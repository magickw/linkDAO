/**
 * DAO Shipping Partners Controller
 * Handles API endpoints for DAO shipping partner management
 */

import { Request, Response } from 'express';
import { DAOShippingPartnersService } from '../services/daoShippingPartnersService';

const daoShippingService = new DAOShippingPartnersService();

/**
 * Get all shipping partners
 */
export const getShippingPartners = async (req: Request, res: Response) => {
  try {
    const { daoApproved, region, serviceType } = req.query;
    
    const filters: any = {};
    if (daoApproved !== undefined) filters.daoApproved = daoApproved === 'true';
    if (region) filters.region = region as string;
    if (serviceType) filters.serviceType = serviceType as string;
    
    const partners = await daoShippingService.getAllPartners(filters);
    
    res.json({
      success: true,
      data: partners,
      message: 'Shipping partners retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting shipping partners:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve shipping partners'
    });
  }
};

/**
 * Get partner by ID
 */
export const getPartnerById = async (req: Request, res: Response) => {
  try {
    const { partnerId } = req.params;
    
    const partner = await daoShippingService.getPartnerById(partnerId);
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }
    
    res.json({
      success: true,
      data: partner,
      message: 'Partner retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting partner by ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve partner'
    });
  }
};

/**
 * Create shipping quote
 */
export const createShippingQuote = async (req: Request, res: Response) => {
  try {
    const { partnerId, serviceType, origin, destination, weight, value, dimensions } = req.body;
    
    if (!partnerId || !serviceType || !origin || !destination || !weight || !value) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: partnerId, serviceType, origin, destination, weight, value'
      });
    }
    
    const quote = await daoShippingService.createShippingQuote({
      partnerId,
      serviceType,
      origin,
      destination,
      weight,
      value,
      dimensions
    });
    
    res.json({
      success: true,
      data: quote,
      message: 'Shipping quote created successfully'
    });
  } catch (error) {
    console.error('Error creating shipping quote:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create shipping quote'
    });
  }
};

/**
 * Get active partner proposals
 */
export const getActiveProposals = async (req: Request, res: Response) => {
  try {
    const proposals = await daoShippingService.getActiveProposals();
    
    res.json({
      success: true,
      data: proposals,
      message: 'Active proposals retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting active proposals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve active proposals'
    });
  }
};

/**
 * Submit vote on partner proposal
 */
export const submitProposalVote = async (req: Request, res: Response) => {
  try {
    const { proposalId, voterAddress, vote, votingPower } = req.body;
    
    if (!proposalId || !voterAddress || !vote || votingPower === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: proposalId, voterAddress, vote, votingPower'
      });
    }
    
    if (!['for', 'against', 'abstain'].includes(vote)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid vote value. Must be: for, against, or abstain'
      });
    }
    
    await daoShippingService.submitProposalVote({
      proposalId,
      voterAddress,
      vote,
      votingPower
    });
    
    res.json({
      success: true,
      message: 'Vote submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting proposal vote:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit vote'
    });
  }
};

/**
 * Create new partner proposal
 */
export const createPartnerProposal = async (req: Request, res: Response) => {
  try {
    const { partnerId, proposalType, description, proposedBy, votingDuration } = req.body;
    
    if (!partnerId || !proposalType || !description || !proposedBy) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: partnerId, proposalType, description, proposedBy'
      });
    }
    
    if (!['approval', 'removal', 'update'].includes(proposalType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid proposal type. Must be: approval, removal, or update'
      });
    }
    
    const proposalId = await daoShippingService.createPartnerProposal({
      partnerId,
      proposalType,
      description,
      proposedBy,
      votingDuration
    });
    
    res.status(201).json({
      success: true,
      data: { proposalId },
      message: 'Partner proposal created successfully'
    });
  } catch (error) {
    console.error('Error creating partner proposal:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create partner proposal'
    });
  }
};

/**
 * Update partner metrics
 */
export const updatePartnerMetrics = async (req: Request, res: Response) => {
  try {
    const { partnerId } = req.params;
    const metrics = req.body;
    
    await daoShippingService.updatePartnerMetrics(partnerId, metrics);
    
    res.json({
      success: true,
      message: 'Partner metrics updated successfully'
    });
  } catch (error) {
    console.error('Error updating partner metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update partner metrics'
    });
  }
};

/**
 * Get partner analytics
 */
export const getPartnerAnalytics = async (req: Request, res: Response) => {
  try {
    const { partnerId } = req.query;
    
    const analytics = await daoShippingService.getPartnerAnalytics(partnerId as string);
    
    res.json({
      success: true,
      data: analytics,
      message: 'Partner analytics retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting partner analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve partner analytics'
    });
  }
};

/**
 * Verify partner requirements
 */
export const verifyPartnerRequirements = async (req: Request, res: Response) => {
  try {
    const { partnerId } = req.params;
    
    const verification = await daoShippingService.verifyPartnerRequirements(partnerId);
    
    res.json({
      success: true,
      data: verification,
      message: 'Partner requirements verification completed'
    });
  } catch (error) {
    console.error('Error verifying partner requirements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify partner requirements'
    });
  }
};