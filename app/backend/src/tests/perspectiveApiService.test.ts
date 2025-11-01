import { PerspectiveAPIService } from '../services/vendors/perspectiveApiService';

// Mock fetch globally
global.fetch = jest.fn();

describe('PerspectiveAPIService', () => {
  let service: PerspectiveAPIService;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PERSPECTIVE_API_KEY = 'test-api-key';
    service = new PerspectiveAPIService();
  });

  afterEach(() => {
    delete process.env.PERSPECTIVE_API_KEY;
  });

  describe('scanText', () => {
    it('should successfully scan safe text', async () => {
      const mockResponse = {
        attributeScores: {
          TOXICITY: {
            summaryScore: { value: 0.1, type: 'PROBABILITY' }
          },
          SEVERE_TOXICITY: {
            summaryScore: { value: 0.05, type: 'PROBABILITY' }
          },
          IDENTITY_ATTACK: {
            summaryScore: { value: 0.02, type: 'PROBABILITY' }
          },
          INSULT: {
            summaryScore: { value: 0.08, type: 'PROBABILITY' }
          },
          PROFANITY: {
            summaryScore: { value: 0.03, type: 'PROBABILITY' }
          },
          THREAT: {
            summaryScore: { value: 0.01, type: 'PROBABILITY' }
          },
          HARASSMENT: {
            summaryScore: { value: 0.06, type: 'PROBABILITY' }
          },
          HATE_SPEECH: {
            summaryScore: { value: 0.04, type: 'PROBABILITY' }
          }
        },
        languages: ['en'],
        detectedLanguages: ['en']
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await service.scanText('Hello world');

      expect(result.success).toBe(true);
      expect(result.vendor).toBe('perspective');
      expect(result.confidence).toBe(0.1); // Highest score (TOXICITY)
      expect(result.categories).toHaveLength(0); // No scores above 0.7 threshold
      expect(result.reasoning).toContain('Highest score: 0.10');
    });

    it('should detect toxic content', async () => {
      const mockResponse = {
        attributeScores: {
          TOXICITY: {
            summaryScore: { value: 0.9, type: 'PROBABILITY' }
          },
          SEVERE_TOXICITY: {
            summaryScore: { value: 0.8, type: 'PROBABILITY' }
          },
          IDENTITY_ATTACK: {
            summaryScore: { value: 0.1, type: 'PROBABILITY' }
          },
          INSULT: {
            summaryScore: { value: 0.75, type: 'PROBABILITY' }
          },
          PROFANITY: {
            summaryScore: { value: 0.6, type: 'PROBABILITY' }
          },
          THREAT: {
            summaryScore: { value: 0.2, type: 'PROBABILITY' }
          },
          HARASSMENT: {
            summaryScore: { value: 0.85, type: 'PROBABILITY' }
          },
          HATE_SPEECH: {
            summaryScore: { value: 0.3, type: 'PROBABILITY' }
          }
        },
        languages: ['en'],
        detectedLanguages: ['en']
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await service.scanText('Toxic content');

      expect(result.success).toBe(true);
      expect(result.confidence).toBe(0.9); // Highest score
      expect(result.categories).toContain('harassment'); // TOXICITY, SEVERE_TOXICITY, INSULT, HARASSMENT all map to harassment
      expect(result.reasoning).toContain('High scores for');
      expect(result.reasoning).toContain('TOXICITY(0.90)');
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request'
      } as Response);

      const result = await service.scanText('Test text');

      expect(result.success).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.error).toContain('Perspective API error: 400');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Connection timeout'));

      const result = await service.scanText('Test text');

      expect(result.success).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.error).toBe('Connection timeout');
    });

    it('should handle missing API key', async () => {
      delete process.env.PERSPECTIVE_API_KEY;
      service = new PerspectiveAPIService();

      const result = await service.scanText('Test text');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Perspective API key not configured');
    });

    it('should normalize categories correctly', async () => {
      const mockResponse = {
        attributeScores: {
          TOXICITY: {
            summaryScore: { value: 0.8, type: 'PROBABILITY' }
          },
          IDENTITY_ATTACK: {
            summaryScore: { value: 0.9, type: 'PROBABILITY' }
          },
          THREAT: {
            summaryScore: { value: 0.75, type: 'PROBABILITY' }
          },
          HATE_SPEECH: {
            summaryScore: { value: 0.85, type: 'PROBABILITY' }
          }
        },
        languages: ['en'],
        detectedLanguages: ['en']
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await service.scanText('Mixed harmful content');

      expect(result.categories).toContain('harassment'); // from TOXICITY
      expect(result.categories).toContain('hate'); // from IDENTITY_ATTACK and HATE_SPEECH
      expect(result.categories).toContain('violence'); // from THREAT
      
      // Should not have duplicates
      const uniqueCategories = [...new Set(result.categories)];
      expect(result.categories).toEqual(uniqueCategories);
    });

    it('should include detailed reasoning with scores', async () => {
      const mockResponse = {
        attributeScores: {
          TOXICITY: {
            summaryScore: { value: 0.85, type: 'PROBABILITY' }
          },
          HARASSMENT: {
            summaryScore: { value: 0.75, type: 'PROBABILITY' }
          },
          INSULT: {
            summaryScore: { value: 0.6, type: 'PROBABILITY' }
          }
        },
        languages: ['en'],
        detectedLanguages: ['en']
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await service.scanText('Moderately toxic content');

      expect(result.reasoning).toContain('TOXICITY(0.85)');
      expect(result.reasoning).toContain('HARASSMENT(0.75)');
      expect(result.reasoning).not.toContain('INSULT'); // Below 0.7 threshold
    });
  });

  describe('isHealthy', () => {
    it('should return true when API is working', async () => {
      const mockResponse = {
        attributeScores: {
          TOXICITY: {
            summaryScore: { value: 0.1, type: 'PROBABILITY' }
          }
        },
        languages: ['en'],
        detectedLanguages: ['en']
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const isHealthy = await service.isHealthy();

      expect(isHealthy).toBe(true);
    });

    it('should return false when API key is missing', async () => {
      delete process.env.PERSPECTIVE_API_KEY;
      service = new PerspectiveAPIService();

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
