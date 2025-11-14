#!/usr/bin/env node

/**
 * Test startup script to verify the backend server starts without errors
 */

import dotenv from 'dotenv';
import { startProductionServer } from './src/config/production-server';

dotenv.config();

// Set environment for testing
process.env.NODE_ENV = 'development';
process.env.PORT = process.env.PORT || '10000';

console.log('🧪 Testing backend server startup...');

async function testServer() {
  try {
    console.log('🚀 Starting server...');
    const server = await startProductionServer();
    console.log('✅ Server started successfully!');
    
    // Give it a moment to fully initialize
    setTimeout(() => {
      console.log('📊 Server is running and ready for requests');
      
      // Attempt graceful shutdown
      if (server && typeof server.gracefulShutdown === 'function') {
        server.gracefulShutdown();
      } else {
        process.exit(0);
      }
    }, 2000);
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

testServer().catch(error => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});