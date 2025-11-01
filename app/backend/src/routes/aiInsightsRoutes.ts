import { Router } from 'express';
import { aiInsightsController } from '../controllers/aiInsightsController';
import { communityRecommendationController } from '../controllers/communityRecommendationController';

const router = Router();

// Existing AI insights routes
router.get('/report', aiInsightsController.getInsightsReport);
router.get('/status', aiInsightsController.getEngineStatus);
router.post('/start', aiInsightsController.startEngine);
router.post('/stop', aiInsightsController.stopEngine);
router.put('/config', aiInsightsController.updateEngineConfig);
router.get('/insights', aiInsightsController.getInsights);
router.get('/performance', aiInsightsController.getPerformanceAnalytics);
router.get('/predictive', aiInsightsController.getPredictiveAnalytics);
router.get('/anomalies', aiInsightsController.getAnomalies);
router.get('/anomalies/stats', aiInsightsController.getAnomalyStatistics);
router.post('/anomalies/configure', aiInsightsController.configureAnomalyThresholds);
router.get('/anomalies/:anomalyId/investigate', aiInsightsController.investigateAnomaly);
router.get('/trends', aiInsightsController.getTrendAnalysis);
router.get('/trends/seasonal', aiInsightsController.getSeasonalPatterns);
router.post('/trends/alerts', aiInsightsController.generateTrendAlerts);
router.get('/trends/visualization', aiInsightsController.createTrendVisualization);
router.get('/trends/forecast', aiInsightsController.forecastMetric);
router.get('/trends/stats', aiInsightsController.getTrendStatistics);
router.get('/insights/analytics', aiInsightsController.getInsightAnalytics);
router.post('/insights/natural-language', aiInsightsController.generateNaturalLanguageInsight);
router.post('/insights/track-outcome', aiInsightsController.trackInsightOutcome);
router.post('/predictive/evaluate', aiInsightsController.evaluatePredictionAccuracy);

// New community recommendation routes
router.post('/community-recommendations', communityRecommendationController.getRecommendations);
router.post('/community-engagement-insights', communityRecommendationController.getEngagementInsights);
router.post('/generate', communityRecommendationController.generateAIRecommendations);

export default router;