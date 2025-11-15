import { Post, CreatePostInput, UpdatePostInput } from '../models/Post';
import { safeLogger } from '../utils/safeLogger';
import { MetadataService } from './metadataService';
import { databaseService } from './databaseService'; // Import the singleton instance
import { UserProfileService } from './userProfileService';
import { aiContentModerationService } from './aiContentModerationService';

// Use the singleton instance instead of creating a new one
// const databaseService = new DatabaseService();
const userProfileService = new UserProfileService();

export class PostService {
  private metadataService: MetadataService;

  constructor() {
    this.metadataService = new MetadataService();
  }

  async createPost(input: CreatePostInput): Promise<Post> {
    try {
      // Check if database is connected with more detailed logging
      if (!databaseService.isDatabaseConnected() || !databaseService.db) {
        safeLogger.warn('Database service not connected. Current state:', {
          isConnected: databaseService.isDatabaseConnected(),
          hasDbInstance: !!databaseService.db,
          timestamp: new Date().toISOString()
        });
        
        // The database service might have been initialized but failed to connect
        // Check if the database connection is actually available by testing it
        try {
          // Attempt a simple query to test the connection
          await databaseService.getDatabase().select().from({}).limit(1);
        } catch (dbTestError) {
          safeLogger.error('Database connection test failed:', dbTestError);
          // If we can't connect to the database, throw the original error
          throw new Error('Service temporarily unavailable. Please try again later.');
        }
      }

      // Get user ID and profile from address with fallback
      let user;
      try {
        user = await userProfileService.getProfileByAddress(input.author);
        if (!user) {
          // Create user if they don't exist
          // Generate a unique handle using wallet address (truncated) and timestamp
          const uniqueHandle = `user_${input.author.substring(0, 8)}_${Date.now()}`;
          user = await userProfileService.createProfile({
            walletAddress: input.author,
            handle: uniqueHandle,
            ens: '',
            avatarCid: '',
            bioCid: ''
          });
        }
      } catch (userError) {
        safeLogger.warn('User profile service failed, using fallback user:', userError);
        // Fallback: Create a temporary user object
        user = {
          id: `temp_user_${Date.now()}`,
          walletAddress: input.author,
          handle: `temp_${input.author.substring(0, 8)}`,
          ens: '',
          avatarCid: '',
          bioCid: '',
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }

      // Generate temporary content ID for moderation
      const tempContentId = `post_${Date.now()}_${user.id}`;

      // Run AI moderation check with fallback
      let moderationReport;
      try {
        moderationReport = await aiContentModerationService.moderateContent({
          id: tempContentId,
          text: input.content,
          userId: user.id,
          type: 'post'
        });

        // Check if content should be blocked immediately
        if (moderationReport.recommendedAction === 'block') {
          throw new Error(
            `Content violates community guidelines: ${moderationReport.explanation}. ` +
            `Risk score: ${moderationReport.overallRiskScore.toFixed(2)}. ` +
            `Please review our content policy and try again.`
          );
        }
      } catch (moderationError) {
        safeLogger.warn('AI moderation service unavailable, allowing content with manual review flag:', moderationError);
        // Fallback: Allow content but flag for manual review
        moderationReport = {
          recommendedAction: 'review',
          overallRiskScore: 0.5,
          explanation: 'Content flagged for manual review due to moderation service unavailability',
          spamDetection: { isSpam: false },
          toxicityDetection: { isToxic: false },
          contentPolicy: { violatesPolicy: false },
          copyrightDetection: { potentialInfringement: false }
        };
      }

      // Upload content to IPFS with fallback
      let contentCid;
      try {
        contentCid = await this.metadataService.uploadToIPFS(input.content);
      } catch (ipfsError) {
        safeLogger.warn('IPFS upload failed, using fallback CID:', ipfsError);
        // Fallback: Use a mock CID for development/testing
        contentCid = `mock_content_${Date.now()}_${Buffer.from(input.content).toString('base64').substring(0, 10)}`;
      }

      // Upload media to IPFS (if any) with fallback
      const mediaCids: string[] = [];
      if (input.media) {
        for (let i = 0; i < input.media.length; i++) {
          try {
            const mediaCid = await this.metadataService.uploadToIPFS(input.media[i]);
            mediaCids.push(mediaCid);
          } catch (ipfsError) {
            safeLogger.warn(`IPFS upload failed for media ${i}, using fallback CID:`, ipfsError);
            // Fallback: Use a mock CID for media
            mediaCids.push(`mock_media_${Date.now()}_${i}`);
          }
        }
      }

      // Determine post status based on moderation result
      let postStatus: 'active' | 'limited' | 'pending_review' = 'active';
      let moderationWarning: string | null = null;

      if (moderationReport.recommendedAction === 'review') {
        postStatus = 'pending_review';
        moderationWarning = 'This post is under review by moderators.';
      } else if (moderationReport.recommendedAction === 'limit') {
        postStatus = 'limited';
        moderationWarning = 'This post has limited visibility due to potentially sensitive content.';
      }

      // Create post in database with fallback
      let dbPost;
      try {
        dbPost = await databaseService.createPost(
          user.id,
          contentCid,
          input.parentId ? parseInt(input.parentId) : undefined,
          mediaCids.length > 0 ? mediaCids : undefined,
          input.tags && input.tags.length > 0 ? input.tags : undefined,
          input.onchainRef
        );
        
        // Update post with moderation metadata
        try {
          await databaseService.updatePost(dbPost.id, {
            moderationStatus: postStatus,
            moderationRiskScore: moderationReport.overallRiskScore,
            moderationCategories: JSON.stringify([
              moderationReport.spamDetection?.isSpam ? 'spam' : null,
              moderationReport.toxicityDetection?.isToxic ? moderationReport.toxicityDetection.toxicityType : null,
              moderationReport.contentPolicy?.violatesPolicy ? moderationReport.contentPolicy.policyType : null,
              moderationReport.copyrightDetection?.potentialInfringement ? 'copyright' : null
            ].filter(Boolean)),
            moderationExplanation: moderationReport.explanation
          });
        } catch (updateError) {
          safeLogger.warn('Failed to update post with moderation metadata:', updateError);
          // Continue without moderation metadata
        }
      } catch (dbError) {
        safeLogger.error('Database post creation failed:', dbError);
        // If database fails, throw error to trigger fallback service
        throw new Error('Database service temporarily unavailable. Please try again later.');
      }

      // Handle potential null dates by providing default values
      const createdAt = dbPost.createdAt || new Date();

      const post: Post = {
        id: dbPost.id.toString(),
        author: input.author,
        parentId: input.parentId || null,
        contentCid,
        mediaCids,
        tags: input.tags || [],
        createdAt,
        onchainRef: input.onchainRef || '',
        // Add moderation metadata
        moderationStatus: postStatus,
        moderationWarning: moderationWarning,
        riskScore: moderationReport.overallRiskScore
      };

      // Log moderation result for analytics
      safeLogger.info(`[MODERATION] Post ${post.id} created with status: ${postStatus}, risk: ${moderationReport.overallRiskScore.toFixed(2)}`);

      return post;
    } catch (error) {
      safeLogger.error('Error creating post:', error);
      
      // If it's a database connectivity issue, throw a specific error
      if (error.message && error.message.includes('Database service temporarily unavailable')) {
        throw new Error('Service temporarily unavailable. Please try again later.');
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  async getPostById(id: string): Promise<Post | undefined> {
    // Convert string ID to number
    const postId = parseInt(id);
    if (isNaN(postId)) {
      safeLogger.info(`Invalid post ID: ${id}`);
      return undefined;
    }
    
    try {
      // Fetch the post from database using the new dedicated method
      const dbPost = await databaseService.getPostById(postId);
      
      if (!dbPost) {
        safeLogger.info(`Post not found with ID: ${postId}`);
        return undefined;
      }
      
      // Get user profile for author info
      const author = dbPost.authorId ? await userProfileService.getProfileById(dbPost.authorId) : null;
      if (!author) {
        safeLogger.info(`Author not found for post ID: ${postId}, authorId: ${dbPost.authorId}`);
        // Instead of returning undefined, create a minimal response with unknown author
        return {
          id: dbPost.id.toString(),
          author: 'unknown',
          parentId: dbPost.parentId ? dbPost.parentId.toString() : null,
          contentCid: dbPost.contentCid,
          mediaCids: dbPost.mediaCids ? JSON.parse(dbPost.mediaCids) : [],
          tags: dbPost.tags ? JSON.parse(dbPost.tags) : [],
          createdAt: dbPost.createdAt || new Date(),
          onchainRef: '',
        };
      }
      
      return {
        id: dbPost.id.toString(),
        author: author.walletAddress,
        parentId: dbPost.parentId ? dbPost.parentId.toString() : null,
        contentCid: dbPost.contentCid,
        mediaCids: dbPost.mediaCids ? JSON.parse(dbPost.mediaCids) : [],
        tags: dbPost.tags ? JSON.parse(dbPost.tags) : [],
        createdAt: dbPost.createdAt || new Date(),
        onchainRef: '',
      };
    } catch (error) {
      safeLogger.error('Error getting post by ID:', error);
      return undefined;
    }
  }

  async getPostsByAuthor(author: string): Promise<Post[]> {
    // Get user ID from address
    const user = await userProfileService.getProfileByAddress(author);
    if (!user) {
      return [];
    }
    
    // Get posts from database
    const dbPosts = await databaseService.getPostsByAuthor(user.id);
    
    // Convert to Post model
    const posts: Post[] = dbPosts.map((dbPost: any) => {
      // Handle potential null dates by providing default values
      const createdAt = dbPost.createdAt || new Date();
      
      return {
        id: dbPost.id.toString(),
        author,
        parentId: dbPost.parentId ? dbPost.parentId.toString() : null,
        contentCid: dbPost.contentCid,
        mediaCids: dbPost.mediaCids ? JSON.parse(dbPost.mediaCids) : [],
        tags: dbPost.tags ? JSON.parse(dbPost.tags) : [],
        createdAt,
        onchainRef: dbPost.onchainRef || ''
      };
    });
    
    return posts;
  }

  async getPostsByTag(tag: string): Promise<Post[]> {
    try {
      // Get posts by tag from database
      const dbPosts = await databaseService.getPostsByTag(tag.toLowerCase());
      
      // Convert to Post model with proper author information
      const posts: Post[] = await Promise.all(dbPosts.map(async (dbPost: any) => {
        const author = await userProfileService.getProfileById(dbPost.authorId);
        const authorAddress = author ? author.walletAddress : 'unknown';
        
        return {
          id: dbPost.id.toString(),
          author: authorAddress,
          parentId: dbPost.parentId ? dbPost.parentId.toString() : null,
          contentCid: dbPost.contentCid,
          mediaCids: dbPost.mediaCids ? JSON.parse(dbPost.mediaCids) : [],
          tags: dbPost.tags ? JSON.parse(dbPost.tags) : [],
          createdAt: dbPost.createdAt || new Date(),
          onchainRef: ''
        };
      }));
      
      return posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      safeLogger.error('Error getting posts by tag:', error);
      return [];
    }
  }

  async getPostsByCommunity(communityId: string): Promise<Post[]> {
    try {
      // Get posts by community from database
      const dbPosts = await databaseService.getPostsByCommunity(communityId);
      
      // Convert to Post model with proper author information
      const posts: Post[] = await Promise.all(dbPosts.map(async (dbPost: any) => {
        // Get the author's profile
        const author = await userProfileService.getProfileById(dbPost.authorId);
        const authorAddress = author ? author.walletAddress : 'unknown';
        
        // Handle potential null dates by providing default values
        const createdAt = dbPost.createdAt || new Date();
        const updatedAt = dbPost.updatedAt || new Date();
        
        return {
          id: dbPost.id.toString(),
          author: authorAddress,
          parentId: dbPost.parentId ? dbPost.parentId.toString() : null,
          contentCid: dbPost.contentCid,
          mediaCids: dbPost.mediaCids ? JSON.parse(dbPost.mediaCids) : [],
          tags: dbPost.tags ? JSON.parse(dbPost.tags) : [],
          createdAt,
          updatedAt,
          onchainRef: dbPost.onchainRef || '',
          // Add moderation fields if they exist
          moderationStatus: dbPost.moderationStatus,
          moderationWarning: dbPost.moderationWarning,
          riskScore: dbPost.riskScore ? parseFloat(dbPost.riskScore.toString()) : undefined,
          // Add staking field if it exists
          stakedValue: dbPost.stakedValue ? parseFloat(dbPost.stakedValue.toString()) : undefined
        };
      }));
      
      // Sort by creation date (newest first)
      return posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      safeLogger.error('Error getting posts by community:', error);
      return [];
    }
  }

  async updatePost(id: string, input: UpdatePostInput): Promise<Post | undefined> {
    try {
      const postId = parseInt(id);
      if (isNaN(postId)) {
        return undefined;
      }

      // Get existing post to verify ownership
      const existingPost = await this.getPostById(id);
      if (!existingPost) {
        return undefined;
      }

      // Upload new content to IPFS if content changed
      let contentCid = existingPost.contentCid;
      if (input.content && input.content !== existingPost.contentCid) {
        contentCid = await this.metadataService.uploadToIPFS(input.content);
      }

      // Upload new media to IPFS if provided
      let mediaCids = existingPost.mediaCids;
      if (input.media) {
        mediaCids = [];
        for (const media of input.media) {
          const mediaCid = await this.metadataService.uploadToIPFS(media);
          mediaCids.push(mediaCid);
        }
      }

      // Update post in database
      const updateData = {
        contentCid,
        mediaCids: JSON.stringify(mediaCids),
        tags: JSON.stringify(input.tags || existingPost.tags)
      };

      const updated = await databaseService.updatePost(postId, updateData);
      if (!updated) {
        return undefined;
      }

      return {
        id: updated.id.toString(),
        author: existingPost.author,
        parentId: existingPost.parentId,
        contentCid,
        mediaCids,
        tags: input.tags || existingPost.tags,
        createdAt: existingPost.createdAt,
        onchainRef: existingPost.onchainRef
      };
    } catch (error) {
      safeLogger.error('Error updating post:', error);
      return undefined;
    }
  }

  async deletePost(id: string): Promise<boolean> {
    try {
      const postId = parseInt(id);
      if (isNaN(postId)) {
        return false;
      }

      // Verify post exists
      const existingPost = await this.getPostById(id);
      if (!existingPost) {
        return false;
      }

      // Delete from database
      const deleted = await databaseService.deletePost(postId);
      
      if (deleted) {
        safeLogger.info(`Post ${id} deleted successfully`);
        // Note: In production, you might want to unpin from IPFS
        // await this.metadataService.unpinFromIPFS(existingPost.contentCid);
      }
      
      return deleted;
    } catch (error) {
      safeLogger.error('Error deleting post:', error);
      return false;
    }
  }

  async getAllPosts(): Promise<Post[]> {
    try {
      // Get all posts from database
      const dbPosts = await databaseService.getAllPosts();
      
      // Convert to Post model with proper author information
      const posts: Post[] = [];
      for (const dbPost of dbPosts) {
        try {
          // Get the author's profile with error handling
          let authorAddress = 'unknown';
          if (dbPost.authorId) {
            try {
              const author = await userProfileService.getProfileById(dbPost.authorId);
              authorAddress = author ? author.walletAddress : 'unknown';
            } catch (profileError) {
              safeLogger.warn(`Failed to get profile for author ID ${dbPost.authorId}:`, profileError);
              authorAddress = 'unknown';
            }
          }
          
          // Handle potential null dates by providing default values
          const createdAt = dbPost.createdAt || new Date();
          
          posts.push({
            id: dbPost.id.toString(),
            author: authorAddress,
            parentId: dbPost.parentId ? dbPost.parentId.toString() : null,
            contentCid: dbPost.contentCid,
            mediaCids: dbPost.mediaCids ? JSON.parse(dbPost.mediaCids) : [],
            tags: dbPost.tags ? JSON.parse(dbPost.tags) : [],
            createdAt,
            onchainRef: dbPost.onchainRef || ''
          });
        } catch (postError) {
          safeLogger.error(`Error processing post ${dbPost.id}:`, postError);
          continue; // Skip this post and continue with others
        }
      }
      
      // Sort by creation date (newest first)
      posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      return posts;
    } catch (error) {
      safeLogger.error('Error getting all posts:', error);
      return [];
    }
  }

  async getFeed(forUser?: string): Promise<Post[]> {
    // If no user specified, return empty feed
    if (!forUser) {
      return [];
    }

    try {
      // Get user ID from address
      const user = await userProfileService.getProfileByAddress(forUser);
      if (!user) {
        return [];
      }

      // Get the list of users that this user follows
      const following = await databaseService.getFollowing(user.id);
      const followingIds = following.map((f: any) => f.followingId);

      // Include the user's own posts
      followingIds.push(user.id);

      // For now, we'll return posts from followed users
      // In a full implementation, this would also include:
      // - Posts from DAOs the user is a member of
      // - Marketplace updates from followed users or DAOs
      // - AI suggested posts based on user interests
      // - Staking/boosted posts that should be prioritized
      
      // Get posts from followed users (including self)
      const postsPromises = followingIds.map((userId: any) => databaseService.getPostsByAuthor(userId));
      const postsArrays = await Promise.all(postsPromises);
      
      // Flatten the arrays and convert to Post model
      const allPosts = postsArrays.flat();
      
      const posts: Post[] = await Promise.all(allPosts.map(async (dbPost: any) => {
        // Get the author's address
        const author = await databaseService.getUserById(dbPost.authorId);
        const authorAddress = author ? author.walletAddress : 'unknown';
        
        // Handle potential null dates by providing default values
        const createdAt = dbPost.createdAt || new Date();
        
        return {
          id: dbPost.id.toString(),
          author: authorAddress,
          parentId: dbPost.parentId ? dbPost.parentId.toString() : null,
          contentCid: dbPost.contentCid,
          mediaCids: dbPost.mediaCids ? JSON.parse(dbPost.mediaCids) : [],
          tags: dbPost.tags ? JSON.parse(dbPost.tags) : [],
          createdAt,
          onchainRef: dbPost.onchainRef || ''
        };
      }));
      
      // Sort by creation date (newest first)
      posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      return posts;
    } catch (error) {
      safeLogger.error("Error getting personalized feed:", error);
      throw error;
    }
  }
}
