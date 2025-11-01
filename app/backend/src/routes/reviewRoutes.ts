import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { ReviewController } from '../controllers/reviewController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const reviewController = new ReviewController();

// Public routes
router.get('/users/:userId/reviews', reviewController.getReviewsForUser.bind(reviewController));
router.get('/users/:userId/reviews/stats', reviewController.getReviewStats.bind(reviewController));
router.get('/users/:userId/reputation', reviewController.getUserReputation.bind(reviewController));
router.get('/sellers/rankings', reviewController.getSellerRankings.bind(reviewController));

// Protected routes (require authentication)
router.post('/reviews', csrfProtection,  authenticateToken, reviewController.submitReview.bind(reviewController));
router.post('/reviews/:reviewId/helpful', csrfProtection,  authenticateToken, reviewController.markReviewHelpful.bind(reviewController));
router.post('/reviews/:reviewId/report', csrfProtection,  authenticateToken, reviewController.reportReview.bind(reviewController));

// Admin routes (would need admin authentication in real implementation)
router.post('/reviews/:reviewId/flag', csrfProtection,  authenticateToken, reviewController.flagReview.bind(reviewController));
router.get('/users/:userId/reviews/fake-detection', authenticateToken, reviewController.detectFakeReviews.bind(reviewController));

export default router;
