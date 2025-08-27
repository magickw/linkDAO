#!/usr/bin/env node

/**
 * AI Bot Demo Script
 * 
 * This script demonstrates how to use the AI bots in LinkDAO.
 * Run with: node scripts/ai-demo.js
 */

// Import the bot manager
const path = require('path');

// Add the backend dist directory to the module resolution paths
const backendDist = path.join(__dirname, '..', 'backend', 'dist');
require('module').globalPaths.push(backendDist);

// Dynamically import the bot manager
async function runDemo() {
  try {
    const { initializeBots, processMessageWithBot } = require('../backend/dist/services/botManager');

    console.log('🤖 LinkDAO AI Bot Demo');
    console.log('========================\n');

    // Initialize bots
    console.log('Initializing AI bots...');
    initializeBots();
    console.log('✅ Bots initialized\n');

    // Demonstrate Wallet Guard bot
    console.log('🛡️  Testing Wallet Guard Bot');
    try {
      const walletGuardResponse = await processMessageWithBot(
        'wallet-guard',
        'Is this contract safe to interact with: 0x741f1923953245b6e52578205d83e468c1b390d4?',
        '0x1234567890123456789012345678901234567890'
      );
      console.log('Response:', walletGuardResponse.response);
    } catch (error) {
      console.error('Error with Wallet Guard:', error);
    }
    console.log();

    // Demonstrate Proposal Summarizer bot
    console.log('📋 Testing Proposal Summarizer Bot');
    try {
      const proposalData = {
        id: '1',
        title: 'Increase Community Fund Allocation',
        description: 'This proposal aims to increase the community fund allocation from 10% to 15% of treasury funds for expanded community initiatives and developer grants.',
        proposer: '0x1234567890123456789012345678901234567890',
        startBlock: 1000000,
        endBlock: 1001000,
        forVotes: '1000000',
        againstVotes: '500000'
      };

      const proposalSummarizerResponse = await processMessageWithBot(
        'proposal-summarizer',
        JSON.stringify(proposalData),
        'system'
      );
      console.log('Response:', proposalSummarizerResponse.response);
    } catch (error) {
      console.error('Error with Proposal Summarizer:', error);
    }
    console.log();

    // Demonstrate Community Moderator bot
    console.log('👮 Testing Community Moderator Bot');
    try {
      const postData = {
        id: '1',
        author: '0x1234567890123456789012345678901234567890',
        content: 'Check out this amazing new DeFi project! 🚀 100x potential! Join now: https://fake-defi-project.com',
        timestamp: Date.now(),
        tags: ['defi', 'investment']
      };

      const communityModeratorResponse = await processMessageWithBot(
        'community-moderator',
        JSON.stringify(postData),
        'system'
      );
      console.log('Response:', communityModeratorResponse.response);
    } catch (error) {
      console.error('Error with Community Moderator:', error);
    }
    console.log();

    // Demonstrate Social Copilot bot
    console.log('✍️  Testing Social Copilot Bot');
    try {
      const userData = {
        id: '0x1234567890123456789012345678901234567890',
        interests: ['web3', 'defi', 'nft'],
        following: ['0x...', '0x...'],
        posts: []
      };

      const socialCopilotResponse = await processMessageWithBot(
        'social-copilot',
        'Generate a post about the latest trends in DeFi',
        userData.id
      );
      console.log('Response:', socialCopilotResponse.response);
    } catch (error) {
      console.error('Error with Social Copilot:', error);
    }
    console.log();

    console.log('🎉 Demo completed!');
  } catch (error) {
    console.error('Error running demo:', error);
  }
}

// Run the demo
runDemo();