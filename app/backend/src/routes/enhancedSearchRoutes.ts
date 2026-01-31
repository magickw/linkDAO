import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { EnhancedSearchController } from '../controllers/enhancedSearchController';

const router = Router();
const enhancedSearchController = new EnhancedSearchController();

// Enhanced search endpoints
router.get('/search/enhanced', enhancedSearchController.enhancedSearch.bind(enhancedSearchController));
router.get('/search/suggestions/enhanced', enhancedSearchController.getEnhancedSuggestions.bind(enhancedSearchController));

// Discovery endpoints
router.get('/search/enhanced/discovery', enhancedSearchController.getDiscoveryContent.bind(enhancedSearchController));

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
router.post('/bookmarks', csrfProtection,  enhancedSearchController.bookmarkItem.bind(enhancedSearchController));
router.post('/follow', csrfProtection,  enhancedSearchController.followItem.bind(enhancedSearchController));
router.post('/communities/:communityId/join', csrfProtection,  enhancedSearchController.joinCommunity.bind(enhancedSearchController));

// Learning and analytics
router.put('/learning/:userId', csrfProtection,  enhancedSearchController.updateLearningData.bind(enhancedSearchController));
router.post('/analytics/search', csrfProtection,  enhancedSearchController.trackSearchAnalytics.bind(enhancedSearchController));
router.post('/analytics/click-through', csrfProtection,  enhancedSearchController.trackClickThrough.bind(enhancedSearchController));

export default router;
