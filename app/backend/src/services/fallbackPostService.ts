import { Post, CreatePostInput, UpdatePostInput } from '../models/Post';
import { safeLogger } from '../utils/safeLogger';

// Simple in-memory storage for posts (fallback when database is unavailable)
let posts: Post[] = [];
let nextId = 1;

export class FallbackPostService {
  async createPost(input: CreatePostInput): Promise<Post> {
    try {
      const post: Post = {
        id: (nextId++).toString(),
        author: input.author,
        parentId: input.parentId || null,
        contentCid: `content_${Date.now()}`, // Mock CID
        mediaCids: input.media ? input.media.map((_, i) => `media_${Date.now()}_${i}`) : [],
        tags: input.tags || [],
        createdAt: new Date(),
        onchainRef: input.onchainRef || ''
      };

      posts.push(post);
      safeLogger.info(`Post created with fallback service: ${post.id}`);
      return post;
    } catch (error) {
      safeLogger.error('Error in fallback post creation:', error);
      throw error;
    }
  }

  async getPostById(id: string): Promise<Post | undefined> {
    return posts.find(p => p.id === id);
  }

  async getAllPosts(): Promise<Post[]> {
    return [...posts].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getPostsByAuthor(author: string): Promise<Post[]> {
    return posts.filter(p => p.author === author);
  }

  async getFeed(forUser?: string): Promise<Post[]> {
    // Return all posts for now
    return this.getAllPosts();
  }

  async updatePost(id: string, input: UpdatePostInput): Promise<Post | undefined> {
    const index = posts.findIndex(p => p.id === id);
    if (index === -1) return undefined;

    const post = posts[index];
    if (input.content) post.contentCid = `updated_${Date.now()}`;
    if (input.tags) post.tags = input.tags;
    if (input.media) post.mediaCids = input.media.map((_, i) => `media_${Date.now()}_${i}`);

    return post;
  }

  async deletePost(id: string): Promise<boolean> {
    const index = posts.findIndex(p => p.id === id);
    if (index === -1) return false;
    posts.splice(index, 1);
    return true;
  }

  async getPostsByTag(tag: string): Promise<Post[]> {
    return posts.filter(p => p.tags.includes(tag));
  }
}