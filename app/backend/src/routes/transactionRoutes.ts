import { Router } from 'express';
import { transactionController } from '../controllers/transactionController';

const router = Router();

// Transaction history routes
router.get('/history/:walletAddress', transactionController.getTransactionHistory.bind(transactionController));
router.get('/summary/:walletAddress', transactionController.getTransactionSummary.bind(transactionController));
router.get('/analytics/:walletAddress', transactionController.getTransactionAnalytics.bind(transactionController));

// Transaction management routes
router.post('/record/:walletAddress', transactionController.recordTransaction.bind(transactionController));
router.get('/:transactionId', transactionController.getTransactionById.bind(transactionController));

export default router;