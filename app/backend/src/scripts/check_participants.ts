
import { db } from '../db';
import { conversations } from '../db/schema';
import { desc } from 'drizzle-orm';

async function verifyParticipants() {
    console.log('Fetching recent conversations...');

    const results = await db
        .select({
            id: conversations.id,
            participants: conversations.participants,
            createdAt: conversations.createdAt
        })
        .from(conversations)
        .orderBy(desc(conversations.createdAt))
        .limit(5);

    console.log('Recent Conversations Participants:');
    results.forEach(r => {
        console.log(`ID: ${r.id}`);
        console.log(`Participants (${typeof r.participants}):`, JSON.stringify(r.participants, null, 2));
        console.log('---');
    });

    process.exit(0);
}

verifyParticipants().catch(console.error);
