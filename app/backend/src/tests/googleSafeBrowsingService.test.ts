import axios from 'axios';
import { GoogleSafeBrowsingService } from '../services/vendors/googleSafeBrowsingService.js';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GoogleSafeBrowsingService', () => {
  let service: GoogleSafeBrowsingService;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.GOOGLE_SAFE_BROWSING_API_KEY = 'test-api-key';
    service = new GoogleSafeBrowsingService();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('checkUrl', () => {
    it('should return safe status for clean URL', async () => {
      const mockResponse = {
        data: {}, // Empty response means no threats
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await service.checkUrl('https://example.com');

      expect(result.status).toBe('safe');
      expect(result.threatTypes).toEqual([]);
      expect(result.confidence).toBe(95);
      expect(result.analysisTimeMs).toBeGreaterThan(0);
    });

    it('should return malicious status for threatening URL', async () => {
      const mockResponse = {
        data: {
          matches: [
            {
              threatType: 'MALWARE',
              platformType: 'ANY_PLATFORM',
              threatEntryType: 'URL',
              threat: {
                url: 'https://malicious-site.com',
              },
              cacheDuration: '300s',
            },
          ],
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await service.checkUrl('https://malicious-site.com');

      expect(result.status).toBe('malicious');
      expect(result.threatTypes).toContain('MALWARE');
      expect(result.confidence).toBe(95);
    });

    it('should return suspicious status for unwanted software', async () => {
      const mockResponse = {
        data: {
          matches: [
            {
              threatType: 'UNWANTED_SOFTWARE',
              platformType: 'ANY_PLATFORM',
              threatEntryType: 'URL',
              threat: {
                url: 'https://suspicious-site.com',
              },
              cacheDuration: '300s',
            },
          ],
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await service.checkUrl('https://suspicious-site.com');

      expect(result.status).toBe('suspicious');
      expect(result.threatTypes).toContain('UNWANTED_SOFTWARE');
      expect(result.confidence).toBe(85);
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const result = await service.checkUrl('https://example.com');

      expect(result.status).toBe('error');
      expect(result.threatTypes).toEqual([]);
      expect(result.confidence).toBe(0);
      expect(result.rawResponse.error).toBe('Network error');
    });

    it('should return error when API key is not configured', async () => {
      process.env.GOOGLE_SAFE_BROWSING_API_KEY = '';
      const serviceWithoutKey = new GoogleSafeBrowsingService();

      const result = await serviceWithoutKey.checkUrl('https://example.com');

      expect(result.status).toBe('error');
      expect(result.rawResponse.error).toBe('API key not configured');
    });
  });

  describe('checkUrls', () => {
    it('should handle batch URL checking', async () => {
      const urls = [
        'https://example1.com',
        'https://example2.com',
        'https://malicious-site.com',
      ];

      const mockResponse = {
        data: {
          matches: [
            {
              threatType: 'MALWARE',
              platformType: 'ANY_PLATFORM',
              threatEntryType: 'URL',
              threat: {
                url: 'https://malicious-site.com',
              },
              cacheDuration: '300s',
            },
          ],
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const results = await service.checkUrls(urls);

      expect(results).toHaveLength(3);
      expect(results[0].status).toBe('safe'); // example1.com
      expect(results[1].status).toBe('safe'); // example2.com
      expect(results[2].status).toBe('malicious'); // malicious-site.com
      expect(results[2].threatTypes).toContain('MALWARE');
    });

    it('should return empty array for empty input', async () => {
      const results = await service.checkUrls([]);
      expect(results).toEqual([]);
    });

    it('should handle large batches by splitting them', async () => {
      const urls = Array.from({ length: 1000 }, (_, i) => `https://example${i}.com`);

      mockedAxios.post.mockResolvedValue({ data: {} });

      const results = await service.checkUrls(urls);

      expect(results).toHaveLength(1000);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2); // 500 + 500
    });
  });

  describe('evaluateThreatLevel', () => {
    it('should correctly categorize high severity threats', async () => {
      const mockResponse = {
        data: {
          matches: [
            {
              threatType: 'SOCIAL_ENGINEERING',
              platformType: 'ANY_PLATFORM',
              threatEntryType: 'URL',
              threat: {
                url: 'https://phishing-site.com',
              },
              cacheDuration: '300s',
            },
          ],
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await service.checkUrl('https://phishing-site.com');

      expect(result.status).toBe('malicious');
      expect(result.confidence).toBe(95);
    });

    it('should correctly categorize medium severity threats', async () => {
      const mockResponse = {
        data: {
          matches: [
            {
              threatType: 'POTENTIALLY_HARMFUL_APPLICATION',
              platformType: 'ANY_PLATFORM',
              threatEntryType: 'URL',
              threat: {
                url: 'https://suspicious-app.com',
              },
              cacheDuration: '300s',
            },
          ],
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await service.checkUrl('https://suspicious-app.com');

      expect(result.status).toBe('suspicious');
      expect(result.confidence).toBe(85);
    });
  });

  describe('getThreatTypeDescription', () => {
    it('should return correct descriptions for known threat types', () => {
      expect(service.getThreatTypeDescription('MALWARE')).toBe('Malware or virus detected');
      expect(service.getThreatTypeDescription('SOCIAL_ENGINEERING')).toBe('Phishing or social engineering attempt');
      expect(service.getThreatTypeDescription('UNWANTED_SOFTWARE')).toBe('Potentially unwanted software');
      expect(service.getThreatTypeDescription('POTENTIALLY_HARMFUL_APPLICATION')).toBe('Potentially harmful application');
      expect(service.getThreatTypeDescription('THREAT_TYPE_UNSPECIFIED')).toBe('Unspecified security threat');
    });

    it('should return generic description for unknown threat types', () => {
      expect(service.getThreatTypeDescription('UNKNOWN_THREAT')).toBe('Unknown threat type: UNKNOWN_THREAT');
    });
  });

  describe('isConfigured', () => {
    it('should return true when API key is configured', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when API key is not configured', () => {
      process.env.GOOGLE_SAFE_BROWSING_API_KEY = '';
      const serviceWithoutKey = new GoogleSafeBrowsingService();
      expect(serviceWithoutKey.isConfigured()).toBe(false);
    });
  });

  describe('testConnection', () => {
    it('should return success for working connection', async () => {
      mockedAxios.post.mockResolvedValue({ data: {} });

      const result = await service.testConnection();

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return failure for connection error', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Connection failed'));

      const result = await service.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection failed');
    });

    it('should return failure when not configured', async () => {
      process.env.GOOGLE_SAFE_BROWSING_API_KEY = '';
      const serviceWithoutKey = new GoogleSafeBrowsingService();

      const result = await serviceWithoutKey.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('API key not configured');
    });
  });

  describe('API request structure', () => {
    it('should send correct request structure', async () => {
      mockedAxios.post.mockResolvedValue({ data: {} });

      await service.checkUrl('https://example.com');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('threatMatches:find'),
        expect.objectContaining({
          client: {
            clientId: 'linkdao-moderation',
            clientVersion: '1.0.0',
          },
          threatInfo: {
            threatTypes: [
              'MALWARE',
              'SOCIAL_ENGINEERING',
              'UNWANTED_SOFTWARE',
              'POTENTIALLY_HARMFUL_APPLICATION',
              'THREAT_TYPE_UNSPECIFIED',
            ],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: [{ url: 'https://example.com' }],
          },
        }),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        })
      );
    });
  });
});
