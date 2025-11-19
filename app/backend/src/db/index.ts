import { drizzle } from "drizzle-orm/postgres-js";
import { safeLogger } from '../utils/safeLogger';
import postgres from "postgres";
import * as schema from "./schema";
import dotenv from "dotenv";

dotenv.config();

// For production, use the DATABASE_URL from environment variables
const connectionString = process.env.DATABASE_URL || "";

// Resource constraint detection
const isRenderFree = process.env.RENDER && !process.env.RENDER_PRO;
const isRenderPro = process.env.RENDER && process.env.RENDER_PRO;
const isResourceConstrained = isRenderFree || (process.env.MEMORY_LIMIT && parseInt(process.env.MEMORY_LIMIT) < 1024);

// Global declaration for hot-reloading in development
declare global {
  var _dbClient: postgres.Sql | undefined;
  var _dbInstance: ReturnType<typeof drizzle> | undefined;
}

let client: postgres.Sql | undefined;
let db: ReturnType<typeof drizzle> | undefined;

if (connectionString) {
  try {
    // Reuse existing connection in development (hot-reloading)
    if (process.env.NODE_ENV !== 'production' && global._dbClient) {
      client = global._dbClient;
      db = global._dbInstance;
      safeLogger.debug('🔄 Reusing existing database connection (Development)');
    } else {
      // Optimized postgres client configuration
      const maxConnections = process.env.DB_MAX_CONNECTIONS
        ? parseInt(process.env.DB_MAX_CONNECTIONS)
        : (isRenderFree ? 2 : (isRenderPro ? 5 : 20));

      const clientConfig = {
        prepare: false, // Disable prefetch as it's not supported in production environments
        max: maxConnections,
        idle_timeout: isRenderFree ? 20 : (isRenderPro ? 30 : 60), // Seconds
        connect_timeout: isRenderFree ? 5 : (isRenderPro ? 3 : 2), // Seconds
        max_lifetime: 60 * 30, // 30 minutes max connection lifetime to prevent stale connections

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

      // Store in global for development hot-reloading
      if (process.env.NODE_ENV !== 'production') {
        global._dbClient = client;
        global._dbInstance = db;
      }

      const tierInfo = isRenderFree ? 'Free' : (isRenderPro ? 'Pro' : 'Standard');
      safeLogger.info(`✅ Database connection established successfully (${tierInfo} tier optimized, max: ${maxConnections})`);

      // Add connection health monitoring for resource-constrained environments
      if (isResourceConstrained) {
        // Test connection periodically
        setInterval(async () => {
          try {
            if (client) await client`SELECT 1`;
          } catch (error) {
            safeLogger.error('❌ Database health check failed:', error);
          }
        }, 300000); // Every 5 minutes
      }
    }

  } catch (error) {
    safeLogger.error('❌ Failed to establish database connection:', error);
    client = undefined;
    db = undefined;
  }
} else {
  safeLogger.warn('⚠️  No DATABASE_URL provided. Database operations will be disabled.');
  client = undefined;
  db = undefined;
}

// Add graceful cleanup function
const cleanup = async () => {
  if (client) {
    try {
      // Don't close in development to support hot-reloading
      if (process.env.NODE_ENV === 'production') {
        await client.end();
        safeLogger.info('✅ Database client closed gracefully');
      }
    } catch (error) {
      safeLogger.error('❌ Error closing database client:', error);
    }
  }
};

// Export cleanup function for use in graceful shutdown
export { db, client, cleanup };
