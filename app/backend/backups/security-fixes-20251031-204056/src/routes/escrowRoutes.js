/**
 * Escrow API Routes - Multi-seller escrow management
 * Handles escrow contract creation, management, and dispute resolution
 */

const express = require('express');
const router = express.Router();

// Mock escrow storage (in production, this would be a database)
const escrowContracts = new Map();
const escrowDisputes = new Map();

/**
 * Create multi-seller escrow contracts
 */
router.post('/create-multi-seller', async (req, res) => {
  try {
    const { 
      orderId, 
      buyerAddress, 
      sellerGroups, 
      autoReleaseHours = 168 
    } = req.body;

    if (!orderId || !buyerAddress || !sellerGroups || !Array.isArray(sellerGroups)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: orderId, buyerAddress, sellerGroups'
      });
    }

    const escrowGroups = [];

    // Create escrow contract for each seller
    for (let i = 0; i < sellerGroups.length; i++) {
      const group = sellerGroups[i];
      const escrowId = `escrow_${orderId}_${group.sellerId}_${Date.now()}`;
      
      const escrowContract = {
        id: escrowId,
        orderId: `${orderId}_${group.sellerId}`,
        contractAddress: `0x${Math.random().toString(16).substr(2, 40)}`, // Mock address
        seller: group.sellerAddress,
        buyer: buyerAddress,
        amount: group.totalAmount,
        currency: group.currency || 'ETH',
        status: 'FUNDED',
        items: group.items,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + autoReleaseHours * 60 * 60 * 1000).toISOString(),
        autoReleaseHours,
        transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`, // Mock tx hash
        escrowFee: (parseFloat(group.totalAmount) * 0.01).toString(), // 1% fee
        gasEstimate: '0.001' // Mock gas estimate
      };

      escrowContracts.set(escrowId, escrowContract);

      escrowGroups.push({
        sellerId: group.sellerId,
        sellerName: group.sellerName || `Seller ${group.sellerId.slice(0, 6)}`,
        sellerAddress: group.sellerAddress,
        escrowContract,
        totalAmount: group.totalAmount,
        status: 'funded'
      });
    }

    res.json({
      success: true,
      message: 'Multi-seller escrow contracts created successfully',
      data: {
        orderId,
        escrowGroups,
        totalContracts: escrowGroups.length,
        totalAmount: escrowGroups.reduce((sum, group) => sum + parseFloat(group.totalAmount), 0).toString()
      }
    });

  } catch (error) {
    console.error('Error creating multi-seller escrow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create escrow contracts'
    });
  }
});

/**
 * Get escrow contract details
 */
router.get('/contract/:escrowId', async (req, res) => {
  try {
    const { escrowId } = req.params;
    
    const escrowContract = escrowContracts.get(escrowId);
    
    if (!escrowContract) {
      return res.status(404).json({
        success: false,
        error: 'Escrow contract not found'
      });
    }

    res.json({
      success: true,
      data: escrowContract
    });

  } catch (error) {
    console.error('Error fetching escrow contract:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch escrow contract'
    });
  }
});

/**
 * Get user's escrow contracts
 */
router.get('/user/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { role = 'all' } = req.query; // 'buyer', 'seller', or 'all'
    
    const userContracts = Array.from(escrowContracts.values()).filter(contract => {
      if (role === 'buyer') {
        return contract.buyer.toLowerCase() === walletAddress.toLowerCase();
      } else if (role === 'seller') {
        return contract.seller.toLowerCase() === walletAddress.toLowerCase();
      } else {
        return contract.buyer.toLowerCase() === walletAddress.toLowerCase() ||
               contract.seller.toLowerCase() === walletAddress.toLowerCase();
      }
    });

    // Group by seller for better organization
    const groupedBySeller = userContracts.reduce((groups, contract) => {
      const sellerId = contract.seller;
      if (!groups[sellerId]) {
        groups[sellerId] = {
          sellerId,
          sellerAddress: sellerId,
          contracts: [],
          totalAmount: '0',
          status: 'pending'
        };
      }
      groups[sellerId].contracts.push(contract);
      groups[sellerId].totalAmount = (
        parseFloat(groups[sellerId].totalAmount) + parseFloat(contract.amount)
      ).toString();
      return groups;
    }, {});

    // Determine group status
    Object.values(groupedBySeller).forEach(group => {
      const statuses = group.contracts.map(c => c.status);
      if (statuses.every(s => s === 'RELEASED')) {
        group.status = 'completed';
      } else if (statuses.some(s => s === 'DISPUTED')) {
        group.status = 'disputed';
      } else if (statuses.every(s => s === 'FUNDED')) {
        group.status = 'funded';
      } else {
        group.status = 'partial';
      }
    });

    res.json({
      success: true,
      data: {
        contracts: userContracts,
        groupedBySeller: Object.values(groupedBySeller),
        totalContracts: userContracts.length,
        summary: {
          funded: userContracts.filter(c => c.status === 'FUNDED').length,
          released: userContracts.filter(c => c.status === 'RELEASED').length,
          disputed: userContracts.filter(c => c.status === 'DISPUTED').length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user escrow contracts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch escrow contracts'
    });
  }
});

/**
 * Release escrow funds
 */
router.post('/release/:escrowId', async (req, res) => {
  try {
    const { escrowId } = req.params;
    const { buyerAddress, signature } = req.body;
    
    const escrowContract = escrowContracts.get(escrowId);
    
    if (!escrowContract) {
      return res.status(404).json({
        success: false,
        error: 'Escrow contract not found'
      });
    }

    if (escrowContract.buyer.toLowerCase() !== buyerAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Only buyer can release escrow'
      });
    }

    if (escrowContract.status !== 'FUNDED') {
      return res.status(400).json({
        success: false,
        error: 'Escrow is not in funded state'
      });
    }

    // Update escrow status
    escrowContract.status = 'RELEASED';
    escrowContract.releasedAt = new Date().toISOString();
    escrowContract.releaseTransactionHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    
    escrowContracts.set(escrowId, escrowContract);

    res.json({
      success: true,
      message: 'Escrow funds released successfully',
      data: {
        escrowId,
        transactionHash: escrowContract.releaseTransactionHash,
        releasedAt: escrowContract.releasedAt,
        amount: escrowContract.amount
      }
    });

  } catch (error) {
    console.error('Error releasing escrow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to release escrow'
    });
  }
});

/**
 * Create dispute
 */
router.post('/dispute/:escrowId', async (req, res) => {
  try {
    const { escrowId } = req.params;
    const { reason, evidence, disputantAddress } = req.body;
    
    const escrowContract = escrowContracts.get(escrowId);
    
    if (!escrowContract) {
      return res.status(404).json({
        success: false,
        error: 'Escrow contract not found'
      });
    }

    if (escrowContract.status !== 'FUNDED') {
      return res.status(400).json({
        success: false,
        error: 'Can only dispute funded escrow contracts'
      });
    }

    const isAuthorized = 
      escrowContract.buyer.toLowerCase() === disputantAddress.toLowerCase() ||
      escrowContract.seller.toLowerCase() === disputantAddress.toLowerCase();

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'Only buyer or seller can create disputes'
      });
    }

    const disputeId = `dispute_${escrowId}_${Date.now()}`;
    
    const dispute = {
      id: disputeId,
      escrowId,
      reason,
      evidence: evidence || [],
      disputant: disputantAddress,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      votes: {
        forBuyer: 0,
        forSeller: 0,
        total: 0
      },
      resolution: null
    };

    // Update escrow status
    escrowContract.status = 'DISPUTED';
    escrowContract.disputeId = disputeId;
    escrowContract.disputeReason = reason;
    
    escrowContracts.set(escrowId, escrowContract);
    escrowDisputes.set(disputeId, dispute);

    res.json({
      success: true,
      message: 'Dispute created successfully',
      data: {
        disputeId,
        escrowId,
        status: 'OPEN',
        createdAt: dispute.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating dispute:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create dispute'
    });
  }
});

/**
 * Get dispute details
 */
router.get('/dispute/:disputeId', async (req, res) => {
  try {
    const { disputeId } = req.params;
    
    const dispute = escrowDisputes.get(disputeId);
    
    if (!dispute) {
      return res.status(404).json({
        success: false,
        error: 'Dispute not found'
      });
    }

    const escrowContract = escrowContracts.get(dispute.escrowId);

    res.json({
      success: true,
      data: {
        dispute,
        escrowContract
      }
    });

  } catch (error) {
    console.error('Error fetching dispute:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dispute'
    });
  }
});

/**
 * Vote on dispute (DAO governance)
 */
router.post('/dispute/:disputeId/vote', async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { voterAddress, vote, daoTokens } = req.body; // vote: 'buyer' or 'seller'
    
    const dispute = escrowDisputes.get(disputeId);
    
    if (!dispute) {
      return res.status(404).json({
        success: false,
        error: 'Dispute not found'
      });
    }

    if (dispute.status !== 'OPEN') {
      return res.status(400).json({
        success: false,
        error: 'Dispute is not open for voting'
      });
    }

    if (!['buyer', 'seller'].includes(vote)) {
      return res.status(400).json({
        success: false,
        error: 'Vote must be either "buyer" or "seller"'
      });
    }

    // Mock DAO token validation (in production, verify on-chain)
    const votingPower = daoTokens || 1;

    // Record vote
    if (vote === 'buyer') {
      dispute.votes.forBuyer += votingPower;
    } else {
      dispute.votes.forSeller += votingPower;
    }
    dispute.votes.total += votingPower;

    // Check if dispute should be resolved (simple majority)
    const threshold = 10; // Minimum votes needed
    if (dispute.votes.total >= threshold) {
      const winner = dispute.votes.forBuyer > dispute.votes.forSeller ? 'buyer' : 'seller';
      
      dispute.status = 'RESOLVED';
      dispute.resolution = {
        winner,
        resolvedAt: new Date().toISOString(),
        finalVotes: { ...dispute.votes }
      };

      // Update escrow contract
      const escrowContract = escrowContracts.get(dispute.escrowId);
      escrowContract.status = 'RESOLVED';
      escrowContract.resolution = dispute.resolution;
      
      escrowContracts.set(dispute.escrowId, escrowContract);
    }

    escrowDisputes.set(disputeId, dispute);

    res.json({
      success: true,
      message: 'Vote recorded successfully',
      data: {
        disputeId,
        currentVotes: dispute.votes,
        status: dispute.status,
        resolution: dispute.resolution
      }
    });

  } catch (error) {
    console.error('Error recording vote:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record vote'
    });
  }
});

/**
 * Get escrow statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const allContracts = Array.from(escrowContracts.values());
    const allDisputes = Array.from(escrowDisputes.values());

    const stats = {
      totalContracts: allContracts.length,
      totalValue: allContracts.reduce((sum, contract) => sum + parseFloat(contract.amount), 0).toString(),
      statusBreakdown: {
        funded: allContracts.filter(c => c.status === 'FUNDED').length,
        released: allContracts.filter(c => c.status === 'RELEASED').length,
        disputed: allContracts.filter(c => c.status === 'DISPUTED').length,
        resolved: allContracts.filter(c => c.status === 'RESOLVED').length
      },
      disputes: {
        total: allDisputes.length,
        open: allDisputes.filter(d => d.status === 'OPEN').length,
        resolved: allDisputes.filter(d => d.status === 'RESOLVED').length
      },
      averageEscrowAmount: allContracts.length > 0 
        ? (allContracts.reduce((sum, contract) => sum + parseFloat(contract.amount), 0) / allContracts.length).toFixed(4)
        : '0'
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching escrow stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

/**
 * Process expired escrows (auto-release)
 */
router.post('/process-expired', async (req, res) => {
  try {
    const now = new Date();
    const expiredContracts = Array.from(escrowContracts.values()).filter(contract => 
      contract.status === 'FUNDED' && new Date(contract.expiresAt) < now
    );

    const processedContracts = [];

    for (const contract of expiredContracts) {
      contract.status = 'RELEASED';
      contract.releasedAt = new Date().toISOString();
      contract.releaseTransactionHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      contract.autoReleased = true;
      
      escrowContracts.set(contract.id, contract);
      processedContracts.push(contract.id);
    }

    res.json({
      success: true,
      message: `Processed ${processedContracts.length} expired escrow contracts`,
      data: {
        processedCount: processedContracts.length,
        processedContracts
      }
    });

  } catch (error) {
    console.error('Error processing expired escrows:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process expired escrows'
    });
  }
});

module.exports = router;