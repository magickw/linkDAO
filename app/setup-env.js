#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 LinkDAO Environment Setup');
console.log('============================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    console.log('📋 Copying .env.example to .env...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created successfully!');
  } else {
    console.log('❌ .env.example file not found');
    process.exit(1);
  }
} else {
  console.log('✅ .env file already exists');
}

// Read current .env file
let envContent = fs.readFileSync(envPath, 'utf8');

// Check for WalletConnect Project ID
if (!envContent.includes('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=') || 
    envContent.includes('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id')) {
  
  console.log('\n🔗 WalletConnect Configuration');
  console.log('===============================');
  console.log('For full WalletConnect functionality, you need a project ID from:');
  console.log('👉 https://cloud.walletconnect.com/');
  console.log('\nSteps:');
  console.log('1. Create a free account at WalletConnect Cloud');
  console.log('2. Create a new project');
  console.log('3. Copy your Project ID');
  console.log('4. Update NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in your .env file');
  console.log('\n⚠️  For development, the app will work with the demo project ID');
  console.log('   but you may see warnings in the console.');
}

console.log('\n🎉 Setup Complete!');
console.log('==================');
console.log('Your LinkDAO development environment is ready.');
console.log('\nNext steps:');
console.log('1. Review and update .env file with your specific values');
console.log('2. Run: npm run dev (in frontend directory)');
console.log('3. Run: npm run dev (in backend directory)');
console.log('\n📚 For more information, check the README.md file');