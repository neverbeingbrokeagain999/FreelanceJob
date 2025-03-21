import axios from 'axios';

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Add request interceptor to add token to headers
instance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling and token management
instance.interceptors.response.use(
  response => {
    // Handle successful responses
    if (response.data?.token) {
      localStorage.setItem('token', response.data.token);
      instance.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
    }
    return response;
  },
  error => {
    if (!error.response) {
      // Network error or server not running
      error.message = 'Unable to connect to server. Please check your connection and try again.';
    } else if (error.response.status === 401) {
      // Clear token and headers on authentication error
      localStorage.removeItem('token');
      delete instance.defaults.headers.common['Authorization'];
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default instance;
