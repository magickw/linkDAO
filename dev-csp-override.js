
// Development CSP Override - TEMPORARY FIX
const isDevelopment = process.env.NODE_ENV === 'development';

const developmentCSP = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "http:"],
  'style-src': ["'self'", "'unsafe-inline'", "https:", "http:"],
  'img-src': ["'self'", "data:", "https:", "http:", "blob:"],
  'font-src': ["'self'", "https:", "http:", "data:"],
  'connect-src': [
    "'self'", 
    "https:", 
    "http:",
    "wss:", 
    "ws:",
    "http://localhost:*",
    "ws://localhost:*",
    "http://127.0.0.1:*",
    "ws://127.0.0.1:*",
    "*"
  ],
  'frame-src': ["'self'", "https:", "http:"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'", "https:", "http:"]
};

module.exports = { developmentCSP, isDevelopment };
