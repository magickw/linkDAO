import { Router } from 'express';
import { SearchController } from '../controllers/searchController';
import rateLimit from 'express-rate-limit';

// Rate limiting for search endpoints
const searchRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    error: {
      code: 'SEARCH_RATE_LIMIT_EXCEEDED',
      message: 'Too many search requests, please try again later',
    }
  }
});

const router = Router();

// Comprehensive search
router.get('/', searchRateLimit, SearchController.search);

// Specific search endpoints
router.get('/posts', searchRateLimit, SearchController.searchPosts);
router.get('/communities', searchRateLimit, SearchController.searchCommunities);
router.get('/users', searchRateLimit, SearchController.searchUsers);

// Trending content
router.get('/trending', searchRateLimit, SearchController.getTrendingContent);
router.get('/trending/hashtags', searchRateLimit, SearchController.getTrendingHashtags);

// Hashtag and topic discovery
router.get('/hashtags/:hashtag/posts', searchRateLimit, SearchController.getPostsByHashtag);
router.get('/topics/:topic', searchRateLimit, SearchController.getTopicContent);

// Search suggestions
router.get('/suggestions', searchRateLimit, SearchController.getSearchSuggestions);
router.get('/suggestions/enhanced', searchRateLimit, SearchController.getEnhancedSearchSuggestions);

// Recommendations
router.get('/recommendations/communities', searchRateLimit, SearchController.getRecommendedCommunities);
router.get('/recommendations/users', searchRateLimit, SearchController.getRecommendedUsers);

export default router;
