#!/usr/bin/env node

/**
 * AI Service Structure Verification Script
 * 
 * This script verifies that all AI service files are properly structured.
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

function verifyAIStructure() {
  console.log('🔍 LinkDAO AI Service Structure Verification');
  console.log('==========================================\n');

  const backendDir = path.join(__dirname, '..', 'backend');
  const srcDir = path.join(backendDir, 'src');
  const servicesDir = path.join(srcDir, 'services');
  const botsDir = path.join(servicesDir, 'bots');
  const routesDir = path.join(srcDir, 'routes');

  // Check main AI service file
  console.log('1. Checking main AI service...');
  const aiServiceFile = path.join(servicesDir, 'aiService.ts');
  console.log(`   - AI Service: ${checkFileExists(aiServiceFile) ? '✅ Found' : '❌ Missing'}`);
  
  // Check bot manager
  console.log('\n2. Checking bot manager...');
  const botManagerFile = path.join(servicesDir, 'botManager.ts');
  console.log(`   - Bot Manager: ${checkFileExists(botManagerFile) ? '✅ Found' : '❌ Missing'}`);
  
  // Check individual bots
  console.log('\n3. Checking individual bot implementations...');
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
  
  // Check AI routes
  console.log('\n4. Checking AI routes...');
  const aiRoutesFile = path.join(routesDir, 'aiRoutes.ts');
  console.log(`   - AI Routes: ${checkFileExists(aiRoutesFile) ? '✅ Found' : '❌ Missing'}`);
  
  // Check frontend components
  console.log('\n5. Checking frontend components...');
  const frontendDir = path.join(__dirname, '..', 'frontend');
  const frontendSrcDir = path.join(frontendDir, 'src');
  const componentsDir = path.join(frontendSrcDir, 'components');
  const hooksDir = path.join(frontendSrcDir, 'hooks');
  
  const aiChatInterfaceFile = path.join(componentsDir, 'AIChatInterface.tsx');
  console.log(`   - AI Chat Interface: ${checkFileExists(aiChatInterfaceFile) ? '✅ Found' : '❌ Missing'}`);
  
  const useAIBotsFile = path.join(hooksDir, 'useAIBots.ts');
  console.log(`   - useAIBots Hook: ${checkFileExists(useAIBotsFile) ? '✅ Found' : '❌ Missing'}`);
  
  console.log('\n🎉 Structure verification complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Set up your environment variables in backend/.env');
  console.log('   2. Build the backend: cd backend && npm run build');
  console.log('   3. Run the backend: cd backend && npm run dev');
  console.log('   4. Test the AI endpoints');
}

// Run the verification
verifyAIStructure();