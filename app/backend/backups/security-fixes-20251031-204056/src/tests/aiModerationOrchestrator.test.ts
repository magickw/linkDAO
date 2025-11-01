import { AIModerationOrchestrator, ContentInput, ModerationResult } from '../services/aiModerationOrchestrator';
import { OpenAIModerationService } from '../services/vendors/openaiModerationService';
import { PerspectiveAPIService } from '../services/vendors/perspectiveApiService';
import { GoogleVisionService } from '../services/vendors/googleVisionService';

// Mock the vendor services
jest.mock('../services/vendors/openaiModerationService');
jest.mock('../services/vendors/perspectiveApiService');
jest.mock('../services/vendors/googleVisionService');

describe('AIModerationOrchestrator', () => {
  let orchestrator: AIModerationOrchestrator;
  let mockOpenAI: jest.Mocked<OpenAIModerationService>;
  let mockPerspective: jest.Mocked<PerspectiveAPIService>;
  let mockGoogleVision: jest.Mocked<GoogleVisionService>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock instances with proper names
    mockOpenAI = {
      name: 'openai',
      scanText: jest.fn(),
      scanImage: jest.fn(),
      isHealthy: jest.fn()
    } as unknown as jest.Mocked<OpenAIModerationService>;
    
    mockPerspective = {
      name: 'perspective',
      scanText: jest.fn(),
      scanImage: jest.fn(),
      isHealthy: jest.fn()
    } as unknown as jest.Mocked<PerspectiveAPIService>;
    
    mockGoogleVision = {
      name: 'google-vision',
      scanText: jest.fn(),
      scanImage: jest.fn(),
      isHealthy: jest.fn()
    } as unknown as jest.Mocked<GoogleVisionService>;
    
    // Mock the constructors to return our mocks
    (OpenAIModerationService as jest.Mock).mockImplementation(() => mockOpenAI);
    (PerspectiveAPIService as jest.Mock).mockImplementation(() => mockPerspective);
    (GoogleVisionService as jest.Mock).mockImplementation(() => mockGoogleVision);
    
    orchestrator = new AIModerationOrchestrator();
  });

  describe('scanContent', () => {
    const mockContent: ContentInput = {
      id: 'test-content-1',
      type: 'post',
      text: 'This is a test post',
      userId: 'user-123',
      userReputation: 75,
      walletAddress: '0x123...',
      metadata: {}
    };

    it('should scan text content with multiple vendors', async () => {
      // Mock vendor responses
      const openaiResult: ModerationResult = {
        vendor: 'openai',
        confidence: 0.2,
        categories: [],
        reasoning: 'Content appears safe',
        cost: 0.0002,
        latency: 150,
        success: true
      };

      const perspectiveResult: ModerationResult = {
        vendor: 'perspective',
        confidence: 0.1,
        categories: [],
        reasoning: 'Highest score: 0.10',
        cost: 0.001,
        latency: 200,
        success: true
      };

      mockOpenAI.scanText.mockResolvedValue(openaiResult);
      mockPerspective.scanText.mockResolvedValue(perspectiveResult);

      const result = await orchestrator.scanContent(mockContent);

      expect(mockOpenAI.scanText).toHaveBeenCalledWith('This is a test post');
      expect(mockPerspective.scanText).toHaveBeenCalledWith('This is a test post');
      expect(result.action).toBe('allow');
      expect(result.overallConfidence).toBeLessThan(0.3);
      expect(result.vendorResults).toHaveLength(2);
    });

    it('should handle high-confidence harmful content', async () => {
      const harmfulContent: ContentInput = {
        ...mockContent,
        text: 'This is harmful content'
      };

      const openaiResult: ModerationResult = {
        vendor: 'openai',
        confidence: 0.95,
        categories: ['harassment'],
        reasoning: 'Flagged for: harassment',
        cost: 0.0002,
        latency: 150,
        success: true
      };

      const perspectiveResult: ModerationResult = {
        vendor: 'perspective',
        confidence: 0.9,
        categories: ['harassment'],
        reasoning: 'High scores for: HARASSMENT(0.90)',
        cost: 0.001,
        latency: 200,
        success: true
      };

      mockOpenAI.scanText.mockResolvedValue(openaiResult);
      mockPerspective.scanText.mockResolvedValue(perspectiveResult);

      const result = await orchestrator.scanContent(harmfulContent);

      expect(result.action).toBe('block');
      expect(result.primaryCategory).toBe('harassment');
      expect(result.overallConfidence).toBeGreaterThan(0.9);
    });

    it('should scan image content', async () => {
      const contentWithImage: ContentInput = {
        ...mockContent,
        text: undefined, // No text content
        media: [{
          url: 'https://example.com/image.jpg',
          type: 'image',
          mimeType: 'image/jpeg',
          size: 1024000
        }]
      };

      const visionResult: ModerationResult = {
        vendor: 'google-vision',
        confidence: 0.3,
        categories: [],
        reasoning: 'Image appears safe',
        cost: 0.0015,
        latency: 500,
        success: true
      };

      mockGoogleVision.scanImage.mockResolvedValue(visionResult);

      const result = await orchestrator.scanContent(contentWithImage);

      expect(mockGoogleVision.scanImage).toHaveBeenCalledWith('https://example.com/image.jpg');
      expect(result.vendorResults).toHaveLength(1);
      expect(result.vendorResults[0]).toEqual(expect.objectContaining({
        vendor: 'google-vision',
        confidence: 0.3,
        success: true
      }));
    });

    it('should handle vendor failures gracefully', async () => {
      const failedResult: ModerationResult = {
        vendor: 'openai',
        confidence: 0,
        categories: [],
        reasoning: 'OpenAI error: API timeout',
        cost: 0,
        latency: 5000,
        success: false,
        error: 'API timeout'
      };

      mockOpenAI.scanText.mockResolvedValue(failedResult);
      mockPerspective.scanText.mockRejectedValue(new Error('Network error'));

      const result = await orchestrator.scanContent(mockContent);

      expect(result.action).toBe('allow'); // When all vendors fail with 0 confidence, should allow
      expect(result.vendorResults.some(r => !r.success)).toBe(true);
    });

    it('should apply reputation-based threshold adjustment', async () => {
      const lowReputationContent: ContentInput = {
        ...mockContent,
        userReputation: 10 // Low reputation user
      };

      const borderlineResult: ModerationResult = {
        vendor: 'openai',
        confidence: 0.85, // Higher confidence to trigger review with low reputation
        categories: ['harassment'],
        reasoning: 'Borderline content',
        cost: 0.0002,
        latency: 150,
        success: true
      };

      mockOpenAI.scanText.mockResolvedValue(borderlineResult);
      mockPerspective.scanText.mockResolvedValue({
        vendor: 'perspective',
        confidence: 0.1,
        categories: [],
        reasoning: 'Low confidence',
        cost: 0.001,
        latency: 200,
        success: true
      });

      const result = await orchestrator.scanContent(lowReputationContent);

      // Low reputation should trigger stricter thresholds
      expect(result.action).toBe('review');
      expect(result.riskScore).toBeGreaterThan(0.5);
    });

    it('should generate evidence hash', async () => {
      mockOpenAI.scanText.mockResolvedValue({
        vendor: 'openai',
        confidence: 0.1,
        categories: [],
        reasoning: 'Safe',
        cost: 0.0002,
        latency: 150,
        success: true
      });

      const result = await orchestrator.scanContent(mockContent);

      expect(result.evidenceHash).toBeDefined();
      expect(typeof result.evidenceHash).toBe('string');
      expect(result.evidenceHash.length).toBeGreaterThan(0);
    });
  });

  describe('healthCheck', () => {
    it('should check health of all vendors', async () => {
      mockOpenAI.isHealthy.mockResolvedValue(true);
      mockPerspective.isHealthy.mockResolvedValue(true);
      mockGoogleVision.isHealthy.mockResolvedValue(false);

      const health = await orchestrator.healthCheck();

      expect(health).toEqual({
        'openai': true,
        'perspective': true,
        'google-vision': false
      });
    });

    it('should handle health check failures', async () => {
      mockOpenAI.isHealthy.mockRejectedValue(new Error('Connection failed'));
      mockPerspective.isHealthy.mockResolvedValue(true);
      mockGoogleVision.isHealthy.mockResolvedValue(true);

      const health = await orchestrator.healthCheck();

      expect(health['openai']).toBe(false);
      expect(health['perspective']).toBe(true);
      expect(health['google-vision']).toBe(true);
    });
  });

  describe('ensemble aggregation logic', () => {
    const mockContent: ContentInput = {
      id: 'test-content-1',
      type: 'post',
      text: 'This is a test post',
      userId: 'user-123',
      userReputation: 75,
      walletAddress: '0x123...',
      metadata: {}
    };

    it('should weight vendor results correctly', async () => {
      const highConfidenceOpenAI: ModerationResult = {
        vendor: 'openai',
        confidence: 0.9,
        categories: ['harassment'],
        reasoning: 'High confidence harassment',
        cost: 0.0002,
        latency: 150,
        success: true
      };

      const lowConfidencePerspective: ModerationResult = {
        vendor: 'perspective',
        confidence: 0.3,
        categories: ['harassment'],
        reasoning: 'Low confidence harassment',
        cost: 0.001,
        latency: 200,
        success: true
      };

      mockOpenAI.scanText.mockResolvedValue(highConfidenceOpenAI);
      mockPerspective.scanText.mockResolvedValue(lowConfidencePerspective);

      const result = await orchestrator.scanContent(mockContent);

      // OpenAI has higher weight (0.4) vs Perspective (0.3)
      // So overall confidence should be closer to OpenAI's score
      expect(result.overallConfidence).toBeGreaterThan(0.6);
      expect(result.primaryCategory).toBe('harassment');
    });

    it('should handle mixed category results', async () => {
      const harassmentResult: ModerationResult = {
        vendor: 'openai',
        confidence: 0.8,
        categories: ['harassment'],
        reasoning: 'Harassment detected',
        cost: 0.0002,
        latency: 150,
        success: true
      };

      const hateResult: ModerationResult = {
        vendor: 'perspective',
        confidence: 0.7,
        categories: ['hate'],
        reasoning: 'Hate speech detected',
        cost: 0.001,
        latency: 200,
        success: true
      };

      mockOpenAI.scanText.mockResolvedValue(harassmentResult);
      mockPerspective.scanText.mockResolvedValue(hateResult);

      const result = await orchestrator.scanContent(mockContent);

      // Should pick the category with highest weighted confidence
      expect(['harassment', 'hate']).toContain(result.primaryCategory);
      expect(result.overallConfidence).toBeGreaterThan(0.7);
    });
  });
});