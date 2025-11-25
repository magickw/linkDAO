#!/usr/bin/env ts-node

/**
 * Seed Marketplace Listings
 *
 * This script seeds the marketplace_listings table with realistic product data
 * matching the actual database schema.
 *
 * Usage:
 *   npm run seed:listings
 *   ts-node scripts/seedMarketplaceListings.ts
 *   ts-node scripts/seedMarketplaceListings.ts --count=50
 */

import { faker } from '@faker-js/faker';
import { db } from '../src/db/connection';
import { marketplaceListings, sellers } from '../src/db/schema';
import { eq } from 'drizzle-orm';

interface SeedOptions {
  count: number;
  clean: boolean;
}

// Sample seller addresses (these should match existing sellers in your database)
// You can update these with real seller addresses from your database
const SAMPLE_SELLERS = [
  '0xc4f4cb013c4121d2dbd5b063eefe074f0ebc03f3',
  '0x72f58fe0e30a3f2fa96720d7ad85b4a8ef767d05',
];

const CATEGORIES = [
  'electronics',
  'fashion',
  'home-garden',
  'sports',
  'books',
  'art',
  'digital',
  'nfts',
  'automotive',
  'beauty',
];

const PRODUCT_DATA = {
  electronics: [
    {
      title: 'Premium Wireless Noise-Canceling Headphones',
      description: 'Experience studio-quality sound with advanced noise cancellation. Features 30-hour battery life, premium comfort padding, and seamless Bluetooth 5.0 connectivity. Perfect for audiophiles and professionals.',
      price: { min: 150, max: 400 },
      images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e', 'https://images.unsplash.com/photo-1484704849700-f032a568e944']
    },
    {
      title: 'Ultra HD 4K Smart Monitor 32"',
      description: 'Crystal-clear 4K resolution with HDR support, perfect for gaming, design work, and entertainment. Built-in smart features and USB-C connectivity.',
      price: { min: 300, max: 800 },
      images: ['https://images.unsplash.com/photo-1527443224154-c4a3942d3acf', 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2']
    },
    {
      title: 'Mechanical Gaming Keyboard RGB',
      description: 'Professional-grade mechanical keyboard with customizable RGB lighting, programmable macro keys, and ultra-responsive switches. Built for gamers and developers.',
      price: { min: 80, max: 200 },
      images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3', 'https://images.unsplash.com/photo-1595225476474-87563907a212']
    },
  ],
  fashion: [
    {
      title: 'Designer Leather Messenger Bag',
      description: 'Handcrafted genuine leather messenger bag with vintage brass hardware. Multiple compartments for laptop, documents, and daily essentials. Perfect for professionals and students.',
      price: { min: 120, max: 350 },
      images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa']
    },
    {
      title: 'Premium Denim Jacket - Vintage Wash',
      description: 'Classic denim jacket with a modern vintage wash. Made from premium denim fabric with authentic stitching and brass buttons. Timeless style that never goes out of fashion.',
      price: { min: 60, max: 150 },
      images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5', 'https://images.unsplash.com/photo-1576566588028-4147f3842f27']
    },
  ],
  digital: [
    {
      title: 'Web3 UI Design System - Complete Kit',
      description: 'Professional Web3 design system with 200+ components, crypto wallet integrations, and blockchain-themed elements. Includes Figma files and React components.',
      price: { min: 49, max: 199 },
      images: ['https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe']
    },
    {
      title: 'Blockchain Development Course Bundle',
      description: 'Complete blockchain development course covering Solidity, smart contracts, DeFi protocols, and NFT development. 40+ hours of video content with code examples.',
      price: { min: 99, max: 299 },
      images: ['https://images.unsplash.com/photo-1639762681485-074b7f938ba0', 'https://images.unsplash.com/photo-1639762681057-408e52192e55']
    },
  ],
  art: [
    {
      title: 'Abstract Digital Art Print - Limited Edition',
      description: 'Museum-quality giclee print of original digital artwork. Limited to 50 editions, signed and numbered by the artist. Printed on archival paper.',
      price: { min: 200, max: 1200 },
      images: ['https://images.unsplash.com/photo-1549887534-1541e9326642', 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8']
    },
  ],
  nfts: [
    {
      title: 'Crypto Punk Style Avatar Collection #2847',
      description: 'Unique generative NFT from the exclusive avatar collection. Rare traits include holographic eyes and diamond skin. Verified on-chain ownership with full commercial rights.',
      price: { min: 0.5, max: 5 },
      images: ['https://images.unsplash.com/photo-1635322966219-b75ed372eb01', 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e']
    },
    {
      title: 'Metaverse Land Plot - Prime Location',
      description: 'Premium virtual real estate in the heart of the metaverse. High-traffic area perfect for virtual stores, galleries, or events. Includes building rights.',
      price: { min: 1, max: 10 },
      images: ['https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac', 'https://images.unsplash.com/photo-1642104704074-907c0698cbd9']
    },
  ],
  'home-garden': [
    {
      title: 'Smart Indoor Garden System',
      description: 'Automated hydroponic garden for growing herbs and vegetables indoors. LED grow lights, automatic watering, and mobile app control. Grow fresh produce year-round.',
      price: { min: 150, max: 400 },
      images: ['https://images.unsplash.com/photo-1466692476868-aef1dfb1e735', 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae']
    },
  ],
};

class MarketplaceListingsSeeder {
  private defaultOptions: SeedOptions = {
    count: 30,
    clean: true,
  };

  /**
   * Main seeding function
   */
  async seed(options: Partial<SeedOptions> = {}): Promise<void> {
    if (!db) {
      throw new Error('Database connection not available. Please check DATABASE_URL environment variable.');
    }

    const opts = { ...this.defaultOptions, ...options };

    console.log('🌱 Starting marketplace listings seeding...');
    console.log(`📊 Configuration:`, opts);

    try {
      if (opts.clean) {
        await this.clearListings();
      }

      // Verify sellers exist
      const existingSellers = await db.select().from(sellers).limit(10);

      if (existingSellers.length === 0) {
        console.warn('⚠️  No sellers found in database. Creating sample sellers...');
        await this.createSampleSellers();
      }

      const createdListings = await this.seedListings(opts.count);
      console.log(`✅ Created ${createdListings.length} marketplace listings`);

      console.log('🎉 Marketplace listings seeding completed successfully!');
    } catch (error) {
      console.error('❌ Marketplace listings seeding failed:', error);
      throw error;
    }
  }

  /**
   * Clear existing marketplace listings
   */
  private async clearListings(): Promise<void> {
    console.log('🧹 Clearing existing marketplace listings...');

    try {
      await db.delete(marketplaceListings);
      console.log('✅ Existing listings cleared');
    } catch (error) {
      console.error('❌ Listing clearing failed:', error);
      throw error;
    }
  }

  /**
   * Create sample sellers if none exist
   */
  private async createSampleSellers(): Promise<void> {
    const sampleSellers = SAMPLE_SELLERS.map((address) => ({
      walletAddress: address,
      displayName: faker.person.fullName(),
      storeName: faker.company.name() + ' Store',
      bio: faker.lorem.sentence(),
      isVerified: Math.random() > 0.5,
      tier: faker.helpers.arrayElement(['basic', 'premium', 'pro']),
      onboardingCompleted: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await db.insert(sellers).values(sampleSellers);
    console.log(`✅ Created ${sampleSellers.length} sample sellers`);
  }

  /**
   * Seed marketplace listings with realistic data
   */
  private async seedListings(count: number): Promise<any[]> {
    const listingsData = [];

    // Get existing sellers
    const existingSellers = await db.select().from(sellers);
    const sellerAddresses = existingSellers.length > 0
      ? existingSellers.map(s => s.walletAddress)
      : SAMPLE_SELLERS;

    for (let i = 0; i < count; i++) {
      const category = faker.helpers.arrayElement(CATEGORIES);
      const sellerAddress = faker.helpers.arrayElement(sellerAddresses);

      // Get product data for category
      const categoryProducts = PRODUCT_DATA[category as keyof typeof PRODUCT_DATA];
      let product;
      let price;

      if (categoryProducts && categoryProducts.length > 0) {
        // Use predefined product data
        product = faker.helpers.arrayElement(categoryProducts);
        price = faker.number.float({
          min: product.price.min,
          max: product.price.max,
          fractionDigits: 2,
        });
      } else {
        // Generate random product
        product = {
          title: this.generateProductTitle(category),
          description: this.generateProductDescription(),
          images: [
            `https://images.unsplash.com/photo-${faker.number.int({ min: 1000000000000, max: 9999999999999 })}`,
          ],
        };
        price = faker.number.float({ min: 10, max: 500, fractionDigits: 2 });
      }

      // Determine currency based on category
      // Use USDC for most items, ETH equivalent for NFTs
      const currency = category === 'nfts' ? 'WETH' : 'USDC';

      listingsData.push({
        sellerAddress,
        title: product.title,
        description: product.description,
        price: price.toString(),
        currency,
        images: JSON.stringify(product.images || []),
        category,
        isActive: Math.random() > 0.1, // 90% active
        createdAt: faker.date.past({ years: 1 }),
        updatedAt: faker.date.recent({ days: 30 }),
      });
    }

    return await db.insert(marketplaceListings).values(listingsData).returning();
  }

  /**
   * Generate product title based on category
   */
  private generateProductTitle(category: string): string {
    const templates = {
      electronics: [
        `${faker.commerce.productAdjective()} ${faker.commerce.product()}`,
        `Professional ${faker.commerce.product()} - Latest Model`,
      ],
      fashion: [
        `${faker.commerce.productAdjective()} ${faker.commerce.product()}`,
        `Designer ${faker.commerce.product()}`,
      ],
      digital: [
        `${faker.commerce.product()} Template Pack`,
        `Professional ${faker.commerce.product()} Bundle`,
      ],
      default: [
        `${faker.commerce.productAdjective()} ${faker.commerce.product()}`,
      ],
    };

    const categoryTemplates = templates[category as keyof typeof templates] || templates.default;
    const template = faker.helpers.arrayElement(categoryTemplates);
    return template;
  }

  /**
   * Generate product description
   */
  private generateProductDescription(): string {
    const features = faker.helpers.arrayElements(
      [
        'High quality materials',
        'Professional grade',
        'Fast shipping available',
        'Satisfaction guaranteed',
        'Limited availability',
        'Eco-friendly',
        'Durable construction',
      ],
      { min: 2, max: 4 }
    );

    return `${faker.lorem.paragraph()}

Key Features:
${features.map((f) => `• ${f}`).join('\n')}`;
  }
}

/**
 * CLI interface
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options: Partial<SeedOptions> = {};

  // Parse command line arguments
  for (const arg of args) {
    if (arg.startsWith('--count=')) {
      options.count = parseInt(arg.split('=')[1]);
    } else if (arg === '--no-clean') {
      options.clean = false;
    }
  }

  const seeder = new MarketplaceListingsSeeder();

  try {
    await seeder.seed(options);
    console.log('\n🎉 Marketplace listings seeding completed successfully!');
    console.log('You can now view listings on the marketplace page.');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { MarketplaceListingsSeeder };
