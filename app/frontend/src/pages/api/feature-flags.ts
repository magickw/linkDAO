import { NextApiRequest, NextApiResponse } from 'next';

// Feature flag configuration storage (in production, this would be a database)
const FEATURE_FLAG_CONFIG = {
  // Global feature flags
  global: {
    enableEnhancedPostComposer: true,
    enableTokenReactions: true,
    enableRealTimeNotifications: true,
    enablePerformanceOptimizations: true,
    enableVisualPolish: true,
    enableMobileOptimizations: true,
    enableSecurityValidation: true,
    enableAnalytics: true,
  },

  // User segment based flags
  segments: {
    beta_users: {
      enableLearningAlgorithm: true,
      enableAdvancedAnalytics: true,
      enableExperimentalFeatures: true,
    },
    premium_users: {
      enableAdvancedSearch: true,
      enablePriorityNotifications: true,
      enableEnhancedAnalytics: true,
    },
    mobile_users: {
      enableMobileOptimizations: true,
      enableTouchOptimizations: true,
      enableSwipeGestures: true,
    },
  },

  // A/B test configurations
  experiments: {
    post_composer_layout: {
      variants: ['control', 'tabbed', 'modal'],
      traffic_allocation: [40, 30, 30], // Percentage for each variant
      start_date: '2024-01-01',
      end_date: '2024-03-01',
    },
    reaction_system: {
      variants: ['control', 'enhanced_animations', 'gamified'],
      traffic_allocation: [50, 25, 25],
      start_date: '2024-01-15',
      end_date: '2024-02-15',
    },
    feed_algorithm: {
      variants: ['chronological', 'engagement_based', 'ai_curated'],
      traffic_allocation: [33, 33, 34],
      start_date: '2024-02-01',
      end_date: '2024-04-01',
    },
  },

  // Gradual rollout configurations
  rollouts: {
    enableContentPreviews: {
      percentage: 75,
      start_date: '2024-01-01',
      target_percentage: 100,
      rollout_duration_days: 30,
    },
    enableAdvancedSearch: {
      percentage: 50,
      start_date: '2024-01-15',
      target_percentage: 100,
      rollout_duration_days: 14,
    },
    enableReputationSystem: {
      percentage: 90,
      start_date: '2024-01-01',
      target_percentage: 100,
      rollout_duration_days: 7,
    },
  },
};

// User segment detection
const getUserSegment = (userId: string, userAgent?: string): string[] => {
  const segments: string[] = [];

  // Mock user segment logic (in production, this would query user database)
  const userHash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Beta users (10% of users)
  if (userHash % 10 === 0) {
    segments.push('beta_users');
  }

  // Premium users (20% of users)
  if (userHash % 5 === 0) {
    segments.push('premium_users');
  }

  // Mobile users (based on user agent)
  if (userAgent && /Mobile|Android|iPhone|iPad/.test(userAgent)) {
    segments.push('mobile_users');
  }

  return segments;
};

// A/B test variant assignment
const getExperimentVariant = (userId: string, experimentKey: string): string => {
  const experiment = (FEATURE_FLAG_CONFIG.experiments as any)[experimentKey];
  if (!experiment) return 'control';

  // Check if experiment is active
  const now = new Date();
  const startDate = new Date(experiment.start_date);
  const endDate = new Date(experiment.end_date);
  
  if (now < startDate || now > endDate) {
    return 'control';
  }

  // Hash-based variant assignment for consistent user experience
  const hash = (userId + experimentKey).split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);

  const percentile = hash % 100;
  let cumulativePercentage = 0;

  for (let i = 0; i < experiment.variants.length; i++) {
    cumulativePercentage += experiment.traffic_allocation[i];
    if (percentile < cumulativePercentage) {
      return experiment.variants[i];
    }
  }

  return 'control';
};

// Gradual rollout check
const isInRollout = (userId: string, rolloutKey: string): boolean => {
  const rollout = (FEATURE_FLAG_CONFIG.rollouts as any)[rolloutKey];
  if (!rollout) return false;

  // Calculate current rollout percentage based on time
  const now = new Date();
  const startDate = new Date(rollout.start_date);
  const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const dailyIncrease = (rollout.target_percentage - rollout.percentage) / rollout.rollout_duration_days;
  const currentPercentage = Math.min(
    rollout.target_percentage,
    rollout.percentage + (dailyIncrease * daysSinceStart)
  );

  // Hash-based user assignment
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const userPercentile = hash % 100;

  return userPercentile < currentPercentage;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get user segments
    const userSegments = getUserSegment(userId, req.headers['user-agent']);

    // Start with global flags
    let featureFlags = { ...FEATURE_FLAG_CONFIG.global };

    // Apply segment-specific flags
    userSegments.forEach(segment => {
      if ((FEATURE_FLAG_CONFIG.segments as any)[segment]) {
        featureFlags = {
          ...featureFlags,
          ...(FEATURE_FLAG_CONFIG.segments as any)[segment],
        };
      }
    });

    // Apply gradual rollout flags
    Object.keys(FEATURE_FLAG_CONFIG.rollouts).forEach(rolloutKey => {
      if (isInRollout(userId, rolloutKey)) {
        (featureFlags as any)[rolloutKey] = true;
      }
    });

    // Add experiment variants
    const experiments: any = {};
    Object.keys(FEATURE_FLAG_CONFIG.experiments).forEach(experimentKey => {
      experiments[experimentKey] = getExperimentVariant(userId, experimentKey);
    });

    // Log feature flag request for analytics
    console.log('Feature flags requested:', {
      userId: userId.substring(0, 8) + '...',
      userSegments,
      timestamp: new Date().toISOString(),
      flagCount: Object.keys(featureFlags).length,
    });

    res.status(200).json({
      flags: featureFlags,
      experiments,
      userSegments,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Feature flag API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Admin endpoint for updating feature flags (protected in production)
export async function updateFeatureFlag(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // In production, add authentication and authorization checks here
  const { flagKey, value, scope = 'global' } = req.body;

  try {
    if (scope === 'global') {
      (FEATURE_FLAG_CONFIG.global as any)[flagKey] = value;
    } else if ((FEATURE_FLAG_CONFIG.segments as any)[scope]) {
      (FEATURE_FLAG_CONFIG.segments as any)[scope][flagKey] = value;
    }

    // In production, persist changes to database
    console.log('Feature flag updated:', { flagKey, value, scope });

    res.status(200).json({ success: true, flagKey, value, scope });
  } catch (error) {
    console.error('Feature flag update error:', error);
    res.status(500).json({ error: 'Failed to update feature flag' });
  }
}