import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { aiInsightsController } from '../controllers/aiInsightsController';
import { communityRecommendationController } from '../controllers/communityRecommendationController';

const router = Router();

// Existing AI insights routes
router.get('/report', aiInsightsController.getInsightsReport);
router.get('/status', aiInsightsController.getEngineStatus);
router.post('/start', csrfProtection,  aiInsightsController.startEngine);
router.post('/stop', csrfProtection,  aiInsightsController.stopEngine);
router.put('/config', csrfProtection,  aiInsightsController.updateEngineConfig);
router.get('/insights', aiInsightsController.getInsights);
router.get('/performance', aiInsightsController.getPerformanceAnalytics);
router.get('/predictive', aiInsightsController.getPredictiveAnalytics);
router.get('/anomalies', aiInsightsController.getAnomalies);
router.get('/anomalies/stats', aiInsightsController.getAnomalyStatistics);
router.post('/anomalies/configure', csrfProtection,  aiInsightsController.configureAnomalyThresholds);
router.get('/anomalies/:anomalyId/investigate', aiInsightsController.investigateAnomaly);
router.get('/trends', aiInsightsController.getTrendAnalysis);
router.get('/trends/seasonal', aiInsightsController.getSeasonalPatterns);
router.post('/trends/alerts', csrfProtection,  aiInsightsController.generateTrendAlerts);
router.get('/trends/visualization', aiInsightsController.createTrendVisualization);
router.get('/trends/forecast', aiInsightsController.forecastMetric);
router.get('/trends/stats', aiInsightsController.getTrendStatistics);
router.get('/insights/analytics', aiInsightsController.getInsightAnalytics);
router.post('/insights/natural-language', csrfProtection,  aiInsightsController.generateNaturalLanguageInsight);
router.post('/insights/track-outcome', csrfProtection,  aiInsightsController.trackInsightOutcome);
router.post('/predictive/evaluate', csrfProtection,  aiInsightsController.evaluatePredictionAccuracy);

// New community recommendation routes
router.post('/community-recommendations', csrfProtection,  communityRecommendationController.getRecommendations);
router.post('/community-engagement-insights', csrfProtection,  communityRecommendationController.getEngagementInsights);
router.post('/generate', csrfProtection,  communityRecommendationController.generateAIRecommendations);

export default router;
