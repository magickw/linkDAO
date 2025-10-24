const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_eqKdwjDV7R9I@ep-quiet-lake-adx0tq66-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
});

async function createTestProduct() {
  try {
    // Create a simple test product
    const client = await pool.connect();
    
    // Check if category exists
    const categoryResult = await client.query('SELECT id FROM categories WHERE slug = $1', ['electronics']);
    let categoryId;
    
    if (categoryResult.rows.length === 0) {
      // Create category
      categoryId = uuidv4();
      const newCategory = await client.query(
        'INSERT INTO categories (id, name, slug, description, path, is_active, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [categoryId, 'Electronics', 'electronics', 'Electronic devices', '["Electronics"]', true, 0]
      );
      categoryId = newCategory.rows[0].id;
    } else {
      categoryId = categoryResult.rows[0].id;
    }
    
    // Check if user exists
    const userResult = await client.query('SELECT id FROM users WHERE wallet_address = $1', ['0x1234567890123456789012345678901234567890']);
    let userId;
    
    if (userResult.rows.length === 0) {
      // Create user
      userId = uuidv4();
      const newUser = await client.query(
        'INSERT INTO users (id, wallet_address) VALUES ($1, $2) RETURNING id',
        [userId, '0x1234567890123456789012345678901234567890']
      );
      userId = newUser.rows[0].id;
    } else {
      userId = userResult.rows[0].id;
    }
    
    // Check if seller exists
    const sellerResult = await client.query('SELECT id FROM sellers WHERE wallet_address = $1', ['0x1234567890123456789012345678901234567890']);
    
    if (sellerResult.rows.length === 0) {
      // Create seller
      await client.query(
        'INSERT INTO sellers (wallet_address, display_name, store_name, bio, is_online, tier) VALUES ($1, $2, $3, $4, $5, $6)',
        ['0x1234567890123456789012345678901234567890', 'Test Seller', 'Test Store', 'Test seller bio', true, 'standard']
      );
    }
    
    // Create product
    const productId = uuidv4();
    const productResult = await client.query(
      'INSERT INTO products (id, seller_id, title, description, price_amount, price_currency, category_id, images, metadata, inventory, status, tags) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id',
      [
        productId,
        userId,
        'Test Product',
        'This is a test product for marketplace testing',
        '99.99',
        'USD',
        categoryId,
        '["https://placehold.co/600x400"]',
        '{"condition": "new", "brand": "TestBrand", "model": "TestModel"}',
        10,
        'active',
        '["test", "electronics"]'
      ]
    );
    
    console.log('Test product created successfully with ID:', productResult.rows[0].id);
    client.release();
  } catch (error) {
    console.error('Error creating test product:', error.message);
  } finally {
    await pool.end();
  }
}

createTestProduct();