import { databaseService } from './src/services/databaseService';
import { safeLogger } from './src/utils/safeLogger';

async function testDatabaseConnection() {
  try {
    safeLogger.info('Testing database connection...');
    
    // Check if database is connected
    const isConnected = databaseService.isDatabaseConnected();
    safeLogger.info(`Database connected: ${isConnected}`);
    
    if (isConnected) {
      // Try a simple query
      try {
        const result = await databaseService.query('SELECT 1 as test');
        safeLogger.info('Database query successful:', result);
      } catch (queryError) {
        safeLogger.error('Database query failed:', queryError);
      }
      
      // Try to get all posts
      try {
        const posts = await databaseService.getAllPosts();
        safeLogger.info(`Found ${posts.length} posts in database`);
      } catch (postError) {
        safeLogger.error('Failed to get posts:', postError);
      }
    } else {
      safeLogger.warn('Database is not connected');
    }
  } catch (error) {
    safeLogger.error('Database connection test failed:', error);
  }
}

testDatabaseConnection();