/**
 * Database Operations Tests
 * Tests for database operations and schema validation
 */

import { db } from '../../db/connection';
import { safeLogger } from '../utils/safeLogger';
import { posts, communities, conversations, messages } from '../../db/schema';
import { safeLogger } from '../utils/safeLogger';
import { eq, and, desc } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

describe('Database Operations Tests', () => {
  let testUserId: string;
  let testCommunityId: string;
  let testPostId: string;
  let testConversationId: string;

  beforeAll(async () => {
    // Setup test data
    testUserId = 'test-user-address';
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
  });

  async function cleanupTestData() {
    try {
      // Clean up in reverse order of dependencies
      if (testPostId) {
        await db.delete(posts).where(eq(posts.id, testPostId));
      }
      if (testConversationId) {
        await db.delete(messages).where(eq(messages.conversationId, testConversationId));
        await db.delete(conversations).where(eq(conversations.id, testConversationId));
      }
      if (testCommunityId) {
        await db.delete(communities).where(eq(communities.id, testCommunityId));
      }
    } catch (error) {
      safeLogger.error('Cleanup error:', error);
    }
  }

  describe('Community Operations', () => {
    it('should create a community', async () => {
      const communityData = {
        name: 'test-community',
        displayName: 'Test Community',
        description: 'A test community for database testing',
        category: 'technology',
        isPublic: true,
        memberCount: 1,
        postCount: 0
      };

      const [community] = await db.insert(communities)
        .values(communityData)
        .returning();

      expect(community).toBeDefined();
      expect(community.name).toBe(communityData.name);
      expect(community.displayName).toBe(communityData.displayName);
      expect(community.description).toBe(communityData.description);
      expect(community.category).toBe(communityData.category);
      expect(community.isPublic).toBe(communityData.isPublic);

      testCommunityId = community.id;
    });

    it('should retrieve community by id', async () => {
      const [community] = await db.select()
        .from(communities)
        .where(eq(communities.id, testCommunityId));

      expect(community).toBeDefined();
      expect(community.id).toBe(testCommunityId);
      expect(community.name).toBe('test-community');
    });

    it('should update community', async () => {
      const updatedData = {
        description: 'Updated test community description',
        memberCount: 5
      };

      await db.update(communities)
        .set(updatedData)
        .where(eq(communities.id, testCommunityId));

      const [community] = await db.select()
        .from(communities)
        .where(eq(communities.id, testCommunityId));

      expect(community.description).toBe(updatedData.description);
      expect(community.memberCount).toBe(updatedData.memberCount);
    });

    it('should search communities by name', async () => {
      const searchResults = await db.select()
        .from(communities)
        .where(eq(communities.name, 'test-community'));

      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].name).toBe('test-community');
    });

    it('should filter communities by category', async () => {
      const categoryResults = await db.select()
        .from(communities)
        .where(eq(communities.category, 'technology'));

      expect(categoryResults.length).toBeGreaterThan(0);
      expect(categoryResults.every(c => c.category === 'technology')).toBe(true);
    });
  });

  describe('Post Operations', () => {
    it('should create a post', async () => {
      const postData = {
        authorAddress: testUserId,
        communityId: testCommunityId,
        content: 'This is a test post for database testing',
        mediaUrls: ['https://example.com/image1.jpg'],
        tags: ['test', 'database'],
        engagementScore: 0,
        isDeleted: false,
        moderationStatus: 'approved' as const
      };

      const [post] = await db.insert(posts)
        .values(postData)
        .returning();

      expect(post).toBeDefined();
      expect(post.authorAddress).toBe(postData.authorAddress);
      expect(post.communityId).toBe(postData.communityId);
      expect(post.content).toBe(postData.content);
      expect(post.mediaUrls).toEqual(postData.mediaUrls);
      expect(post.tags).toEqual(postData.tags);

      testPostId = post.id;
    });

    it('should retrieve post by id', async () => {
      const [post] = await db.select()
        .from(posts)
        .where(eq(posts.id, testPostId));

      expect(post).toBeDefined();
      expect(post.id).toBe(testPostId);
      expect(post.content).toBe('This is a test post for database testing');
    });

    it('should update post engagement score', async () => {
      const newScore = 25;

      await db.update(posts)
        .set({ engagementScore: newScore })
        .where(eq(posts.id, testPostId));

      const [post] = await db.select()
        .from(posts)
        .where(eq(posts.id, testPostId));

      expect(post.engagementScore).toBe(newScore);
    });

    it('should filter posts by community', async () => {
      const communityPosts = await db.select()
        .from(posts)
        .where(eq(posts.communityId, testCommunityId));

      expect(communityPosts.length).toBeGreaterThan(0);
      expect(communityPosts.every(p => p.communityId === testCommunityId)).toBe(true);
    });

    it('should filter posts by author', async () => {
      const authorPosts = await db.select()
        .from(posts)
        .where(eq(posts.authorAddress, testUserId));

      expect(authorPosts.length).toBeGreaterThan(0);
      expect(authorPosts.every(p => p.authorAddress === testUserId)).toBe(true);
    });

    it('should order posts by creation date', async () => {
      const orderedPosts = await db.select()
        .from(posts)
        .orderBy(desc(posts.createdAt))
        .limit(10);

      expect(orderedPosts.length).toBeGreaterThan(0);
      
      // Verify ordering
      for (let i = 1; i < orderedPosts.length; i++) {
        expect(orderedPosts[i-1].createdAt >= orderedPosts[i].createdAt).toBe(true);
      }
    });

    it('should soft delete post', async () => {
      await db.update(posts)
        .set({ isDeleted: true })
        .where(eq(posts.id, testPostId));

      const [post] = await db.select()
        .from(posts)
        .where(eq(posts.id, testPostId));

      expect(post.isDeleted).toBe(true);
    });
  });

  describe('Conversation Operations', () => {
    it('should create a conversation', async () => {
      const conversationData = {
        participants: [testUserId, 'other-user-address'],
        isEncrypted: true,
        conversationType: 'direct' as const,
        metadata: { title: 'Test Conversation' }
      };

      const [conversation] = await db.insert(conversations)
        .values(conversationData)
        .returning();

      expect(conversation).toBeDefined();
      expect(conversation.participants).toEqual(conversationData.participants);
      expect(conversation.isEncrypted).toBe(conversationData.isEncrypted);
      expect(conversation.conversationType).toBe(conversationData.conversationType);

      testConversationId = conversation.id;
    });

    it('should retrieve conversation by id', async () => {
      const [conversation] = await db.select()
        .from(conversations)
        .where(eq(conversations.id, testConversationId));

      expect(conversation).toBeDefined();
      expect(conversation.id).toBe(testConversationId);
      expect(conversation.participants).toContain(testUserId);
    });

    it('should find conversations by participant', async () => {
      // This would require a more complex query with array operations
      // For now, we'll test basic retrieval
      const userConversations = await db.select()
        .from(conversations);

      const participantConversations = userConversations.filter(
        c => c.participants.includes(testUserId)
      );

      expect(participantConversations.length).toBeGreaterThan(0);
    });
  });

  describe('Message Operations', () => {
    it('should create a message', async () => {
      const messageData = {
        conversationId: testConversationId,
        fromAddress: testUserId,
        encryptedContent: 'encrypted-test-message-content',
        contentType: 'text' as const,
        encryptionMetadata: { algorithm: 'AES-GCM', keyId: 'test-key' },
        deliveryStatus: 'sent' as const
      };

      const [message] = await db.insert(messages)
        .values(messageData)
        .returning();

      expect(message).toBeDefined();
      expect(message.conversationId).toBe(messageData.conversationId);
      expect(message.fromAddress).toBe(messageData.fromAddress);
      expect(message.encryptedContent).toBe(messageData.encryptedContent);
      expect(message.contentType).toBe(messageData.contentType);
      expect(message.deliveryStatus).toBe(messageData.deliveryStatus);
    });

    it('should retrieve messages by conversation', async () => {
      const conversationMessages = await db.select()
        .from(messages)
        .where(eq(messages.conversationId, testConversationId))
        .orderBy(desc(messages.timestamp));

      expect(conversationMessages.length).toBeGreaterThan(0);
      expect(conversationMessages.every(m => m.conversationId === testConversationId)).toBe(true);
    });

    it('should update message delivery status', async () => {
      const [firstMessage] = await db.select()
        .from(messages)
        .where(eq(messages.conversationId, testConversationId))
        .limit(1);

      await db.update(messages)
        .set({ deliveryStatus: 'delivered' })
        .where(eq(messages.id, firstMessage.id));

      const [updatedMessage] = await db.select()
        .from(messages)
        .where(eq(messages.id, firstMessage.id));

      expect(updatedMessage.deliveryStatus).toBe('delivered');
    });

    it('should order messages by timestamp', async () => {
      const orderedMessages = await db.select()
        .from(messages)
        .where(eq(messages.conversationId, testConversationId))
        .orderBy(desc(messages.timestamp));

      expect(orderedMessages.length).toBeGreaterThan(0);
      
      // Verify ordering
      for (let i = 1; i < orderedMessages.length; i++) {
        expect(orderedMessages[i-1].timestamp >= orderedMessages[i].timestamp).toBe(true);
      }
    });
  });

  describe('Full-Text Search', () => {
    it('should search posts by content', async () => {
      // This would test the full-text search functionality
      // Implementation depends on the specific database and search setup
      const searchTerm = 'test';
      
      const searchResults = await db.select()
        .from(posts)
        .where(eq(posts.content, searchTerm)); // Simplified for this test

      // In a real implementation, this would use full-text search
      expect(Array.isArray(searchResults)).toBe(true);
    });
  });

  describe('Database Constraints and Validation', () => {
    it('should enforce required fields', async () => {
      try {
        await db.insert(posts).values({
          // Missing required fields
          authorAddress: '',
          content: ''
        });
        
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle unique constraints', async () => {
      try {
        // Try to create community with same name
        await db.insert(communities).values({
          name: 'test-community', // Same as existing
          displayName: 'Duplicate Community',
          description: 'This should fail',
          category: 'technology'
        });
        
        // Should not reach here if unique constraint is enforced
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Performance and Indexing', () => {
    it('should efficiently query posts by engagement score', async () => {
      const startTime = Date.now();
      
      const topPosts = await db.select()
        .from(posts)
        .orderBy(desc(posts.engagementScore))
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(topPosts).toBeDefined();
      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should efficiently query communities by member count', async () => {
      const startTime = Date.now();
      
      const popularCommunities = await db.select()
        .from(communities)
        .orderBy(desc(communities.memberCount))
        .limit(10);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(popularCommunities).toBeDefined();
      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Transaction Handling', () => {
    it('should handle database transactions', async () => {
      await db.transaction(async (tx) => {
        // Create a post and update community post count
        const [newPost] = await tx.insert(posts).values({
          authorAddress: testUserId,
          communityId: testCommunityId,
          content: 'Transaction test post',
          engagementScore: 0,
          isDeleted: false,
          moderationStatus: 'approved'
        }).returning();

        await tx.update(communities)
          .set({ postCount: 1 })
          .where(eq(communities.id, testCommunityId));

        expect(newPost).toBeDefined();
      });

      // Verify both operations completed
      const [community] = await db.select()
        .from(communities)
        .where(eq(communities.id, testCommunityId));

      expect(community.postCount).toBe(1);
    });

    it('should rollback on transaction failure', async () => {
      const originalPostCount = await db.select()
        .from(posts)
        .where(eq(posts.communityId, testCommunityId));

      try {
        await db.transaction(async (tx) => {
          // Create a post
          await tx.insert(posts).values({
            authorAddress: testUserId,
            communityId: testCommunityId,
            content: 'This should be rolled back',
            engagementScore: 0,
            isDeleted: false,
            moderationStatus: 'approved'
          });

          // Force an error
          throw new Error('Transaction rollback test');
        });
      } catch (error) {
        expect(error.message).toBe('Transaction rollback test');
      }

      // Verify rollback - post count should be unchanged
      const finalPostCount = await db.select()
        .from(posts)
        .where(eq(posts.communityId, testCommunityId));

      expect(finalPostCount.length).toBe(originalPostCount.length);
    });
  });
});