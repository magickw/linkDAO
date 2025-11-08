import { Router } from 'express';
import { returnService } from '../services/returnService.js';
import { returnPolicyService } from '../services/returnPolicyService.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

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
    const { amount, reason, refundMethod } = req.body;
    const refund = await returnService.processRefund({
      returnId: req.params.returnId,
      amount,
      reason,
      refundMethod
    });
    res.json(refund);
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

export default router;
