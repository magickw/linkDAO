
import { db } from '../db';
import { chatMessages, conversations } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

async function reproduceMessageError() {
    console.log('Starting reproduction script...');

    try {
        // 1. Get a recent valid conversation
        const recentConvo = await db
            .select()
            .from(conversations)
            .limit(1)
            .orderBy(desc(conversations.lastActivity));

        if (!recentConvo || recentConvo.length === 0) {
            console.error('No conversations found to test with.');
            process.exit(1);
        }

        const conversation = recentConvo[0];
        const conversationId = conversation.id;
        // Use first participant as sender
        let participants = conversation.participants;
        if (typeof participants === 'string') {
            try {
                participants = JSON.parse(participants);
            } catch (e) {
                console.error('Failed to parse participants JSON:', e);
                participants = [];
            }
        }
        const fromAddress = Array.isArray(participants) ? participants[0] : null;

        if (!fromAddress) {
            console.error('No valid participants found.');
            process.exit(1);
        }

        console.log(`Testing with Conversation ID: ${conversationId}`);
        console.log(`Sender: ${fromAddress}`);

        // 2. Prepare message payload (same as messagingService.ts)
        const messageContent = "Debug message from script " + new Date().toISOString();

        // TEST BLOB
        console.log('Testing Blob availability...');
        try {
            const contentSize = new Blob([messageContent]).size;
            console.log('Blob size check passed:', contentSize);
        } catch (e) {
            console.error('Blob check FAILED:', e);
            throw e;
        }

        console.log('Attempting DB insert...');

        const newMessage = await db
            .insert(chatMessages)
            .values({
                conversationId,
                senderAddress: fromAddress,
                content: messageContent,
                messageType: 'text',
                encryptionMetadata: null, // Test with null
                replyToId: null,
                attachments: null,
                sentAt: new Date(),
                deliveryStatus: 'sent',
                replyCount: 0
            })
            .returning();

        console.log('Success! Message inserted:', newMessage[0].id);

        console.log('Attempting Conversation Update...');
        await db
            .update(conversations)
            .set({
                lastActivity: new Date(),
                lastMessageId: newMessage[0].id
            })
            .where(eq(conversations.id, conversationId));

        console.log('Success! Conversation updated.');

    } catch (error) {
        console.error('---------------------------------------------------');
        console.error('CAUGHT ERROR DURING INSERT:');
        console.error(error);
        if (error instanceof Error) {
            console.error('Message:', error.message);
            console.error('Stack:', error.stack);
            // Log detailed properties if it's a Drizzle/Postgres error
            console.error('Full Error Object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        }
        console.error('---------------------------------------------------');
    } finally {
        process.exit(0);
    }
}

reproduceMessageError().catch(console.error);
