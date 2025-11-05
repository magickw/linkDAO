#!/usr/bin/env node

/**
 * Quick fix script for frontend-backend connection issues
 */

console.log('🔧 Applying Frontend-Backend Connection Fixes');
console.log('=============================================');

// Check if we're in the right directory
const fs = require('fs');
const path = require('path');

if (!fs.existsSync('app/backend') || !fs.existsSync('app/frontend')) {
  console.error('❌ Please run this script from the project root directory');
  process.exit(1);
}

console.log('✅ Project structure verified');

// Test the connection
async function testConnection() {
  console.log('\n📡 Testing backend connection...');
  
  try {
    const response = await fetch('http://localhost:10000/health');
    if (response.ok) {
      console.log('✅ Backend is running and accessible');
      return true;
    } else {
      console.log(`⚠️  Backend responded with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Backend is not accessible:', error.message);
    return false;
  }
}

async function main() {
  const isConnected = await testConnection();
  
  if (isConnected) {
    console.log('\n🎉 Backend connection is working!');
    console.log('Now test post creation and onboarding in your frontend.');
  } else {
    console.log('\n🚀 Next steps:');
    console.log('1. Start the backend: cd app/backend && npm run dev');
    console.log('2. Start the frontend: cd app/frontend && npm run dev');
    console.log('3. Run diagnostics: node diagnose-connection-issues.js');
  }
}

main().catch(console.error);