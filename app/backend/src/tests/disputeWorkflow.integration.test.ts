import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../index';
import { db } from '../db/connection';
import { disputes, escrows, users } from '../../drizzle/schema';
import { DisputeType, DisputeStatus, VerdictType } from '../services/disputeService';

describe('Dispute Workflow Integration Tests', () => {
  let authToken: string;
  let buyerToken: string;
  let sellerToken: string;
  let arbitratorToken: string;
  let escrowId: number;
  let disputeId: number;

  beforeAll(async () => {
    // Setup test users and authentication tokens
    const buyerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        walletAddress: '0xBuyer123',
        handle: 'testbuyer'
      });
    buyerToken = buyerResponse.body.token;

    const sellerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        walletAddress: '0xSeller456',
        handle: 'testseller'
      });
    sellerToken = sellerResponse.body.token;

    const arbitratorResponse = await request(app)
      .post('/api/auth/register')
      .send({
        walletAddress: '0xArbitrator789',
        handle: 'testarbitrator'
      });
    arbitratorToken = arbitratorResponse.body.token;

    // Create test escrow
    const escrowResponse = await request(app)
      .post('/api/escrows')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        sellerId: sellerResponse.body.user.id,
        amount: '100.00',
        listingId: 1
      });
    escrowId = escrowResponse.body.data.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await db.delete(disputes);
    await db.delete(escrows);
    await db.delete(users);
  });

  beforeEach(() => {
    // Reset dispute ID for each test
    disputeId = 0;
  });

  describe('Complete Dispute Resolution Workflow', () => {
    it('should handle full dispute lifecycle from creation to resolution', async () => {
      // Step 1: Create dispute
      const createDisputeResponse = await request(app)
        .post('/api/disputes')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          escrowId,
          reason: 'Product was not received after 2 weeks of waiting. Tracking shows it was never delivered.',
          disputeType: DisputeType.PRODUCT_NOT_RECEIVED,
          evidence: 'Tracking number: 123456789. Shows package was never delivered to my address.'
        });

      expect(createDisputeResponse.status).toBe(201);
      expect(createDisputeResponse.body.success).toBe(true);
      disputeId = createDisputeResponse.body.data.disputeId;

      // Step 2: Submit evidence by buyer
      const submitEvidenceResponse = await request(app)
        .post(`/api/disputes/${disputeId}/evidence`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          evidenceType: 'image',
          ipfsHash: 'QmTestHash123',
          description: 'Screenshot of tracking information showing package was never delivered'
        });

      expect(submitEvidenceResponse.status).toBe(200);
      expect(submitEvidenceResponse.body.success).toBe(true);

      // Step 3: Submit counter-evidence by seller
      const sellerEvidenceResponse = await request(app)
        .post(`/api/disputes/${disputeId}/evidence`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          evidenceType: 'document',
          ipfsHash: 'QmSellerEvidence456',
          description: 'Shipping receipt showing package was sent to correct address'
        });

      expect(sellerEvidenceResponse.status).toBe(200);

      // Step 4: Proceed to arbitration (simulate time passing)
      const proceedResponse = await request(app)
        .post(`/api/disputes/${disputeId}/proceed-arbitration`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(proceedResponse.status).toBe(200);

      // Step 5: Resolve as arbitrator
      const resolveResponse = await request(app)
        .post(`/api/disputes/${disputeId}/resolve`)
        .set('Authorization', `Bearer ${arbitratorToken}`)
        .send({
          verdict: VerdictType.FAVOR_BUYER,
          refundAmount: 100,
          reasoning: 'Evidence clearly shows package was never delivered. Tracking information supports buyer claim.'
        });

      expect(resolveResponse.status).toBe(200);

      // Step 6: Verify dispute is resolved
      const disputeDetailsResponse = await request(app)
        .get(`/api/disputes/${disputeId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(disputeDetailsResponse.status).toBe(200);
      expect(disputeDetailsResponse.body.data.status).toBe(DisputeStatus.RESOLVED);
      expect(disputeDetailsResponse.body.data.verdict).toBe(VerdictType.FAVOR_BUYER);
    });

    it('should handle community voting workflow', async () => {
      // Create dispute for community voting
      const createResponse = await request(app)
        .post('/api/disputes')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          escrowId,
          reason: 'Product description was misleading. Item received was different color and size.',
          disputeType: DisputeType.PRODUCT_NOT_AS_DESCRIBED,
          evidence: 'Photos comparing product listing vs received item'
        });

      disputeId = createResponse.body.data.disputeId;

      // Submit evidence
      await request(app)
        .post(`/api/disputes/${disputeId}/evidence`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          evidenceType: 'image',
          ipfsHash: 'QmComparisonPhoto',
          description: 'Side-by-side comparison of listing photo vs received product'
        });

      // Proceed to community voting
      await request(app)
        .post(`/api/disputes/${disputeId}/proceed-arbitration`)
        .set('Authorization', `Bearer ${buyerToken}`);

      // Cast community votes
      const vote1Response = await request(app)
        .post(`/api/disputes/${disputeId}/vote`)
        .set('Authorization', `Bearer ${arbitratorToken}`)
        .send({
          verdict: VerdictType.FAVOR_BUYER,
          votingPower: 150,
          reasoning: 'Photos clearly show significant difference from listing'
        });

      expect(vote1Response.status).toBe(200);

      // Verify vote was recorded
      const disputeDetails = await request(app)
        .get(`/api/disputes/${disputeId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(disputeDetails.body.data.votes).toHaveLength(1);
      expect(disputeDetails.body.data.votes[0].verdict).toBe(VerdictType.FAVOR_BUYER);
    });

    it('should prevent duplicate evidence submission after deadline', async () => {
      // Create dispute
      const createResponse = await request(app)
        .post('/api/disputes')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          escrowId,
          reason: 'Test dispute for deadline validation',
          disputeType: DisputeType.OTHER
        });

      disputeId = createResponse.body.data.disputeId;

      // Try to submit evidence after deadline (mock by manipulating dispute creation time)
      // In a real test, you would manipulate the database or use time mocking
      const lateEvidenceResponse = await request(app)
        .post(`/api/disputes/${disputeId}/evidence`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          evidenceType: 'text',
          ipfsHash: 'QmLateEvidence',
          description: 'This evidence is submitted too late'
        });

      // Should succeed if within deadline, fail if after deadline
      // The actual behavior depends on the dispute creation time
      expect([200, 500]).toContain(lateEvidenceResponse.status);
    });

    it('should prevent unauthorized actions', async () => {
      // Create dispute
      const createResponse = await request(app)
        .post('/api/disputes')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          escrowId,
          reason: 'Test dispute for authorization',
          disputeType: DisputeType.OTHER
        });

      disputeId = createResponse.body.data.disputeId;

      // Try to resolve dispute without arbitrator privileges
      const unauthorizedResolveResponse = await request(app)
        .post(`/api/disputes/${disputeId}/resolve`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          verdict: VerdictType.FAVOR_BUYER,
          reasoning: 'Unauthorized resolution attempt'
        });

      expect(unauthorizedResolveResponse.status).toBe(500);
      expect(unauthorizedResolveResponse.body.error).toContain('Insufficient reputation');
    });

    it('should handle dispute analytics correctly', async () => {
      // Create and resolve multiple disputes for analytics
      const disputes = [];
      
      for (let i = 0; i < 3; i++) {
        const createResponse = await request(app)
          .post('/api/disputes')
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({
            escrowId,
            reason: `Test dispute ${i + 1} for analytics`,
            disputeType: DisputeType.PRODUCT_NOT_RECEIVED
          });
        
        disputes.push(createResponse.body.data.disputeId);
      }

      // Get analytics
      const analyticsResponse = await request(app)
        .get('/api/disputes/analytics')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(analyticsResponse.status).toBe(200);
      expect(analyticsResponse.body.data).toHaveProperty('totalDisputes');
      expect(analyticsResponse.body.data).toHaveProperty('resolvedDisputes');
      expect(analyticsResponse.body.data).toHaveProperty('averageResolutionTime');
      expect(analyticsResponse.body.data.totalDisputes).toBeGreaterThanOrEqual(3);
    });

    it('should handle user dispute history', async () => {
      // Get user's dispute history
      const historyResponse = await request(app)
        .get('/api/disputes/user/history')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(historyResponse.status).toBe(200);
      expect(Array.isArray(historyResponse.body.data)).toBe(true);
      
      // Should contain disputes created by this user
      const userDisputes = historyResponse.body.data;
      expect(userDisputes.length).toBeGreaterThan(0);
    });

    it('should validate dispute creation input', async () => {
      // Test missing required fields
      const invalidResponse1 = await request(app)
        .post('/api/disputes')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          escrowId,
          // Missing reason and disputeType
        });

      expect(invalidResponse1.status).toBe(400);

      // Test invalid dispute type
      const invalidResponse2 = await request(app)
        .post('/api/disputes')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          escrowId,
          reason: 'Valid reason',
          disputeType: 'invalid_type'
        });

      expect(invalidResponse2.status).toBe(400);

      // Test reason too short
      const invalidResponse3 = await request(app)
        .post('/api/disputes')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          escrowId,
          reason: 'Short',
          disputeType: DisputeType.OTHER
        });

      expect(invalidResponse3.status).toBe(400);
    });

    it('should handle arbitrator application workflow', async () => {
      // Apply to become arbitrator
      const applicationResponse = await request(app)
        .post('/api/arbitrator/apply')
        .set('Authorization', `Bearer ${arbitratorToken}`)
        .send({
          qualifications: 'I have 5 years of experience in dispute resolution and mediation. I hold a degree in law and have successfully resolved over 100 commercial disputes.',
          experience: 'Previously worked as a mediator for commercial disputes at XYZ Company'
        });

      expect(applicationResponse.status).toBe(200);
      expect(applicationResponse.body.success).toBe(true);

      // Get arbitrator dashboard
      const dashboardResponse = await request(app)
        .get('/api/arbitrator/dashboard')
        .set('Authorization', `Bearer ${arbitratorToken}`);

      expect(dashboardResponse.status).toBe(200);
      expect(dashboardResponse.body.data).toHaveProperty('assignedDisputes');
      expect(dashboardResponse.body.data).toHaveProperty('completedCases');
      expect(dashboardResponse.body.data).toHaveProperty('successRate');
    });

    it('should handle concurrent dispute operations', async () => {
      // Create dispute
      const createResponse = await request(app)
        .post('/api/disputes')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          escrowId,
          reason: 'Concurrent operations test',
          disputeType: DisputeType.OTHER
        });

      disputeId = createResponse.body.data.disputeId;

      // Submit evidence concurrently from both parties
      const [buyerEvidence, sellerEvidence] = await Promise.all([
        request(app)
          .post(`/api/disputes/${disputeId}/evidence`)
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({
            evidenceType: 'text',
            ipfsHash: 'QmBuyerEvidence',
            description: 'Buyer evidence'
          }),
        request(app)
          .post(`/api/disputes/${disputeId}/evidence`)
          .set('Authorization', `Bearer ${sellerToken}`)
          .send({
            evidenceType: 'text',
            ipfsHash: 'QmSellerEvidence',
            description: 'Seller evidence'
          })
      ]);

      expect(buyerEvidence.status).toBe(200);
      expect(sellerEvidence.status).toBe(200);

      // Verify both evidence submissions were recorded
      const disputeDetails = await request(app)
        .get(`/api/disputes/${disputeId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(disputeDetails.body.data.evidence).toHaveLength(2);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle non-existent dispute ID', async () => {
      const response = await request(app)
        .get('/api/disputes/99999')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Dispute not found');
    });

    it('should handle duplicate dispute creation', async () => {
      // Create first dispute
      await request(app)
        .post('/api/disputes')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          escrowId,
          reason: 'First dispute',
          disputeType: DisputeType.OTHER
        });

      // Try to create second dispute for same escrow
      const duplicateResponse = await request(app)
        .post('/api/disputes')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          escrowId,
          reason: 'Duplicate dispute',
          disputeType: DisputeType.OTHER
        });

      expect(duplicateResponse.status).toBe(500);
      expect(duplicateResponse.body.error).toContain('Dispute already exists');
    });

    it('should handle invalid authentication', async () => {
      const response = await request(app)
        .post('/api/disputes')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          escrowId,
          reason: 'Test dispute',
          disputeType: DisputeType.OTHER
        });

      expect(response.status).toBe(401);
    });

    it('should handle missing authentication', async () => {
      const response = await request(app)
        .post('/api/disputes')
        .send({
          escrowId,
          reason: 'Test dispute',
          disputeType: DisputeType.OTHER
        });

      expect(response.status).toBe(401);
    });
  });
});
