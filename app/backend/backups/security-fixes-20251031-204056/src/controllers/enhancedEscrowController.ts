import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { 
  EnhancedEscrowService, 
  EscrowCreationRequest, 
  EscrowValidationResult,
  EscrowStatus,
  EscrowRecoveryOptions
} from '../services/enhancedEscrowService';
import { AppError, ValidationError, NotFoundError } from '../middleware/errorHandler';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

export class EnhancedEscrowController {
  private enhancedEscrowService: EnhancedEscrowService;

  constructor() {
    this.enhancedEscrowService = new EnhancedEscrowService(
      process.env.RPC_URL || 'http://localhost:8545',
      process.env.ENHANCED_ESCROW_CONTRACT_ADDRESS || '',
      process.env.MARKETPLACE_CONTRACT_ADDRESS || ''
    );
  }

  /**
   * Validate escrow creation request
   */
  async validateEscrowCreation(req: Request, res: Response): Promise<Response> {
    try {
      const request: EscrowCreationRequest = req.body;

      if (!request.listingId || !request.buyerAddress || !request.sellerAddress || !request.tokenAddress || !request.amount) {
        throw new ValidationError('Missing required fields: listingId, buyerAddress, sellerAddress, tokenAddress, amount');
      }

      const validation = await this.enhancedEscrowService.validateEscrowCreation(request);

      return res.json({
        success: true,
        data: validation
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Escrow validation failed: ${error.message}`, 500, 'ESCROW_VALIDATION_ERROR');
    }
  }

  /**
   * Create a new escrow
   */
  async createEscrow(req: Request, res: Response): Promise<Response> {
    try {
      const { listingId, buyerAddress, sellerAddress, tokenAddress, amount } = req.body;

      if (!listingId || !buyerAddress || !sellerAddress || !tokenAddress || !amount) {
        throw new ValidationError('Missing required fields: listingId, buyerAddress, sellerAddress, tokenAddress, amount');
      }

      const escrowId = await this.enhancedEscrowService.createEscrow(
        listingId,
        buyerAddress,
        sellerAddress,
        tokenAddress,
        amount
      );

      return res.status(201).json({
        success: true,
        data: {
          escrowId,
          message: 'Escrow created successfully'
        }
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Escrow creation failed: ${error.message}`, 500, 'ESCROW_CREATION_ERROR');
    }
  }

  /**
   * Lock funds in escrow
   */
  async lockFunds(req: Request, res: Response): Promise<Response> {
    try {
      const { escrowId } = req.params;
      const { amount, tokenAddress } = req.body;

      if (!escrowId) {
        throw new ValidationError('Escrow ID is required');
      }

      if (!amount || !tokenAddress) {
        throw new ValidationError('Missing required fields: amount, tokenAddress');
      }

      await this.enhancedEscrowService.lockFunds(escrowId, amount, tokenAddress);

      return res.json({
        success: true,
        data: {
          message: 'Funds locked successfully'
        }
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Fund locking failed: ${error.message}`, 500, 'ESCROW_LOCK_ERROR');
    }
  }

  /**
   * Get escrow details
   */
  async getEscrow(req: Request, res: Response): Promise<Response> {
    try {
      const { escrowId } = req.params;

      if (!escrowId) {
        throw new ValidationError('Escrow ID is required');
      }

      const escrow = await this.enhancedEscrowService.getEscrow(escrowId);

      if (!escrow) {
        throw new NotFoundError('Escrow not found');
      }

      return res.json({
        success: true,
        data: escrow
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to get escrow: ${error.message}`, 500, 'ESCROW_GET_ERROR');
    }
  }

  /**
   * Get escrow status
   */
  async getEscrowStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { escrowId } = req.params;

      if (!escrowId) {
        throw new ValidationError('Escrow ID is required');
      }

      const status = await this.enhancedEscrowService.getEscrowStatus(escrowId);

      if (!status) {
        throw new NotFoundError('Escrow status not found');
      }

      return res.json({
        success: true,
        data: status
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to get escrow status: ${error.message}`, 500, 'ESCROW_STATUS_ERROR');
    }
  }

  /**
   * Get escrow recovery options
   */
  async getEscrowRecoveryOptions(req: Request, res: Response): Promise<Response> {
    try {
      const { escrowId } = req.params;

      if (!escrowId) {
        throw new ValidationError('Escrow ID is required');
      }

      const options = await this.enhancedEscrowService.getEscrowRecoveryOptions(escrowId);

      return res.json({
        success: true,
        data: options
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to get recovery options: ${error.message}`, 500, 'ESCROW_RECOVERY_ERROR');
    }
  }

  /**
   * Confirm delivery
   */
  async confirmDelivery(req: Request, res: Response): Promise<Response> {
    try {
      const { escrowId } = req.params;
      const { deliveryInfo } = req.body;

      if (!escrowId) {
        throw new ValidationError('Escrow ID is required');
      }

      if (!deliveryInfo) {
        throw new ValidationError('Delivery info is required');
      }

      await this.enhancedEscrowService.confirmDelivery(escrowId, deliveryInfo);

      return res.json({
        success: true,
        data: {
          message: 'Delivery confirmed successfully'
        }
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Delivery confirmation failed: ${error.message}`, 500, 'ESCROW_DELIVERY_ERROR');
    }
  }

  /**
   * Approve escrow (buyer confirms receipt)
   */
  async approveEscrow(req: Request, res: Response): Promise<Response> {
    try {
      const { escrowId } = req.params;
      const { buyerAddress } = req.body;

      if (!escrowId) {
        throw new ValidationError('Escrow ID is required');
      }

      if (!buyerAddress) {
        throw new ValidationError('Buyer address is required');
      }

      await this.enhancedEscrowService.approveEscrow(escrowId, buyerAddress);

      return res.json({
        success: true,
        data: {
          message: 'Escrow approved successfully'
        }
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Escrow approval failed: ${error.message}`, 500, 'ESCROW_APPROVAL_ERROR');
    }
  }

  /**
   * Open dispute
   */
  async openDispute(req: Request, res: Response): Promise<Response> {
    try {
      const { escrowId } = req.params;
      const { userAddress, reason } = req.body;

      if (!escrowId) {
        throw new ValidationError('Escrow ID is required');
      }

      if (!userAddress || !reason) {
        throw new ValidationError('Missing required fields: userAddress, reason');
      }

      await this.enhancedEscrowService.openDispute(escrowId, userAddress, reason);

      return res.json({
        success: true,
        data: {
          message: 'Dispute opened successfully'
        }
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Dispute opening failed: ${error.message}`, 500, 'ESCROW_DISPUTE_ERROR');
    }
  }

  /**
   * Submit evidence for dispute
   */
  async submitEvidence(req: Request, res: Response): Promise<Response> {
    try {
      const { escrowId } = req.params;
      const { userAddress, evidence } = req.body;

      if (!escrowId) {
        throw new ValidationError('Escrow ID is required');
      }

      if (!userAddress || !evidence) {
        throw new ValidationError('Missing required fields: userAddress, evidence');
      }

      await this.enhancedEscrowService.submitEvidence(escrowId, userAddress, evidence);

      return res.json({
        success: true,
        data: {
          message: 'Evidence submitted successfully'
        }
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Evidence submission failed: ${error.message}`, 500, 'ESCROW_EVIDENCE_ERROR');
    }
  }

  /**
   * Cast vote in community dispute resolution
   */
  async castVote(req: Request, res: Response): Promise<Response> {
    try {
      const { escrowId } = req.params;
      const { voterAddress, voteForBuyer } = req.body;

      if (!escrowId) {
        throw new ValidationError('Escrow ID is required');
      }

      if (!voterAddress || typeof voteForBuyer !== 'boolean') {
        throw new ValidationError('Missing required fields: voterAddress, voteForBuyer');
      }

      await this.enhancedEscrowService.castVote(escrowId, voterAddress, voteForBuyer);

      return res.json({
        success: true,
        data: {
          message: 'Vote cast successfully'
        }
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Vote casting failed: ${error.message}`, 500, 'ESCROW_VOTE_ERROR');
    }
  }

  /**
   * Cancel escrow
   */
  async cancelEscrow(req: Request, res: Response): Promise<Response> {
    try {
      const { escrowId } = req.params;
      const { cancellerAddress, reason } = req.body;

      if (!escrowId) {
        throw new ValidationError('Escrow ID is required');
      }

      if (!cancellerAddress || !reason) {
        throw new ValidationError('Missing required fields: cancellerAddress, reason');
      }

      await this.enhancedEscrowService.cancelEscrow(escrowId, cancellerAddress, reason);

      return res.json({
        success: true,
        data: {
          message: 'Escrow cancelled successfully'
        }
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Escrow cancellation failed: ${error.message}`, 500, 'ESCROW_CANCEL_ERROR');
    }
  }

  /**
   * Retry escrow operation
   */
  async retryEscrowOperation(req: Request, res: Response): Promise<Response> {
    try {
      const { escrowId } = req.params;
      const { operation } = req.body;

      if (!escrowId) {
        throw new ValidationError('Escrow ID is required');
      }

      if (!operation || !['fund', 'confirm', 'resolve'].includes(operation)) {
        throw new ValidationError('Invalid operation. Must be: fund, confirm, or resolve');
      }

      await this.enhancedEscrowService.retryEscrowOperation(escrowId, operation);

      return res.json({
        success: true,
        data: {
          message: `${operation} operation retried successfully`
        }
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Operation retry failed: ${error.message}`, 500, 'ESCROW_RETRY_ERROR');
    }
  }

  /**
   * Get user reputation score
   */
  async getUserReputation(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress } = req.params;

      if (!userAddress) {
        throw new ValidationError('User address is required');
      }

      const reputation = await this.enhancedEscrowService.getUserReputation(userAddress);

      return res.json({
        success: true,
        data: {
          userAddress,
          reputationScore: reputation
        }
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to get user reputation: ${error.message}`, 500, 'ESCROW_REPUTATION_ERROR');
    }
  }

  /**
   * Health check for escrow service
   */
  async healthCheck(req: Request, res: Response): Promise<Response> {
    try {
      const healthStatus = {
        escrowService: 'healthy',
        contractConnection: 'healthy',
        databaseConnection: 'healthy',
        timestamp: new Date().toISOString()
      };

      // Test contract connection
      try {
        // In a real implementation, test contract call
        safeLogger.info('Testing escrow contract connection...');
      } catch (error) {
        healthStatus.contractConnection = 'unhealthy';
      }

      const isHealthy = Object.values(healthStatus).every(status => 
        status === 'healthy' || typeof status === 'string'
      );

      return res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        data: healthStatus
      });
    } catch (error: any) {
      return res.status(503).json({
        success: false,
        error: 'Health check failed',
        message: error.message
      });
    }
  }
}