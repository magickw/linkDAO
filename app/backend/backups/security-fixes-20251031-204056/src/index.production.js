#!/usr/bin/env node

/**
 * Production Server Entry Point (JavaScript)
 * 
 * This is a JavaScript wrapper for the TypeScript production server.
 * It uses ts-node to run the TypeScript version in production.
 */

const path = require('path');
const { spawn } = require('child_process');

// Check if ts-node is available
try {
  require.resolve('ts-node');
} catch (error) {
  console.error('❌ ts-node is required to run the production server');
  console.error('Install it with: npm install ts-node');
  process.exit(1);
}

// Path to the TypeScript production server
const tsServerPath = path.join(__dirname, 'index.production.ts');

console.log('🚀 Starting production server via ts-node...');

// Spawn ts-node process
const tsNodeProcess = spawn('npx', ['ts-node', tsServerPath], {
  stdio: 'inherit',
  env: process.env
});

// Handle process events
tsNodeProcess.on('error', (error) => {
  console.error('💥 Failed to start ts-node process:', error);
  process.exit(1);
});

tsNodeProcess.on('exit', (code, signal) => {
  if (signal) {
    console.log(`📡 Process terminated by signal: ${signal}`);
  } else {
    console.log(`📊 Process exited with code: ${code}`);
  }
  process.exit(code || 0);
});

// Forward signals to child process
process.on('SIGTERM', () => {
  tsNodeProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  tsNodeProcess.kill('SIGINT');
});

process.on('SIGUSR2', () => {
  tsNodeProcess.kill('SIGUSR2');
});