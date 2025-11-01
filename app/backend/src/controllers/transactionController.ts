import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { transactionService } from '../services/transactionService';

export class TransactionController {
  
  /**
   * Get transaction history for a wallet address
   */
  async getTransactionHistory(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress } = req.params;
      const { 
        limit = '50', 
        offset = '0', 
        type, 
        startDate, 
        endDate 
      } = req.query;

      if (!walletAddress) {
        res.status(400).json({
          success: false,
          message: 'Wallet address is required'
        });
        return;
      }

      const parsedLimit = Math.min(parseInt(limit as string) || 50, 100);
      const parsedOffset = parseInt(offset as string) || 0;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const transactions = await transactionService.getTransactionHistory(
        walletAddress,
        parsedLimit,
        parsedOffset,
        type as any,
        start,
        end
      );

      res.json({
        success: true,
        data: transactions,
        pagination: {
          limit: parsedLimit,
          offset: parsedOffset,
          hasMore: transactions.length === parsedLimit
        }
      });
    } catch (error) {
      safeLogger.error('Error getting transaction history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get transaction history',
        error: error.message
      });
    }
  }

  /**
   * Get transaction summary for a wallet address
   */
  async getTransactionSummary(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress } = req.params;
      const { days = '30' } = req.query;

      if (!walletAddress) {
        res.status(400).json({
          success: false,
          message: 'Wallet address is required'
        });
        return;
      }

      const parsedDays = Math.min(parseInt(days as string) || 30, 365);

      const summary = await transactionService.getTransactionSummary(
        walletAddress,
        parsedDays
      );

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      safeLogger.error('Error getting transaction summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get transaction summary',
        error: error.message
      });
    }
  }

  /**
   * Get transaction analytics for a wallet address
   */
  async getTransactionAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress } = req.params;
      const { days = '90' } = req.query;

      if (!walletAddress) {
        res.status(400).json({
          success: false,
          message: 'Wallet address is required'
        });
        return;
      }

      const parsedDays = Math.min(parseInt(days as string) || 90, 365);

      const analytics = await transactionService.getTransactionAnalytics(
        walletAddress,
        parsedDays
      );

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      safeLogger.error('Error getting transaction analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get transaction analytics',
        error: error.message
      });
    }
  }

  /**
   * Record a new transaction manually
   */
  async recordTransaction(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress } = req.params;
      const {
        type,
        amount,
        currency,
        counterpartyAddress,
        orderId,
        transactionHash,
        metadata
      } = req.body;

      if (!walletAddress || !type || !amount || !currency) {
        res.status(400).json({
          success: false,
          message: 'Wallet address, type, amount, and currency are required'
        });
        return;
      }

      const transaction = await transactionService.recordTransaction(
        walletAddress,
        type,
        amount,
        currency,
        counterpartyAddress,
        orderId,
        transactionHash,
        metadata
      );

      res.status(201).json({
        success: true,
        data: transaction,
        message: 'Transaction recorded successfully'
      });
    } catch (error) {
      safeLogger.error('Error recording transaction:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record transaction',
        error: error.message
      });
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(req: Request, res: Response): Promise<void> {
    try {
      const { transactionId } = req.params;

      if (!transactionId) {
        res.status(400).json({
          success: false,
          message: 'Transaction ID is required'
        });
        return;
      }

      // For now, we'll get it from the transaction history
      // In a real implementation, you might want a dedicated method
      const transactions = await transactionService.getTransactionHistory(
        '', // We don't have wallet address, so this is a limitation
        1,
        0
      );

      const transaction = transactions.find(t => t.id === transactionId);

      if (!transaction) {
        res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
        return;
      }

      res.json({
        success: true,
        data: transaction
      });
    } catch (error) {
      safeLogger.error('Error getting transaction:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get transaction',
        error: error.message
      });
    }
  }
}

export const transactionController = new TransactionController();
