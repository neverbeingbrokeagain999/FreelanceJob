import React from 'react';
import PropTypes from 'prop-types';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ 
  children, 
  requiredRole = null, 
  redirectTo = '/login',
  allowUnverified = true,
  onAccessDenied = null,
  loadingFallback = <LoadingSpinner fullScreen />
}) => {
  const location = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();

  const handleAccessDenied = (message) => {
    if (onAccessDenied) {
      onAccessDenied(message);
    }
  };

  if (isLoading) {
    return loadingFallback;
  }

  if (!isAuthenticated || !user) {
    handleAccessDenied('Please log in to access this page');
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location.pathname }}
        replace 
      />
    );
  }

  // Check for required role
  if (requiredRole) {
    const normalizedRequiredRole = requiredRole.toLowerCase();
    const userRoles = user?.roles?.map(role => role.toLowerCase()) || [];
    
    if (!userRoles.includes(normalizedRequiredRole)) {
      handleAccessDenied(`Access denied. You need ${requiredRole} privileges to access this page.`);
      // Redirect to the appropriate dashboard based on user's role
      let redirectPath = '/';
      if (userRoles.includes('admin')) {
        redirectPath = '/admin/dashboard';
      } else if (userRoles.includes('client')) {
        redirectPath = '/client/dashboard';
      } else if (userRoles.includes('freelancer')) {
        redirectPath = '/freelancer/dashboard';
      }
      return <Navigate to={redirectPath} replace />;
    }
  }

  return children || <Outlet />;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node,
  requiredRole: PropTypes.oneOf(['admin', 'client', 'freelancer', 'ADMIN', 'CLIENT', 'FREELANCER']),
  redirectTo: PropTypes.string,
  allowUnverified: PropTypes.bool,
  onAccessDenied: PropTypes.func,
  loadingFallback: PropTypes.node
};

export const AdminRoute = ({ children, onAccessDenied, ...props }) => {
  return (
    <ProtectedRoute 
      requiredRole="admin" 
      redirectTo="/login"
      allowUnverified={true}
      onAccessDenied={(message) => 
        onAccessDenied?.(message || 'Administrative privileges required.')
      }
      {...props}
    >
      {children}
    </ProtectedRoute>
  );
};

// Higher-order component for client routes
export const ClientRoute = ({ children, onAccessDenied, ...props }) => {
  return (
    <ProtectedRoute
      requiredRole="client"
      redirectTo="/login"
      allowUnverified={true}
      onAccessDenied={(message) =>
        onAccessDenied?.(message || 'Client privileges required.')
      }
      {...props}
    >
      {children}
    </ProtectedRoute>
  );
};

// Higher-order component for freelancer routes
export const FreelancerRoute = ({ children, onAccessDenied, ...props }) => {
  return (
    <ProtectedRoute
      requiredRole="freelancer"
      redirectTo="/login"
      allowUnverified={true}
      onAccessDenied={(message) =>
        onAccessDenied?.(message || 'Freelancer privileges required.')
      }
      {...props}
    >
      {children}
    </ProtectedRoute>
  );
};

AdminRoute.propTypes = {
  children: PropTypes.node.isRequired,
  onAccessDenied: PropTypes.func
};

ClientRoute.propTypes = {
  children: PropTypes.node.isRequired,
  onAccessDenied: PropTypes.func
};

FreelancerRoute.propTypes = {
  children: PropTypes.node.isRequired,
  onAccessDenied: PropTypes.func
};

export default ProtectedRoute;
