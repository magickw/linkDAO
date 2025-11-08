import { Router } from 'express';
import { returnService } from '../services/returnService.ts';
import { returnPolicyService } from '../services/returnPolicyService.ts';
import { authMiddleware } from '../middleware/authMiddleware.ts';
import { refundPaymentService } from '../services/refundPaymentService.ts';
import { returnFraudDetectionService } from '../services/returnFraudDetectionService.ts';
import { returnLabelService } from '../services/returnLabelService.ts';
import { returnAnalyticsService } from '../services/returnAnalyticsService.ts';

const router = Router();

// Return request routes
router.post('/returns', authMiddleware, async (req, res) => {
  try {
    const returnRequest = await returnService.createReturn(req.body);
    res.status(201).json(returnRequest);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/returns/:returnId', authMiddleware, async (req, res) => {
  try {
    const returnRecord = await returnService.getReturn(req.params.returnId);
    res.json(returnRecord);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

router.get('/returns/user/:userId', authMiddleware, async (req, res) => {
  try {
    const { role = 'buyer', limit = 20, offset = 0 } = req.query;
    const returns = await returnService.getReturnsForUser(
      req.params.userId,
      role as 'buyer' | 'seller',
      Number(limit),
      Number(offset)
    );
    res.json(returns);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/returns/:returnId/approve', authMiddleware, async (req, res) => {
  try {
    const { approverId, notes } = req.body;
    await returnService.approveReturn(req.params.returnId, approverId, notes);
    res.json({ message: 'Return approved successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/returns/:returnId/reject', authMiddleware, async (req, res) => {
  try {
    const { rejectorId, reason } = req.body;
    await returnService.rejectReturn(req.params.returnId, rejectorId, reason);
    res.json({ message: 'Return rejected successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/returns/:returnId/refund', authMiddleware, async (req, res) => {
  try {
    const { provider = 'stripe', paymentIntentId, recipientAddress } = req.body;
    
    let result;
    if (provider === 'stripe' && paymentIntentId) {
      result = await refundPaymentService.processStripeRefund(paymentIntentId, req.body.amount);
    } else if (provider === 'blockchain' && recipientAddress) {
      result = await refundPaymentService.processBlockchainRefund(recipientAddress, req.body.amount);
    } else {
      return res.status(400).json({ error: 'Invalid refund provider or missing parameters' });
    }
    
    if (result.success) {
      await returnService.processRefund({
        returnId: req.params.returnId,
        amount: req.body.amount,
        reason: req.body.reason,
        refundMethod: provider,
        transactionHash: result.transactionHash,
        refundId: result.refundId
      });
    }
    
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Return policy routes
router.post('/return-policies', authMiddleware, async (req, res) => {
  try {
    const policy = await returnPolicyService.upsertReturnPolicy(req.body);
    res.json(policy);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/return-policies/:sellerId', async (req, res) => {
  try {
    const policy = await returnPolicyService.getReturnPolicy(req.params.sellerId);
    res.json(policy);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// Fraud detection endpoint
router.post('/returns/:returnId/risk-assessment', authMiddleware, async (req, res) => {
  try {
    const risk = await returnFraudDetectionService.calculateRiskScore(req.body);
    res.json(risk);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Generate return label
router.post('/returns/:returnId/label', authMiddleware, async (req, res) => {
  try {
    const label = await returnLabelService.generateShippingLabel(req.body);
    res.json(label);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Enhanced analytics
router.get('/returns/analytics', authMiddleware, async (req, res) => {
  try {
    const { sellerId, periodStart, periodEnd } = req.query;
    const analytics = await returnAnalyticsService.getEnhancedAnalytics(
      sellerId as string,
      { start: periodStart as string, end: periodEnd as string }
    );
    res.json(analytics);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
