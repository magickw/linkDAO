#!/usr/bin/env node

/**
 * Immediate CORS Fix
 * Creates a simple proxy server to fix CORS issues immediately
 */

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 8080;
const BACKEND_URL = 'https://api.linkdao.io';
const ALLOWED_ORIGIN = 'https://www.linkdao.io';

console.log('🚀 Starting immediate CORS fix proxy server...');
console.log(`📡 Proxying requests to: ${BACKEND_URL}`);
console.log(`🌐 Allowing origin: ${ALLOWED_ORIGIN}`);

const server = http.createServer((req, res) => {
  // Set CORS headers immediately
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse the request URL
  const parsedUrl = url.parse(req.url);
  const targetUrl = `${BACKEND_URL}${parsedUrl.path}`;

  console.log(`📡 Proxying: ${req.method} ${targetUrl}`);

  // Prepare request options
  const options = {
    method: req.method,
    headers: {
      ...req.headers,
      host: 'api.linkdao.io'
    }
  };

  // Remove problematic headers
  delete options.headers['host'];
  delete options.headers['origin'];

  // Make request to backend
  const backendReq = https.request(targetUrl, options, (backendRes) => {
    // Copy status code
    res.writeHead(backendRes.statusCode, backendRes.headers);

    // Override CORS headers
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Pipe response
    backendRes.pipe(res);
  });

  backendReq.on('error', (error) => {
    console.error('❌ Backend request error:', error.message);
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: 'Backend service unavailable',
      message: error.message
    }));
  });

  // Pipe request body
  req.pipe(backendReq);
});

server.listen(PORT, () => {
  console.log(`✅ CORS fix proxy server running on port ${PORT}`);
  console.log(`🔗 Use this URL in your frontend: http://localhost:${PORT}`);
  console.log('\n📋 To use this fix:');
  console.log('1. Update your frontend API URL to: http://localhost:8080');
  console.log('2. Keep this proxy server running');
  console.log('3. Test your application');
  console.log('\n⚠️ This is a temporary fix - use only for testing!');
});

server.on('error', (error) => {
  console.error('❌ Proxy server error:', error.message);
  process.exit(1);
});