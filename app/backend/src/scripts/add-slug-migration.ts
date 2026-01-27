import { drizzle } from "drizzle-orm/postgres-js";
import { safeLogger } from '../utils/safeLogger';
import postgres from "postgres";
import dotenv from "dotenv";
import { communities } from '../db/schema';
import { eq } from 'drizzle-orm';

dotenv.config();

async function addSlugColumn() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    safeLogger.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  // Disable prefetch as it's not supported in production environments
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client);

  try {
    safeLogger.info('Adding slug column to communities table...');
    
    // Check if slug column already exists
    const result = await client`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'communities' 
      AND column_name = 'slug'
    `;
    
    if (result.length === 0) {
      // Add slug column
      await client`
        ALTER TABLE communities ADD COLUMN slug varchar(64) NOT NULL DEFAULT ''
      `;
      safeLogger.info('Slug column added');
      
      // Create unique index
      await client`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_communities_slug ON communities(slug)
      `;
      safeLogger.info('Unique index on slug created');
      
      // Generate slugs for existing communities
      const existingCommunities = await db.select().from(communities);
      
      for (const community of existingCommunities) {
        let baseSlug = community.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        
        let slug = baseSlug;
        let counter = 1;
        
        // Check if slug already exists
        while (true) {
          const existing = await db
            .select({ id: communities.id })
            .from(communities)
            .where(eq(communities.slug, slug))
            .limit(1);
          
          if (existing.length === 0 || existing[0].id === community.id) {
            break;
          }
          
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
        
        // Update the community with the slug
        await db
          .update(communities)
          .set({ slug })
          .where(eq(communities.id, community.id));
        
        safeLogger.info(`Updated community "${community.name}" with slug "${slug}"`);
      }
      
      safeLogger.info('Migration completed successfully!');
    } else {
      safeLogger.info('Slug column already exists');
    }
  } catch (error) {
    safeLogger.error('Error running migration:', error);
    throw error;
  } finally {
    await client.end();
  }
}

addSlugColumn().catch(console.error);