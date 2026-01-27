import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { AppError, ValidationError, UnauthorizedError } from '../middleware/errorHandler';
import { MarketplaceRegistrationService } from '../services/marketplace/marketplaceRegistrationService';

const marketplaceRegistrationService = new MarketplaceRegistrationService();

export class MarketplaceRegistrationController {
  /**
   * Register a user as a seller in the marketplace
   * This endpoint collects additional information required for selling
   */
  async registerSeller(req: Request, res: Response): Promise<Response> {
    try {
      const { 
        walletAddress,
        legalName,
        email,
        country,
        shippingAddress,
        billingAddress
      } = req.body;
      
      // Validate required fields
      if (!walletAddress) {
        throw new ValidationError('Wallet address is required');
      }
      
      // Verify user is authenticated and owns this wallet address
      const authenticatedUser = (req as any).user;
      if (!authenticatedUser || authenticatedUser.address !== walletAddress) {
        throw new UnauthorizedError('Unauthorized: Wallet address mismatch');
      }
      
      // Register seller with marketplace
      const sellerProfile = await marketplaceRegistrationService.registerSeller({
        walletAddress,
        legalName,
        email,
        country,
        shippingAddress,
        billingAddress
      });
      
      return res.status(201).json({
        success: true,
        message: 'Seller registration successful',
        sellerProfile
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Seller registration failed', 500);
    }
  }

  /**
   * Register a user as a buyer in the marketplace
   * This endpoint may collect optional information for buyers
   */
  async registerBuyer(req: Request, res: Response): Promise<Response> {
    try {
      const { 
        walletAddress,
        email,
        shippingAddress,
        billingAddress
      } = req.body;
      
      // Validate required fields
      if (!walletAddress) {
        throw new ValidationError('Wallet address is required');
      }
      
      // Verify user is authenticated and owns this wallet address
      const authenticatedUser = (req as any).user;
      if (!authenticatedUser || authenticatedUser.address !== walletAddress) {
        throw new UnauthorizedError('Unauthorized: Wallet address mismatch');
      }
      
      // Register buyer with marketplace
      const buyerProfile = await marketplaceRegistrationService.registerBuyer({
        walletAddress,
        email,
        shippingAddress,
        billingAddress
      });
      
      return res.status(201).json({
        success: true,
        message: 'Buyer registration successful',
        buyerProfile
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Buyer registration failed', 500);
    }
  }

  /**
   * Get marketplace profile for a user
   */
  async getMarketplaceProfile(req: Request, res: Response): Promise<Response> {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        throw new ValidationError('Wallet address is required');
      }
      
      const profile = await marketplaceRegistrationService.getMarketplaceProfile(walletAddress);
      
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Marketplace profile not found'
        });
      }
      
      return res.json({
        success: true,
        profile
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to retrieve marketplace profile', 500);
    }
  }

  /**
   * Update marketplace profile
   */
  async updateMarketplaceProfile(req: Request, res: Response): Promise<Response> {
    try {
      const { walletAddress } = req.params;
      const updateData = req.body;
      
      // Validate required fields
      if (!walletAddress) {
        throw new ValidationError('Wallet address is required');
      }
      
      // Verify user is authenticated and owns this wallet address
      const authenticatedUser = (req as any).user;
      if (!authenticatedUser || authenticatedUser.address !== walletAddress) {
        throw new UnauthorizedError('Unauthorized: Wallet address mismatch');
      }
      
      const updatedProfile = await marketplaceRegistrationService.updateMarketplaceProfile(walletAddress, updateData);
      
      return res.json({
        success: true,
        message: 'Marketplace profile updated successfully',
        profile: updatedProfile
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update marketplace profile', 500);
    }
  }

  /**
   * Check if a user is registered as a seller
   */
  async isSeller(req: Request, res: Response): Promise<Response> {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        throw new ValidationError('Wallet address is required');
      }
      
      const isSeller = await marketplaceRegistrationService.isSeller(walletAddress);
      
      return res.json({
        success: true,
        isSeller
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to check seller status', 500);
    }
  }

  /**
   * Check if a user is registered as a buyer
   */
  async isBuyer(req: Request, res: Response): Promise<Response> {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        throw new ValidationError('Wallet address is required');
      }
      
      const isBuyer = await marketplaceRegistrationService.isBuyer(walletAddress);
      
      return res.json({
        success: true,
        isBuyer
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to check buyer status', 500);
    }
  }
}
