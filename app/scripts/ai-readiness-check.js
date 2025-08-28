#!/usr/bin/env node

/**
 * AI Services Readiness Check Script
 * 
 * This script performs a comprehensive check to ensure everything is ready for AI services.
 * Run with: node scripts/ai-readiness-check.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

function checkFileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

function checkDependencyInstalled(dependency, directory) {
  try {
    const result = spawnSync('npm', ['list', dependency], { 
      cwd: directory, 
      stdio: 'pipe' 
    });
    return result.status === 0;
  } catch (error) {
    return false;
  }
}

function runReadinessCheck() {
  console.log('✅ LinkDAO AI Services Readiness Check');
  console.log('====================================\n');
  
  let allChecksPassed = true;
  
  // 1. Check environment variables
  console.log('1. Environment Variables Check');
  const requiredEnvVars = ['OPENAI_API_KEY', 'RPC_URL', 'PORT'];
  const optionalEnvVars = ['PINECONE_API_KEY', 'PINECONE_ENVIRONMENT', 'PINECONE_INDEX_NAME'];
  
  requiredEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      console.log(`   ✅ ${envVar}: Set`);
    } else {
      console.log(`   ❌ ${envVar}: Not set (REQUIRED)`);
      allChecksPassed = false;
    }
  });
  
  optionalEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      console.log(`   ✅ ${envVar}: Set`);
    } else {
      console.log(`   ⚠️  ${envVar}: Not set (optional but recommended)`);
    }
  });
  
  console.log();
  
  // 2. Check file structure
  console.log('2. File Structure Check');
  const rootDir = path.join(__dirname, '..');
  const backendDir = path.join(rootDir, 'backend');
  const frontendDir = path.join(rootDir, 'frontend');
  const servicesDir = path.join(backendDir, 'src', 'services');
  const botsDir = path.join(servicesDir, 'bots');
  const routesDir = path.join(backendDir, 'src', 'routes');
  const frontendComponentsDir = path.join(frontendDir, 'src', 'components');
  const frontendHooksDir = path.join(frontendDir, 'src', 'hooks');
  
  const requiredFiles = [
    { path: path.join(servicesDir, 'aiService.ts'), name: 'AI Service' },
    { path: path.join(servicesDir, 'botManager.ts'), name: 'Bot Manager' },
    { path: path.join(botsDir, 'walletGuardBot.ts'), name: 'Wallet Guard Bot' },
    { path: path.join(botsDir, 'proposalSummarizerBot.ts'), name: 'Proposal Summarizer Bot' },
    { path: path.join(botsDir, 'communityModeratorBot.ts'), name: 'Community Moderator Bot' },
    { path: path.join(botsDir, 'socialCopilotBot.ts'), name: 'Social Copilot Bot' },
    { path: path.join(routesDir, 'aiRoutes.ts'), name: 'AI Routes' },
    { path: path.join(frontendComponentsDir, 'AIChatInterface.tsx'), name: 'AI Chat Interface' },
    { path: path.join(frontendHooksDir, 'useAIBots.ts'), name: 'useAIBots Hook' }
  ];
  
  requiredFiles.forEach(file => {
    if (checkFileExists(file.path)) {
      console.log(`   ✅ ${file.name}: Found`);
    } else {
      console.log(`   ❌ ${file.name}: Missing`);
      allChecksPassed = false;
    }
  });
  
  console.log();
  
  // 3. Check dependencies
  console.log('3. Dependency Check');
  const requiredDependencies = [
    { name: 'openai', directory: backendDir },
    { name: '@pinecone-database/pinecone', directory: backendDir },
    { name: 'ethers', directory: backendDir }
  ];
  
  requiredDependencies.forEach(dep => {
    if (checkDependencyInstalled(dep.name, dep.directory)) {
      console.log(`   ✅ ${dep.name}: Installed`);
    } else {
      console.log(`   ❌ ${dep.name}: Not installed`);
      allChecksPassed = false;
    }
  });
  
  console.log();
  
  // 4. Check build status
  console.log('4. Build Status Check');
  const distDir = path.join(backendDir, 'dist');
  if (checkFileExists(distDir)) {
    console.log('   ✅ Backend compiled: Yes');
  } else {
    console.log('   ⚠️  Backend compiled: No (run "npm run build" in backend directory)');
  }
  
  console.log();
  
  // Final status
  if (allChecksPassed) {
    console.log('🎉 All readiness checks passed!');
    console.log('\n🚀 You are ready to start the AI services!');
    console.log('\n📝 Next steps:');
    console.log('   1. Start the backend: cd backend && npm run dev');
    console.log('   2. Start the frontend: cd frontend && npm run dev');
    console.log('   3. Visit http://localhost:3004 to use the AI features');
  } else {
    console.log('❌ Some readiness checks failed!');
    console.log('\n🔧 Please fix the issues above before starting the AI services.');
  }
}

// Run the readiness check
runReadinessCheck();