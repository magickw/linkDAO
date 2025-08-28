import { AIService, AIBot } from '../services/aiService';
import { WalletGuardBot } from '../services/bots/walletGuardBot';
import { ProposalSummarizerBot } from '../services/bots/proposalSummarizerBot';
import { CommunityModeratorBot } from '../services/bots/communityModeratorBot';
import { SocialCopilotBot } from '../services/bots/socialCopilotBot';

// Mock the OpenAI and Pinecone imports since we don't want to test actual API calls
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'Mock response' } }],
            usage: { total_tokens: 10 },
            model: 'gpt-4-turbo'
          })
        }
      },
      moderations: {
        create: jest.fn().mockResolvedValue({
          results: [{ flagged: false }]
        })
      },
      embeddings: {
        create: jest.fn().mockResolvedValue({
          data: [{ embedding: [0.1, 0.2, 0.3] }]
        })
      }
    }))
  };
});

jest.mock('@pinecone-database/pinecone', () => {
  return {
    __esModule: true,
    Pinecone: jest.fn().mockImplementation(() => ({
      Index: jest.fn().mockReturnValue({
        query: jest.fn().mockResolvedValue({ matches: [] })
      })
    }))
  };
});

describe('AI Service', () => {
  let aiService: AIService;

  beforeEach(() => {
    aiService = new AIService();
  });

  it('should generate text', async () => {
    const messages = [
      { role: 'user' as const, content: 'Hello, world!' }
    ];
    
    const result = await aiService.generateText(messages);
    
    expect(result.content).toBe('Mock response');
    expect(result.tokensUsed).toBe(10);
    expect(result.model).toBe('gpt-4-turbo');
  });

  it('should moderate content', async () => {
    const input = 'Test content';
    
    const result = await aiService.moderateContent(input);
    
    expect(result.flagged).toBe(false);
  });

  it('should generate embeddings', async () => {
    const input = 'Test text';
    
    const result = await aiService.generateEmbeddings(input);
    
    expect(result).toEqual([[0.1, 0.2, 0.3]]);
  });

  it('should retrieve context', async () => {
    const query = 'Test query';
    
    const result = await aiService.retrieveContext(query);
    
    expect(result).toEqual([]);
  });

  it('should get proposal data', async () => {
    const result = await aiService.getProposalData('123');
    
    expect(result).toBeDefined();
    expect(result.id).toBe('123');
  });
});

describe('AI Bots', () => {
  it('should initialize Wallet Guard bot', () => {
    const bot = new WalletGuardBot();
    expect(bot).toBeInstanceOf(WalletGuardBot);
    expect(bot).toBeInstanceOf(AIBot);
    
    const config = bot.getConfig();
    expect(config.name).toBe('Wallet Guard');
    expect(config.scope).toEqual(['wallet', 'security']);
  });

  it('should initialize Proposal Summarizer bot', () => {
    const bot = new ProposalSummarizerBot();
    expect(bot).toBeInstanceOf(ProposalSummarizerBot);
    expect(bot).toBeInstanceOf(AIBot);
    
    const config = bot.getConfig();
    expect(config.name).toBe('Proposal Summarizer');
    expect(config.scope).toEqual(['governance']);
  });

  it('should initialize Community Moderator bot', () => {
    const bot = new CommunityModeratorBot();
    expect(bot).toBeInstanceOf(CommunityModeratorBot);
    expect(bot).toBeInstanceOf(AIBot);
    
    const config = bot.getConfig();
    expect(config.name).toBe('Community Moderator');
    expect(config.scope).toEqual(['social', 'moderation']);
  });

  it('should initialize Social Copilot bot', () => {
    const bot = new SocialCopilotBot();
    expect(bot).toBeInstanceOf(SocialCopilotBot);
    expect(bot).toBeInstanceOf(AIBot);
    
    const config = bot.getConfig();
    expect(config.name).toBe('Social Copilot');
    expect(config.scope).toEqual(['social', 'content']);
  });
});