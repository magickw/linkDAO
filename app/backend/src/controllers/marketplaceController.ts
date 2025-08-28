import { Request, Response } from 'express';
import { MarketplaceService } from '../services/marketplaceService';
import { EnhancedEscrowService } from '../services/enhancedEscrowService';
import { 
  CreateListingInput, 
  UpdateListingInput, 
  PlaceBidInput 
} from '../models/Marketplace';
import { APIError, NotFoundError, ValidationError } from '../middleware/errorHandler';

const marketplaceService = new MarketplaceService();
const enhancedEscrowService = new EnhancedEscrowService(
  process.env.RPC_URL || 'http://localhost:8545',
  process.env.ENHANCED_ESCROW_CONTRACT_ADDRESS || '',
  process.env.MARKETPLACE_CONTRACT_ADDRESS || ''
);

export class MarketplaceController {
  // Listings
  async createListing(req: Request, res: Response): Promise<Response> {
    try {
      const input: CreateListingInput = req.body;
      
      // Validate required fields
      if (!input.sellerAddress || !input.price || !input.quantity || !input.metadataURI) {
        throw new ValidationError('Missing required fields');
      }
      
      // Validate item and listing types
      const validItemTypes = ['PHYSICAL', 'DIGITAL', 'NFT', 'SERVICE'];
      const validListingTypes = ['FIXED_PRICE', 'AUCTION'];
      
      if (!validItemTypes.includes(input.itemType)) {
        throw new ValidationError('Invalid item type');
      }
      
      if (!validListingTypes.includes(input.listingType)) {
        throw new ValidationError('Invalid listing type');
      }
      
      // For auctions, duration is required
      if (input.listingType === 'AUCTION' && !input.duration) {
        throw new ValidationError('Duration is required for auction listings');
      }
      
      const listing = await marketplaceService.createListing(input);
      return res.status(201).json(listing);
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  async getListingById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const listing = await marketplaceService.getListingById(id);
      
      if (!listing) {
        throw new NotFoundError('Listing not found');
      }
      
      return res.json(listing);
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  async getListingsBySeller(req: Request, res: Response): Promise<Response> {
    try {
      const { sellerAddress } = req.params;
      const listings = await marketplaceService.getListingsBySeller(sellerAddress);
      return res.json(listings);
    } catch (error: any) {
      throw new APIError(500, error.message);
    }
  }

  async getAllListings(req: Request, res: Response): Promise<Response> {
    try {
      const listings = await marketplaceService.getAllListings();
      return res.json(listings);
    } catch (error: any) {
      throw new APIError(500, error.message);
    }
  }

  async getActiveListings(req: Request, res: Response): Promise<Response> {
    try {
      const listings = await marketplaceService.getActiveListings();
      return res.json(listings);
    } catch (error: any) {
      throw new APIError(500, error.message);
    }
  }

  async updateListing(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const input: UpdateListingInput = req.body;
      
      const listing = await marketplaceService.updateListing(id, input);
      
      if (!listing) {
        throw new NotFoundError('Listing not found');
      }
      
      return res.json(listing);
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  async cancelListing(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const success = await marketplaceService.cancelListing(id);
      
      if (!success) {
        throw new NotFoundError('Listing not found');
      }
      
      return res.status(204).send();
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  // Bids
  async placeBid(req: Request, res: Response): Promise<Response> {
    try {
      const { listingId } = req.params;
      const input: PlaceBidInput = req.body;
      
      // Validate required fields
      if (!input.bidderAddress || !input.amount) {
        throw new ValidationError('Missing required fields');
      }
      
      const bid = await marketplaceService.placeBid(listingId, input);
      
      if (!bid) {
        throw new NotFoundError('Listing not found or not active');
      }
      
      return res.status(201).json(bid);
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  async getBidsByListing(req: Request, res: Response): Promise<Response> {
    try {
      const { listingId } = req.params;
      const listingBids = await marketplaceService.getBidsByListing(listingId);
      return res.json(listingBids);
    } catch (error: any) {
      throw new APIError(500, error.message);
    }
  }

  async getBidsByBidder(req: Request, res: Response): Promise<Response> {
    try {
      const { bidderAddress } = req.params;
      const bidderBids = await marketplaceService.getBidsByBidder(bidderAddress);
      return res.json(bidderBids);
    } catch (error: any) {
      throw new APIError(500, error.message);
    }
  }

  // Escrow
  async createEscrow(req: Request, res: Response): Promise<Response> {
    try {
      const { listingId } = req.params;
      const { buyerAddress } = req.body;
      
      if (!buyerAddress) {
        throw new ValidationError('Buyer address is required');
      }
      
      const escrow = await marketplaceService.createEscrow(listingId, buyerAddress);
      
      if (!escrow) {
        throw new NotFoundError('Listing not found or not active');
      }
      
      return res.status(201).json(escrow);
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  async approveEscrow(req: Request, res: Response): Promise<Response> {
    try {
      const { escrowId } = req.params;
      const { userAddress } = req.body;
      
      if (!userAddress) {
        throw new ValidationError('User address is required');
      }
      
      const success = await marketplaceService.approveEscrow(escrowId, userAddress);
      
      if (!success) {
        throw new NotFoundError('Escrow not found');
      }
      
      return res.status(204).send();
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  async openDispute(req: Request, res: Response): Promise<Response> {
    try {
      const { escrowId } = req.params;
      const { userAddress } = req.body;
      
      if (!userAddress) {
        throw new ValidationError('User address is required');
      }
      
      const success = await marketplaceService.openDispute(escrowId, userAddress);
      
      if (!success) {
        throw new NotFoundError('Escrow not found');
      }
      
      return res.status(204).send();
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  async getEscrowById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const escrow = await marketplaceService.getEscrowById(id);
      
      if (!escrow) {
        throw new NotFoundError('Escrow not found');
      }
      
      return res.json(escrow);
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  async getEscrowsByUser(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress } = req.params;
      const userEscrows = await marketplaceService.getEscrowsByUser(userAddress);
      return res.json(userEscrows);
    } catch (error: any) {
      throw new APIError(500, error.message);
    }
  }

  // Enhanced Escrow methods
  async createEnhancedEscrow(req: Request, res: Response): Promise<Response> {
    try {
      const { listingId, buyerAddress, sellerAddress, tokenAddress, amount } = req.body;
      
      if (!listingId || !buyerAddress || !sellerAddress || !tokenAddress || !amount) {
        throw new ValidationError('Missing required fields');
      }
      
      const escrowId = await enhancedEscrowService.createEscrow(
        listingId, 
        buyerAddress, 
        sellerAddress, 
        tokenAddress, 
        amount
      );
      
      return res.status(201).json({ escrowId });
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  async lockFunds(req: Request, res: Response): Promise<Response> {
    try {
      const { escrowId } = req.params;
      const { amount, tokenAddress } = req.body;
      
      if (!amount || !tokenAddress) {
        throw new ValidationError('Amount and token address are required');
      }
      
      await enhancedEscrowService.lockFunds(escrowId, amount, tokenAddress);
      
      return res.status(204).send();
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  async confirmDelivery(req: Request, res: Response): Promise<Response> {
    try {
      const { escrowId } = req.params;
      const { deliveryInfo } = req.body;
      
      if (!deliveryInfo) {
        throw new ValidationError('Delivery info is required');
      }
      
      await enhancedEscrowService.confirmDelivery(escrowId, deliveryInfo);
      
      return res.status(204).send();
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  async approveEnhancedEscrow(req: Request, res: Response): Promise<Response> {
    try {
      const { escrowId } = req.params;
      const { buyerAddress } = req.body;
      
      if (!buyerAddress) {
        throw new ValidationError('Buyer address is required');
      }
      
      await enhancedEscrowService.approveEscrow(escrowId, buyerAddress);
      
      return res.status(204).send();
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  async openEnhancedDispute(req: Request, res: Response): Promise<Response> {
    try {
      const { escrowId } = req.params;
      const { userAddress, reason } = req.body;
      
      if (!userAddress || !reason) {
        throw new ValidationError('User address and reason are required');
      }
      
      await enhancedEscrowService.openDispute(escrowId, userAddress, reason);
      
      return res.status(204).send();
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  async submitEvidence(req: Request, res: Response): Promise<Response> {
    try {
      const { escrowId } = req.params;
      const { userAddress, evidence } = req.body;
      
      if (!userAddress || !evidence) {
        throw new ValidationError('User address and evidence are required');
      }
      
      await enhancedEscrowService.submitEvidence(escrowId, userAddress, evidence);
      
      return res.status(204).send();
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  async castVote(req: Request, res: Response): Promise<Response> {
    try {
      const { escrowId } = req.params;
      const { voterAddress, voteForBuyer } = req.body;
      
      if (!voterAddress || voteForBuyer === undefined) {
        throw new ValidationError('Voter address and vote are required');
      }
      
      await enhancedEscrowService.castVote(escrowId, voterAddress, voteForBuyer);
      
      return res.status(204).send();
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  // Reputation
  async getUserReputation(req: Request, res: Response): Promise<Response> {
    try {
      const { address } = req.params;
      const reputation = await marketplaceService.getUserReputation(address);
      
      if (!reputation) {
        return res.json({ address, score: 0, daoApproved: false });
      }
      
      return res.json(reputation);
    } catch (error: any) {
      throw new APIError(500, error.message);
    }
  }

  async updateUserReputation(req: Request, res: Response): Promise<Response> {
    try {
      const { address } = req.params;
      const { score, daoApproved } = req.body;
      
      if (score === undefined || daoApproved === undefined) {
        throw new ValidationError('Score and daoApproved are required');
      }
      
      // In a real implementation, only DAO/admin can update reputation
      // For now, we'll allow it for demonstration purposes
      
      const reputation = await marketplaceService.updateUserReputation(address, score, daoApproved);
      return res.json(reputation);
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  async getDAOApprovedVendors(req: Request, res: Response): Promise<Response> {
    try {
      const vendors = await marketplaceService.getDAOApprovedVendors();
      return res.json(vendors);
    } catch (error: any) {
      throw new APIError(500, error.message);
    }
  }
}