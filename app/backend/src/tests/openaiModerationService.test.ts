import { OpenAIModerationService } from '../services/vendors/openaiModerationService';

// Mock fetch globally
global.fetch = jest.fn();

describe('OpenAIModerationService', () => {
  let service: OpenAIModerationService;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-api-key';
    service = new OpenAIModerationService();
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  describe('scanText', () => {
    it('should successfully scan safe text', async () => {
      const mockResponse = {
        id: 'modr-123',
        model: 'text-moderation-latest',
        results: [{
          flagged: false,
          categories: {
            sexual: false,
            hate: false,
            harassment: false,
            'self-harm': false,
            'sexual/minors': false,
            'hate/threatening': false,
            'violence/graphic': false,
            'self-harm/intent': false,
            'self-harm/instructions': false,
            'harassment/threatening': false
          },
          category_scores: {
            sexual: 0.01,
            hate: 0.02,
            harassment: 0.03,
            'self-harm': 0.01,
            'sexual/minors': 0.001,
            'hate/threatening': 0.001,
            'violence/graphic': 0.002,
            'self-harm/intent': 0.001,
            'self-harm/instructions': 0.001,
            'harassment/threatening': 0.002
          }
        }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await service.scanText('Hello world');

      expect(result.success).toBe(true);
      expect(result.vendor).toBe('openai');
      expect(result.confidence).toBe(0.03); // Highest score
      expect(result.categories).toHaveLength(0); // Nothing flagged
      expect(result.reasoning).toContain('Content appears safe');
    });

    it('should detect flagged content', async () => {
      const mockResponse = {
        id: 'modr-456',
        model: 'text-moderation-latest',
        results: [{
          flagged: true,
          categories: {
            sexual: false,
            hate: true,
            harassment: true,
            'self-harm': false,
            'sexual/minors': false,
            'hate/threatening': false,
            'violence/graphic': false,
            'self-harm/intent': false,
            'self-harm/instructions': false,
            'harassment/threatening': false
          },
          category_scores: {
            sexual: 0.1,
            hate: 0.9,
            harassment: 0.8,
            'self-harm': 0.1,
            'sexual/minors': 0.05,
            'hate/threatening': 0.2,
            'violence/graphic': 0.1,
            'self-harm/intent': 0.05,
            'self-harm/instructions': 0.05,
            'harassment/threatening': 0.3
          }
        }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await service.scanText('Harmful content');

      expect(result.success).toBe(true);
      expect(result.confidence).toBe(0.9); // Highest flagged score
      expect(result.categories).toContain('hate');
      expect(result.categories).toContain('harassment');
      expect(result.reasoning).toContain('Flagged for');
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      } as Response);

      const result = await service.scanText('Test text');

      expect(result.success).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.error).toContain('OpenAI API error: 401');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.scanText('Test text');

      expect(result.success).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.error).toBe('Network error');
    });

    it('should handle missing API key', async () => {
      delete process.env.OPENAI_API_KEY;
      service = new OpenAIModerationService();

      const result = await service.scanText('Test text');

      expect(result.success).toBe(false);
      expect(result.error).toContain('OpenAI API key not configured');
    });

    it('should normalize categories correctly', async () => {
      const mockResponse = {
        id: 'modr-789',
        model: 'text-moderation-latest',
        results: [{
          flagged: true,
          categories: {
            sexual: false,
            hate: false,
            harassment: false,
            'self-harm': false,
            'sexual/minors': true,
            'hate/threatening': true,
            'violence/graphic': true,
            'self-harm/intent': true,
            'self-harm/instructions': false,
            'harassment/threatening': true
          },
          category_scores: {
            sexual: 0.1,
            hate: 0.1,
            harassment: 0.1,
            'self-harm': 0.1,
            'sexual/minors': 0.9,
            'hate/threatening': 0.8,
            'violence/graphic': 0.7,
            'self-harm/intent': 0.6,
            'self-harm/instructions': 0.1,
            'harassment/threatening': 0.5
          }
        }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await service.scanText('Complex harmful content');

      expect(result.categories).toContain('sexual'); // from sexual/minors
      expect(result.categories).toContain('hate'); // from hate/threatening
      expect(result.categories).toContain('violence'); // from violence/graphic
      expect(result.categories).toContain('self-harm'); // from self-harm/intent
      expect(result.categories).toContain('harassment'); // from harassment/threatening
    });
  });

  describe('isHealthy', () => {
    it('should return true when API is working', async () => {
      const mockResponse = {
        id: 'modr-health',
        model: 'text-moderation-latest',
        results: [{
          flagged: false,
          categories: {},
          category_scores: {}
        }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const isHealthy = await service.isHealthy();

      expect(isHealthy).toBe(true);
    });

    it('should return false when API key is missing', async () => {
      delete process.env.OPENAI_API_KEY;
      service = new OpenAIModerationService();

      const isHealthy = await service.isHealthy();

      expect(isHealthy).toBe(false);
    });

    it('should return false when API is down', async () => {
      mockFetch.mockRejectedValue(new Error('Service unavailable'));

      const isHealthy = await service.isHealthy();

      expect(isHealthy).toBe(false);
    });
  });
});
