#!/usr/bin/env node

/**
 * AI Bot Structure Verification Script
 * 
 * This script verifies that all AI bot files are in place.
 * Run with: node scripts/verify-ai-structure.js
 */

const fs = require('fs');
const path = require('path');

function checkFileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

function verifyStructure() {
  console.log('🔍 LinkDAO AI Bot Structure Verification');
  console.log('========================================\n');

  // Check backend services
  const backendServicesDir = path.join(__dirname, '..', 'backend', 'src', 'services');
  const aiServiceFile = path.join(backendServicesDir, 'aiService.ts');
  const botManagerFile = path.join(backendServicesDir, 'botManager.ts');
  const botsDir = path.join(backendServicesDir, 'bots');

  console.log('1. Checking core AI service files...');
  console.log(`   - AI Service: ${checkFileExists(aiServiceFile) ? '✅ Found' : '❌ Missing'}`);
  console.log(`   - Bot Manager: ${checkFileExists(botManagerFile) ? '✅ Found' : '❌ Missing'}`);
  console.log();

  console.log('2. Checking individual bot files...');
  const botFiles = [
    'walletGuardBot.ts',
    'proposalSummarizerBot.ts',
    'communityModeratorBot.ts',
    'socialCopilotBot.ts'
  ];

  botFiles.forEach(botFile => {
    const fullPath = path.join(botsDir, botFile);
    console.log(`   - ${botFile}: ${checkFileExists(fullPath) ? '✅ Found' : '❌ Missing'}`);
  });
  console.log();

  // Check API routes
  const apiRoutesDir = path.join(__dirname, '..', 'backend', 'src', 'routes');
  const aiRoutesFile = path.join(apiRoutesDir, 'aiRoutes.ts');

  console.log('3. Checking API routes...');
  console.log(`   - AI Routes: ${checkFileExists(aiRoutesFile) ? '✅ Found' : '❌ Missing'}`);
  console.log();

  // Check frontend components
  const frontendComponentsDir = path.join(__dirname, '..', 'frontend', 'src', 'components');
  const aiChatInterfaceFile = path.join(frontendComponentsDir, 'AIChatInterface.tsx');

  console.log('4. Checking frontend components...');
  console.log(`   - AI Chat Interface: ${checkFileExists(aiChatInterfaceFile) ? '✅ Found' : '❌ Missing'}`);
  console.log();

  // Check frontend hooks
  const frontendHooksDir = path.join(__dirname, '..', 'frontend', 'src', 'hooks');
  const useAIBotsFile = path.join(frontendHooksDir, 'useAIBots.ts');

  console.log('5. Checking frontend hooks...');
  console.log(`   - useAIBots Hook: ${checkFileExists(useAIBotsFile) ? '✅ Found' : '❌ Missing'}`);
  console.log();

  console.log('🎉 Structure verification complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Set up environment variables (OPENAI_API_KEY, PINECONE_API_KEY)');
  console.log('   2. Run the backend with: cd backend && npm run dev');
  console.log('   3. Test the AI endpoints with the API documentation');
}

// Run the verification
verifyStructure();