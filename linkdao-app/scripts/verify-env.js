#!/usr/bin/env node

/**
 * Environment Variables Verification Script
 * 
 * This script checks that all required environment variables are set.
 * Run with: node scripts/verify-env.js
 */

require('dotenv').config({ path: './backend/.env' });

function verifyEnvironment() {
  console.log('🔍 LinkDAO Environment Variables Verification');
  console.log('==========================================\n');

  // Required environment variables
  const requiredVars = [
    'OPENAI_API_KEY',
    'PORT',
    'RPC_URL'
  ];

  // Optional but recommended environment variables
  const recommendedVars = [
    'PINECONE_API_KEY',
    'PINECONE_ENVIRONMENT',
    'PINECONE_INDEX_NAME'
  ];

  console.log('1. Checking required environment variables...');
  let allRequiredSet = true;
  
  requiredVars.forEach((envVar) => {
    if (process.env[envVar]) {
      console.log(`   ✅ ${envVar}: Set`);
    } else {
      console.log(`   ❌ ${envVar}: Not set`);
      allRequiredSet = false;
    }
  });
  
  console.log();
  
  if (allRequiredSet) {
    console.log('✅ All required environment variables are set!\n');
  } else {
    console.log('❌ Some required environment variables are missing!\n');
  }

  console.log('2. Checking recommended environment variables...');
  let allRecommendedSet = true;
  
  recommendedVars.forEach((envVar) => {
    if (process.env[envVar]) {
      console.log(`   ✅ ${envVar}: Set`);
    } else {
      console.log(`   ⚠️  ${envVar}: Not set (optional but recommended)`);
      allRecommendedSet = false;
    }
  });
  
  console.log();
  
  if (allRecommendedSet) {
    console.log('✅ All recommended environment variables are set!\n');
  } else {
    console.log('⚠️  Some recommended environment variables are missing.\n');
  }

  console.log('3. Environment variable values:');
  console.log(`   PORT: ${process.env.PORT || 'Not set'}`);
  console.log(`   RPC_URL: ${process.env.RPC_URL || 'Not set'}`);
  console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || 'Not set'}`);
  
  // Mask sensitive values for security
  console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'Set (value hidden for security)' : 'Not set'}`);
  console.log(`   PINECONE_API_KEY: ${process.env.PINECONE_API_KEY ? 'Set (value hidden for security)' : 'Not set'}`);
  
  console.log('\n📝 Next steps:');
  if (!process.env.OPENAI_API_KEY) {
    console.log('   1. Set your OpenAI API key in backend/.env');
  }
  if (!process.env.PINECONE_API_KEY) {
    console.log('   2. Set your Pinecone API key in backend/.env (optional but recommended)');
  }
  console.log('   3. Run the backend with: cd backend && npm run dev');
}

// Run the verification
verifyEnvironment();