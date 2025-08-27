import { AIBot, aiService, AIResponse } from '../aiService';

interface PostData {
  id: string;
  author: string;
  content: string;
  timestamp: number;
  tags: string[];
}

export class CommunityModeratorBot extends AIBot {
  constructor() {
    super(
      {
        name: 'Community Moderator',
        description: 'Detects spam, scams, and inappropriate content in posts',
        scope: ['social', 'moderation'],
        permissions: ['read-posts', 'flag-content'],
        aiModel: 'gpt-4-turbo',
        persona: 'community-moderator',
      },
      aiService
    );
  }

  async moderatePost(post: PostData): Promise<{ flagged: boolean; reason: string; confidence: number }> {
    // First check with OpenAI's moderation API
    const isFlagged = await this.aiService.moderateContent(post.content);
    
    if (isFlagged) {
      return {
        flagged: true,
        reason: 'Content flagged by OpenAI moderation API',
        confidence: 0.9
      };
    }

    // Use custom AI for more nuanced moderation
    const prompt = `
      Analyze this social media post for potential issues:
      
      Content: "${post.content}"
      Author: ${post.author}
      Tags: ${post.tags.join(', ')}
      
      Please identify:
      1. Is this spam or promotional content?
      2. Does it contain phishing links or scam attempts?
      3. Is it inappropriate or potentially harmful?
      4. Does it violate community guidelines?
      
      Respond with a JSON object in this format:
      {
        "flagged": boolean,
        "reason": "brief explanation",
        "confidence": number between 0-1
      }
    `;

    try {
      const response = await this.aiService.generateText([
        {
          role: 'system',
          content: 'You are a community moderator AI that identifies problematic content.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]);

      // Try to parse the JSON response
      try {
        const result = JSON.parse(response.content);
        return {
          flagged: result.flagged || false,
          reason: result.reason || 'No issues detected',
          confidence: result.confidence || 0
        };
      } catch (parseError) {
        // If JSON parsing fails, return a default safe response
        return {
          flagged: false,
          reason: 'No issues detected',
          confidence: 0
        };
      }
    } catch (error) {
      console.error('Error moderating post:', error);
      return {
        flagged: false,
        reason: 'Moderation check failed',
        confidence: 0
      };
    }
  }

  async processMessage(userMessage: string, userId: string): Promise<AIResponse> {
    const prompt = `
      User is asking about community guidelines or content moderation: "${userMessage}"
      
      Provide helpful information about:
      1. Community guidelines and standards
      2. How to report inappropriate content
      3. What types of content are not allowed
      4. How the moderation system works
    `;

    return await this.aiService.generateText([
      {
        role: 'system',
        content: 'You are a community manager helping users understand guidelines and moderation.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]);
  }
}