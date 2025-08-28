import { Post, CreatePostInput, UpdatePostInput } from '../models/Post';
import { MetadataService } from './metadataService';
import { DatabaseService } from './databaseService';
import { UserProfileService } from './userProfileService';

const databaseService = new DatabaseService();
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
        address: input.author,
        handle: '',
        ens: '',
        avatarCid: '',
        bioCid: ''
      });
    }
    
    // Create post in database
    const dbPost = await databaseService.createPost(user.id, contentCid, input.parentId ? parseInt(input.parentId) : undefined);
    
    const post: Post = {
      id: dbPost.id.toString(),
      author: input.author,
      parentId: input.parentId || null,
      contentCid,
      mediaCids,
      tags: input.tags || [],
      createdAt: dbPost.createdAt,
      onchainRef: input.onchainRef || '',
    };

    return post;
  }

  async getPostById(id: string): Promise<Post | undefined> {
    // Convert string ID to number
    const postId = parseInt(id);
    if (isNaN(postId)) {
      return undefined;
    }
    
    // Fetch all posts (in a real implementation, you'd query by ID directly)
    const dbPosts = await databaseService.getAllListings(); // This is a placeholder
    
    // In a full implementation, you would fetch the post from the database
    // For now, we'll return undefined
    return undefined;
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
    const posts: Post[] = dbPosts.map((dbPost: any) => ({
      id: dbPost.id.toString(),
      author,
      parentId: dbPost.parentId ? dbPost.parentId.toString() : null,
      contentCid: dbPost.contentCid,
      mediaCids: [], // Would need to store media CIDs in database
      tags: [], // Would need to store tags in database
      createdAt: dbPost.createdAt,
      onchainRef: '' // Would need to store onchainRef in database
    }));
    
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
    // In a full implementation, you would fetch all posts from the database
    // For now, we'll return an empty array
    return [];
  }

  async getFeed(forUser?: string): Promise<Post[]> {
    // In a full implementation, this would return a personalized feed from the database
    // For now, we'll return an empty array
    return [];
  }
}