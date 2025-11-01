import { drizzle } from 'drizzle-orm/node-postgres';
import { safeLogger } from '../utils/safeLogger';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { safeLogger } from '../utils/safeLogger';
import { Pool } from 'pg';
import { safeLogger } from '../utils/safeLogger';
import { jest } from '@jest/globals';
import { safeLogger } from '../utils/safeLogger';

// Import schema
import * as schema from '../../db/schema';
import { safeLogger } from '../utils/safeLogger';

let testDb: any;
let testPool: Pool;

export async function setupTestDatabase(): Promise<void> {
  // Create test database connection
  testPool = new Pool({
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    database: process.env.TEST_DB_NAME || 'linkdao_test',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'password',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  testDb = drizzle(testPool, { schema });

  try {
    // Run migrations
    await migrate(testDb, { migrationsFolder: './drizzle' });
    
    // Clear existing test data
    await cleanupTestData();
    
    safeLogger.info('✅ Test database setup complete');
  } catch (error) {
    safeLogger.error('❌ Test database setup failed:', error);
    throw error;
  }
}

export async function cleanupTestDatabase(): Promise<void> {
  try {
    if (testDb) {
      await cleanupTestData();
    }
    
    if (testPool) {
      await testPool.end();
    }
    
    safeLogger.info('✅ Test database cleanup complete');
  } catch (error) {
    safeLogger.error('❌ Test database cleanup failed:', error);
  }
}

export async function cleanupTestData(): Promise<void> {
  if (!testDb) return;

  try {
    // Clean up test data in reverse dependency order
    await testDb.delete(schema.sellerAnalytics);
    await testDb.delete(schema.sellerTierUpgrades);
    await testDb.delete(schema.sellerListings);
    await testDb.delete(schema.sellerProfiles);
    await testDb.delete(schema.users);
    
    safeLogger.info('✅ Test data cleanup complete');
  } catch (error) {
    safeLogger.error('❌ Test data cleanup failed:', error);
    throw error;
  }
}

export function getTestDatabase() {
  return testDb;
}

export function getTestPool() {
  return testPool;
}

// Database seeding utilities
export async function seedTestSellerProfile(profileData: any = {}) {
  const defaultProfile = {
    walletAddress: '0x1234567890123456789012345678901234567890',
    displayName: 'Test Seller',
    storeName: 'Test Store',
    bio: 'Test seller bio',
    profileImageUrl: null,
    coverImageUrl: null,
    tier: 'bronze',
    isVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...profileData,
  };

  const [profile] = await testDb.insert(schema.sellerProfiles)
    .values(defaultProfile)
    .returning();

  return profile;
}

export async function seedTestSellerListing(listingData: any = {}) {
  const defaultListing = {
    id: 'test-listing-1',
    sellerId: '0x1234567890123456789012345678901234567890',
    title: 'Test Product',
    description: 'Test product description',
    price: 100,
    currency: 'USD',
    images: [],
    category: 'Electronics',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...listingData,
  };

  const [listing] = await testDb.insert(schema.sellerListings)
    .values(defaultListing)
    .returning();

  return listing;
}

export async function seedTestSellerAnalytics(analyticsData: any = {}) {
  const defaultAnalytics = {
    sellerId: '0x1234567890123456789012345678901234567890',
    totalSales: 0,
    totalRevenue: 0,
    averageRating: 0,
    totalViews: 0,
    conversionRate: 0,
    period: 'monthly',
    recordedAt: new Date(),
    ...analyticsData,
  };

  const [analytics] = await testDb.insert(schema.sellerAnalytics)
    .values(defaultAnalytics)
    .returning();

  return analytics;
}

// Database transaction utilities
export async function withTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
  return testDb.transaction(fn);
}

// Database performance testing
export async function measureQueryPerformance<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = await queryFn();
  const duration = Date.now() - start;
  
  safeLogger.info(`[DB Query] ${queryName}: ${duration}ms`);
  
  return { result, duration };
}

// Connection pool monitoring
export function getPoolStats() {
  if (!testPool) return null;
  
  return {
    totalCount: testPool.totalCount,
    idleCount: testPool.idleCount,
    waitingCount: testPool.waitingCount,
  };
}

export function logPoolStats(context: string) {
  const stats = getPoolStats();
  if (stats) {
    safeLogger.info(`[${context}] Pool Stats:`, stats);
  }
}

// Database stress testing utilities
export async function simulateDatabaseLoad(
  concurrentQueries: number = 50,
  queryFn: () => Promise<any>
): Promise<{ successCount: number; errorCount: number; averageTime: number }> {
  const promises = Array.from({ length: concurrentQueries }, async () => {
    const start = Date.now();
    try {
      await queryFn();
      return { success: true, duration: Date.now() - start };
    } catch (error) {
      return { success: false, duration: Date.now() - start, error };
    }
  });

  const results = await Promise.all(promises);
  
  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;
  const averageTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  return { successCount, errorCount, averageTime };
}

// Database connection failure simulation
export function simulateConnectionFailure() {
  const originalQuery = testPool.query;
  
  testPool.query = jest.fn().mockRejectedValue(
    new Error('Connection to database failed')
  );
  
  return () => {
    testPool.query = originalQuery;
  };
}

// Database deadlock simulation
export function simulateDeadlock() {
  const originalQuery = testPool.query;
  let callCount = 0;
  
  testPool.query = jest.fn().mockImplementation((...args) => {
    callCount++;
    if (callCount <= 2) {
      const error = new Error('Deadlock detected');
      (error as any).code = 'ER_LOCK_DEADLOCK';
      throw error;
    }
    return originalQuery.apply(testPool, args);
  });
  
  return () => {
    testPool.query = originalQuery;
  };
}

// Test data validation utilities
export async function validateSellerProfileIntegrity(walletAddress: string): Promise<boolean> {
  try {
    const profile = await testDb.select()
      .from(schema.sellerProfiles)
      .where(schema.sellerProfiles.walletAddress.eq(walletAddress))
      .limit(1);

    if (!profile.length) return false;

    // Validate required fields
    const requiredFields = ['walletAddress', 'displayName', 'storeName'];
    return requiredFields.every(field => profile[0][field] != null);
  } catch (error) {
    safeLogger.error('Profile integrity validation failed:', error);
    return false;
  }
}

export async function validateReferentialIntegrity(): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    // Check that all listings have valid seller references
    const orphanedListings = await testDb.select()
      .from(schema.sellerListings)
      .leftJoin(
        schema.sellerProfiles,
        schema.sellerListings.sellerId.eq(schema.sellerProfiles.walletAddress)
      )
      .where(schema.sellerProfiles.walletAddress.isNull());

    if (orphanedListings.length > 0) {
      errors.push(`Found ${orphanedListings.length} orphaned listings`);
    }

    // Check that all analytics have valid seller references
    const orphanedAnalytics = await testDb.select()
      .from(schema.sellerAnalytics)
      .leftJoin(
        schema.sellerProfiles,
        schema.sellerAnalytics.sellerId.eq(schema.sellerProfiles.walletAddress)
      )
      .where(schema.sellerProfiles.walletAddress.isNull());

    if (orphanedAnalytics.length > 0) {
      errors.push(`Found ${orphanedAnalytics.length} orphaned analytics records`);
    }

    return { valid: errors.length === 0, errors };
  } catch (error) {
    errors.push(`Referential integrity check failed: ${error.message}`);
    return { valid: false, errors };
  }
}

// Database backup and restore for testing
export async function createTestSnapshot(snapshotName: string): Promise<void> {
  // In a real implementation, this would create a database snapshot
  // For testing purposes, we'll just log the operation
  safeLogger.info(`📸 Created test snapshot: ${snapshotName}`);
}

export async function restoreTestSnapshot(snapshotName: string): Promise<void> {
  // In a real implementation, this would restore from a database snapshot
  // For testing purposes, we'll clean and reseed the database
  safeLogger.info(`🔄 Restoring test snapshot: ${snapshotName}`);
  await cleanupTestData();
}

// Database migration testing
export async function testMigrations(): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    // Test that all expected tables exist
    const expectedTables = [
      'seller_profiles',
      'seller_listings',
      'seller_analytics',
      'seller_tier_upgrades',
    ];

    for (const table of expectedTables) {
      try {
        await testDb.execute(`SELECT 1 FROM ${table} LIMIT 1`);
      } catch (error) {
        errors.push(`Table ${table} does not exist or is not accessible`);
      }
    }

    return { success: errors.length === 0, errors };
  } catch (error) {
    errors.push(`Migration test failed: ${error.message}`);
    return { success: false, errors };
  }
}