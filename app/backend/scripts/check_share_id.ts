
import { db } from '../src/db';
import { statuses, posts } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { unifiedShareResolver } from '../src/services/unifiedShareResolver';

async function checkShareId(shareId: string) {
    console.log(`Checking share ID: ${shareId}`);

    // Check statuses
    const status = await db.select().from(statuses).where(eq(statuses.shareId, shareId)).limit(1);
    console.log('Status found:', status.length > 0 ? status[0] : 'No');

    // Check posts
    const post = await db.select().from(posts).where(eq(posts.shareId, shareId)).limit(1);
    console.log('Post found:', post.length > 0 ? post[0] : 'No');

    // Check resolver
    console.log('Running resolver...');
    const resolution = await unifiedShareResolver.resolve(shareId);
    console.log('Resolution:', resolution);

    process.exit(0);
}

const shareId = process.argv[2] || 'qqIbbjf3';
checkShareId(shareId).catch(console.error);
