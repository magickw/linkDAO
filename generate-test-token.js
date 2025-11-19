#!/usr/bin/env node

// Simple script to generate a test JWT token for development
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || '68511d56377eb3959e43fd953c2ee76346eb8becf62e08f0afe5439efa8595d4';
const TEST_WALLET_ADDRESS = '0xEe034b53D4cCb101b2a4faec27708be507197350'; // From the console logs

const payload = {
  walletAddress: TEST_WALLET_ADDRESS.toLowerCase(),
  type: 'session',
  timestamp: Date.now(),
  // Add additional fields that the auth middleware expects
  address: TEST_WALLET_ADDRESS.toLowerCase(),
  userId: TEST_WALLET_ADDRESS.toLowerCase(),
  id: TEST_WALLET_ADDRESS.toLowerCase()
};

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

console.log('Test JWT Token:');
console.log(token);
console.log('\nUse this token in your requests:');
console.log(`Authorization: Bearer ${token}`);
console.log('\nTest with curl:');
console.log(`curl -H "Authorization: Bearer ${token}" "http://localhost:10000/api/feed?page=1&limit=20&sort=hot&timeRange=day"`);