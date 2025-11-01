/**
 * Product/Marketplace Test Fixtures
 * Provides realistic test data for marketplace functionality
 */

import { TestDataFactory, TestDataOptions } from './testDataFactory';
import { faker } from '@faker-js/faker';

export interface ProductFixture {
  id: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  cryptoPrice: string;
  cryptoSymbol: string;
  category: string;
  listingType: 'FIXED_PRICE' | 'AUCTION';
  seller: {
    id: string;
    name: string;
    rating: number;
    reputation: number;
    verified: boolean;
    daoApproved: boolean;
    walletAddress: string;
  };
  trust: {
    verified: boolean;
    escrowProtected: boolean;
    onChainCertified: boolean;
    safetyScore: number;
  };
  images: string[];
  inventory: number;
  isNFT: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  views: number;
  favorites: number;
  auctionEndTime?: Date;
  highestBid?: string;
  bidCount?: number;
  specifications?: Record<string, string>;
  shipping?: {
    free: boolean;
    cost: string;
    estimatedDays: string;
    regions: string[];
    expedited: boolean;
  };
}

export interface AuctionFixture extends ProductFixture {
  auctionEndTime: Date;
  currentBid: string;
  bidCount: number;
  minimumBid: string;
  reservePrice?: string;
  bids: BidFixture[];
}

export interface BidFixture {
  id: string;
  auctionId: string;
  bidder: string;
  amount: string;
  timestamp: Date;
  txHash: string;
}

export interface SellerFixture {
  id: string;
  name: string;
  description: string;
  walletAddress: string;
  rating: number;
  reputation: number;
  verified: boolean;
  daoApproved: boolean;
  totalSales: number;
  joinedAt: Date;
  avatar?: string;
  banner?: string;
  socialLinks: {
    website?: string;
    twitter?: string;
    discord?: string;
  };
  policies: {
    returns: string;
    shipping: string;
    privacy: string;
  };
}

export class ProductFixtures {
  /**
   * Create a single product fixture
   */
  static createProduct(overrides: Partial<ProductFixture> = {}): ProductFixture {
    const priceData = TestDataFactory.generatePriceData();
    const engagement = TestDataFactory.generateEngagementMetrics();
    const seller = TestDataFactory.generateSellerData();
    const trust = TestDataFactory.generateTrustIndicators();
    const isNFT = faker.datatype.boolean({ probability: 0.3 });
    const isAuction = faker.datatype.boolean({ probability: 0.4 });

    return {
      id: faker.string.uuid(),
      title: TestDataFactory.generateProductTitle(),
      description: faker.lorem.paragraphs(2),
      price: priceData.usd,
      currency: priceData.currency,
      cryptoPrice: priceData.eth,
      cryptoSymbol: priceData.cryptoSymbol,
      category: faker.helpers.arrayElement([
        'electronics', 'nft', 'collectibles', 'fashion', 'art', 'gaming', 'books', 'music'
      ]),
      listingType: isAuction ? 'AUCTION' : 'FIXED_PRICE',
      seller: {
        id: faker.string.uuid(),
        ...seller
      },
      trust,
      images: TestDataFactory.generateImageUrls(faker.number.int({ min: 1, max: 5 })),
      inventory: isNFT ? 1 : faker.number.int({ min: 1, max: 100 }),
      isNFT,
      tags: TestDataFactory.generateTags(faker.number.int({ min: 2, max: 6 })),
      createdAt: TestDataFactory.generateTimestamp(60),
      updatedAt: TestDataFactory.generateTimestamp(7),
      views: engagement.views,
      favorites: faker.number.int({ min: 0, max: Math.floor(engagement.views * 0.1) }),
      auctionEndTime: isAuction ? faker.date.future({ days: 30 }) : undefined,
      highestBid: isAuction ? TestDataFactory.generateTokenAmount(0.1, 10) : undefined,
      bidCount: isAuction ? faker.number.int({ min: 0, max: 50 }) : undefined,
      specifications: this.generateSpecifications(),
      shipping: !isNFT ? TestDataFactory.generateShippingData() : undefined,
      ...overrides
    };
  }

  /**
   * Create multiple product fixtures
   */
  static createProducts(options: TestDataOptions = {}): ProductFixture[] {
    return TestDataFactory.generateTestData(
      () => this.createProduct(options.overrides),
      options
    );
  }

  /**
   * Create an auction fixture
   */
  static createAuction(overrides: Partial<AuctionFixture> = {}): AuctionFixture {
    const product = this.createProduct({ listingType: 'AUCTION' });
    const bidCount = faker.number.int({ min: 0, max: 25 });
    
    const auction: AuctionFixture = {
      ...product,
      auctionEndTime: faker.date.future({ days: 30 }),
      currentBid: TestDataFactory.generateTokenAmount(0.1, 10),
      bidCount,
      minimumBid: TestDataFactory.generateTokenAmount(0.05, 1),
      reservePrice: faker.datatype.boolean({ probability: 0.3 }) 
        ? TestDataFactory.generateTokenAmount(1, 5)
        : undefined,
      bids: this.createBids({ count: bidCount, overrides: { auctionId: product.id } }),
      ...overrides
    };

    return auction;
  }

  /**
   * Create multiple auction fixtures
   */
  static createAuctions(options: TestDataOptions = {}): AuctionFixture[] {
    return TestDataFactory.generateTestData(
      () => this.createAuction(options.overrides),
      options
    );
  }

  /**
   * Create a bid fixture
   */
  static createBid(overrides: Partial<BidFixture> = {}): BidFixture {
    return {
      id: faker.string.uuid(),
      auctionId: faker.string.uuid(),
      bidder: TestDataFactory.generateWalletAddress(),
      amount: TestDataFactory.generateTokenAmount(0.1, 10),
      timestamp: TestDataFactory.generateTimestamp(7),
      txHash: TestDataFactory.generateTxHash(),
      ...overrides
    };
  }

  /**
   * Create multiple bid fixtures
   */
  static createBids(options: TestDataOptions = {}): BidFixture[] {
    return TestDataFactory.generateTestData(
      () => this.createBid(options.overrides),
      options
    );
  }

  /**
   * Create a seller fixture
   */
  static createSeller(overrides: Partial<SellerFixture> = {}): SellerFixture {
    const sellerData = TestDataFactory.generateSellerData();
    
    return {
      id: faker.string.uuid(),
      name: sellerData.name,
      description: faker.lorem.paragraph(),
      walletAddress: sellerData.walletAddress,
      rating: sellerData.rating,
      reputation: sellerData.reputation,
      verified: sellerData.verified,
      daoApproved: sellerData.daoApproved,
      totalSales: faker.number.int({ min: 0, max: 1000 }),
      joinedAt: TestDataFactory.generateTimestamp(365),
      avatar: faker.image.avatar(),
      banner: faker.image.url({ width: 800, height: 200 }),
      socialLinks: {
        website: faker.datatype.boolean({ probability: 0.4 }) ? faker.internet.url() : undefined,
        twitter: faker.datatype.boolean({ probability: 0.6 }) ? faker.internet.userName() : undefined,
        discord: faker.datatype.boolean({ probability: 0.3 }) ? faker.internet.userName() : undefined,
      },
      policies: {
        returns: faker.lorem.paragraph(),
        shipping: faker.lorem.paragraph(),
        privacy: faker.lorem.paragraph(),
      },
      ...overrides
    };
  }

  /**
   * Create multiple seller fixtures
   */
  static createSellers(options: TestDataOptions = {}): SellerFixture[] {
    return TestDataFactory.generateTestData(
      () => this.createSeller(options.overrides),
      options
    );
  }

  /**
   * Generate realistic product specifications
   */
  private static generateSpecifications(): Record<string, string> {
    const specTypes = [
      { brand: faker.company.name() },
      { model: faker.commerce.productName() },
      { color: faker.color.human() },
      { material: faker.commerce.productMaterial() },
      { weight: `${faker.number.float({ min: 0.1, max: 10, fractionDigits: 1 })} lbs` },
      { dimensions: `${faker.number.int({ min: 5, max: 50 })} x ${faker.number.int({ min: 5, max: 50 })} x ${faker.number.int({ min: 1, max: 20 })} inches` }
    ];

    const selectedSpecs = faker.helpers.arrayElements(specTypes, { min: 2, max: 4 });
    return selectedSpecs.reduce((acc, spec) => ({ ...acc, ...spec }), {});
  }

  /**
   * Create featured products
   */
  static createFeaturedProducts(count = 6): ProductFixture[] {
    return this.createProducts({
      count,
      overrides: {
        seller: {
          ...TestDataFactory.generateSellerData(),
          daoApproved: true,
          verified: true,
          rating: faker.number.float({ min: 4.5, max: 5.0, fractionDigits: 1 })
        },
        trust: {
          ...TestDataFactory.generateTrustIndicators(),
          safetyScore: faker.number.int({ min: 90, max: 100 })
        }
      }
    });
  }

  /**
   * Create products by category
   */
  static createProductsByCategory(category: string, count = 10): ProductFixture[] {
    return this.createProducts({
      count,
      overrides: { category }
    });
  }

  /**
   * Create NFT products
   */
  static createNFTProducts(count = 5): ProductFixture[] {
    return this.createProducts({
      count,
      overrides: {
        isNFT: true,
        inventory: 1,
        category: 'nft',
        shipping: undefined
      }
    });
  }

  /**
   * Create active auctions
   */
  static createActiveAuctions(count = 8): AuctionFixture[] {
    return this.createAuctions({
      count,
      overrides: {
        auctionEndTime: faker.date.future({ days: 7 }) // Ending within a week
      }
    });
  }

  /**
   * Create a complete marketplace dataset
   */
  static createMarketplaceData(): {
    products: ProductFixture[];
    auctions: AuctionFixture[];
    sellers: SellerFixture[];
    featuredProducts: ProductFixture[];
  } {
    const sellers = this.createSellers({ count: 20 });
    const products = this.createProducts({ count: 50 });
    const auctions = this.createActiveAuctions(15);
    const featuredProducts = this.createFeaturedProducts(8);

    return { products, auctions, sellers, featuredProducts };
  }
}
