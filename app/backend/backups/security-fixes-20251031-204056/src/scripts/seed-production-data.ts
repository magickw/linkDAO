import { drizzle } from "drizzle-orm/postgres-js";
import { safeLogger } from '../utils/safeLogger';
import postgres from "postgres";
import { safeLogger } from '../utils/safeLogger';
import dotenv from "dotenv";
import { safeLogger } from '../utils/safeLogger';
import { eq } from "drizzle-orm";
import { safeLogger } from '../utils/safeLogger';

dotenv.config();

// Import schema types (assuming they exist)
interface SellerProfile {
  walletAddress: string;
  displayName?: string;
  ensHandle?: string;
  storeDescription?: string;
  isVerified: boolean;
  onboardingCompleted: boolean;
}

interface MarketplaceListing {
  id: string;
  sellerAddress: string;
  title: string;
  description?: string;
  price: string;
  currency: string;
  category?: string;
  images?: any;
  isActive: boolean;
}

interface UserReputation {
  walletAddress: string;
  reputationScore: number;
  totalTransactions: number;
  positiveReviews: number;
  negativeReviews: number;
}

class ProductionDataSeeder {
  private client: postgres.Sql;
  private db: any;

  constructor(connectionString: string) {
    this.client = postgres(connectionString, { prepare: false });
    this.db = drizzle(this.client);
  }

  async close() {
    await this.client.end();
  }

  async seedSellerProfiles(): Promise<void> {
    safeLogger.info("🌱 Seeding seller profiles...");
    
    const sampleProfiles: SellerProfile[] = [
      {
        walletAddress: "0x1234567890123456789012345678901234567890",
        displayName: "Demo Seller 1",
        ensHandle: "demoseller1.eth",
        storeDescription: "High-quality digital assets and NFTs",
        isVerified: true,
        onboardingCompleted: true
      },
      {
        walletAddress: "0x2345678901234567890123456789012345678901",
        displayName: "Demo Seller 2", 
        ensHandle: "demoseller2.eth",
        storeDescription: "Exclusive marketplace items and collectibles",
        isVerified: true,
        onboardingCompleted: true
      },
      {
        walletAddress: "0x3456789012345678901234567890123456789012",
        displayName: "Demo Seller 3",
        storeDescription: "Premium services and digital goods",
        isVerified: false,
        onboardingCompleted: true
      }
    ];

    try {
      for (const profile of sampleProfiles) {
        // Check if profile already exists
        const existing = await this.client`
          SELECT wallet_address FROM seller_profiles 
          WHERE wallet_address = ${profile.walletAddress}
        `;

        if (existing.length === 0) {
          await this.client`
            INSERT INTO seller_profiles (
              wallet_address, display_name, ens_handle, store_description, 
              is_verified, onboarding_completed, created_at, updated_at
            ) VALUES (
              ${profile.walletAddress}, ${profile.displayName}, ${profile.ensHandle}, 
              ${profile.storeDescription}, ${profile.isVerified}, ${profile.onboardingCompleted},
              NOW(), NOW()
            )
          `;
          safeLogger.info(`  ✓ Created seller profile: ${profile.displayName}`);
        } else {
          safeLogger.info(`  ⚠ Seller profile already exists: ${profile.displayName}`);
        }
      }
    } catch (error) {
      safeLogger.error("❌ Error seeding seller profiles:", error);
      throw error;
    }
  }

  async seedMarketplaceListings(): Promise<void> {
    safeLogger.info("🌱 Seeding marketplace listings...");
    
    const sampleListings: MarketplaceListing[] = [
      {
        id: "listing-1",
        sellerAddress: "0x1234567890123456789012345678901234567890",
        title: "Premium NFT Collection",
        description: "Exclusive digital art collection with utility tokens",
        price: "0.5",
        currency: "ETH",
        category: "NFT",
        images: JSON.stringify(["/images/nft1.jpg", "/images/nft2.jpg"]),
        isActive: true
      },
      {
        id: "listing-2", 
        sellerAddress: "0x2345678901234567890123456789012345678901",
        title: "DeFi Strategy Guide",
        description: "Comprehensive guide to DeFi yield farming strategies",
        price: "0.1",
        currency: "ETH",
        category: "Digital Services",
        images: JSON.stringify(["/images/guide1.jpg"]),
        isActive: true
      },
      {
        id: "listing-3",
        sellerAddress: "0x3456789012345678901234567890123456789012", 
        title: "Smart Contract Audit",
        description: "Professional smart contract security audit service",
        price: "2.0",
        currency: "ETH",
        category: "Services",
        images: JSON.stringify(["/images/audit1.jpg"]),
        isActive: true
      }
    ];

    try {
      for (const listing of sampleListings) {
        // Check if listing already exists
        const existing = await this.client`
          SELECT id FROM marketplace_listings WHERE id = ${listing.id}
        `;

        if (existing.length === 0) {
          await this.client`
            INSERT INTO marketplace_listings (
              id, seller_address, title, description, price, currency, 
              category, images, is_active, created_at, updated_at
            ) VALUES (
              ${listing.id}, ${listing.sellerAddress}, ${listing.title}, 
              ${listing.description}, ${listing.price}, ${listing.currency},
              ${listing.category}, ${listing.images}, ${listing.isActive},
              NOW(), NOW()
            )
          `;
          safeLogger.info(`  ✓ Created listing: ${listing.title}`);
        } else {
          safeLogger.info(`  ⚠ Listing already exists: ${listing.title}`);
        }
      }
    } catch (error) {
      safeLogger.error("❌ Error seeding marketplace listings:", error);
      throw error;
    }
  }

  async seedUserReputation(): Promise<void> {
    safeLogger.info("🌱 Seeding user reputation data...");
    
    const sampleReputations: UserReputation[] = [
      {
        walletAddress: "0x1234567890123456789012345678901234567890",
        reputationScore: 4.8,
        totalTransactions: 25,
        positiveReviews: 23,
        negativeReviews: 2
      },
      {
        walletAddress: "0x2345678901234567890123456789012345678901",
        reputationScore: 4.5,
        totalTransactions: 18,
        positiveReviews: 16,
        negativeReviews: 2
      },
      {
        walletAddress: "0x3456789012345678901234567890123456789012",
        reputationScore: 4.2,
        totalTransactions: 12,
        positiveReviews: 10,
        negativeReviews: 2
      }
    ];

    try {
      for (const reputation of sampleReputations) {
        // Check if reputation already exists
        const existing = await this.client`
          SELECT wallet_address FROM user_reputation 
          WHERE wallet_address = ${reputation.walletAddress}
        `;

        if (existing.length === 0) {
          await this.client`
            INSERT INTO user_reputation (
              wallet_address, reputation_score, total_transactions, 
              positive_reviews, negative_reviews, last_calculated
            ) VALUES (
              ${reputation.walletAddress}, ${reputation.reputationScore}, 
              ${reputation.totalTransactions}, ${reputation.positiveReviews}, 
              ${reputation.negativeReviews}, NOW()
            )
          `;
          safeLogger.info(`  ✓ Created reputation for: ${reputation.walletAddress.slice(0, 10)}...`);
        } else {
          safeLogger.info(`  ⚠ Reputation already exists for: ${reputation.walletAddress.slice(0, 10)}...`);
        }
      }
    } catch (error) {
      safeLogger.error("❌ Error seeding user reputation:", error);
      throw error;
    }
  }

  async verifySeededData(): Promise<void> {
    safeLogger.info("🔍 Verifying seeded data...");
    
    try {
      const profileCount = await this.client`SELECT COUNT(*) FROM seller_profiles`;
      const listingCount = await this.client`SELECT COUNT(*) FROM marketplace_listings`;
      const reputationCount = await this.client`SELECT COUNT(*) FROM user_reputation`;
      
      safeLogger.info(`  ✓ Seller profiles: ${profileCount[0].count}`);
      safeLogger.info(`  ✓ Marketplace listings: ${listingCount[0].count}`);
      safeLogger.info(`  ✓ User reputations: ${reputationCount[0].count}`);
      
      if (profileCount[0].count === '0' || listingCount[0].count === '0') {
        throw new Error("Seeded data verification failed - no data found");
      }
      
    } catch (error) {
      safeLogger.error("❌ Error verifying seeded data:", error);
      throw error;
    }
  }
}

async function main() {
  safeLogger.info("🌱 Production Data Seeding Script");
  safeLogger.info("=================================");
  
  if (!process.env.DATABASE_URL) {
    safeLogger.error("❌ DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const seeder = new ProductionDataSeeder(process.env.DATABASE_URL);
  
  try {
    safeLogger.info("🚀 Starting data seeding process...");
    
    await seeder.seedSellerProfiles();
    await seeder.seedMarketplaceListings();
    await seeder.seedUserReputation();
    await seeder.verifySeededData();
    
    safeLogger.info("🎉 Data seeding completed successfully!");
    
  } catch (error) {
    safeLogger.error("💥 Data seeding failed:", error);
    process.exit(1);
  } finally {
    await seeder.close();
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  safeLogger.info('\n⚠ Seeding interrupted by user');
  process.exit(1);
});

if (require.main === module) {
  main();
}

export { ProductionDataSeeder };