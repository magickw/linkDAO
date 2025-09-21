import { Router } from 'express';
import { EnhancedSearchController } from '../controllers/enhancedSearchController';

const router = Router();
const enhancedSearchController = new EnhancedSearchController();

// Enhanced search endpoints
router.get('/enhanced', enhancedSearchController.enhancedSearch.bind(enhancedSearchController));
router.get('/suggestions/enhanced', enhancedSearchController.getEnhancedSuggestions.bind(enhancedSearchController));

// Discovery endpoints
router.get('/discovery', enhancedSearchController.getDiscoveryContent.bind(enhancedSearchController));

// Hashtag discovery
router.get('/hashtags/:hashtag/discovery', enhancedSearchController.getHashtagDiscovery.bind(enhancedSearchController));

// Topic discovery
router.get('/topics/:topic/discovery', enhancedSearchController.getTopicDiscovery.bind(enhancedSearchController));

// Community-specific search
router.get('/communities/:communityId/search', enhancedSearchController.searchInCommunity.bind(enhancedSearchController));

// Recommendations
router.get('/recommendations/communities/enhanced', enhancedSearchController.getCommunityRecommendations.bind(enhancedSearchController));
router.get('/recommendations/users/enhanced', enhancedSearchController.getUserRecommendations.bind(enhancedSearchController));

// User actions
router.post('/bookmarks', enhancedSearchController.bookmarkItem.bind(enhancedSearchController));
router.post('/follow', enhancedSearchController.followItem.bind(enhancedSearchController));
router.post('/communities/:communityId/join', enhancedSearchController.joinCommunity.bind(enhancedSearchController));

// Learning and analytics
router.put('/learning/:userId', enhancedSearchController.updateLearningData.bind(enhancedSearchController));
router.post('/analytics/search', enhancedSearchController.trackSearchAnalytics.bind(enhancedSearchController));
router.post('/analytics/click-through', enhancedSearchController.trackClickThrough.bind(enhancedSearchController));

export default router;