import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import dotenv from "dotenv";

dotenv.config();

async function initializeDatabase() {
  console.log('Initializing database...');
  
  try {
    // Create postgres client
    const connectionString = process.env.DATABASE_URL || "";
    if (!connectionString) {
      throw new Error('DATABASE_URL not found in environment variables');
    }
    
    console.log('Connecting to database...');
    const client = postgres(connectionString, { 
      prepare: false,
      max: 5,
      idle_timeout: 20,
      connect_timeout: 30
    });
    
    // Create Drizzle ORM instance
    const db = drizzle(client, { schema });
    
    // Test connection by running a simple query
    console.log('Testing database connection...');
    await client`SELECT NOW() as current_time`;
    console.log('✅ Database connection successful!');
    
    // Try to create a simple test user to verify tables exist
    console.log('Testing table structure...');
    try {
      await db.insert(schema.users).values({
        address: '0x0000000000000000000000000000000000000001',
        handle: 'test_user_temp'
      });
      console.log('✅ User table is working');
      
      // Clean up test user
      await client`DELETE FROM users WHERE address = '0x0000000000000000000000000000000000000001'`;
    } catch (error) {
      console.log('⚠️  Tables may not exist yet. This is normal for first-time setup.');
      console.log('Error:', error.message);
    }
    
    console.log('✅ Database initialization complete!');
    await client.end();
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  initializeDatabase();
}

export default initializeDatabase;