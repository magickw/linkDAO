import { Request, Response } from 'express';
import { SellerVerificationService } from '../services/sellerVerificationService';
import { ValidationError } from '../models/validation';
import { verifyAuth } from '../middleware/authMiddleware';
import { db } from '../db';
import { sellerVerifications } from '../database/schemas/sellerVerification';
import { eq } from 'drizzle-orm';

const verificationService = new SellerVerificationService();

export class SellerVerificationController {
  /**
   * Submit a new verification request
   */
  async submitVerification(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const { legalName, ein, businessAddress } = req.body;

      // Validate required fields
      if (!legalName || !businessAddress) {
        res.status(400).json({
          success: false,
          message: 'Legal name and business address are required'
        });
        return;
      }

      const verificationRequest = {
        legalName,
        ein,
        businessAddress
      };

      const verification = await verificationService.submitVerification(sellerId, verificationRequest);

      res.status(201).json({
        success: true,
        data: verification
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          message: error.message
        });
        return;
      }

      console.error('Error submitting verification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit verification request'
      });
    }
  }

  /**
   * Get verification status for a seller
   */
  async getVerificationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      
      const verification = await verificationService.getActiveVerification(sellerId);
      
      if (!verification) {
        res.status(404).json({
          success: false,
          message: 'No verification found for this seller'
        });
        return;
      }

      res.json({
        success: true,
        data: verification
      });
    } catch (error) {
      console.error('Error fetching verification status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch verification status'
      });
    }
  }

  /**
   * Get all pending verification requests (admin only)
   */
  async getPendingVerifications(req: Request, res: Response): Promise<void> {
    try {
      // Fetch pending verifications with seller information
      const pendingVerifications = await db.select().from(sellerVerifications)
        .where(eq(sellerVerifications.status, 'pending'))
        .orderBy(sellerVerifications.submittedAt, 'desc');

      res.json({
        success: true,
        data: pendingVerifications
      });
    } catch (error) {
      console.error('Error fetching pending verifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pending verification requests'
      });
    }
  }

  /**
   * Get verification by ID (admin only)
   */
  async getVerificationById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const verification = await verificationService.getVerificationById(id);
      
      if (!verification) {
        res.status(404).json({
          success: false,
          message: 'Verification not found'
        });
        return;
      }

      res.json({
        success: true,
        data: verification
      });
    } catch (error) {
      console.error('Error fetching verification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch verification'
      });
    }
  }

  /**
   * Approve verification (admin only)
   */
  async approveVerification(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { verificationMethod, verificationReference, riskScore } = req.body;
      
      const verification = await verificationService.approveVerification(id, {
        verificationMethod,
        verificationReference,
        riskScore
      });
      
      if (!verification) {
        res.status(404).json({
          success: false,
          message: 'Verification not found'
        });
        return;
      }

      res.json({
        success: true,
        data: verification,
        message: 'Verification approved successfully'
      });
    } catch (error) {
      console.error('Error approving verification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve verification'
      });
    }
  }

  /**
   * Reject verification (admin only)
   */
  async rejectVerification(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      if (!reason) {
        res.status(400).json({
          success: false,
          message: 'Rejection reason is required'
        });
        return;
      }
      
      const verification = await verificationService.rejectVerification(id, reason);
      
      if (!verification) {
        res.status(404).json({
          success: false,
          message: 'Verification not found'
        });
        return;
      }

      res.json({
        success: true,
        data: verification,
        message: 'Verification rejected successfully'
      });
    } catch (error) {
      console.error('Error rejecting verification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject verification'
      });
    }
  }
}
