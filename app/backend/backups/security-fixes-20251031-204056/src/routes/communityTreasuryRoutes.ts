import { Router } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { safeLogger } from '../utils/safeLogger';
import { authMiddleware } from '../middleware/authMiddleware';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { safeLogger } from '../utils/safeLogger';

const router = Router();

/**
 * Treasury Routes for Community Financial Management
 */

// Get treasury pools for a community
router.get('/:id/treasury/pools', async (req, res) => {
  try {
    const { id: communityId } = req.params;
    
    // Query from communityTreasuryPools table
    const pools = await req.app.locals.db
      .select()
      .from(req.app.locals.schema.communityTreasuryPools)
      .where(req.app.locals.eq(req.app.locals.schema.communityTreasuryPools.communityId, communityId));

    res.json(pools);
  } catch (error) {
    safeLogger.error('Error fetching treasury pools:', error);
    res.status(500).json({ error: 'Failed to fetch treasury pools' });
  }
});

// Get treasury transactions
router.get('/:id/treasury/transactions', async (req, res) => {
  try {
    const { id: communityId } = req.params;
    const { timeRange = '30d', limit = 50 } = req.query;
    
    // Calculate date filter based on time range
    const since = new Date();
    if (timeRange === '7d') since.setDate(since.getDate() - 7);
    else if (timeRange === '30d') since.setDate(since.getDate() - 30);
    else if (timeRange === '90d') since.setDate(since.getDate() - 90);

    // Mock transactions for now - integrate with actual transaction tracking
    const transactions = [];
    
    res.json(transactions);
  } catch (error) {
    safeLogger.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get spending proposals
router.get('/:id/treasury/proposals', async (req, res) => {
  try {
    const { id: communityId } = req.params;
    
    // Query spending proposals from governance proposals
    const proposals = await req.app.locals.db
      .select()
      .from(req.app.locals.schema.communityGovernanceProposals)
      .where(
        req.app.locals.and(
          req.app.locals.eq(req.app.locals.schema.communityGovernanceProposals.communityId, communityId),
          req.app.locals.eq(req.app.locals.schema.communityGovernanceProposals.type, 'spending')
        )
      )
      .orderBy(req.app.locals.desc(req.app.locals.schema.communityGovernanceProposals.createdAt));

    res.json(proposals);
  } catch (error) {
    safeLogger.error('Error fetching spending proposals:', error);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
});

// Create spending proposal
router.post('/:id/treasury/proposals', csrfProtection,  authMiddleware, async (req, res) => {
  try {
    const { id: communityId } = req.params;
    const { title, description, amount, tokenAddress, recipient } = req.body;
    const proposerAddress = req.user?.address;

    if (!proposerAddress) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify user is member
    const membership = await req.app.locals.db
      .select()
      .from(req.app.locals.schema.communityMembers)
      .where(
        req.app.locals.and(
          req.app.locals.eq(req.app.locals.schema.communityMembers.communityId, communityId),
          req.app.locals.eq(req.app.locals.schema.communityMembers.userId, proposerAddress)
        )
      )
      .limit(1);

    if (membership.length === 0) {
      return res.status(403).json({ error: 'Must be a community member to create proposals' });
    }

    // Create proposal
    const proposal = await req.app.locals.db
      .insert(req.app.locals.schema.communityGovernanceProposals)
      .values({
        communityId,
        proposerAddress,
        title,
        description,
        type: 'spending',
        status: 'pending',
        votingStartTime: new Date(),
        votingEndTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        metadata: JSON.stringify({
          amount,
          tokenAddress,
          recipient,
        }),
      })
      .returning();

    res.status(201).json({
      success: true,
      data: proposal[0]
    });
  } catch (error) {
    safeLogger.error('Error creating spending proposal:', error);
    res.status(500).json({ error: 'Failed to create proposal' });
  }
});

export default router;
