import { Post, CreatePostInput, UpdatePostInput } from '../models/Post';
import { MetadataService } from './metadataService';
import { databaseService } from './databaseService'; // Import the singleton instance
import { UserProfileService } from './userProfileService';

// Use the singleton instance instead of creating a new one
// const databaseService = new DatabaseService();
const userProfileService = new UserProfileService();

export class PostService {
  private metadataService: MetadataService;

  constructor() {
    this.metadataService = new MetadataService();
  }

  async createPost(input: CreatePostInput): Promise<Post> {
    // Upload content to IPFS
    const contentCid = await this.metadataService.uploadToIPFS(input.content);
    
    // Upload media to IPFS (if any)
    const mediaCids: string[] = [];
    if (input.media) {
      for (const media of input.media) {
        const mediaCid = await this.metadataService.uploadToIPFS(media);
        mediaCids.push(mediaCid);
      }
    }
    
    // Get user ID from address
    let user = await userProfileService.getProfileByAddress(input.author);
    if (!user) {
      // Create user if they don't exist
      user = await userProfileService.createProfile({
        walletAddress: input.author,
        handle: '',
        ens: '',
        avatarCid: '',
        bioCid: ''
      });
    }
    
    // Create post in database
    const dbPost = await databaseService.createPost(user.id, contentCid, input.parentId ? parseInt(input.parentId) : undefined);
    
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
    };

    return post;
  }

  async getPostById(id: string): Promise<Post | undefined> {
    // Convert string ID to number
    const postId = parseInt(id);
    if (isNaN(postId)) {
      console.log(`Invalid post ID: ${id}`);
      return undefined;
    }
    
    try {
      // Fetch the post from database using the new dedicated method
      const dbPost = await databaseService.getPostById(postId);
      
      if (!dbPost) {
        console.log(`Post not found with ID: ${postId}`);
        return undefined;
      }
      
      // Get user profile for author info
      const author = dbPost.authorId ? await userProfileService.getProfileById(dbPost.authorId) : null;
      if (!author) {
        console.log(`Author not found for post ID: ${postId}, authorId: ${dbPost.authorId}`);
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
      console.error('Error getting post by ID:', error);
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
    // In a full implementation, you would fetch posts by tag from the database
    // For now, we'll return an empty array
    return [];
  }

  async updatePost(id: string, input: UpdatePostInput): Promise<Post | undefined> {
    // In a full implementation, you would update the post in the database
    // For now, we'll return undefined
    return undefined;
  }

  async deletePost(id: string): Promise<boolean> {
    // In a full implementation, you would delete the post from the database
    // For now, we'll return true
    return true;
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
      console.error('Error getting all posts:', error);
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
      console.error("Error getting personalized feed:", error);
      throw error;
    }
  }
}