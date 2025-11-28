// config.js
const config = {
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  MAX_FILE_SIZE: 200 * 1024 * 1024, // 200MB
  REQUEST_TIMEOUT: 300000, // 5 minutes

  // Browser parsing options
  BROWSER_PARSING: {
    ENABLE_MAYA: true,
    ENABLE_BLEND: true,
    MAX_VERTICES: 1000000,
    FALLBACK_TO_SERVER: true
  }
};

export default config;