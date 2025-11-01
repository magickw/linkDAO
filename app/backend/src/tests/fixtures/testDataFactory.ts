/**
 * Test Data Factory
 * Provides factory functions for creating test data with realistic variations
 */

import { faker } from '@faker-js/faker';

export interface TestDataOptions {
  count?: number;
  overrides?: Record<string, any>;
  seed?: number;
}

export class TestDataFactory {
  private static setSeed(seed?: number) {
    if (seed) {
      faker.seed(seed);
    }
  }

  /**
   * Generate realistic test data with consistent patterns
   */
  static generateTestData<T>(
    generator: () => T,
    options: TestDataOptions = {}
  ): T[] {
    const { count = 1, seed } = options;
    this.setSeed(seed);
    
    return Array.from({ length: count }, () => generator());
  }

  /**
   * Create deterministic test data for consistent testing
   */
  static createDeterministicData<T>(
    generator: (index: number) => T,
    count: number
  ): T[] {
    return Array.from({ length: count }, (_, index) => generator(index));
  }

  /**
   * Generate realistic wallet addresses
   */
  static generateWalletAddress(): string {
    return `0x${faker.string.hexadecimal({ length: 40, prefix: '' })}`;
  }

  /**
   * Generate realistic IPFS CIDs
   */
  static generateIPFSCid(): string {
    return `Qm${faker.string.alphanumeric(44)}`;
  }

  /**
   * Generate realistic transaction hashes
   */
  static generateTxHash(): string {
    return `0x${faker.string.hexadecimal({ length: 64, prefix: '' })}`;
  }

  /**
   * Generate realistic token amounts
   */
  static generateTokenAmount(min = 0.001, max = 1000): string {
    return faker.number.float({ min, max, fractionDigits: 6 }).toString();
  }

  /**
   * Generate realistic timestamps within a range
   */
  static generateTimestamp(daysAgo = 30): Date {
    return faker.date.recent({ days: daysAgo });
  }

  /**
   * Generate realistic user reputation scores
   */
  static generateReputationScore(): number {
    return faker.number.int({ min: 0, max: 1000 });
  }

  /**
   * Generate realistic engagement metrics
   */
  static generateEngagementMetrics() {
    return {
      views: faker.number.int({ min: 10, max: 10000 }),
      likes: faker.number.int({ min: 0, max: 500 }),
      comments: faker.number.int({ min: 0, max: 100 }),
      shares: faker.number.int({ min: 0, max: 50 }),
    };
  }

  /**
   * Generate realistic price data
   */
  static generatePriceData() {
    const usdPrice = faker.number.float({ min: 1, max: 10000, fractionDigits: 2 });
    const ethPrice = faker.number.float({ min: 0.001, max: 10, fractionDigits: 6 });
    
    return {
      usd: usdPrice.toString(),
      eth: ethPrice.toString(),
      currency: 'USD',
      cryptoSymbol: 'ETH',
    };
  }

  /**
   * Generate realistic image URLs
   */
  static generateImageUrls(count = 1): string[] {
    return Array.from({ length: count }, () => 
      faker.image.url({ width: 400, height: 300 })
    );
  }

  /**
   * Generate realistic tags
   */
  static generateTags(count = 3): string[] {
    const tagPool = [
      'defi', 'nft', 'dao', 'governance', 'art', 'gaming', 'metaverse',
      'collectibles', 'electronics', 'fashion', 'music', 'sports',
      'technology', 'crypto', 'blockchain', 'web3', 'ethereum',
      'bitcoin', 'trading', 'investment', 'community', 'social'
    ];
    
    return faker.helpers.arrayElements(tagPool, count);
  }

  /**
   * Generate realistic community names
   */
  static generateCommunityName(): string {
    const prefixes = ['defi', 'nft', 'dao', 'crypto', 'web3', 'blockchain'];
    const suffixes = ['hub', 'community', 'collective', 'guild', 'society', 'network'];
    
    const prefix = faker.helpers.arrayElement(prefixes);
    const suffix = faker.helpers.arrayElement(suffixes);
    
    return `${prefix}-${suffix}`;
  }

  /**
   * Generate realistic product titles
   */
  static generateProductTitle(): string {
    const adjectives = ['Premium', 'Professional', 'Vintage', 'Rare', 'Limited', 'Exclusive'];
    const nouns = ['Headphones', 'Camera', 'Keyboard', 'Watch', 'Artwork', 'Collectible'];
    
    const adjective = faker.helpers.arrayElement(adjectives);
    const noun = faker.helpers.arrayElement(nouns);
    
    return `${adjective} ${noun}`;
  }

  /**
   * Generate realistic seller data
   */
  static generateSellerData() {
    return {
      name: faker.company.name(),
      rating: faker.number.float({ min: 3.5, max: 5.0, fractionDigits: 1 }),
      reputation: faker.number.int({ min: 50, max: 100 }),
      verified: faker.datatype.boolean({ probability: 0.7 }),
      daoApproved: faker.datatype.boolean({ probability: 0.5 }),
      walletAddress: this.generateWalletAddress(),
    };
  }

  /**
   * Generate realistic trust indicators
   */
  static generateTrustIndicators() {
    const verified = faker.datatype.boolean({ probability: 0.8 });
    const escrowProtected = faker.datatype.boolean({ probability: 0.9 });
    const onChainCertified = faker.datatype.boolean({ probability: 0.6 });
    
    // Safety score based on trust indicators
    let safetyScore = 50;
    if (verified) safetyScore += 20;
    if (escrowProtected) safetyScore += 25;
    if (onChainCertified) safetyScore += 15;
    safetyScore += faker.number.int({ min: -10, max: 10 });
    
    return {
      verified,
      escrowProtected,
      onChainCertified,
      safetyScore: Math.max(0, Math.min(100, safetyScore)),
    };
  }

  /**
   * Generate realistic shipping data
   */
  static generateShippingData() {
    const free = faker.datatype.boolean({ probability: 0.4 });
    
    return {
      free,
      cost: free ? '0' : faker.number.float({ min: 5, max: 50, fractionDigits: 2 }).toString(),
      estimatedDays: faker.helpers.arrayElement(['1-2', '2-3', '3-5', '5-7', '7-10']),
      regions: faker.helpers.arrayElements(['US', 'CA', 'EU', 'AU', 'UK'], { min: 1, max: 4 }),
      expedited: faker.datatype.boolean({ probability: 0.6 }),
    };
  }
}
