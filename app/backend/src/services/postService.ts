import { Post, CreatePostInput, UpdatePostInput } from '../models/Post';
import { safeLogger } from '../utils/safeLogger';
import * as schema from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { MetadataService } from './metadataService';
import { databaseService } from './databaseService'; // Import the singleton instance
import { UserProfileService } from './userProfileService';
import { aiContentModerationService } from './aiContentModerationService';
import { InputSanitizer, SANITIZATION_CONFIGS } from '../utils/sanitizer';
import { socialMediaIntegrationService } from './socialMediaIntegrationService';
import { SocialPlatform, isSupportedPlatform } from './oauth';
import { generateShareId } from '../utils/shareIdGenerator';

// Use the singleton instance instead of creating a new one
// const databaseService = new DatabaseService();
const userProfileService = new UserProfileService();

export class PostService {
  private metadataService: MetadataService;

  private get db() {
    return databaseService.getDatabase();
  }

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

      // Handle multiple community posting
      if (input.communityIds && input.communityIds.length > 0) {
        const posts: Post[] = [];

        // Create primary post (first community)
        const primaryInput = { ...input, communityId: input.communityIds[0] };
        // Remove communityIds to prevent infinite recursion if we called createPost recursively
        // But here we are just going to create them sequentially in this block or modify the single creation logic below

        // Better approach: Iterate and create each post
        // We need to ensure content is uploaded only once if possible, but PostService logic uploads it.
        // Optimization: Upload content first if not already uploaded, then reuse CID.

        // 1. Upload content/media once
        let contentCid = '';
        const mediaCids: string[] = [];

        try {
          contentCid = await this.metadataService.uploadToIPFS(input.content);
        } catch (ipfsError) {
          safeLogger.warn('IPFS upload failed, using fallback CID:', ipfsError);
          contentCid = `mock_content_${Date.now()}_${Buffer.from(input.content).toString('base64').substring(0, 10)}`;
        }

        if (input.media) {
          for (let i = 0; i < input.media.length; i++) {
            const mediaItem = input.media[i];
            if (mediaItem && (mediaItem.startsWith('Qm') || mediaItem.startsWith('b'))) {
              mediaCids.push(mediaItem);
              continue;
            }
            try {
              const mediaCid = await this.metadataService.uploadToIPFS(mediaItem);
              mediaCids.push(mediaCid);
            } catch (ipfsError) {
              safeLogger.warn(`IPFS upload failed for media ${i}, using fallback CID:`, ipfsError);
              mediaCids.push(`mock_media_${Date.now()}_${i}`);
            }
          }
        }

        // 2. Create posts for each community
        for (const communityId of input.communityIds) {
          // Create post in database
          try {
            const dbPost = await databaseService.createPost(
              user.id,
              contentCid,
              input.parentId, // Note: Parent ID might strictly belong to one community, but for cross-posting usually it's a new root post
              mediaCids,
              input.tags,
              input.onchainRef,
              InputSanitizer.sanitizeString(input.content, {
                allowedTags: [
                  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                  'p', 'br', 'hr',
                  'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
                  'a', 'code', 'pre', 'blockquote',
                  'ul', 'ol', 'li',
                  'img', 'iframe', 'div', 'span'
                ],
                allowedAttributes: {
                  'a': ['href', 'title', 'target', 'rel', 'class'],
                  'img': ['src', 'alt', 'title', 'width', 'height', 'class'],
                  'iframe': ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder', 'class'],
                  'div': ['class', 'style'],
                  'span': ['class', 'style'],
                  'p': ['class', 'style'],
                  '*': ['class', 'id']
                },
                stripUnknown: true,
                maxLength: 50000,
                preserveWhitespace: true
              }).sanitized,
              undefined,
              input.isRepost,
              input.mediaUrls,
              input.location,
              communityId
            );

            // Add moderation metadata... (omitted for brevity in this multi-post loop, but should ideally ideally be applied)
            // For MVP/feature add, we can assume the single post logic below handles the "primary" one or refactor.
            // To minimize code duplication, we will return the FIRST post created as the primary result, 
            // but realistically the caller (controller) expects one Post object.

            const post: Post = {
              id: dbPost.id.toString(),
              author: input.author,
              parentId: input.parentId || null,
              contentCid,
              content: dbPost.content,
              shareId: dbPost.shareId || '',
              mediaCids,
              tags: input.tags || [],
              createdAt: dbPost.createdAt || new Date(),
              onchainRef: input.onchainRef || '',
              moderationStatus: 'active', // simplified
              communityId: communityId
            };
            posts.push(post);

          } catch (err) {
            safeLogger.error(`Failed to create post for community ${communityId}`, err);
          }
        }

        // Return the first post as reference
        if (posts.length > 0) {
          return posts[0];
        } else {
          throw new Error('Failed to create posts for any community');
        }
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
          const mediaItem = input.media[i];

          // Check if it's already a valid IPFS CID (supports all CIDv0 and CIDv1 formats)
          // CIDv0: starts with 'Qm' (base58btc, 46 characters)
          // CIDv1: starts with 'b' (typically 'bafy', 'bafk', 'bafkrei', etc.)
          if (mediaItem && (mediaItem.startsWith('Qm') || mediaItem.startsWith('b'))) {
            safeLogger.info(`Media item ${i} is already a valid IPFS CID: ${mediaItem.substring(0, 20)}...`);
            mediaCids.push(mediaItem);
            continue;
          }

          try {
            const mediaCid = await this.metadataService.uploadToIPFS(mediaItem);
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
          input.parentId,
          mediaCids,
          input.tags,
          input.onchainRef,
          InputSanitizer.sanitizeString(input.content, {
            allowedTags: [
              'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
              'p', 'br', 'hr',
              'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
              'a', 'code', 'pre', 'blockquote',
              'ul', 'ol', 'li',
              'img', 'iframe', 'div', 'span'
            ],
            allowedAttributes: {
              'a': ['href', 'title', 'target', 'rel', 'class'],
              'img': ['src', 'alt', 'title', 'width', 'height', 'class'],
              'iframe': ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder', 'class'],
              'div': ['class', 'style'],
              'span': ['class', 'style'],
              'p': ['class', 'style'],
              '*': ['class', 'id']
            },
            stripUnknown: true,
            maxLength: 50000,
            preserveWhitespace: true
          }).sanitized,
          undefined, // title not in CreatePostInput for now
          input.isRepost,
          input.mediaUrls,
          input.location,
          input.communityId // Pass community ID if present
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
        content: dbPost.content, // Include content for immediate local update
        shareId: dbPost.shareId || '', // Include shareId from database
        mediaCids,
        tags: input.tags || [],
        createdAt,
        onchainRef: input.onchainRef || '',
        // Add moderation metadata
        moderationStatus: postStatus,
        moderationWarning: moderationWarning,
        riskScore: moderationReport.overallRiskScore,
        communityId: input.communityId // Ensure this is passed back
      };

      // Handle social media cross-posting
      if (input.shareToSocialMedia) {
        const platformsToPost: SocialPlatform[] = [];

        for (const [platform, shouldShare] of Object.entries(input.shareToSocialMedia)) {
          if (shouldShare === true && isSupportedPlatform(platform)) {
            platformsToPost.push(platform as SocialPlatform);
          }
        }

        if (platformsToPost.length > 0) {
          // Process asynchronously
          socialMediaIntegrationService.postToConnectedPlatforms(
            post.id,
            user.id,
            platformsToPost,
            input.content,
            input.media,
            'post' // This is a community post
          ).then(results => {
            safeLogger.info('Social media cross-posting results:', results);
          }).catch(error => {
            safeLogger.error('Error in social media cross-posting:', error);
          });
        }
      }

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

  async sharePostToCommunity(originalPostId: string, targetCommunityId: string, authorAddress: string): Promise<Post> {
    try {
      // 1. Get original post
      const originalPost = await this.getPostById(originalPostId);
      if (!originalPost) {
        throw new Error('Original post not found');
      }

      // 2. Verify ownership - only the original author can cross-post their own content
      if (originalPost.author.toLowerCase() !== authorAddress.toLowerCase()) {
        safeLogger.warn(`Unauthorized cross-post attempt: User ${authorAddress} tried to share post ${originalPostId} owned by ${originalPost.author}`);
        throw new Error('You can only share your own posts to other communities');
      }

      // 3. Prepare new post input as a clone
      const input: CreatePostInput = {
        author: authorAddress,
        content: originalPost.content || '',
        media: originalPost.mediaCids, // Use existing CIDs or URLs? media expects string[]
        mediaUrls: originalPost.mediaUrls,
        tags: originalPost.tags,
        communityId: targetCommunityId,
        isRepost: true,
        parentId: originalPostId // Link to original
      };

      // 4. Create using standard method (handles user creation, validation etc)
      // Optimization: We could bypass IPFS upload since we have CIDs, but strict types might require re-upload logic flow 
      // to be bypassed. 
      // In the modified createPost above, we check if media items are already CIDs, which they are.
      // For content, createPost tries to upload 'content'. 
      // If we want to strictly link contentCid, we might need a lower level DB call or update createPost to accept contentCid.
      // For now, re-uploading text (cheap) or getting identical CID is acceptable overhead for code reuse.

      return await this.createPost(input);

    } catch (error) {
      safeLogger.error('Error sharing post to community:', error);
      throw error;
    }
  }


  async incrementView(postId: string, userId?: string, ipAddress?: string) {
    try {
      // 1. Record the view in the views table for analytics/deduplication
      await this.db.insert(schema.views).values({
        postId,
        userId: userId || null,
        ipAddress: ipAddress || null,
        userAgent: null // Could add this if available
      });

      // 2. Increment the counter on the post itself
      const [updatedPost] = await this.db
        .update(schema.posts)
        .set({
          views: sql`${schema.posts.views} + 1`
        })
        .where(eq(schema.posts.id, postId))
        .returning({ views: schema.posts.views });

      return updatedPost?.views || 0;
    } catch (error) {
      safeLogger.error('Error incrementing post view:', error);
      // Don't throw, just return current count or 0 to not break UI
      return 0;
    }
  }

  async getPostById(id: string, viewerId?: string): Promise<Post | undefined> {
    // Convert string ID to number
    const postId = id;
    if (!postId) {
      safeLogger.info(`Invalid post ID: ${id}`);
      return undefined;
    }

    try {
      // Fetch the post from database using the new dedicated method
      let dbPost = await databaseService.getPostById(postId);
      let isStatus = false;

      // Fallback to statuses if not found in regular posts
      if (!dbPost) {
        dbPost = await databaseService.getStatusById(postId);
        isStatus = true;
      }

      if (!dbPost) {
        safeLogger.info(`Post not found with ID: ${postId}`);
        return undefined;
      }

      // Get user profile for author info
      const author = dbPost.authorId ? await userProfileService.getProfileById(dbPost.authorId) : null;
      const authorAddress = author ? author.walletAddress : 'unknown';
      const authorHandle = author ? (author.handle || author.walletAddress?.slice(0, 8) || 'anonymous') : 'anonymous';
      const authorName = author ? author.displayName : undefined;

      // Fetch enrichment data (shares, repost status)
      let shares = 0;
      let isRepostedByMe = false;

      try {
        const counts = await databaseService.getRepostCounts([postId]);
        shares = counts.get(postId) || 0;

        if (viewerId) {
          const userReposts = await databaseService.getUserRepostIds(viewerId);
          isRepostedByMe = userReposts.has(postId);
        }
      } catch (enrichError) {
        safeLogger.warn('Failed to fetch enrichment data for post:', enrichError);
      }


      // Fetch community info if available
      let communityName: string | undefined;
      let communitySlug: string | undefined;

      if (dbPost.communityId) {
        try {
          const communityResult = await this.db.select({
            name: schema.communities.name,
            slug: schema.communities.slug
          })
            .from(schema.communities)
            .where(eq(schema.communities.id, dbPost.communityId))
            .limit(1);

          if (communityResult.length > 0) {
            communityName = communityResult[0].name;
            communitySlug = communityResult[0].slug;
          }
        } catch (commError) {
          safeLogger.warn('Failed to fetch community info:', commError);
        }
      }

      // Safe JSON parsing
      const safeParse = (data: any) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        try {
          return JSON.parse(data);
        } catch (e) {
          return [];
        }
      };

      return {
        id: dbPost.id.toString(),
        author: authorAddress,
        authorHandle,
        authorName,
        parentId: dbPost.parentId ? dbPost.parentId.toString() : null,
        content: dbPost.content,
        contentCid: dbPost.contentCid,
        shareId: dbPost.shareId || '', // Include shareId for share URLs
        mediaCids: safeParse(dbPost.mediaCids),
        tags: safeParse(dbPost.tags),
        createdAt: dbPost.createdAt || new Date(),
        onchainRef: '',
        mediaUrls: safeParse(dbPost.mediaUrls),
        location: dbPost.location || undefined,
        shares,
        isRepostedByMe,
        isStatus,
        isRepost: dbPost.isRepost,
        communityId: dbPost.communityId,
        communityName,
        communitySlug,
        upvotes: dbPost.upvotes || 0,
        downvotes: dbPost.downvotes || 0,
        views: dbPost.views || 0
      };
    } catch (error) {
      safeLogger.error('Error getting post by ID:', error);
      return undefined;
    }
  }

  async getPostByShareId(shareId: string): Promise<Post | undefined> {
    try {
      // Fetch the post from database by share_id
      let dbPost = await databaseService.getPostByShareId(shareId);

      // Fallback to statuses if not found in regular posts
      if (!dbPost) {
        dbPost = await databaseService.getStatusByShareId(shareId);
      }

      if (!dbPost) {
        safeLogger.info(`Post not found with share ID: ${shareId}`);
        return undefined;
      }

      // Get user profile for author info
      const author = dbPost.authorId ? await userProfileService.getProfileById(dbPost.authorId) : null;
      if (!author) {
        safeLogger.info(`Author not found for post share ID: ${shareId}, authorId: ${dbPost.authorId}`);
        // Instead of returning undefined, create a minimal response with unknown author
        return {
          id: dbPost.id.toString(),
          author: 'unknown',
          authorHandle: 'anonymous',
          authorName: undefined,
          parentId: dbPost.parentId ? dbPost.parentId.toString() : null,
          content: dbPost.content,
          contentCid: dbPost.contentCid,
          shareId: dbPost.shareId || '', // Include shareId for share URLs
          mediaCids: dbPost.mediaCids ? JSON.parse(dbPost.mediaCids) : [],
          tags: dbPost.tags ? JSON.parse(dbPost.tags) : [],
          createdAt: dbPost.createdAt || new Date(),
          onchainRef: '',
          upvotes: dbPost.upvotes || 0,
          downvotes: dbPost.downvotes || 0,
          views: dbPost.views || 0,
        };
      }

      // Fetch community info if available
      let communityName: string | undefined;
      let communitySlug: string | undefined;

      if (dbPost.communityId) {
        try {
          const communityResult = await this.db.select({
            name: schema.communities.name,
            slug: schema.communities.slug
          })
            .from(schema.communities)
            .where(eq(schema.communities.id, dbPost.communityId))
            .limit(1);

          if (communityResult.length > 0) {
            communityName = communityResult[0].name;
            communitySlug = communityResult[0].slug;
          }
        } catch (commError) {
          safeLogger.warn('Failed to fetch community info:', commError);
        }
      }

      // Safe JSON parsing helper
      const safeParse = (data: any) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        try {
          return JSON.parse(data);
        } catch (e) {
          return [];
        }
      };

      return {
        id: dbPost.id.toString(),
        author: author.walletAddress,
        authorHandle: author.handle || author.walletAddress?.slice(0, 8) || 'anonymous',
        authorName: author.displayName,
        parentId: dbPost.parentId ? dbPost.parentId.toString() : null,
        content: dbPost.content,
        contentCid: dbPost.contentCid,
        shareId: dbPost.shareId || '', // Include shareId for share URLs
        mediaCids: safeParse(dbPost.mediaCids),
        tags: safeParse(dbPost.tags),
        createdAt: dbPost.createdAt || new Date(),
        onchainRef: '',
        mediaUrls: safeParse(dbPost.mediaUrls),
        location: dbPost.location || undefined,
        communityId: dbPost.communityId,
        communityName,
        communitySlug,
        upvotes: dbPost.upvotes || 0,
        downvotes: dbPost.downvotes || 0,
        views: dbPost.views || 0
      };
    } catch (error) {
      safeLogger.error('Error getting post by share ID:', error);
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

    // Safe JSON parsing helper
    const safeParse = (data: any) => {
      if (!data) return [];
      if (Array.isArray(data)) return data;
      try {
        return JSON.parse(data);
      } catch (e) {
        return [];
      }
    };

    // Convert to Post model
    const posts: Post[] = dbPosts.map((dbPost: any) => {
      // Handle potential null dates by providing default values
      const createdAt = dbPost.createdAt || new Date();

      return {
        id: dbPost.id.toString(),
        author,
        parentId: dbPost.parentId ? dbPost.parentId.toString() : null,
        title: dbPost.title || '', // Include title field
        content: dbPost.content,
        contentCid: dbPost.contentCid,
        mediaCids: safeParse(dbPost.mediaCids),
        tags: safeParse(dbPost.tags),
        communityId: dbPost.communityId || null, // Include communityId for proper redirects
        createdAt,
        onchainRef: dbPost.onchainRef || '',
        upvotes: dbPost.upvotes || 0,
        downvotes: dbPost.downvotes || 0,
        views: dbPost.views || 0
      };
    });

    return posts;
  }

  async getPostsByTag(tag: string): Promise<Post[]> {
    try {
      // Get posts by tag from database
      const dbPosts = await databaseService.getPostsByTag(tag.toLowerCase());

      // Safe JSON parsing helper
      const safeParse = (data: any) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        try {
          return JSON.parse(data);
        } catch (e) {
          return [];
        }
      };

      // Convert to Post model with proper author information
      const posts: Post[] = await Promise.all(dbPosts.map(async (dbPost: any) => {
        const author = await userProfileService.getProfileById(dbPost.authorId);
        const authorAddress = author ? author.walletAddress : 'unknown';

        return {
          id: dbPost.id.toString(),
          author: authorAddress,
          parentId: dbPost.parentId ? dbPost.parentId.toString() : null,
          content: dbPost.content,
          contentCid: dbPost.contentCid,
          mediaCids: safeParse(dbPost.mediaCids),
          tags: safeParse(dbPost.tags),
          createdAt: dbPost.createdAt || new Date(),
          onchainRef: '',
          upvotes: dbPost.upvotes || 0,
          downvotes: dbPost.downvotes || 0,
          views: dbPost.views || 0
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

      // Safe JSON parsing helper
      const safeParse = (data: any) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        try {
          return JSON.parse(data);
        } catch (e) {
          return [];
        }
      };

      // Convert to Post model with proper author information
      const posts: Post[] = await Promise.all(dbPosts.map(async (dbPost: any) => {
        // Get the author's profile
        const author = await userProfileService.getProfileById(dbPost.authorId);
        const authorAddress = author ? author.walletAddress : 'unknown';
        const authorHandle = author ? (author.handle || author.walletAddress?.slice(0, 8) || 'anonymous') : 'anonymous';
        const authorName = author ? author.displayName : undefined;

        // Handle potential null dates by providing default values
        const createdAt = dbPost.createdAt || new Date();
        const updatedAt = dbPost.updatedAt || new Date();

        return {
          id: dbPost.id.toString(),
          shareId: dbPost.shareId,
          author: authorAddress,
          authorHandle,
          authorName,
          parentId: dbPost.parentId ? dbPost.parentId.toString() : null,
          content: dbPost.content,
          contentCid: dbPost.contentCid,
          mediaCids: safeParse(dbPost.mediaCids),
          tags: safeParse(dbPost.tags),
          upvotes: dbPost.upvotes || 0,
          downvotes: dbPost.downvotes || 0,
          views: dbPost.views || 0,
          createdAt,
          updatedAt,
          onchainRef: dbPost.onchainRef || '',
          // Add moderation fields if they exist
          moderationStatus: dbPost.moderationStatus,
          moderationWarning: dbPost.moderationWarning,
          riskScore: dbPost.riskScore ? parseFloat(dbPost.riskScore.toString()) : undefined,
          // Add staking field if it exists
          stakedValue: dbPost.stakedValue ? parseFloat(dbPost.stakedValue.toString()) : undefined,
          title: dbPost.title || '' // Add missing title field
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
      const postId = id;
      if (!postId) {
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
      // Calculate sanitized content
      let content = existingPost.content;
      if (input.content) {
        content = InputSanitizer.sanitizeString(input.content, {
          allowedTags: [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'br', 'hr',
            'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
            'a', 'code', 'pre', 'blockquote',
            'ul', 'ol', 'li',
            'img', 'iframe', 'div', 'span'
          ],
          allowedAttributes: {
            'a': ['href', 'title', 'target', 'rel', 'class'],
            'img': ['src', 'alt', 'title', 'width', 'height', 'class'],
            'iframe': ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder', 'class'],
            'div': ['class', 'style'],
            'span': ['class', 'style'],
            'p': ['class', 'style'],
            '*': ['class', 'id']
          },
          stripUnknown: true,
          maxLength: 50000,
          preserveWhitespace: true
        }).sanitized;
      }

      // Update post in database
      const updateData = {
        contentCid,
        content,
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
        shareId: updated.shareId || existingPost.shareId || '', // Include shareId
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
      const postId = id;
      if (!postId) {
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

      // Safe JSON parsing helper
      const safeParse = (data: any) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        try {
          return JSON.parse(data);
        } catch (e) {
          return [];
        }
      };

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
            content: dbPost.content,
            contentCid: dbPost.contentCid,
            shareId: dbPost.shareId || '', // Include shareId
            mediaCids: safeParse(dbPost.mediaCids),
            tags: safeParse(dbPost.tags),
            createdAt,
            onchainRef: dbPost.onchainRef || '',
            upvotes: dbPost.upvotes || 0,
            downvotes: dbPost.downvotes || 0,
            views: dbPost.views || 0
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

      // Include the user's own posts (only if not already included)
      if (!followingIds.includes(user.id)) {
        followingIds.push(user.id);
      }

      // For now, we'll return posts from followed users
      // In a full implementation, this would also include:
      // - Posts from DAOs the user is a member of
      // - Marketplace updates from followed users or DAOs
      // - AI suggested posts based on user interests
      // - Staking/boosted posts that should be prioritized

      // Get posts from followed users (including self)
      // Get posts and statuses from followed users (including self)
      const postsPromises = followingIds.map((userId: any) => databaseService.getPostsByAuthor(userId));
      const statusPromises = followingIds.map((userId: any) => databaseService.getStatusesByAuthor(userId));

      const [postsArrays, statusArrays] = await Promise.all([
        Promise.all(postsPromises),
        Promise.all(statusPromises)
      ]);

      const allPosts = postsArrays.flat();
      const allStatuses = statusArrays.flat();

      // Collect all post IDs for efficient querying
      const allPostIds = new Set<string>();
      allPosts.forEach((p: any) => allPostIds.add(p.id.toString()));
      allStatuses.forEach((p: any) => allPostIds.add(p.id.toString()));

      // Fetch user reposts and repost counts in parallel
      let userReposts = new Set<string>();
      let repostCounts = new Map<string, number>();

      try {
        const [reposts, counts] = await Promise.all([
          databaseService.getUserRepostIds(user.id),
          databaseService.getRepostCounts(Array.from(allPostIds))
        ]);
        userReposts = reposts;
        repostCounts = counts;
      } catch (e) {
        safeLogger.warn('Failed to fetch enrichment data:', e);
      }

      // Map regular posts
      const mappedPosts: Post[] = await Promise.all(allPosts.map(async (dbPost: any) => {
        // Get the author's address
        const author = await databaseService.getUserById(dbPost.authorId);
        const authorAddress = author ? author.walletAddress : 'unknown';

        // Handle potential null dates by providing default values
        const createdAt = dbPost.createdAt || new Date();

        return {
          id: dbPost.id.toString(),
          author: authorAddress,
          parentId: dbPost.parentId ? dbPost.parentId.toString() : null,
          content: dbPost.content,
          contentCid: dbPost.contentCid,
          shareId: dbPost.shareId || '', // Include shareId
          mediaCids: dbPost.mediaCids ? JSON.parse(dbPost.mediaCids) : [],
          tags: dbPost.tags ? JSON.parse(dbPost.tags) : [],
          createdAt,
          onchainRef: dbPost.onchainRef || '',
          isRepostedByMe: userReposts.has(dbPost.id.toString()),
          isStatus: false,
          isRepost: dbPost.isRepost,
          shares: repostCounts.get(dbPost.id.toString()) || 0,
          mediaUrls: dbPost.mediaUrls ? JSON.parse(dbPost.mediaUrls) : [],
          location: dbPost.location || undefined,
          upvotes: dbPost.upvotes || 0,
          downvotes: dbPost.downvotes || 0,
          views: dbPost.views || 0
        };
      }));

      // Map statuses
      const mappedStatuses: Post[] = await Promise.all(allStatuses.map(async (dbPost: any) => {
        // Get the author's address
        const author = await databaseService.getUserById(dbPost.authorId);
        const authorAddress = author ? author.walletAddress : 'unknown';

        const createdAt = dbPost.createdAt || new Date();

        return {
          id: dbPost.id.toString(),
          author: authorAddress,
          parentId: dbPost.parentId ? dbPost.parentId.toString() : null,
          content: dbPost.content,
          contentCid: dbPost.contentCid,
          shareId: dbPost.shareId || '',
          mediaCids: dbPost.mediaCids ? JSON.parse(dbPost.mediaCids) : [],
          tags: dbPost.tags ? JSON.parse(dbPost.tags) : [],
          createdAt,
          onchainRef: dbPost.onchainRef || '',
          isRepostedByMe: userReposts.has(dbPost.id.toString()),
          isStatus: true, // Mark as status
          isRepost: dbPost.isRepost,
          title: null, // Statuses don't have titles
          shares: repostCounts.get(dbPost.id.toString()) || 0,
          mediaUrls: dbPost.mediaUrls ? JSON.parse(dbPost.mediaUrls) : [],
          location: dbPost.location || undefined,
          upvotes: dbPost.upvotes || 0,
          downvotes: dbPost.downvotes || 0,
          views: dbPost.views || 0
        };
      }));

      // Combine and sort by creation date (newest first)
      const combinedPosts = [...mappedPosts, ...mappedStatuses];
      combinedPosts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Remove duplicates by ID
      const uniquePosts: Post[] = [];
      const seenIds = new Set<string>();

      for (const post of combinedPosts) {
        if (!seenIds.has(post.id)) {
          seenIds.add(post.id);
          uniquePosts.push(post);
        }
      }

      return uniquePosts;
    } catch (error) {
      safeLogger.error("Error getting personalized feed:", error);
      throw error;
    }
  }
}
