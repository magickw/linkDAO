import { GoogleVisionService } from '../services/vendors/googleVisionService';

// Mock fetch globally
global.fetch = jest.fn();

describe('GoogleVisionService', () => {
  let service: GoogleVisionService;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_VISION_API_KEY = 'test-api-key';
    service = new GoogleVisionService();
  });

  afterEach(() => {
    delete process.env.GOOGLE_VISION_API_KEY;
  });

  describe('scanText', () => {
    it('should return empty result for text scanning', async () => {
      const result = await service.scanText('Hello world');

      expect(result.success).toBe(true);
      expect(result.vendor).toBe('google-vision');
      expect(result.confidence).toBe(0);
      expect(result.categories).toHaveLength(0);
      expect(result.reasoning).toContain('Google Vision does not process text content');
    });
  });

  describe('scanImage', () => {
    it('should successfully scan safe image', async () => {
      const mockResponse = {
        responses: [{
          safeSearchAnnotation: {
            adult: 'VERY_UNLIKELY',
            spoof: 'UNLIKELY',
            medical: 'VERY_UNLIKELY',
            violence: 'VERY_UNLIKELY',
            racy: 'UNLIKELY'
          }
        }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await service.scanImage('https://example.com/safe-image.jpg');

      expect(result.success).toBe(true);
      expect(result.vendor).toBe('google-vision');
      expect(result.confidence).toBe(0.3); // Highest likelihood (UNLIKELY = 0.3)
      expect(result.categories).toHaveLength(0); // No categories above 0.7 threshold
      expect(result.reasoning).toContain('Image appears safe');
    });

    it('should detect adult content', async () => {
      const mockResponse = {
        responses: [{
          safeSearchAnnotation: {
            adult: 'VERY_LIKELY',
            spoof: 'UNLIKELY',
            medical: 'UNLIKELY',
            violence: 'UNLIKELY',
            racy: 'LIKELY'
          }
        }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await service.scanImage('https://example.com/adult-image.jpg');

      expect(result.success).toBe(true);
      expect(result.confidence).toBe(0.95); // VERY_LIKELY = 0.95
      expect(result.categories).toContain('sexual'); // Both adult and racy map to sexual
      expect(result.reasoning).toContain('Flagged categories: sexual');
    });

    it('should detect violent content', async () => {
      const mockResponse = {
        responses: [{
          safeSearchAnnotation: {
            adult: 'UNLIKELY',
            spoof: 'UNLIKELY',
            medical: 'UNLIKELY',
            violence: 'VERY_LIKELY',
            racy: 'UNLIKELY'
          }
        }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await service.scanImage('https://example.com/violent-image.jpg');

      expect(result.success).toBe(true);
      expect(result.confidence).toBe(0.95);
      expect(result.categories).toContain('violence');
      expect(result.reasoning).toContain('Violence: VERY_LIKELY');
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'Forbidden'
      } as Response);

      const result = await service.scanImage('https://example.com/image.jpg');

      expect(result.success).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.error).toContain('Google Vision API error: 403');
    });

    it('should handle Vision API response errors', async () => {
      const mockResponse = {
        responses: [{
          error: {
            code: 3,
            message: 'Invalid image format',
            status: 'INVALID_ARGUMENT'
          }
        }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await service.scanImage('https://example.com/invalid-image.jpg');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid image format');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'));

      const result = await service.scanImage('https://example.com/image.jpg');

      expect(result.success).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.error).toBe('Network timeout');
    });

    it('should handle missing API key', async () => {
      delete process.env.GOOGLE_VISION_API_KEY;
      service = new GoogleVisionService();

      const result = await service.scanImage('https://example.com/image.jpg');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Google Vision API key not configured');
    });

    it('should handle missing safe search annotation', async () => {
      const mockResponse = {
        responses: [{}] // No safeSearchAnnotation
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await service.scanImage('https://example.com/image.jpg');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No safe search annotation returned');
    });

    it('should convert likelihood values correctly', async () => {
      const mockResponse = {
        responses: [{
          safeSearchAnnotation: {
            adult: 'POSSIBLE',      // 0.5
            spoof: 'LIKELY',        // 0.8
            medical: 'UNKNOWN',     // 0.0
            violence: 'UNLIKELY',   // 0.3
            racy: 'VERY_UNLIKELY'   // 0.1
          }
        }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await service.scanImage('https://example.com/test-image.jpg');

      expect(result.confidence).toBe(0.5); // Highest confidence from 'adult: POSSIBLE'
      expect(result.categories).toHaveLength(0); // No categories above 0.7 threshold
    });

    it('should remove duplicate categories', async () => {
      const mockResponse = {
        responses: [{
          safeSearchAnnotation: {
            adult: 'VERY_LIKELY',   // Maps to 'sexual'
            spoof: 'UNLIKELY',
            medical: 'UNLIKELY',
            violence: 'UNLIKELY',
            racy: 'VERY_LIKELY'     // Also maps to 'sexual'
          }
        }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await service.scanImage('https://example.com/image.jpg');

      expect(result.categories).toEqual(['sexual']); // Should only appear once
      expect(result.categories).toHaveLength(1);
    });
  });

  describe('isHealthy', () => {
    it('should return true when API is working', async () => {
      const mockResponse = {
        responses: [{
          safeSearchAnnotation: {
            adult: 'VERY_UNLIKELY',
            spoof: 'UNLIKELY',
            medical: 'VERY_UNLIKELY',
            violence: 'VERY_UNLIKELY',
            racy: 'UNLIKELY'
          }
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
      delete process.env.GOOGLE_VISION_API_KEY;
      service = new GoogleVisionService();

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
