import { Request, Response } from 'express';
import { MarketplaceService } from '../services/marketplaceService';
import { EnhancedEscrowService } from '../services/enhancedEscrowService';
import { 
  CreateListingInput, 
  UpdateListingInput, 
  PlaceBidInput,
  MakeOfferInput
} from '../models/Marketplace';
import { AppError, NotFoundError, ValidationError } from '../middleware/errorHandler';

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
      if (!input.sellerWalletAddress || !input.price || !input.quantity || !input.metadataURI) {
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
      
      // For NFT items, nftStandard and tokenId are required
      if (input.itemType === 'NFT') {
        if (!input.nftStandard || !input.tokenId) {
          throw new ValidationError('NFT standard and token ID are required for NFT items');
        }
      }
      
      // For auctions, reservePrice and minIncrement are optional but should be valid if provided
      if (input.listingType === 'AUCTION') {
        if (input.reservePrice && isNaN(parseFloat(input.reservePrice))) {
          throw new ValidationError('Invalid reserve price');
        }
        if (input.minIncrement && isNaN(parseFloat(input.minIncrement))) {
          throw new ValidationError('Invalid minimum increment');
        }
      }
      
      const listing = await marketplaceService.createListing(input);
      return res.status(201).json(listing);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message, 500, 'CREATE_LISTING_ERROR');
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
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  async getListingsBySeller(req: Request, res: Response): Promise<Response> {
    try {
      const { sellerAddress } = req.params;
      const listings = await marketplaceService.getListingsBySeller(sellerAddress);
      return res.json(listings);
    } catch (error: any) {
      throw new AppError(error.message, 500, 'GET_LISTINGS_BY_SELLER_ERROR');
    }
  }

  async getAllListings(req: Request, res: Response): Promise<Response> {
    try {
      const listings = await marketplaceService.getAllListings();
      return res.json(listings);
    } catch (error: any) {
      throw new AppError(error.message, 500, 'GET_ALL_LISTINGS_ERROR');
    }
  }

  async getActiveListings(req: Request, res: Response): Promise<Response> {
    try {
      const listings = await marketplaceService.getActiveListings();
      return res.json(listings);
    } catch (error: any) {
      throw new AppError(error.message, 500, 'GET_ACTIVE_LISTINGS_ERROR');
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
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
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
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  // Bids
  async placeBid(req: Request, res: Response): Promise<Response> {
    try {
      const { listingId } = req.params;
      const input: PlaceBidInput = req.body;
      
      // Validate required fields
      if (!input.bidderWalletAddress || !input.amount) {
        throw new ValidationError('Missing required fields');
      }
      
      const bid = await marketplaceService.placeBid(listingId, input);
      
      if (!bid) {
        throw new NotFoundError('Listing not found or not active');
      }
      
      return res.status(201).json(bid);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message, 500, 'PLACE_BID_ERROR');
    }
  }

  async getBidsByListing(req: Request, res: Response): Promise<Response> {
    try {
      const { listingId } = req.params;
      const listingBids = await marketplaceService.getBidsByListing(listingId);
      return res.json(listingBids);
    } catch (error: any) {
      throw new AppError(error.message, 500, 'GET_BIDS_BY_LISTING_ERROR');
    }
  }

  async getBidsByBidder(req: Request, res: Response): Promise<Response> {
    try {
      const { bidderAddress } = req.params;
      const bidderBids = await marketplaceService.getBidsByBidder(bidderAddress);
      return res.json(bidderBids);
    } catch (error: any) {
      throw new AppError(error.message, 500, 'GET_BIDS_BY_BIDDER_ERROR');
    }
  }

  // Offers
  async makeOffer(req: Request, res: Response): Promise<Response> {
    try {
      const { listingId } = req.params;
      const input: MakeOfferInput = req.body;
      
      // Validate required fields
      if (!input.buyerWalletAddress || !input.amount) {
        throw new ValidationError('Missing required fields');
      }
      
      const offer = await marketplaceService.makeOffer(listingId, input);
      
      if (!offer) {
        throw new NotFoundError('Listing not found or not active');
      }
      
      return res.status(201).json(offer);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  async getOffersByListing(req: Request, res: Response): Promise<Response> {
    try {
      const { listingId } = req.params;
      const listingOffers = await marketplaceService.getOffersByListing(listingId);
      return res.json(listingOffers);
    } catch (error: any) {
      throw new AppError(error.message);
    }
  }

  async getOffersByBuyer(req: Request, res: Response): Promise<Response> {
    try {
      const { buyerAddress } = req.params;
      const buyerOffers = await marketplaceService.getOffersByBuyer(buyerAddress);
      return res.json(buyerOffers);
    } catch (error: any) {
      throw new AppError(error.message);
    }
  }

  async acceptOffer(req: Request, res: Response): Promise<Response> {
    try {
      const { offerId } = req.params;
      
      const success = await marketplaceService.acceptOffer(offerId);
      
      if (!success) {
        throw new NotFoundError('Offer not found or already accepted');
      }
      
      return res.status(204).send();
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  // Escrow
  async createEscrow(req: Request, res: Response): Promise<Response> {
    try {
      const { listingId } = req.params;
      const { buyerAddress, deliveryInfo } = req.body;
      
      if (!buyerAddress) {
        throw new ValidationError('Buyer address is required');
      }
      
      const escrow = await marketplaceService.createEscrow(listingId, buyerAddress, deliveryInfo);
      
      if (!escrow) {
        throw new NotFoundError('Listing not found or not active');
      }
      
      return res.status(201).json(escrow);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
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
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
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
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Confirm delivery for an escrow (basic version)
   */
  async confirmDelivery(req: Request, res: Response): Promise<Response> {
    try {
      const { escrowId } = req.params;
      const { deliveryInfo } = req.body;
      
      if (!deliveryInfo) {
        throw new ValidationError('Delivery info is required');
      }
      
      const success = await marketplaceService.confirmDelivery(escrowId, deliveryInfo);
      
      if (!success) {
        throw new NotFoundError('Escrow not found');
      }
      
      return res.status(204).send();
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
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
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  async getEscrowsByUser(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress } = req.params;
      const userEscrows = await marketplaceService.getEscrowsByUser(userAddress);
      return res.json(userEscrows);
    } catch (error: any) {
      throw new AppError(error.message);
    }
  }

  // Orders
  async createOrder(req: Request, res: Response): Promise<Response> {
    try {
      const { listingId, buyerAddress, sellerAddress, amount, paymentToken, escrowId } = req.body;
      
      if (!listingId || !buyerAddress || !sellerAddress || !amount || !paymentToken) {
        throw new ValidationError('Missing required fields');
      }
      
      const order = await marketplaceService.createOrder(
        listingId, 
        buyerAddress, 
        sellerAddress, 
        amount, 
        paymentToken, 
        escrowId
      );
      
      if (!order) {
        throw new AppError('Failed to create order', 500, 'ORDER_CREATION_ERROR');
      }
      
      return res.status(201).json(order);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  async getOrderById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const order = await marketplaceService.getOrderById(id);
      
      if (!order) {
        throw new NotFoundError('Order not found');
      }
      
      return res.json(order);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  async getOrdersByUser(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress } = req.params;
      const userOrders = await marketplaceService.getOrdersByUser(userAddress);
      return res.json(userOrders);
    } catch (error: any) {
      throw new AppError(error.message);
    }
  }

  async updateOrderStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;
      const { status } = req.body;
      
      if (!status) {
        throw new ValidationError('Status is required');
      }
      
      const validStatuses = ['PENDING', 'COMPLETED', 'DISPUTED', 'REFUNDED'];
      if (!validStatuses.includes(status)) {
        throw new ValidationError('Invalid status');
      }
      
      const success = await marketplaceService.updateOrderStatus(orderId, status as any);
      
      if (!success) {
        throw new NotFoundError('Order not found');
      }
      
      return res.status(204).send();
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  // Disputes
  async createDispute(req: Request, res: Response): Promise<Response> {
    try {
      const { escrowId, reporterAddress, reason, evidence } = req.body;
      
      if (!escrowId || !reporterAddress || !reason) {
        throw new ValidationError('Missing required fields');
      }
      
      const dispute = await marketplaceService.createDispute(escrowId, reporterAddress, reason, evidence);
      
      if (!dispute) {
        throw new AppError('Failed to create dispute');
      }
      
      return res.status(201).json(dispute);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  async getDisputeById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const dispute = await marketplaceService.getDisputeById(id);
      
      if (!dispute) {
        throw new NotFoundError('Dispute not found');
      }
      
      return res.json(dispute);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  async getDisputesByUser(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress } = req.params;
      const userDisputes = await marketplaceService.getDisputesByUser(userAddress);
      return res.json(userDisputes);
    } catch (error: any) {
      throw new AppError(error.message);
    }
  }

  async updateDisputeStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { disputeId } = req.params;
      const { status, resolution } = req.body;
      
      if (!status) {
        throw new ValidationError('Status is required');
      }
      
      const validStatuses = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'ESCALATED'];
      if (!validStatuses.includes(status)) {
        throw new ValidationError('Invalid status');
      }
      
      const success = await marketplaceService.updateDisputeStatus(disputeId, status as any, resolution);
      
      if (!success) {
        throw new NotFoundError('Dispute not found');
      }
      
      return res.status(204).send();
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  // AI Moderation
  async createAIModeration(req: Request, res: Response): Promise<Response> {
    try {
      const { objectType, objectId, aiAnalysis } = req.body;
      
      if (!objectType || !objectId) {
        throw new ValidationError('Missing required fields');
      }
      
      const aiModeration = await marketplaceService.createAIModeration(objectType, objectId, aiAnalysis);
      
      if (!aiModeration) {
        throw new AppError('Failed to create AI moderation record');
      }
      
      return res.status(201).json(aiModeration);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  async getAIModerationByObject(req: Request, res: Response): Promise<Response> {
    try {
      const { objectType, objectId } = req.params;
      
      if (!objectType || !objectId) {
        throw new ValidationError('Missing required parameters');
      }
      
      const aiModeration = await marketplaceService.getAIModerationByObject(objectType, objectId);
      
      if (!aiModeration) {
        return res.status(404).json({ message: 'AI moderation record not found' });
      }
      
      return res.json(aiModeration);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  async updateAIModerationStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { status, aiAnalysis } = req.body;
      
      if (!status) {
        throw new ValidationError('Status is required');
      }
      
      const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'];
      if (!validStatuses.includes(status)) {
        throw new ValidationError('Invalid status');
      }
      
      const success = await marketplaceService.updateAIModerationStatus(id, status as any, aiAnalysis);
      
      if (!success) {
        throw new NotFoundError('AI moderation record not found');
      }
      
      return res.status(204).send();
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  async getPendingAIModeration(req: Request, res: Response): Promise<Response> {
    try {
      const aiModerations = await marketplaceService.getPendingAIModeration();
      return res.json(aiModerations);
    } catch (error: any) {
      throw new AppError(error.message);
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
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
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
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Confirm delivery for an enhanced escrow
   */
  async confirmDeliveryEnhanced(req: Request, res: Response): Promise<Response> {
    try {
      const { escrowId } = req.params;
      const { deliveryInfo } = req.body;
      
      if (!deliveryInfo) {
        throw new ValidationError('Delivery info is required');
      }
      
      await enhancedEscrowService.confirmDelivery(escrowId, deliveryInfo);
      
      return res.status(204).send();
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
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
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
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
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
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
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
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
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
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
      throw new AppError(error.message);
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
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  async getDAOApprovedVendors(req: Request, res: Response): Promise<Response> {
    try {
      const vendors = await marketplaceService.getDAOApprovedVendors();
      return res.json(vendors);
    } catch (error: any) {
      throw new AppError(error.message);
    }
  }
}