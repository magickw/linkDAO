import express from 'express';
import { KYCVerificationService } from '../services/kycVerificationService';
import { KYCVerificationRequest } from '../services/kycVerificationService';

export function createKYCRoutes(kycService: KYCVerificationService): express.Router {
  const router = express.Router();

  // Initiate KYC verification
  router.post('/initiate', async (req, res) => {
    try {
      const { userId, personalInfo, documents, verificationLevel = 'basic' } = req.body;

      // Validation
      if (!userId || !personalInfo || !documents) {
        return res.status(400).json({
          error: 'Missing required fields: userId, personalInfo, documents'
        });
      }

      if (!personalInfo.firstName || !personalInfo.lastName || !personalInfo.email) {
        return res.status(400).json({
          error: 'Missing required personal info: firstName, lastName, email'
        });
      }

      if (!Array.isArray(documents) || documents.length === 0) {
        return res.status(400).json({
          error: 'At least one document is required'
        });
      }

      const request: KYCVerificationRequest = {
        userId,
        personalInfo,
        documents,
        verificationLevel,
      };

      const result = await kycService.initiateVerification(request);

      res.status(200).json({
        success: true,
        verificationId: result.id,
        status: result.status,
        verificationLevel: result.verificationLevel,
        expiresAt: result.expiresAt,
      });
    } catch (error) {
      console.error('KYC initiation error:', error);
      res.status(500).json({
        error: 'Failed to initiate KYC verification',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get verification status
  router.get('/status/:verificationId', async (req, res) => {
    try {
      const { verificationId } = req.params;

      const verification = await kycService.getVerificationStatus(verificationId);

      if (!verification) {
        return res.status(404).json({
          error: 'Verification not found'
        });
      }

      res.status(200).json({
        success: true,
        verification: {
          id: verification.id,
          status: verification.status,
          verificationLevel: verification.verificationLevel,
          riskScore: verification.riskScore,
          reasons: verification.reasons,
          documents: verification.documents,
          createdAt: verification.createdAt,
          updatedAt: verification.updatedAt,
          expiresAt: verification.expiresAt,
        }
      });
    } catch (error) {
      console.error('KYC status retrieval error:', error);
      res.status(500).json({
        error: 'Failed to retrieve verification status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get user verification status
  router.get('/user/:userId/status', async (req, res) => {
    try {
      const { userId } = req.params;

      const verification = await kycService.getUserVerificationStatus(userId);

      if (!verification) {
        return res.status(200).json({
          success: true,
          verified: false,
          verificationLevel: 'none',
          limits: kycService.getPurchaseLimits('none'),
        });
      }

      res.status(200).json({
        success: true,
        verified: verification.status === 'approved',
        verificationLevel: verification.verificationLevel,
        status: verification.status,
        limits: kycService.getPurchaseLimits(verification.verificationLevel),
        lastVerified: verification.updatedAt,
        expiresAt: verification.expiresAt,
      });
    } catch (error) {
      console.error('User KYC status retrieval error:', error);
      res.status(500).json({
        error: 'Failed to retrieve user verification status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Check if verification is required for amount
  router.post('/check-requirement', async (req, res) => {
    try {
      const { userId, amount } = req.body;

      if (!userId || !amount) {
        return res.status(400).json({
          error: 'Missing required fields: userId, amount'
        });
      }

      if (amount <= 0) {
        return res.status(400).json({
          error: 'Amount must be greater than 0'
        });
      }

      const isRequired = await kycService.isVerificationRequired(userId, amount);
      const requiredLevel = await kycService.getRequiredVerificationLevel(amount);

      res.status(200).json({
        success: true,
        verificationRequired: isRequired,
        requiredLevel,
        limits: kycService.getPurchaseLimits(requiredLevel),
      });
    } catch (error) {
      console.error('KYC requirement check error:', error);
      res.status(500).json({
        error: 'Failed to check verification requirement',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get purchase limits
  router.get('/limits/:level?', async (req, res) => {
    try {
      const { level = 'none' } = req.params;

      if (!['none', 'basic', 'enhanced', 'premium'].includes(level)) {
        return res.status(400).json({
          error: 'Invalid verification level'
        });
      }

      const limits = kycService.getPurchaseLimits(level as any);

      res.status(200).json({
        success: true,
        level,
        limits,
      });
    } catch (error) {
      console.error('KYC limits retrieval error:', error);
      res.status(500).json({
        error: 'Failed to retrieve limits',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Generate compliance report
  router.get('/compliance/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      const report = await kycService.generateComplianceReport(userId);

      if (!report) {
        return res.status(404).json({
          error: 'No verification found for user'
        });
      }

      res.status(200).json({
        success: true,
        report,
      });
    } catch (error) {
      console.error('Compliance report generation error:', error);
      res.status(500).json({
        error: 'Failed to generate compliance report',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Webhook endpoints for different providers
  router.post('/webhook/jumio', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const signature = req.headers['x-jumio-signature'] as string;
      
      if (!signature) {
        return res.status(400).json({ error: 'Missing signature' });
      }

      const event = await kycService.handleWebhook(req.body.toString(), signature, 'jumio');
      
      if (!event) {
        return res.status(400).json({ error: 'Invalid webhook' });
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Jumio webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  router.post('/webhook/onfido', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const signature = req.headers['x-sha1-signature'] as string;
      
      if (!signature) {
        return res.status(400).json({ error: 'Missing signature' });
      }

      const event = await kycService.handleWebhook(req.body.toString(), signature, 'onfido');
      
      if (!event) {
        return res.status(400).json({ error: 'Invalid webhook' });
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Onfido webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  router.post('/webhook/sumsub', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const signature = req.headers['x-payload-digest'] as string;
      
      if (!signature) {
        return res.status(400).json({ error: 'Missing signature' });
      }

      const event = await kycService.handleWebhook(req.body.toString(), signature, 'sumsub');
      
      if (!event) {
        return res.status(400).json({ error: 'Invalid webhook' });
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Sumsub webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  return router;
}