#!/usr/bin/env node

/**
 * AI Services Test Script
 * 
 * This script tests that the AI services can be initialized properly.
 * Run with: node scripts/test-ai-services.js
 */

require('dotenv').config({ path: './backend/.env' });

async function testAIServices() {
  console.log('🧪 LinkDAO AI Services Test');
  console.log('==========================\n');

  try {
    console.log('1. Testing environment variables...');
    
    // Check required environment variables
    const requiredEnvVars = ['OPENAI_API_KEY', 'RPC_URL'];
    let missingVars = [];
    
    requiredEnvVars.forEach(envVar => {
      if (!process.env[envVar]) {
        missingVars.push(envVar);
      }
    });
    
    if (missingVars.length > 0) {
      console.log(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
      process.exit(1);
    }
    
    console.log('✅ All required environment variables are set\n');
    
    console.log('2. Testing AI service initialization...');
    
    // Dynamically import the AI service
    const { aiService } = await import('../backend/dist/services/aiService.js');
    
    if (aiService) {
      console.log('✅ AI Service initialized successfully');
    } else {
      console.log('❌ Failed to initialize AI Service');
      process.exit(1);
    }
    
    console.log('\n3. Testing bot initialization...');
    
    // Dynamically import the bot manager
    const { initializeBots, getAllBots } = await import('../backend/dist/services/botManager.js');
    
    // Initialize bots
    initializeBots();
    console.log('✅ Bot manager initialized');
    
    // Get all bots
    const bots = getAllBots();
    console.log(`✅ Found ${bots.length} bots:`);
    bots.forEach(bot => {
      console.log(`   - ${bot.config.name}: ${bot.config.description}`);
    });
    
    console.log('\n🎉 All AI services tests passed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Start the backend: cd backend && npm run dev');
    console.log('   2. Test the API endpoints with curl or the frontend');
    
  } catch (error) {
    console.error('❌ Error testing AI services:', error.message);
    process.exit(1);
  }
}

// Run the test
testAIServices();