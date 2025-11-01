import { Router } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { featureFlagService, FeatureFlag } from '../services/featureFlagService';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Get all feature flags (admin only)
router.get('/flags', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const flags = await featureFlagService.getAllFlags();
    res.json({ flags });
  } catch (error) {
    safeLogger.error('Error getting feature flags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific feature flag
router.get('/flags/:flagName', authMiddleware, async (req, res) => {
  try {
    const { flagName } = req.params;
    const flag = await featureFlagService.getFlag(flagName);
    
    if (!flag) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }

    res.json({ flag });
  } catch (error) {
    safeLogger.error('Error getting feature flag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Evaluate feature flag for current user
router.get('/flags/:flagName/evaluate', authMiddleware, async (req, res) => {
  try {
    const { flagName } = req.params;
    const userId = req.user?.id;
    const userReputation = req.user?.reputation;
    const userGroups = req.user?.groups;

    const evaluation = await featureFlagService.isEnabled(
      flagName,
      userId,
      userReputation,
      userGroups
    );

    res.json({ evaluation });
  } catch (error) {
    safeLogger.error('Error evaluating feature flag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or update feature flag (admin only)
router.put('/flags/:flagName', csrfProtection,  authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { flagName } = req.params;
    const flagData: Partial<FeatureFlag> = req.body;

    // Validate flag data
    if (typeof flagData.enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled field must be boolean' });
    }

    if (typeof flagData.rolloutPercentage !== 'number' || 
        flagData.rolloutPercentage < 0 || 
        flagData.rolloutPercentage > 100) {
      return res.status(400).json({ error: 'rolloutPercentage must be between 0 and 100' });
    }

    const flag: FeatureFlag = {
      name: flagName,
      enabled: flagData.enabled,
      rolloutPercentage: flagData.rolloutPercentage,
      conditions: flagData.conditions,
      metadata: {
        description: flagData.metadata?.description || '',
        owner: flagData.metadata?.owner || req.user.id,
        createdAt: flagData.metadata?.createdAt || new Date(),
        updatedAt: new Date()
      }
    };

    await featureFlagService.setFlag(flag);
    res.json({ flag, message: 'Feature flag updated successfully' });
  } catch (error) {
    safeLogger.error('Error updating feature flag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete feature flag (admin only)
router.delete('/flags/:flagName', csrfProtection,  authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { flagName } = req.params;
    await featureFlagService.deleteFlag(flagName);
    res.json({ message: 'Feature flag deleted successfully' });
  } catch (error) {
    safeLogger.error('Error deleting feature flag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk evaluate multiple flags for current user
router.post('/flags/evaluate', csrfProtection,  authMiddleware, async (req, res) => {
  try {
    const { flagNames } = req.body;
    
    if (!Array.isArray(flagNames)) {
      return res.status(400).json({ error: 'flagNames must be an array' });
    }

    const userId = req.user?.id;
    const userReputation = req.user?.reputation;
    const userGroups = req.user?.groups;

    const evaluations = await Promise.all(
      flagNames.map(async (flagName: string) => {
        const evaluation = await featureFlagService.isEnabled(
          flagName,
          userId,
          userReputation,
          userGroups
        );
        return { flagName, ...evaluation };
      })
    );

    res.json({ evaluations });
  } catch (error) {
    safeLogger.error('Error evaluating feature flags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get feature flag statistics (admin only)
router.get('/flags/:flagName/stats', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { flagName } = req.params;
    
    // This would typically query usage statistics from a metrics store
    // For now, return basic flag information
    const flag = await featureFlagService.getFlag(flagName);
    
    if (!flag) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }

    const stats = {
      flagName,
      enabled: flag.enabled,
      rolloutPercentage: flag.rolloutPercentage,
      conditions: flag.conditions,
      metadata: flag.metadata,
      // These would come from actual usage metrics
      totalEvaluations: 0,
      enabledEvaluations: 0,
      disabledEvaluations: 0,
      lastEvaluated: null
    };

    res.json({ stats });
  } catch (error) {
    safeLogger.error('Error getting feature flag stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
