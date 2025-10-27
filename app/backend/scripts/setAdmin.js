// Script to set a user as admin
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { users } = require('../src/db/schema');

// Get wallet address from command line arguments
const walletAddress = process.argv[2];

if (!walletAddress) {
  console.error('Usage: node setAdmin.js <walletAddress>');
  process.exit(1);
}

async function setAdmin() {
  try {
    // Initialize database connection
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error('DATABASE_URL environment variable is required');
      process.exit(1);
    }

    const sql = postgres(connectionString, { ssl: 'require' });
    const db = drizzle(sql);

    // Update user role to admin
    const result = await db
      .update(users)
      .set({ role: 'admin' })
      .where(users.walletAddress, walletAddress.toLowerCase())
      .returning();

    if (result.length === 0) {
      console.log(`No user found with wallet address: ${walletAddress}`);
    } else {
      console.log(`User with wallet address ${walletAddress} has been set as admin`);
    }

    // Close database connection
    await sql.end();
  } catch (error) {
    console.error('Error setting admin role:', error);
    process.exit(1);
  }
}

setAdmin();