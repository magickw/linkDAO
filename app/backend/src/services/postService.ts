import { Post, CreatePostInput, UpdatePostInput } from '../models/Post';
import { MetadataService } from './metadataService';

// In a real implementation, this would connect to a database
// For now, we'll use an in-memory store for demonstration
let posts: Post[] = [];
let nextId = 1;

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
    
    const post: Post = {
      id: `post_${nextId++}`,
      author: input.author,
      parentId: input.parentId || null,
      contentCid,
      mediaCids,
      tags: input.tags || [],
      createdAt: new Date(),
      onchainRef: input.onchainRef || '',
    };

    posts.push(post);
    return post;
  }

  async getPostById(id: string): Promise<Post | undefined> {
    return posts.find(p => p.id === id);
  }

  async getPostsByAuthor(author: string): Promise<Post[]> {
    return posts.filter(p => p.author === author);
  }

  async getPostsByTag(tag: string): Promise<Post[]> {
    return posts.filter(p => p.tags.includes(tag));
  }

  async updatePost(id: string, input: UpdatePostInput): Promise<Post | undefined> {
    const postIndex = posts.findIndex(p => p.id === id);
    if (postIndex === -1) {
      return undefined;
    }

    const post = posts[postIndex];
    
    // If content is being updated, upload new content to IPFS
    let contentCid = post.contentCid;
    if (input.content) {
      contentCid = await this.metadataService.uploadToIPFS(input.content);
    }
    
    // If media is being updated, upload new media to IPFS
    let mediaCids = post.mediaCids;
    if (input.media) {
      mediaCids = [];
      for (const media of input.media) {
        const mediaCid = await this.metadataService.uploadToIPFS(media);
        mediaCids.push(mediaCid);
      }
    }
    
    const updatedPost = {
      ...post,
      contentCid,
      mediaCids,
      tags: input.tags || post.tags,
      createdAt: post.createdAt, // Keep original creation time
    };

    posts[postIndex] = updatedPost;
    return updatedPost;
  }

  async deletePost(id: string): Promise<boolean> {
    const postIndex = posts.findIndex(p => p.id === id);
    if (postIndex === -1) {
      return false;
    }

    posts.splice(postIndex, 1);
    return true;
  }

  async getAllPosts(): Promise<Post[]> {
    return [...posts];
  }

  async getFeed(forUser?: string): Promise<Post[]> {
    // In a real implementation, this would return a personalized feed
    // For now, we'll just return all posts sorted by creation time
    return [...posts].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}