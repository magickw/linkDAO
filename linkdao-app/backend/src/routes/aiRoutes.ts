import express from 'express';
import { processMessageWithBot, getAllBots, getBotsByCategory } from '../services/botManager';

const router = express.Router();

/**
 * Get all available AI bots
 */
router.get('/bots', (req, res) => {
  try {
    const bots = getAllBots();
    return res.json({ bots });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch bots' });
  }
});

/**
 * Get AI bots by category
 */
router.get('/bots/category/:category', (req, res) => {
  try {
    const { category } = req.params;
    const bots = getBotsByCategory(category);
    return res.json({ category, bots });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch bots by category' });
  }
});

/**
 * Process a message with a specific AI bot
 */
router.post('/bots/:botId/process', async (req, res) => {
  try {
    const { botId } = req.params;
    const { message, userId } = req.body;
    
    if (!message || !userId) {
      return res.status(400).json({ error: 'Message and userId are required' });
    }
    
    const result = await processMessageWithBot(botId, message, userId);
    return res.json(result);
  } catch (error: any) {
    console.error('Error processing bot message:', error);
    return res.status(500).json({ error: error.message || 'Failed to process message with bot' });
  }
});

/**
 * Specialized endpoints for specific bot functions
 */

// Wallet Guard - Analyze transaction
router.post('/bots/wallet-guard/analyze-transaction', async (req, res) => {
  try {
    const { transaction, userAddress } = req.body;
    
    if (!transaction || !userAddress) {
      return res.status(400).json({ error: 'Transaction and userAddress are required' });
    }
    
    // Get the wallet guard bot
    const result = await processMessageWithBot('wallet-guard', JSON.stringify(transaction), userAddress);
    return res.json(result);
  } catch (error: any) {
    console.error('Error analyzing transaction:', error);
    return res.status(500).json({ error: error.message || 'Failed to analyze transaction' });
  }
});

// Proposal Summarizer - Summarize proposal
router.post('/bots/proposal-summarizer/summarize', async (req, res) => {
  try {
    const { proposal } = req.body;
    
    if (!proposal) {
      return res.status(400).json({ error: 'Proposal data is required' });
    }
    
    // Get the proposal summarizer bot
    const result = await processMessageWithBot('proposal-summarizer', JSON.stringify(proposal), 'system');
    return res.json(result);
  } catch (error: any) {
    console.error('Error summarizing proposal:', error);
    return res.status(500).json({ error: error.message || 'Failed to summarize proposal' });
  }
});

// Community Moderator - Moderate post
router.post('/bots/community-moderator/moderate', async (req, res) => {
  try {
    const { post } = req.body;
    
    if (!post) {
      return res.status(400).json({ error: 'Post data is required' });
    }
    
    // Get the community moderator bot
    const result = await processMessageWithBot('community-moderator', JSON.stringify(post), 'system');
    return res.json(result);
  } catch (error: any) {
    console.error('Error moderating post:', error);
    return res.status(500).json({ error: error.message || 'Failed to moderate post' });
  }
});

// Social Copilot - Generate post idea
router.post('/bots/social-copilot/generate-post', async (req, res) => {
  try {
    const { user, topic } = req.body;
    
    if (!user) {
      return res.status(400).json({ error: 'User data is required' });
    }
    
    const message = topic ? `Generate post about: ${topic}` : 'Generate post idea';
    const result = await processMessageWithBot('social-copilot', message, user.id);
    return res.json(result);
  } catch (error: any) {
    console.error('Error generating post:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate post' });
  }
});

export default router;