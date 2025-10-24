import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { v4 as uuidv4 } from 'uuid';

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_eqKdwjDV7R9I@ep-quiet-lake-adx0tq66-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

console.log('Creating test product...');

async function createTestProduct() {
  const pool = new Pool({
    connectionString: databaseUrl,
  });

  const db = drizzle(pool, { schema });

  try {
    // First, check if there are any categories
    const categories = await db.select().from(schema.categories).limit(1);
    
    let categoryId: string;
    
    if (categories.length === 0) {
      console.log('No categories found, creating a test category...');
      
      // Create a test category
      const categoryResult = await db.insert(schema.categories).values({
        id: uuidv4(),
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices and gadgets',
        path: JSON.stringify(['Electronics']),
        isActive: true,
        sortOrder: 0,
      }).returning();
      
      categoryId = categoryResult[0].id;
      console.log('Created category:', categoryId);
    } else {
      categoryId = categories[0].id;
      console.log('Using existing category:', categoryId);
    }
    
    // Create a test user (seller)
    const userId = uuidv4();
    const walletAddress = '0x1234567890123456789012345678901234567890';
    
    console.log('Creating test user...');
    const userResult = await db.insert(schema.users).values({
      id: userId,
      walletAddress: walletAddress,
    }).returning();
    
    console.log('Created user:', userResult[0].id);
    
    // Create a seller profile
    console.log('Creating seller profile...');
    const sellerResult = await db.insert(schema.sellers).values({
      walletAddress: walletAddress,
      displayName: 'Test Seller',
      storeName: 'Test Store',
      bio: 'This is a test seller',
      isOnline: true,
      tier: 'standard',
    }).returning();
    
    console.log('Created seller:', sellerResult[0].id);
    
    // Create a test product
    console.log('Creating test product...');
    const productId = uuidv4();
    const productResult = await db.insert(schema.products).values({
      id: productId,
      sellerId: userId,
      title: 'Test Product',
      description: 'This is a test product for marketplace testing',
      priceAmount: '99.99',
      priceCurrency: 'USD',
      categoryId: categoryId,
      images: JSON.stringify(['https://placehold.co/600x400']),
      metadata: JSON.stringify({
        condition: 'new',
        brand: 'TestBrand',
        model: 'TestModel',
      }),
      inventory: 10,
      status: 'active',
      tags: JSON.stringify(['test', 'electronics']),
    }).returning();
    
    console.log('Created product:', productResult[0].id);
    
    console.log('Test product created successfully!');
    console.log('You can now test the marketplace endpoints with product ID:', productId);
    
  } catch (error) {
    console.error('Failed to create test product:', error);
  } finally {
    await pool.end();
  }
}

createTestProduct();