import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';

interface Bot {
  id: string;
  name: string;
  description: string;
  scope: string[];
}

interface BotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export const useAIBots = () => {
  const { address } = useAccount();
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available bots
  const fetchBots = useCallback(async () => {
    if (!address) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/bots');
      if (!response.ok) {
        throw new Error('Failed to fetch bots');
      }
      
      const data = await response.json();
      setBots(data.bots.map((bot: any) => ({
        id: bot.id,
        name: bot.config.name,
        description: bot.config.description,
        scope: bot.config.scope
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error fetching bots:', err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  // Send message to a bot
  const sendMessageToBot = useCallback(async (botId: string, message: string) => {
    if (!address || !message.trim()) {
      throw new Error('User not connected or message is empty');
    }
    
    try {
      const response = await fetch(`/api/ai/bots/${botId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          userId: address
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process message');
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error sending message to bot:', err);
      throw err;
    }
  }, [address]);

  // Specialized functions for specific bots

  // Wallet Guard - Analyze transaction
  const analyzeTransaction = useCallback(async (transaction: any) => {
    if (!address) {
      throw new Error('User not connected');
    }
    
    try {
      const response = await fetch('/api/ai/bots/wallet-guard/analyze-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction,
          userAddress: address
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze transaction');
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error analyzing transaction:', err);
      throw err;
    }
  }, [address]);

  // Proposal Summarizer - Summarize proposal
  const summarizeProposal = useCallback(async (proposal: any) => {
    try {
      const response = await fetch('/api/ai/bots/proposal-summarizer/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ proposal })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to summarize proposal');
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error summarizing proposal:', err);
      throw err;
    }
  }, []);

  // Community Moderator - Moderate post
  const moderatePost = useCallback(async (post: any) => {
    try {
      const response = await fetch('/api/ai/bots/community-moderator/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ post })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to moderate post');
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error moderating post:', err);
      throw err;
    }
  }, []);

  // Social Copilot - Generate post idea
  const generatePostIdea = useCallback(async (user: any, topic?: string) => {
    if (!address) {
      throw new Error('User not connected');
    }
    
    try {
      const response = await fetch('/api/ai/bots/social-copilot/generate-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user, topic })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate post idea');
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error generating post idea:', err);
      throw err;
    }
  }, [address]);

  return {
    bots,
    loading,
    error,
    fetchBots,
    sendMessageToBot,
    analyzeTransaction,
    summarizeProposal,
    moderatePost,
    generatePostIdea
  };
};