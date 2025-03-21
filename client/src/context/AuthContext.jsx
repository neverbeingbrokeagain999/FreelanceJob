import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import axiosInstance from '../services/axios';
import toast from 'react-hot-toast';
import PropTypes from 'prop-types';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        return {
          success: false,
          error: 'No authentication token found'
        };
      }

      // Set token in axios headers
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const response = await axiosInstance.get('/api/v1/auth/me');
      
      // Validate response structure
      if (!response?.data?.user) {
        throw new Error('Invalid response format: missing user data');
      }

      const userData = response.data.user;
      
      // Validate required user fields
      if (!userData.id && !userData._id) {
        throw new Error('Invalid user data: missing user ID');
      }

      if (!userData.email) {
        throw new Error('Invalid user data: missing email');
      }
    
      // Enhanced role validation and normalization
      let roles = [];
      if (Array.isArray(userData.roles) && userData.roles.length > 0) {
        roles = userData.roles
          .filter(role => role && typeof role === 'string')
          .map(role => role.toLowerCase());
      } else if (userData.role && typeof userData.role === 'string') {
        roles = [userData.role.toLowerCase()];
      }

      if (!roles.length) {
        roles = ['user']; // Fallback to default role
      }

      const userWithRoles = {
        id: userData.id || userData._id,
        email: userData.email,
        name: userData.name || '',
        roles: roles,
        role: roles[0] // Set primary role as first role in array
      };
      
      setUser(userWithRoles);
      setIsAuthenticated(true);
      setIsLoading(false);
      
      return {
        success: true,
        user: userWithRoles
      };
    } catch (error) {
      console.error('CheckAuth Error:', error);
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      localStorage.removeItem('token');
      delete axiosInstance.defaults.headers.common['Authorization'];
      
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  };

  // Initialize auth state on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axiosInstance.post('/api/v1/auth/login', {
        email,
        password
      });

      if (!response.data || typeof response.data !== 'object') {
        throw new Error('Invalid response format');
      }

      const { token, user } = response.data;

      if (!token || !user) {
        throw new Error('Invalid response: missing token or user data');
      }

      // Validate user object structure
      if (!user.id && !user._id) {
        throw new Error('Invalid user data: missing user ID');
      }

      if (!user.email) {
        throw new Error('Invalid user data: missing email');
      }

      localStorage.setItem('token', token);
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Validate and normalize user roles
      let roles = [];
      if (Array.isArray(user.roles) && user.roles.length > 0) {
        roles = user.roles
          .filter(role => role && typeof role === 'string')
          .map(role => role.toLowerCase());
      } else if (user.role && typeof user.role === 'string') {
        roles = [user.role.toLowerCase()];
      }

      if (!roles.length) {
        roles = ['user']; // Fallback to default role
      }

      const userWithRoles = {
        id: user.id || user._id,
        email: user.email,
        name: user.name || '',
        roles: roles,
        role: roles[0] // Set primary role as first role in array
      };

      setUser(userWithRoles);
      setIsAuthenticated(true);
      setIsLoading(false);

      return {
        success: true,
        user: userWithRoles
      };
    } catch (error) {
      console.error('Login Error:', error);
      localStorage.removeItem('token');
      delete axiosInstance.defaults.headers.common['Authorization'];
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axiosInstance.defaults.headers.common['Authorization'];
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  const signup = async ({ email, password, name, role = 'client' }) => {
    try {
      if (!email || !password || !name || !role) {
        throw new Error('All fields are required');
      }

      // Check for admin role creation
      const isAdminCreation = role === 'admin';
      const adminToken = localStorage.getItem('admin_creation_token');
      
      if (isAdminCreation && (!adminToken || adminToken !== import.meta.env.VITE_ADMIN_CREATION_TOKEN)) {
        throw new Error('Unauthorized admin account creation');
      }
      
      if (!['client', 'freelancer', 'admin'].includes(role)) {
        throw new Error('Invalid role specified');
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/.test(password)) {
        throw new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      }

      const response = await axiosInstance.post('/api/v1/auth/register', {
        email,
        password,
        name,
        role
      });

      if (!response.data || typeof response.data !== 'object') {
        throw new Error('Invalid response format');
      }

      const { token, user } = response.data;

      if (!token || !user) {
        throw new Error('Invalid response: missing token or user data');
      }

      // Validate user object structure
      if (!user.id && !user._id) {
        throw new Error('Invalid user data: missing user ID');
      }

      if (!user.email) {
        throw new Error('Invalid user data: missing email');
      }

      localStorage.setItem('token', token);
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Validate and normalize user roles
      let roles = [];
      if (Array.isArray(user.roles) && user.roles.length > 0) {
        roles = user.roles
          .filter(role => role && typeof role === 'string')
          .map(role => role.toLowerCase());
      } else if (user.role && typeof user.role === 'string') {
        roles = [user.role.toLowerCase()];
      }

      if (!roles.length) {
        roles = ['user']; // Fallback to default role
      }

      const userWithRoles = {
        id: user.id || user._id,
        email: user.email,
        name: user.name || '',
        roles: roles,
        role: roles[0] // Set primary role as first role in array
      };

      setUser(userWithRoles);
      setIsAuthenticated(true);
      setIsLoading(false);

      return {
        success: true,
        user: userWithRoles
      };
    } catch (error) {
      console.error('Signup Error:', error);
      localStorage.removeItem('token');
      delete axiosInstance.defaults.headers.common['Authorization'];
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      isAuthenticated,
      login,
      logout,
      signup,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
