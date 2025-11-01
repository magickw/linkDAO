import { CustomScamDetectionService, ContentInput, ScamDetectionResult } from '../services/customScamDetectionService';

describe('CustomScamDetectionService', () => {
  let service: CustomScamDetectionService;

  beforeEach(() => {
    service = new CustomScamDetectionService();
  });

  describe('Seed Phrase Detection', () => {
    it('should detect BIP39 seed phrases', async () => {
      const content: ContentInput = {
        text: 'abandon ability able about above absent absorb abstract absurd abuse access accident',
        metadata: { contentId: 'test-1' }
      };

      const result = await service.analyzeContent(content);

      expect(result.isScam).toBe(true);
      expect(result.category).toBe('seed_phrase_exposure');
      expect(result.patterns).toContain('seed_phrase');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect private key patterns', async () => {
      const content: ContentInput = {
        text: 'My private key is 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        metadata: { contentId: 'test-2' }
      };

      const result = await service.analyzeContent(content);

      expect(result.isScam).toBe(true);
      expect(result.category).toBe('seed_phrase_exposure');
      expect(result.patterns).toContain('private_key');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should detect recovery phrase indicators', async () => {
      const content: ContentInput = {
        text: 'Please help me recover my wallet using this recovery phrase: abandon ability able about',
        metadata: { contentId: 'test-3' }
      };

      const result = await service.analyzeContent(content);

      expect(result.isScam).toBe(true);
      expect(result.category).toBe('seed_phrase_exposure');
      expect(result.patterns).toContain('recovery_phrase');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should not flag normal text as seed phrase', async () => {
      const content: ContentInput = {
        text: 'I love crypto and blockchain technology. Bitcoin is amazing!',
        metadata: { contentId: 'test-4' }
      };

      const result = await service.analyzeContent(content);

      expect(result.isScam).toBe(false);
      expect(result.category).toBe('clean');
      expect(result.patterns).not.toContain('seed_phrase');
    });
  });

  describe('Crypto Scam Detection', () => {
    it('should detect fake giveaways', async () => {
      const content: ContentInput = {
        text: 'Elon Musk is giving away 1000 BTC! Send 1 BTC to get 10 BTC back!',
        metadata: { contentId: 'test-5' }
      };

      const result = await service.analyzeContent(content);

      expect(result.isScam).toBe(true);
      expect(result.category).toBe('crypto_scam');
      expect(result.patterns).toContain('giveaway');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect crypto doubling scams', async () => {
      const content: ContentInput = {
        text: 'Double your Bitcoin instantly! 100% guaranteed returns!',
        metadata: { contentId: 'test-6' }
      };

      const result = await service.analyzeContent(content);

      expect(result.isScam).toBe(true);
      expect(result.category).toBe('crypto_scam');
      expect(result.patterns).toContain('giveaway');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should detect fake airdrops', async () => {
      const content: ContentInput = {
        text: 'Free airdrop! Claim your tokens now before it expires!',
        metadata: { contentId: 'test-7' }
      };

      const result = await service.analyzeContent(content);

      expect(result.isScam).toBe(true);
      expect(result.category).toBe('crypto_scam');
      expect(result.patterns).toContain('airdrop');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect investment scams', async () => {
      const content: ContentInput = {
        text: 'Guaranteed profit! Make $1000 daily with no risk! 100% safe investment!',
        metadata: { contentId: 'test-8' }
      };

      const result = await service.analyzeContent(content);

      expect(result.isScam).toBe(true);
      expect(result.category).toBe('crypto_scam');
      expect(result.patterns).toContain('investment');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should detect urgency tactics', async () => {
      const content: ContentInput = {
        text: 'Act now! Limited time offer expires today! Only 5 spots left!',
        metadata: { contentId: 'test-9' }
      };

      const result = await service.analyzeContent(content);

      expect(result.isScam).toBe(true);
      expect(result.category).toBe('crypto_scam');
      expect(result.patterns).toContain('urgency');
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Impersonation Detection', () => {
    it('should detect profile impersonation', async () => {
      const content: ContentInput = {
        text: 'Hello everyone, this is my official account',
        userProfile: {
          handle: 'elonmusk_official',
          bio: 'CEO of Tesla and SpaceX',
          reputation: 0,
          accountAge: 1
        },
        metadata: { contentId: 'test-10' }
      };

      const result = await service.analyzeContent(content);

      expect(result.isScam).toBe(true);
      expect(result.category).toBe('impersonation');
      expect(result.patterns).toContain('profile_impersonation');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect verification claims', async () => {
      const content: ContentInput = {
        text: 'I am the verified account of Vitalik Buterin, founder of Ethereum',
        metadata: { contentId: 'test-11' }
      };

      const result = await service.analyzeContent(content);

      expect(result.isScam).toBe(true);
      expect(result.category).toBe('impersonation');
      expect(result.patterns).toContain('content_impersonation');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect brand impersonation', async () => {
      const content: ContentInput = {
        text: 'Official Coinbase announcement: new airdrop available',
        userProfile: {
          handle: 'coinbase_official',
          reputation: 0,
          accountAge: 2
        },
        metadata: { contentId: 'test-12' }
      };

      const result = await service.analyzeContent(content);

      expect(result.isScam).toBe(true);
      expect(result.category).toBe('impersonation');
      expect(result.patterns).toContain('brand_impersonation');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should not flag legitimate accounts', async () => {
      const content: ContentInput = {
        text: 'Just sharing my thoughts on crypto markets',
        userProfile: {
          handle: 'crypto_enthusiast',
          bio: 'Love blockchain technology',
          reputation: 85,
          accountAge: 365
        },
        metadata: { contentId: 'test-13' }
      };

      const result = await service.analyzeContent(content);

      expect(result.isScam).toBe(false);
      expect(result.category).toBe('clean');
    });
  });

  describe('Market Manipulation Detection', () => {
    it('should detect pump and dump schemes', async () => {
      const content: ContentInput = {
        text: 'Pump and dump this coin to the moon! Everyone buy now!',
        metadata: { contentId: 'test-14' }
      };

      const result = await service.analyzeContent(content);

      expect(result.isScam).toBe(true);
      expect(result.category).toBe('market_manipulation');
      expect(result.patterns).toContain('pump_dump');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should detect coordinated trading', async () => {
      const content: ContentInput = {
        text: 'Everyone buy at the same time! Coordinated effort to pump the price!',
        metadata: { contentId: 'test-15' }
      };

      const result = await service.analyzeContent(content);

      expect(result.isScam).toBe(true);
      expect(result.category).toBe('market_manipulation');
      expect(result.patterns).toContain('coordination');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect fake trading signals', async () => {
      const content: ContentInput = {
        text: 'Guaranteed trading signal! 100% win rate! Insider information available!',
        metadata: { contentId: 'test-16' }
      };

      const result = await service.analyzeContent(content);

      expect(result.isScam).toBe(true);
      expect(result.category).toBe('market_manipulation');
      expect(result.patterns).toContain('manipulation');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should not flag legitimate trading discussion', async () => {
      const content: ContentInput = {
        text: 'I think Bitcoin might go up based on technical analysis. Not financial advice.',
        metadata: { contentId: 'test-17' }
      };

      const result = await service.analyzeContent(content);

      expect(result.isScam).toBe(false);
      expect(result.category).toBe('clean');
    });
  });

  describe('Phishing Detection', () => {
    it('should detect wallet verification phishing', async () => {
      const content: ContentInput = {
        text: 'Verify your wallet immediately! Click here to validate your account before it gets suspended!',
        metadata: { contentId: 'test-18' }
      };

      const result = await service.analyzeContent(content);

      expect(result.isScam).toBe(true);
      expect(result.category).toBe('phishing');
      expect(result.patterns).toContain('phishing');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect urgency-based phishing', async () => {
      const content: ContentInput = {
        text: 'Immediate action required! Your account will be suspended within 24 hours!',
        metadata: { contentId: 'test-19' }
      };

      const result = await service.analyzeContent(content);

      expect(result.isScam).toBe(true);
      expect(result.category).toBe('phishing');
      expect(result.patterns).toContain('urgency');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should detect fake security alerts', async () => {
      const content: ContentInput = {
        text: 'Security breach detected on your wallet! Unauthorized access attempt blocked!',
        metadata: { contentId: 'test-20' }
      };

      const result = await service.analyzeContent(content);

      expect(result.isScam).toBe(true);
      expect(result.category).toBe('phishing');
      expect(result.patterns).toContain('fake_security');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect suspicious links', async () => {
      const content: ContentInput = {
        text: 'Update your MetaMask here: https://metamask-wallet.com/verify',
        metadata: { contentId: 'test-21' }
      };

      const result = await service.analyzeContent(content);

      expect(result.isScam).toBe(true);
      expect(result.category).toBe('phishing');
      expect(result.patterns).toContain('suspicious_link');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should not flag legitimate security communications', async () => {
      const content: ContentInput = {
        text: 'Remember to always verify URLs before entering your wallet information. Stay safe!',
        metadata: { contentId: 'test-22' }
      };

      const result = await service.analyzeContent(content);

      expect(result.isScam).toBe(false);
      expect(result.category).toBe('clean');
    });
  });

  describe('Multiple Pattern Detection', () => {
    it('should increase confidence with multiple scam patterns', async () => {
      const content: ContentInput = {
        text: 'Elon Musk verified account giving away Bitcoin! Send 1 BTC get 10 back! Act now, limited time!',
        userProfile: {
          handle: 'elonmusk_verified',
          bio: 'CEO of Tesla',
          reputation: 0,
          accountAge: 1
        },
        metadata: { contentId: 'test-23' }
      };

      const result = await service.analyzeContent(content);

      expect(result.isScam).toBe(true);
      expect(result.patterns.length).toBeGreaterThan(1);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should handle mixed legitimate and suspicious content', async () => {
      const content: ContentInput = {
        text: 'I love Bitcoin and think it will go to the moon someday. Great technology!',
        metadata: { contentId: 'test-24' }
      };

      const result = await service.analyzeContent(content);

      // "to the moon" might trigger market manipulation but confidence should be low
      if (result.isScam) {
        expect(result.confidence).toBeLessThan(0.7);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle empty content gracefully', async () => {
      const content: ContentInput = {
        text: '',
        metadata: { contentId: 'test-25' }
      };

      const result = await service.analyzeContent(content);

      expect(result.isScam).toBe(false);
      expect(result.category).toBe('clean');
      expect(result.confidence).toBe(0);
    });

    it('should handle missing user profile', async () => {
      const content: ContentInput = {
        text: 'This is a test message',
        metadata: { contentId: 'test-26' }
      };

      const result = await service.analyzeContent(content);

      expect(result).toBeDefined();
      expect(typeof result.isScam).toBe('boolean');
      expect(typeof result.confidence).toBe('number');
    });

    it('should handle malformed content', async () => {
      const content: ContentInput = {
        text: null as any,
        title: undefined,
        metadata: { contentId: 'test-27' }
      };

      const result = await service.analyzeContent(content);

      expect(result).toBeDefined();
      expect(result.category).toBe('clean');
    });
  });

  describe('Performance Tests', () => {
    it('should analyze content within reasonable time', async () => {
      const content: ContentInput = {
        text: 'This is a test message for performance testing. '.repeat(100),
        metadata: { contentId: 'test-28' }
      };

      const startTime = Date.now();
      const result = await service.analyzeContent(content);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result).toBeDefined();
    });

    it('should handle concurrent analysis', async () => {
      const contents = Array.from({ length: 10 }, (_, i) => ({
        text: `Test message ${i}`,
        metadata: { contentId: `test-concurrent-${i}` }
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        contents.map(content => service.analyzeContent(content))
      );
      const endTime = Date.now();

      expect(results).toHaveLength(10);
      expect(results.every(r => r !== undefined)).toBe(true);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});
