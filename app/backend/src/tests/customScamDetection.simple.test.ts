import { CustomScamDetectionService, ContentInput } from '../services/customScamDetectionService';

describe('CustomScamDetectionService - Simple Tests', () => {
  let service: CustomScamDetectionService;

  beforeEach(() => {
    service = new CustomScamDetectionService();
  });

  describe('Basic Functionality', () => {
    it('should initialize without errors', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(CustomScamDetectionService);
    });

    it('should analyze clean content correctly', async () => {
      const content: ContentInput = {
        text: 'Hello world, this is a normal message about crypto',
        metadata: { contentId: 'clean-test' }
      };

      const result = await service.analyzeContent(content);

      expect(result).toBeDefined();
      expect(result.isScam).toBe(false);
      expect(result.category).toBe('clean');
      expect(result.confidence).toBe(0);
      expect(result.patterns).toHaveLength(0);
    });

    it('should detect obvious scam content', async () => {
      const content: ContentInput = {
        text: 'Send 1 BTC to get 10 BTC back! Elon Musk giveaway!',
        metadata: { contentId: 'scam-test' }
      };

      const result = await service.analyzeContent(content);

      expect(result).toBeDefined();
      expect(result.isScam).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.patterns.length).toBeGreaterThan(0);
    });

    it('should handle empty content', async () => {
      const content: ContentInput = {
        text: '',
        metadata: { contentId: 'empty-test' }
      };

      const result = await service.analyzeContent(content);

      expect(result).toBeDefined();
      expect(result.isScam).toBe(false);
      expect(result.category).toBe('clean');
    });
  });

  describe('Seed Phrase Detection', () => {
    it('should detect seed phrase patterns', async () => {
      const content: ContentInput = {
        text: 'My seed phrase is: abandon ability able about above absent absorb abstract absurd abuse access accident',
        metadata: { contentId: 'seed-test' }
      };

      const result = await service.analyzeContent(content);

      expect(result.isScam).toBe(true);
      expect(result.category).toBe('seed_phrase_exposure');
      expect(result.patterns).toContain('seed_phrase');
    });
  });

  describe('Crypto Scam Detection', () => {
    it('should detect giveaway scams', async () => {
      const content: ContentInput = {
        text: 'Free Bitcoin giveaway! Send 0.1 BTC to receive 1 BTC!',
        metadata: { contentId: 'giveaway-test' }
      };

      const result = await service.analyzeContent(content);

      expect(result.isScam).toBe(true);
      expect(result.category).toBe('crypto_scam');
      expect(result.patterns).toContain('giveaway');
    });
  });

  describe('Error Handling', () => {
    it('should handle null text gracefully', async () => {
      const content: ContentInput = {
        text: null as any,
        metadata: { contentId: 'null-test' }
      };

      const result = await service.analyzeContent(content);

      expect(result).toBeDefined();
      expect(result.category).toBe('clean');
    });

    it('should handle missing metadata', async () => {
      const content: ContentInput = {
        text: 'Test message'
      };

      const result = await service.analyzeContent(content);

      expect(result).toBeDefined();
      expect(typeof result.isScam).toBe('boolean');
    });
  });
});