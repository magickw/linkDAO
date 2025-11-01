import { Pool } from 'pg';
import { safeLogger } from '../utils/safeLogger';
import { drizzle } from 'drizzle-orm/node-postgres';
import { safeLogger } from '../utils/safeLogger';
import * as schema from '../db/schema';
import { safeLogger } from '../utils/safeLogger';

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_eqKdwjDV7R9I@ep-quiet-lake-adx0tq66-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

safeLogger.info('Testing database connection...');

async function testDatabase() {
  const pool = new Pool({
    connectionString: databaseUrl,
  });

  const db = drizzle(pool, { schema });

  try {
    // Test connection
    const result = await db.execute('SELECT 1 as test');
    safeLogger.info('Database connection successful:', result);

    // Check if there are any products
    const productCount = await db.select().from(schema.products).limit(1);
    safeLogger.info('Products found:', productCount.length);

    // Check if there are any categories
    const categoryCount = await db.select().from(schema.categories).limit(1);
    safeLogger.info('Categories found:', categoryCount.length);

    if (categoryCount.length === 0) {
      safeLogger.info('No categories found, creating a test category...');
      
      // Create a test category
      const categoryResult = await db.insert(schema.categories).values({
        name: 'Test Category',
        slug: 'test-category',
        description: 'A test category for testing purposes',
        path: JSON.stringify(['Test Category']),
        isActive: true,
        sortOrder: 0,
      }).returning();
      
      safeLogger.info('Created category:', categoryResult);
    }

    safeLogger.info('Test completed successfully');
  } catch (error) {
    safeLogger.error('Database test failed:', error);
  } finally {
    await pool.end();
  }
}

testDatabase();