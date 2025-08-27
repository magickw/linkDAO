import { AIBot, aiService, AIResponse } from '../aiService';

interface UserData {
  id: string;
  interests: string[];
  following: string[];
  posts: any[];
}

export class SocialCopilotBot extends AIBot {
  constructor() {
    super(
      {
        name: 'Social Copilot',
        description: 'Helps you create content, find communities, and connect with others',
        scope: ['social', 'content'],
        permissions: ['read-profile', 'read-posts', 'read-follows'],
        aiModel: 'gpt-4-turbo',
        persona: 'helpful-creative-assistant',
      },
      aiService
    );
  }

  async generatePostIdea(user: UserData, topic?: string): Promise<AIResponse> {
    const prompt = `
      Generate a creative social media post for a Web3 user with these interests:
      ${user.interests.join(', ')}
      
      ${topic ? `They want to post about: ${topic}` : 'Suggest an interesting topic for them to post about.'}
      
      Their recent activity:
      - Follows: ${user.following.length} accounts
      - Posts: ${user.posts.length} posts
      
      Create a post that would engage their audience and fit with Web3 culture.
      Include relevant hashtags and emojis.
    `;

    return await this.aiService.generateText([
      {
        role: 'system',
        content: 'You are a creative social media assistant for Web3 communities.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]);
  }

  async translateContent(content: string, targetLanguage: string): Promise<AIResponse> {
    const prompt = `
      Translate this content to ${targetLanguage}:
      
      "${content}"
      
      Maintain the tone and style while ensuring the translation is natural and fluent.
    `;

    return await this.aiService.generateText([
      {
        role: 'system',
        content: 'You are a professional translator with expertise in Web3 and technical topics.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]);
  }

  async suggestCommunities(user: UserData): Promise<AIResponse> {
    const prompt = `
      Based on this user's interests: ${user.interests.join(', ')}
      
      Suggest 5 Web3 communities or DAOs they might want to join.
      For each suggestion, provide:
      1. Community name
      2. Brief description
      3. Why it matches their interests
      4. How to join or participate
    `;

    return await this.aiService.generateText([
      {
        role: 'system',
        content: 'You are a Web3 community expert helping users find relevant communities.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]);
  }

  async processMessage(userMessage: string, userId: string): Promise<AIResponse> {
    const prompt = `
      User is asking for social media help: "${userMessage}"
      
      Provide assistance with:
      1. Content creation ideas
      2. Community recommendations
      3. Engagement strategies
      4. Web3 social best practices
    `;

    return await this.aiService.generateText([
      {
        role: 'system',
        content: 'You are a helpful social media assistant for Web3 users.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]);
  }
}