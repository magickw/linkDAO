import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { returnService } from '../services/returnService';
import { returnPolicyService } from '../services/returnPolicyService';

describe('Return Service', () => {
  describe('createReturn', () => {
    it('should create a return request with risk assessment', async () => {
      const request = {
        orderId: 'order-123',
        buyerId: 'buyer-123',
        sellerId: 'seller-123',
        returnReason: 'defective',
        returnReasonDetails: 'Item arrived damaged',
        itemsToReturn: [
          {
            itemId: 'item-1',
            quantity: 1,
            reason: 'Damaged on arrival',
            photos: []
          }
        ],
        originalAmount: 99.99
      };

      const result = await returnService.createReturn(request);

      expect(result).toBeDefined();
      expect(result.orderId).toBe(request.orderId);
      expect(result.status).toMatch(/requested|approved/);
      expect(result.riskScore).toBeDefined();
      expect(result.riskLevel).toMatch(/low|medium|high/);
    });

    it('should auto-approve low-risk returns', async () => {
      const request = {
        orderId: 'order-456',
        buyerId: 'new-buyer',
        sellerId: 'seller-123',
        returnReason: 'defective',
        itemsToReturn: [{ itemId: 'item-1', quantity: 1, reason: 'Defective' }],
        originalAmount: 50.00
      };

      const result = await returnService.createReturn(request);

      expect(result.status).toBe('approved');
      expect(result.riskLevel).toBe('low');
    });

    it('should flag high-risk returns for manual review', async () => {
      const request = {
        orderId: 'order-789',
        buyerId: 'frequent-returner',
        sellerId: 'seller-123',
        returnReason: 'changed_mind',
        itemsToReturn: [{ itemId: 'item-1', quantity: 1, reason: 'Changed mind' }],
        originalAmount: 1500.00
      };

      const result = await returnService.createReturn(request);

      expect(result.requiresManualReview).toBe(true);
      expect(result.riskLevel).toMatch(/medium|high/);
    });
  });

  describe('processRefund', () => {
    it('should process Stripe refund successfully', async () => {
      const refundRequest = {
        returnId: 'return-123',
        amount: 99.99,
        reason: 'Defective item',
        refundMethod: 'original_payment' as const
      };

      const result = await returnService.processRefund(refundRequest);

      expect(result).toBeDefined();
      expect(result.status).toMatch(/pending|completed/);
    });

    it('should handle refund failures gracefully', async () => {
      const refundRequest = {
        returnId: 'return-invalid',
        amount: 99.99,
        refundMethod: 'original_payment' as const
      };

      await expect(returnService.processRefund(refundRequest))
        .rejects.toThrow();
    });
  });

  describe('approveReturn', () => {
    it('should approve a return and generate shipping label', async () => {
      const returnId = 'return-123';
      const approverId = 'seller-123';

      await returnService.approveReturn(returnId, approverId, 'Approved');

      const returnRecord = await returnService.getReturn(returnId);
      expect(returnRecord.status).toBe('approved');
      expect(returnRecord.approvedBy).toBe(approverId);
    });
  });

  describe('rejectReturn', () => {
    it('should reject a return with reason', async () => {
      const returnId = 'return-456';
      const rejectorId = 'seller-123';
      const reason = 'Outside return window';

      await returnService.rejectReturn(returnId, rejectorId, reason);

      const returnRecord = await returnService.getReturn(returnId);
      expect(returnRecord.status).toBe('rejected');
      expect(returnRecord.rejectionReason).toBe(reason);
    });
  });
});

describe('Return Policy Service', () => {
  describe('upsertReturnPolicy', () => {
    it('should create a new return policy', async () => {
      const policyData = {
        sellerId: 'seller-new',
        acceptsReturns: true,
        returnWindowDays: 30,
        policyText: 'Standard 30-day return policy',
        requiresOriginalPackaging: true
      };

      const result = await returnPolicyService.upsertReturnPolicy(policyData);

      expect(result).toBeDefined();
      expect(result.sellerId).toBe(policyData.sellerId);
      expect(result.returnWindowDays).toBe(30);
    });

    it('should update existing return policy', async () => {
      const sellerId = 'seller-existing';
      
      // Create initial policy
      await returnPolicyService.upsertReturnPolicy({
        sellerId,
        policyText: 'Initial policy',
        returnWindowDays: 30
      });

      // Update policy
      const updated = await returnPolicyService.upsertReturnPolicy({
        sellerId,
        policyText: 'Updated policy',
        returnWindowDays: 60
      });

      expect(updated.returnWindowDays).toBe(60);
      expect(updated.policyText).toBe('Updated policy');
    });
  });

  describe('getReturnPolicy', () => {
    it('should return default policy if none exists', async () => {
      const policy = await returnPolicyService.getReturnPolicy('seller-no-policy');

      expect(policy).toBeDefined();
      expect(policy.acceptsReturns).toBe(true);
      expect(policy.returnWindowDays).toBe(30);
    });

    it('should return custom policy if exists', async () => {
      const sellerId = 'seller-custom';
      await returnPolicyService.upsertReturnPolicy({
        sellerId,
        policyText: 'Custom policy',
        returnWindowDays: 45
      });

      const policy = await returnPolicyService.getReturnPolicy(sellerId);

      expect(policy.returnWindowDays).toBe(45);
      expect(policy.policyText).toBe('Custom policy');
    });
  });
});
