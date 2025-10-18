import { Router } from 'express';
import userJourneyRoutes from './userJourneyRoutes';
import cohortAnalysisRoutes from './cohortAnalysisRoutes';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';

const router = Router();

// Apply admin authentication to all analytics routes
router.use(adminAuthMiddleware);

// Mount analytics sub-routes
router.use('/user-journey', userJourneyRoutes);
router.use('/cohort-analysis', cohortAnalysisRoutes);

export default router;