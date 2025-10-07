import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { communityService } from '../services/communityService';
import { db } from '../db';

describe('CommunityService', () => {
  beforeAll(async () => {
    // Setup test database if needed
  });

  afterAll(async () => {
    // Cleanup test database if needed
  });

  describe('listCommunities', () => {
    it('should return communities with pagination', async () => {
      const result = await communityService.listCommunities({
        page: 1,
        limit: 10,
        sort: 'members',
        tags: []
      });

      expect(result).toHaveProperty('communities');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toHaveProperty('page', 1);
      expect(result.pagination).toHaveProperty('limit', 10);
      expect(Array.isArray(result.communities)).toBe(true);
    });

    it('should filter communities by category', async () => {
      const result = await communityService.listCommunities({
        page: 1,
        limit: 10,
        category: 'Finance',
        sort: 'members',
        tags: []
      });

      expect(result).toHaveProperty('communities');
      expect(Array.isArray(result.communities)).toBe(true);
    });

    it('should search communities by query', async () => {
      const result = await communityService.listCommunities({
        page: 1,
        limit: 10,
        search: 'test',
        sort: 'members',
        tags: []
      });

      expect(result).toHaveProperty('communities');
      expect(Array.isArray(result.communities)).toBe(true);
    });
  });

  describe('getCommunityCategories', () => {
    it('should return available categories', async () => {
      const categories = await communityService.getCommunityCategories();
      
      expect(Array.isArray(categories)).toBe(true);
      if (categories.length > 0) {
        expect(categories[0]).toHaveProperty('id');
        expect(categories[0]).toHaveProperty('name');
        expect(categories[0]).toHaveProperty('slug');
      }
    });
  });

  describe('getTrendingCommunities', () => {
    it('should return trending communities', async () => {
      const result = await communityService.getTrendingCommunities({
        page: 1,
        limit: 5,
        timeRange: '7d'
      });

      expect(result).toHaveProperty('communities');
      expect(result).toHaveProperty('pagination');
      expect(Array.isArray(result.communities)).toBe(true);
    });
  });

  describe('searchCommunities', () => {
    it('should search communities with query', async () => {
      const result = await communityService.searchCommunities({
        query: 'test',
        page: 1,
        limit: 10
      });

      expect(result).toHaveProperty('communities');
      expect(result).toHaveProperty('pagination');
      expect(Array.isArray(result.communities)).toBe(true);
    });
  });

  describe('calculateMemberCounts', () => {
    it('should handle non-existent community gracefully', async () => {
      const result = await communityService.calculateMemberCounts('non-existent-id');
      
      expect(result).toHaveProperty('total', 0);
      expect(result).toHaveProperty('active7d', 0);
      expect(result).toHaveProperty('active30d', 0);
    });
  });

  describe('getPersonalizedRecommendations', () => {
    it('should return personalized recommendations', async () => {
      const result = await communityService.getPersonalizedRecommendations('0x1234567890123456789012345678901234567890');
      
      expect(Array.isArray(result)).toBe(true);
    });
  });
});