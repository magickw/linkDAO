#!/usr/bin/env node

/**
 * Test Data Seeding Script
 * 
 * Seeds the test database with sample data for comprehensive testing
 */

const { Pool } = require('pg');
const { createHash } = require('crypto');

// Database configuration
const dbConfig = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  database: process.env.TEST_DB_NAME || 'marketplace_test',
  user: process.env.TEST_DB_USER || 'test',
  password: process.env.TEST_DB_PASSWORD || 'test'
};

// Test data generators
const generateRandomAddress = () => {
  return '0x' + Array.from({ length: 40 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
};

const generateRandomHash = () => {
  return '0x' + Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
};

const generateRandomUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Sample data
const sampleUsers = [
  {
    wallet_address: '0x1234567890123456789012345678901234567890',
    email: 'buyer1@test.com',
    username: 'test_buyer_1',
    kyc_status: 'verified',
    profile_data: { bio: 'Test buyer for comprehensive testing', location: 'Test City' }
  },
  {
    wallet_address: '0x0987654321098765432109876543210987654321',
    email: 'seller1@test.com',
    username: 'test_seller_1',
    kyc_status: 'verified',
    profile_data: { bio: 'Test seller for comprehensive testing', store_name: 'Test Electronics' }
  },
  {
    wallet_address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    email: 'admin@test.com',
    username: 'test_admin',
    kyc_status: 'verified',
    profile_data: { bio: 'Test admin user', role: 'admin' }
  },
  {
    wallet_address: '0x1111222233334444555566667777888899990000',
    email: 'arbitrator@test.com',
    username: 'test_arbitrator',
    kyc_status: 'verified',
    profile_data: { bio: 'Test arbitrator for dispute resolution', reputation: 95 }
  }
];

const sampleCategories = [
  'electronics',
  'clothing',
  'books',
  'home-garden',
  'sports',
  'automotive',
  'health-beauty',
  'toys-games',
  'art-collectibles',
  'digital-assets'
];

const sampleProducts = [
  {
    title: 'Test Smartphone Pro',
    description: 'High-end smartphone for comprehensive testing with advanced features',
    price_amount: '599.99',
    price_currency: 'USDC',
    category: 'electronics',
    images: ['smartphone1.jpg', 'smartphone2.jpg'],
    metadata: { brand: 'TestBrand', model: 'Pro-2024', color: 'Black', storage: '256GB' },
    inventory_count: 50,
    status: 'active'
  },
  {
    title: 'Test Laptop Ultra',
    description: 'Powerful laptop for testing performance and functionality',
    price_amount: '1299.99',
    price_currency: 'USDC',
    category: 'electronics',
    images: ['laptop1.jpg', 'laptop2.jpg'],
    metadata: { brand: 'TestTech', model: 'Ultra-2024', ram: '16GB', storage: '512GB SSD' },
    inventory_count: 25,
    status: 'active'
  },
  {
    title: 'Test Digital Art NFT',
    description: 'Unique digital artwork for NFT testing',
    price_amount: '0.5',
    price_currency: 'ETH',
    category: 'digital-assets',
    images: ['nft-art.png'],
    metadata: { artist: 'TestArtist', edition: 'Limited', rarity: 'Rare' },
    inventory_count: 1,
    status: 'active'
  },
  {
    title: 'Test Gaming Headset',
    description: 'Professional gaming headset for audio testing',
    price_amount: '149.99',
    price_currency: 'USDC',
    category: 'electronics',
    images: ['headset1.jpg'],
    metadata: { brand: 'TestAudio', type: 'Wireless', battery: '20 hours' },
    inventory_count: 100,
    status: 'active'
  },
  {
    title: 'Test Vintage Book',
    description: 'Rare vintage book for collectibles testing',
    price_amount: '89.99',
    price_currency: 'USDC',
    category: 'books',
    images: ['book1.jpg'],
    metadata: { author: 'Test Author', year: '1950', condition: 'Good' },
    inventory_count: 3,
    status: 'active'
  }
];

class TestDataSeeder {
  constructor() {
    this.pool = new Pool(dbConfig);
    this.userIds = [];
    this.productIds = [];
    this.orderIds = [];
  }

  async connect() {
    try {
      await this.pool.query('SELECT NOW()');
      console.log('✅ Connected to test database');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error.message);
      throw error;
    }
  }

  async seedUsers() {
    console.log('📝 Seeding test users...');
    
    for (const user of sampleUsers) {
      try {
        const result = await this.pool.query(
          `INSERT INTO users (wallet_address, email, username, kyc_status, profile_data, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) 
           ON CONFLICT (wallet_address) DO UPDATE SET
           email = EXCLUDED.email,
           username = EXCLUDED.username,
           kyc_status = EXCLUDED.kyc_status,
           profile_data = EXCLUDED.profile_data,
           updated_at = NOW()
           RETURNING id`,
          [user.wallet_address, user.email, user.username, user.kyc_status, JSON.stringify(user.profile_data)]
        );
        
        this.userIds.push(result.rows[0].id);
        console.log(`  ✅ Created user: ${user.username} (${result.rows[0].id})`);
      } catch (error) {
        console.error(`  ❌ Failed to create user ${user.username}:`, error.message);
      }
    }
  }

  async seedProducts() {
    console.log('📦 Seeding test products...');
    
    for (const product of sampleProducts) {
      try {
        // Assign to random seller (skip admin and arbitrator)
        const sellerId = this.userIds[1]; // Use test_seller_1
        
        const result = await this.pool.query(
          `INSERT INTO products (seller_id, title, description, price_amount, price_currency, category, images, metadata, inventory_count, status, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) 
           RETURNING id`,
          [
            sellerId,
            product.title,
            product.description,
            product.price_amount,
            product.price_currency,
            product.category,
            product.images,
            JSON.stringify(product.metadata),
            product.inventory_count,
            product.status
          ]
        );
        
        this.productIds.push(result.rows[0].id);
        console.log(`  ✅ Created product: ${product.title} (${result.rows[0].id})`);
      } catch (error) {
        console.error(`  ❌ Failed to create product ${product.title}:`, error.message);
      }
    }
  }

  async seedOrders() {
    console.log('🛒 Seeding test orders...');
    
    const orderStatuses = ['created', 'paid', 'shipped', 'delivered', 'completed'];
    const buyerId = this.userIds[0]; // test_buyer_1
    const sellerId = this.userIds[1]; // test_seller_1
    
    for (let i = 0; i < Math.min(5, this.productIds.length); i++) {
      try {
        const productId = this.productIds[i];
        const status = orderStatuses[i % orderStatuses.length];
        const quantity = Math.floor(Math.random() * 3) + 1;
        const totalAmount = (Math.random() * 1000 + 50).toFixed(2);
        
        const result = await this.pool.query(
          `INSERT INTO orders (buyer_id, seller_id, product_id, quantity, total_amount, currency, status, escrow_contract, transaction_hash, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) 
           RETURNING id`,
          [
            buyerId,
            sellerId,
            productId,
            quantity,
            totalAmount,
            'USDC',
            status,
            generateRandomAddress(),
            generateRandomHash()
          ]
        );
        
        this.orderIds.push(result.rows[0].id);
        console.log(`  ✅ Created order: ${result.rows[0].id} (${status})`);
      } catch (error) {
        console.error(`  ❌ Failed to create order:`, error.message);
      }
    }
  }

  async seedReviews() {
    console.log('⭐ Seeding test reviews...');
    
    const reviewComments = [
      'Excellent product, fast shipping!',
      'Good quality, as described.',
      'Amazing seller, highly recommended!',
      'Product works perfectly, great value.',
      'Outstanding service and communication.'
    ];
    
    const reviewerId = this.userIds[0]; // test_buyer_1
    const revieweeId = this.userIds[1]; // test_seller_1
    
    for (let i = 0; i < Math.min(3, this.orderIds.length); i++) {
      try {
        const orderId = this.orderIds[i];
        const rating = Math.floor(Math.random() * 2) + 4; // 4-5 stars
        const comment = reviewComments[i % reviewComments.length];
        
        await this.pool.query(
          `INSERT INTO reviews (reviewer_id, reviewee_id, order_id, rating, comment, blockchain_tx, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            reviewerId,
            revieweeId,
            orderId,
            rating,
            comment,
            generateRandomHash()
          ]
        );
        
        console.log(`  ✅ Created review: ${rating} stars for order ${orderId}`);
      } catch (error) {
        console.error(`  ❌ Failed to create review:`, error.message);
      }
    }
  }

  async seedTestScenarios() {
    console.log('🎭 Seeding test scenarios...');
    
    // Create a disputed order
    try {
      const buyerId = this.userIds[0];
      const sellerId = this.userIds[1];
      const productId = this.productIds[0];
      
      const result = await this.pool.query(
        `INSERT INTO orders (buyer_id, seller_id, product_id, quantity, total_amount, currency, status, escrow_contract, transaction_hash, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) 
         RETURNING id`,
        [
          buyerId,
          sellerId,
          productId,
          1,
          '299.99',
          'USDC',
          'disputed',
          generateRandomAddress(),
          generateRandomHash()
        ]
      );
      
      console.log(`  ✅ Created disputed order: ${result.rows[0].id}`);
    } catch (error) {
      console.error(`  ❌ Failed to create disputed order:`, error.message);
    }
    
    // Create an expired order
    try {
      const buyerId = this.userIds[0];
      const sellerId = this.userIds[1];
      const productId = this.productIds[1];
      
      await this.pool.query(
        `INSERT INTO orders (buyer_id, seller_id, product_id, quantity, total_amount, currency, status, escrow_contract, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days')`,
        [
          buyerId,
          sellerId,
          productId,
          1,
          '199.99',
          'USDC',
          'created',
          generateRandomAddress()
        ]
      );
      
      console.log(`  ✅ Created expired order for testing`);
    } catch (error) {
      console.error(`  ❌ Failed to create expired order:`, error.message);
    }
  }

  async generateAnalyticsData() {
    console.log('📊 Generating analytics data...');
    
    // Create historical orders for analytics
    const buyerId = this.userIds[0];
    const sellerId = this.userIds[1];
    
    for (let i = 0; i < 20; i++) {
      try {
        const productId = this.productIds[i % this.productIds.length];
        const daysAgo = Math.floor(Math.random() * 90);
        const amount = (Math.random() * 500 + 50).toFixed(2);
        
        await this.pool.query(
          `INSERT INTO orders (buyer_id, seller_id, product_id, quantity, total_amount, currency, status, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - INTERVAL '${daysAgo} days', NOW() - INTERVAL '${daysAgo} days')`,
          [
            buyerId,
            sellerId,
            productId,
            Math.floor(Math.random() * 3) + 1,
            amount,
            'USDC',
            'completed'
          ]
        );
      } catch (error) {
        console.error(`  ❌ Failed to create analytics order:`, error.message);
      }
    }
    
    console.log(`  ✅ Generated 20 historical orders for analytics`);
  }

  async validateSeededData() {
    console.log('🔍 Validating seeded data...');
    
    try {
      // Count users
      const userCount = await this.pool.query('SELECT COUNT(*) FROM users');
      console.log(`  📊 Users: ${userCount.rows[0].count}`);
      
      // Count products
      const productCount = await this.pool.query('SELECT COUNT(*) FROM products');
      console.log(`  📊 Products: ${productCount.rows[0].count}`);
      
      // Count orders
      const orderCount = await this.pool.query('SELECT COUNT(*) FROM orders');
      console.log(`  📊 Orders: ${orderCount.rows[0].count}`);
      
      // Count reviews
      const reviewCount = await this.pool.query('SELECT COUNT(*) FROM reviews');
      console.log(`  📊 Reviews: ${reviewCount.rows[0].count}`);
      
      // Validate relationships
      const orphanedProducts = await this.pool.query(
        'SELECT COUNT(*) FROM products WHERE seller_id NOT IN (SELECT id FROM users)'
      );
      
      const orphanedOrders = await this.pool.query(
        'SELECT COUNT(*) FROM orders WHERE buyer_id NOT IN (SELECT id FROM users) OR seller_id NOT IN (SELECT id FROM users)'
      );
      
      if (orphanedProducts.rows[0].count > 0) {
        console.warn(`  ⚠️  Found ${orphanedProducts.rows[0].count} orphaned products`);
      }
      
      if (orphanedOrders.rows[0].count > 0) {
        console.warn(`  ⚠️  Found ${orphanedOrders.rows[0].count} orphaned orders`);
      }
      
      console.log('  ✅ Data validation completed');
    } catch (error) {
      console.error('  ❌ Data validation failed:', error.message);
    }
  }

  async cleanup() {
    console.log('🧹 Cleaning up previous test data...');
    
    try {
      // Delete in reverse order of dependencies
      await this.pool.query('DELETE FROM reviews WHERE reviewer_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')');
      await this.pool.query('DELETE FROM orders WHERE buyer_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')');
      await this.pool.query('DELETE FROM products WHERE seller_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')');
      await this.pool.query('DELETE FROM users WHERE email LIKE \'%@test.com\'');
      
      console.log('  ✅ Previous test data cleaned up');
    } catch (error) {
      console.error('  ❌ Cleanup failed:', error.message);
    }
  }

  async close() {
    await this.pool.end();
    console.log('🔌 Database connection closed');
  }

  async seed() {
    try {
      await this.connect();
      await this.cleanup();
      await this.seedUsers();
      await this.seedProducts();
      await this.seedOrders();
      await this.seedReviews();
      await this.seedTestScenarios();
      await this.generateAnalyticsData();
      await this.validateSeededData();
      
      console.log('🎉 Test data seeding completed successfully!');
    } catch (error) {
      console.error('💥 Test data seeding failed:', error);
      throw error;
    } finally {
      await this.close();
    }
  }
}

// Run seeding if called directly
if (require.main === module) {
  const seeder = new TestDataSeeder();
  
  seeder.seed()
    .then(() => {
      console.log('✅ Seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding process failed:', error);
      process.exit(1);
    });
}

module.exports = TestDataSeeder;