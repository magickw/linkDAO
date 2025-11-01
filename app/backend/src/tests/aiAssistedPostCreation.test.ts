import { CommunityController } from '../controllers/communityController';
import { openaiService } from '../services/ai/openaiService';

// Mock the OpenAI service
jest.mock('../services/ai/openaiService', () => ({
  openaiService: {
    isAvailable: jest.fn().mockReturnValue(true),
    generateInsight: jest.fn()
  }
}));

// Mock the community service
jest.mock('../services/communityService', () => ({
  communityService: {
    getCommunityDetails: jest.fn().mockResolvedValue({
      id: 'test-community',
      name: 'Test Community',
      description: 'A test community',
      category: 'General'
    }),
    createCommunityPost: jest.fn().mockResolvedValue({
      success: true,
      data: {
        id: 'test-post',
        content: 'Test content'
      }
    })
  }
}));

describe('AI-Assisted Post Creation', () => {
  let communityController: CommunityController;

  beforeEach(() => {
    communityController = new CommunityController();
    jest.clearAllMocks();
  });

  describe('handleAIPostAssistance', () => {
    it('should generate a title when given content', async () => {
      // Mock the AI service response
      (openaiService.generateInsight as jest.Mock).mockResolvedValue('Engaging Title About Blockchain');

      const result = await (communityController as any).handleAIPostAssistance({
        aiAction: 'generate_title',
        content: 'This is a post about blockchain technology and its applications.',
        communityId: 'test-community',
        userAddress: '0x123'
      });

      expect(result.success).toBe(true);
      expect(result.data.action).toBe('generate_title');
      expect(openaiService.generateInsight).toHaveBeenCalledWith({
        type: 'content_trends',
        context: {
          action: 'generate_title',
          content: 'This is a post about blockchain technology and its applications.',
          communityName: 'Test Community',
          communityDescription: 'A test community'
        }
      });
    });

    it('should generate content when given a title', async () => {
      // Mock the AI service response
      (openaiService.generateInsight as jest.Mock).mockResolvedValue('Here is some engaging content about blockchain.');

      const result = await (communityController as any).handleAIPostAssistance({
        aiAction: 'generate_content',
        title: 'Blockchain Applications',
        communityId: 'test-community',
        userAddress: '0x123'
      });

      expect(result.success).toBe(true);
      expect(result.data.action).toBe('generate_content');
      expect(openaiService.generateInsight).toHaveBeenCalledWith({
        type: 'content_trends',
        context: {
          action: 'generate_content',
          title: 'Blockchain Applications',
          communityName: 'Test Community',
          communityDescription: 'A test community'
        }
      });
    });

    it('should generate tags when given content', async () => {
      // Mock the AI service response
      (openaiService.generateInsight as jest.Mock).mockResolvedValue('blockchain,web3,technology');

      const result = await (communityController as any).handleAIPostAssistance({
        aiAction: 'generate_tags',
        content: 'This is a post about blockchain technology.',
        communityId: 'test-community',
        userAddress: '0x123'
      });

      expect(result.success).toBe(true);
      expect(result.data.action).toBe('generate_tags');
      expect(openaiService.generateInsight).toHaveBeenCalledWith({
        type: 'content_trends',
        context: {
          action: 'generate_tags',
          content: 'This is a post about blockchain technology.',
          communityName: 'Test Community',
          communityDescription: 'A test community'
        }
      });
    });

    it('should improve content when given content', async () => {
      // Mock the AI service response
      (openaiService.generateInsight as jest.Mock).mockResolvedValue('Enhanced content with better structure.');

      const result = await (communityController as any).handleAIPostAssistance({
        aiAction: 'improve_content',
        content: 'This is basic content.',
        communityId: 'test-community',
        userAddress: '0x123'
      });

      expect(result.success).toBe(true);
      expect(result.data.action).toBe('improve_content');
      expect(openaiService.generateInsight).toHaveBeenCalledWith({
        type: 'content_trends',
        context: {
          action: 'improve_content',
          content: 'This is basic content.',
          communityName: 'Test Community',
          communityDescription: 'A test community'
        }
      });
    });

    it('should return error for invalid AI action', async () => {
      const result = await (communityController as any).handleAIPostAssistance({
        aiAction: 'invalid_action',
        content: 'Test content',
        communityId: 'test-community',
        userAddress: '0x123'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid AI action');
    });

    it('should return error when content is missing for title generation', async () => {
      const result = await (communityController as any).handleAIPostAssistance({
        aiAction: 'generate_title',
        communityId: 'test-community',
        userAddress: '0x123'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Content is required to generate title');
    });

    it('should return error when title is missing for content generation', async () => {
      const result = await (communityController as any).handleAIPostAssistance({
        aiAction: 'generate_content',
        communityId: 'test-community',
        userAddress: '0x123'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Title is required to generate content');
    });
  });

  describe('callAIInsightsService', () => {
    it('should call the AI insights service with correct parameters', async () => {
      // Mock the AI service response
      (openaiService.generateInsight as jest.Mock).mockResolvedValue('AI-generated insight');

      const result = await (communityController as any).callAIInsightsService('content_trends', {
        action: 'test',
        content: 'Test content'
      });

      expect(result).toBe('AI-generated insight');
      expect(openaiService.generateInsight).toHaveBeenCalledWith({
        type: 'content_trends',
        context: {
          action: 'test',
          content: 'Test content'
        }
      });
    });

    it('should handle errors from the AI service', async () => {
      // Mock the AI service to throw an error
      (openaiService.generateInsight as jest.Mock).mockRejectedValue(new Error('AI service error'));

      await expect((communityController as any).callAIInsightsService('content_trends', {
        action: 'test',
        content: 'Test content'
      })).rejects.toThrow('AI service error');
    });
  });
});