import { Router } from 'express';
import { SearchController } from '../controllers/searchController';

const router = Router();

// Comprehensive search
router.get('/', SearchController.search);

// Specific search endpoints
router.get('/posts', SearchController.searchPosts);
router.get('/communities', SearchController.searchCommunities);
router.get('/users', SearchController.searchUsers);

// Trending content
router.get('/trending', SearchController.getTrendingContent);
router.get('/trending/hashtags', SearchController.getTrendingHashtags);

// Hashtag and topic discovery
router.get('/hashtags/:hashtag/posts', SearchController.getPostsByHashtag);
router.get('/topics/:topic', SearchController.getTopicContent);

// Search suggestions
router.get('/suggestions', SearchController.getSearchSuggestions);
router.get('/suggestions/enhanced', SearchController.getEnhancedSearchSuggestions);

// Recommendations
router.get('/recommendations/communities', SearchController.getRecommendedCommunities);
router.get('/recommendations/users', SearchController.getRecommendedUsers);

export default router;
