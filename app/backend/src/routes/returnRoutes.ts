import { Router } from 'express';
import { returnService } from '../services/returnService';
import { returnPolicyService } from '../services/returnPolicyService';
import { authMiddleware } from '../middleware/authMiddleware';
import { refundPaymentService } from '../services/refundPaymentService';
import { returnFraudDetectionService } from '../services/returnFraudDetectionService';
import { returnLabelService } from '../services/returnLabelService';
import { returnAnalyticsService } from '../services/returnAnalyticsService';
import { returnInspectionService } from '../services/returnInspectionService';

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
    const { provider = 'stripe', paymentIntentId, recipientAddress, captureId, tokenAddress } = req.body;
    
    let result;
    if (provider === 'stripe' && paymentIntentId) {
      result = await refundPaymentService.processStripeRefund(paymentIntentId, req.body.amount, req.body.reason);
    } else if (provider === 'paypal' && captureId) {
      result = await refundPaymentService.processPayPalRefund(captureId, req.body.amount, req.body.currency, req.body.reason);
    } else if (provider === 'blockchain' && recipientAddress) {
      result = await refundPaymentService.processBlockchainRefund(recipientAddress, req.body.amount.toString(), tokenAddress);
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

// Inspection workflow endpoints
router.get('/returns/:returnId/inspection/checklist', authMiddleware, async (req, res) => {
  try {
    const checklist = await returnInspectionService.generateInspectionChecklist(req.params.returnId);
    res.json(checklist);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/returns/:returnId/inspection/checklist-item', authMiddleware, async (req, res) => {
  try {
    const { itemId, checkId, passed, notes } = req.body;
    await returnInspectionService.updateChecklistItem(
      req.params.returnId,
      itemId,
      checkId,
      passed,
      notes
    );
    res.json({ message: 'Checklist item updated successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/returns/:returnId/inspection/complete', authMiddleware, async (req, res) => {
  try {
    const { inspectorId, checklistResults } = req.body;
    const result = await returnInspectionService.completeInspection(
      req.params.returnId,
      inspectorId,
      checklistResults
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/returns/:returnId/inspection', authMiddleware, async (req, res) => {
  try {
    const inspection = await returnInspectionService.getInspectionDetails(req.params.returnId);
    res.json(inspection);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// Generate return label
router.post('/returns/:returnId/label', authMiddleware, async (req, res) => {
  try {
    const { fromAddress, toAddress, weight, carrier } = req.body;
    const label = await returnService.generateReturnLabel(
      req.params.returnId,
      fromAddress,
      toAddress,
      weight,
      carrier
    );
    res.json(label);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get return with tracking information
router.get('/returns/:returnId/tracking', authMiddleware, async (req, res) => {
  try {
    const returnRecord = await returnService.getReturnWithTracking(req.params.returnId);
    res.json(returnRecord);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// Update return tracking manually
router.post('/returns/:returnId/tracking', authMiddleware, async (req, res) => {
  try {
    const { trackingNumber, carrier } = req.body;
    // In a real implementation, we would update tracking info
    // For now, we'll just acknowledge the request
    res.json({ message: 'Tracking information updated' });
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

// Analytics by reason
router.get('/returns/analytics/reasons', authMiddleware, async (req, res) => {
  try {
    const { sellerId, periodStart, periodEnd } = req.query;
    const analytics = await returnAnalyticsService.getAnalyticsByReason(
      sellerId as string,
      { start: periodStart as string, end: periodEnd as string }
    );
    res.json(analytics);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Analytics by time period
router.get('/returns/analytics/time', authMiddleware, async (req, res) => {
  try {
    const { sellerId, periodStart, periodEnd, granularity } = req.query;
    const analytics = await returnAnalyticsService.getAnalyticsByTime(
      sellerId as string,
      { start: periodStart as string, end: periodEnd as string }
    );
    res.json(analytics);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Performance report
router.get('/returns/analytics/report', authMiddleware, async (req, res) => {
  try {
    const { sellerId, periodStart, periodEnd } = req.query;
    const report = await returnAnalyticsService.generatePerformanceReport(
      sellerId as string,
      { start: periodStart as string, end: periodEnd as string }
    );
    res.json(report);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
