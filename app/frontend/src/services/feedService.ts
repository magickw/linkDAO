// Mock Feed Service for testing
import { EnhancedPost, FeedFilter } from '../types/feed';

export interface FeedResponse {
  posts: EnhancedPost[];
  hasMore: boolean;
  totalPages: number;
}

export class FeedService {
  static async getEnhancedFeed(
    filter: FeedFilter,
    page: number = 1,
    limit: number = 20
  ): Promise<FeedResponse> {
    // Mock implementation for testing
    return {
      posts: [],
      hasMore: false,
      totalPages: 1
    };
  }
}