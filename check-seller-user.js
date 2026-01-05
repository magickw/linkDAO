const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

async function checkSellerUser(walletAddress) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const normalizedAddress = walletAddress.toLowerCase();

    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, wallet_address, display_name, role FROM users WHERE wallet_address = $1',
      [normalizedAddress]
    );

    console.log('\n=== User Table Results ===');
    console.log(`Found ${userResult.rows.length} user(s) with wallet address: ${walletAddress}`);
    
    if (userResult.rows.length > 0) {
      console.log('User details:');
      userResult.rows.forEach(user => {
        console.log(`  - ID: ${user.id}`);
        console.log(`  - Wallet Address: ${user.wallet_address}`);
        console.log(`  - Display Name: ${user.display_name}`);
        console.log(`  - Role: ${user.role}`);
      });
    } else {
      console.log('❌ No user found in users table');
    }

    // Check if seller exists
    const sellerResult = await pool.query(
      'SELECT id, wallet_address, store_name FROM sellers WHERE wallet_address = $1',
      [normalizedAddress]
    );

    console.log('\n=== Seller Table Results ===');
    console.log(`Found ${sellerResult.rows.length} seller(s) with wallet address: ${walletAddress}`);
    
    if (sellerResult.rows.length > 0) {
      console.log('Seller details:');
      sellerResult.rows.forEach(seller => {
        console.log(`  - ID: ${seller.id}`);
        console.log(`  - Wallet Address: ${seller.wallet_address}`);
        console.log(`  - Store Name: ${seller.store_name}`);
      });
    } else {
      console.log('❌ No seller found in sellers table');
    }

    // Check for promo codes
    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;
      const promoResult = await pool.query(
        'SELECT id, code, discount_type, discount_value, is_active, created_at FROM promo_codes WHERE seller_id = $1 ORDER BY created_at DESC',
        [userId]
      );

      console.log('\n=== Promo Codes Results ===');
      console.log(`Found ${promoResult.rows.length} promo code(s) for user: ${userId}`);
      
      if (promoResult.rows.length > 0) {
        console.log('Promo codes:');
        promoResult.rows.forEach(promo => {
          console.log(`  - ID: ${promo.id}`);
          console.log(`  - Code: ${promo.code}`);
          console.log(`  - Discount Type: ${promo.discount_type}`);
          console.log(`  - Discount Value: ${promo.discount_value}`);
          console.log(`  - Is Active: ${promo.is_active}`);
          console.log(`  - Created At: ${promo.created_at}`);
        });
      } else {
        console.log('❌ No promo codes found');
      }
    }

    // Check all promo codes for debugging
    const allPromoResult = await pool.query(
      'SELECT id, code, seller_id, is_active, created_at FROM promo_codes ORDER BY created_at DESC LIMIT 10'
    );

    console.log('\n=== All Promo Codes (Last 10) ===');
    console.log(`Total promo codes in database: ${allPromoResult.rows.length}`);
    
    if (allPromoResult.rows.length > 0) {
      console.log('Recent promo codes:');
      allPromoResult.rows.forEach(promo => {
        console.log(`  - ID: ${promo.id}`);
        console.log(`  - Code: ${promo.code}`);
        console.log(`  - Seller ID: ${promo.seller_id}`);
        console.log(`  - Is Active: ${promo.is_active}`);
        console.log(`  - Created At: ${promo.created_at}`);
      });
    } else {
      console.log('❌ No promo codes found in database');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

// Get wallet address from command line or use default
const walletAddress = process.argv[2] || '0xEe034b53D4cCb101b2a4faec27708be507197350';
console.log(`\nChecking seller user for wallet address: ${walletAddress}`);
checkSellerUser(walletAddress);