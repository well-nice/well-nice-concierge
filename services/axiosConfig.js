const axios = require('axios');

// Create a custom Axios instance with robust configuration
const createAxiosInstance = () => {
  const instance = axios.create({
    // Default timeout of 10 seconds
    timeout: 10000,
    
    // Default headers
    headers: {
      'User-Agent': 'WellNice Concierge/1.0',
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json'
    }
  });

  // Request interceptor for logging and potential modification
  instance.interceptors.request.use(
    config => {
      // Log requests in debug mode
      if (process.env.DEBUG === 'true') {
        console.log(`[Axios Request] ${config.method.toUpperCase()} ${config.url}`);
      }
      return config;
    },
    error => {
      console.error('Axios request error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor for global error handling
  instance.interceptors.response.use(
    response => response,
    error => {
      // Centralized error handling
      if (error.response) {
        // The request was made and the server responded with a status code
        console.error('Axios response error:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
      } else {
        // Something happened in setting up the request
        console.error('Axios error:', error.message);
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

// Export a singleton Axios instance
module.exports = createAxiosInstance();
