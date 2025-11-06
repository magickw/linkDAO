import { drizzle } from "drizzle-orm/postgres-js";
import { safeLogger } from '../utils/safeLogger';
import postgres from "postgres";
import * as schema from "./schema";
import dotenv from "dotenv";

dotenv.config();

// For production, use the DATABASE_URL from environment variables
// For development, you can use a local PostgreSQL instance
// If no DATABASE_URL is provided, the application will run without database connectivity
const connectionString = process.env.DATABASE_URL || "";

// Resource constraint detection
const isRenderFree = process.env.RENDER && !process.env.RENDER_PRO;
const isRenderPro = process.env.RENDER && process.env.RENDER_PRO;
const isResourceConstrained = isRenderFree || (process.env.MEMORY_LIMIT && parseInt(process.env.MEMORY_LIMIT) < 1024);

let client;
let db;

if (connectionString) {
  try {
    // Optimized postgres client configuration for resource constraints
    const clientConfig = {
      prepare: false, // Disable prefetch as it's not supported in production environments
      max: isRenderFree ? 2 : (isRenderPro ? 5 : 20), // Connection pool size
      idle_timeout: isRenderFree ? 20 : (isRenderPro ? 30 : 60), // Seconds
      connect_timeout: isRenderFree ? 5 : (isRenderPro ? 3 : 2), // Seconds
      // Add resource management options
      transform: {
        undefined: null, // Transform undefined to null to prevent issues
      },
      // Add connection cleanup
      onnotice: isResourceConstrained ? undefined : (notice: any) => {
        safeLogger.debug('Database notice:', notice);
      },
      // Reduce memory usage by limiting result set processing
      fetch_array_size: isResourceConstrained ? 100 : 1000,
    };

    client = postgres(connectionString, clientConfig);
    db = drizzle(client, { schema });
    
    const tierInfo = isRenderFree ? 'Free' : (isRenderPro ? 'Pro' : 'Standard');
    safeLogger.info(`✅ Database connection established successfully (${tierInfo} tier optimized)`);
    
    // Add connection health monitoring for resource-constrained environments
    if (isResourceConstrained) {
      // Test connection periodically
      setInterval(async () => {
        try {
          await client`SELECT 1`;
        } catch (error) {
          safeLogger.error('❌ Database health check failed:', error);
        }
      }, 300000); // Every 5 minutes
    }
    
  } catch (error) {
    safeLogger.error('❌ Failed to establish database connection:', error);
    client = null;
    db = null;
  }
} else {
  safeLogger.warn('⚠️  No DATABASE_URL provided. Database operations will be disabled.');
  client = null;
  db = null;
}

// Add graceful cleanup function
const cleanup = async () => {
  if (client) {
    try {
      await client.end();
      safeLogger.info('✅ Database client closed gracefully');
    } catch (error) {
      safeLogger.error('❌ Error closing database client:', error);
    }
  }
};

// Export cleanup function for use in graceful shutdown
export { db, client, cleanup };
