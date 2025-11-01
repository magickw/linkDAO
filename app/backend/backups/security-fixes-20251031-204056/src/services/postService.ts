import { Post, CreatePostInput, UpdatePostInput } from '../models/Post';
import { safeLogger } from '../utils/safeLogger';
import { MetadataService } from './metadataService';
import { safeLogger } from '../utils/safeLogger';
import { databaseService } from './databaseService'; // Import the singleton instance
import { safeLogger } from '../utils/safeLogger';
import { UserProfileService } from './userProfileService';
import { safeLogger } from '../utils/safeLogger';
import { aiContentModerationService } from './aiContentModerationService';
import { safeLogger } from '../utils/safeLogger';

// Use the singleton instance instead of creating a new one
// const databaseService = new DatabaseService();
const userProfileService = new UserProfileService();

export class PostService {
  private metadataService: MetadataService;

  constructor() {
    this.metadataService = new MetadataService();
  }

  async createPost(input: CreatePostInput): Promise<Post> {
    // Get user ID and profile from address
    let user = await userProfileService.getProfileByAddress(input.author);
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

    // Generate temporary content ID for moderation
    const tempContentId = `post_${Date.now()}_${user.id}`;

    // Run AI moderation check
    const moderationReport = await aiContentModerationService.moderateContent({
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

    // Upload content to IPFS (allowed or limited content)
    const contentCid = await this.metadataService.uploadToIPFS(input.content);

    // Upload media to IPFS (if any)
    const mediaCids: string[] = [];
    if (input.media) {
      for (const media of input.media) {
        const mediaCid = await this.metadataService.uploadToIPFS(media);
        mediaCids.push(mediaCid);
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

    // Create post in database with moderation metadata
    const dbPost = await databaseService.createPost(
      user.id,
      contentCid,
      input.parentId ? parseInt(input.parentId) : undefined,
      {
        moderationStatus: postStatus,
        moderationRiskScore: moderationReport.overallRiskScore,
        moderationCategories: [
          moderationReport.spamDetection.isSpam ? 'spam' : null,
          moderationReport.toxicityDetection.isToxic ? moderationReport.toxicityDetection.toxicityType : null,
          moderationReport.contentPolicy.violatesPolicy ? moderationReport.contentPolicy.policyType : null,
          moderationReport.copyrightDetection.potentialInfringement ? 'copyright' : null
        ].filter(Boolean),
        moderationExplanation: moderationReport.explanation
      }
    );

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
        mediaCids: [], // Would need to store media CIDs in database
        tags: [], // Would need to store tags in database
        createdAt,
        onchainRef: '' // Would need to store onchainRef in database
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
      const posts: Post[] = await Promise.all(dbPosts.map(async (dbPost: any) => {
        // Get the author's profile
        const author = await userProfileService.getProfileById(dbPost.authorId);
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
          onchainRef: '' // Would need to store onchainRef in database
        };
      }));
      
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
          mediaCids: [], // Would need to store media CIDs in database
          tags: [], // Would need to store tags in database
          createdAt,
          onchainRef: '' // Would need to store onchainRef in database
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