import { Request, Response } from 'express';
import { UnifiedSellerVerificationService } from '../services/unifiedSellerVerificationService';
import { ValidationError } from '../models/validation';
import { authMiddleware } from '../middleware/authMiddleware';
import { db } from '../db';
import { sellerVerifications } from '../database/schemas/sellerVerification';
import { eq } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

const verificationService = new UnifiedSellerVerificationService();

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

      safeLogger.error('Error submitting verification:', error);
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
      safeLogger.error('Error fetching verification status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch verification status'
      });
    }
  }

  /**
   * Get verification progress for a seller
   */
  async getVerificationProgressForSeller(req: Request, res: Response): Promise<void> {
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

      const progress = await verificationService.getVerificationProgress(verification.id);
      
      res.json({
        success: true,
        data: progress
      });
    } catch (error) {
      safeLogger.error('Error fetching verification progress:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch verification progress'
      });
    }
  }

  /**
   * Get all pending verification requests (admin only)
   */
  async getPendingVerifications(req: Request, res: Response): Promise<void> {
    try {
      // Fetch pending verifications with seller information
      const pendingVerifications = await verificationService.getPendingVerifications();

      res.json({
        success: true,
        data: pendingVerifications
      });
    } catch (error) {
      safeLogger.error('Error fetching pending verifications:', error);
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
      safeLogger.error('Error fetching verification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch verification'
      });
    }
  }

  /**
   * Get verification progress by ID (admin only)
   */
  async getVerificationProgress(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const progress = await verificationService.getVerificationProgress(id);
      
      if (!progress) {
        res.status(404).json({
          success: false,
          message: 'Verification not found'
        });
        return;
      }

      res.json({
        success: true,
        data: progress
      });
    } catch (error) {
      safeLogger.error('Error fetching verification progress:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch verification progress'
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
      // Get admin ID from authenticated user
      const adminId = (req as any).user?.id || 'system';
      
      const verification = await verificationService.approveVerification(id, adminId, {
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
      safeLogger.error('Error approving verification:', error);
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
      // Get admin ID from authenticated user
      const adminId = (req as any).user?.id || 'system';
      
      if (!reason) {
        res.status(400).json({
          success: false,
          message: 'Rejection reason is required'
        });
        return;
      }
      
      const verification = await verificationService.rejectVerification(id, adminId, reason);
      
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
      safeLogger.error('Error rejecting verification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject verification'
      });
    }
  }

  /**
   * Bulk approve verifications (admin only)
   */
  async bulkApproveVerifications(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.body;
      const adminId = (req as any).user?.id || 'system';
      
      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          message: 'At least one verification ID is required'
        });
        return;
      }

      // Process each verification
      const results = [];
      const errors = [];
      
      for (const id of ids) {
        try {
          const verification = await verificationService.approveVerification(id, adminId, {
            verificationMethod: 'bulk_manual_review',
            riskScore: 'low'
          });
          
          if (verification) {
            results.push({
              id,
              success: true,
              data: verification
            });
          } else {
            errors.push({
              id,
              success: false,
              message: 'Verification not found'
            });
          }
        } catch (error) {
          errors.push({
            id,
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      res.json({
        success: true,
        data: {
          processed: results.length,
          successes: results,
          errors: errors
        },
        message: `Bulk approval completed: ${results.length} approved, ${errors.length} failed`
      });
    } catch (error) {
      safeLogger.error('Error bulk approving verifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bulk approve verifications'
      });
    }
  }

  /**
   * Bulk reject verifications (admin only)
   */
  async bulkRejectVerifications(req: Request, res: Response): Promise<void> {
    try {
      const { ids, reason } = req.body;
      const adminId = (req as any).user?.id || 'system';
      
      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          message: 'At least one verification ID is required'
        });
        return;
      }
      
      if (!reason) {
        res.status(400).json({
          success: false,
          message: 'Rejection reason is required'
        });
        return;
      }

      // Process each verification
      const results = [];
      const errors = [];
      
      for (const id of ids) {
        try {
          const verification = await verificationService.rejectVerification(id, adminId, reason);
          
          if (verification) {
            results.push({
              id,
              success: true,
              data: verification
            });
          } else {
            errors.push({
              id,
              success: false,
              message: 'Verification not found'
            });
          }
        } catch (error) {
          errors.push({
            id,
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      res.json({
        success: true,
        data: {
          processed: results.length,
          successes: results,
          errors: errors
        },
        message: `Bulk rejection completed: ${results.length} rejected, ${errors.length} failed`
      });
    } catch (error) {
      safeLogger.error('Error bulk rejecting verifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bulk reject verifications'
      });
    }
  }
}
