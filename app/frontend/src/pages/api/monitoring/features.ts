import { NextApiRequest, NextApiResponse } from 'next';

interface FeatureAdoptionMetrics {
  featureName: string;
  userId: string;
  sessionId: string;
  timestamp: string;
  action: 'viewed' | 'interacted' | 'completed' | 'abandoned';
  duration?: number;
  metadata?: Record<string, any>;
}

// In-memory storage for demo (use database in production)
const metricsStorage: FeatureAdoptionMetrics[] = [];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { metrics } = req.body;

    if (!Array.isArray(metrics)) {
      return res.status(400).json({ error: 'Metrics must be an array' });
    }

    // Validate and store metrics
    const validMetrics = metrics.filter(metric => 
      metric.featureName && 
      metric.userId && 
      metric.sessionId && 
      metric.action
    );

    metricsStorage.push(...validMetrics);

    // In production, you would:
    // 1. Store in database (PostgreSQL, MongoDB, etc.)
    // 2. Send to analytics service (Google Analytics, Mixpanel, etc.)
    // 3. Send to monitoring service (DataDog, New Relic, etc.)

    console.log(`Stored ${validMetrics.length} feature adoption metrics`);

    // Generate insights
    const insights = generateFeatureInsights(validMetrics);

    res.status(200).json({ 
      success: true, 
      stored: validMetrics.length,
      insights 
    });

  } catch (error) {
    console.error('Feature metrics API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function generateFeatureInsights(metrics: FeatureAdoptionMetrics[]) {
  const featureStats: any = {};
  
  metrics.forEach(metric => {
    if (!featureStats[metric.featureName]) {
      featureStats[metric.featureName] = {
        totalInteractions: 0,
        uniqueUsers: new Set(),
        completions: 0,
        abandonments: 0,
        averageDuration: 0,
        durations: [],
      };
    }

    const stats = featureStats[metric.featureName];
    stats.totalInteractions++;
    stats.uniqueUsers.add(metric.userId);

    if (metric.action === 'completed') {
      stats.completions++;
      if (metric.duration) {
        stats.durations.push(metric.duration);
      }
    } else if (metric.action === 'abandoned') {
      stats.abandonments++;
    }
  });

  // Calculate averages and completion rates
  Object.keys(featureStats).forEach(featureName => {
    const stats = featureStats[featureName];
    stats.uniqueUsers = stats.uniqueUsers.size;
    
    if (stats.durations.length > 0) {
      stats.averageDuration = stats.durations.reduce((a: number, b: number) => a + b, 0) / stats.durations.length;
    }
    
    stats.completionRate = stats.totalInteractions > 0 
      ? (stats.completions / stats.totalInteractions) * 100 
      : 0;
    
    delete stats.durations; // Remove raw data from response
  });

  return featureStats;
}

// GET endpoint for retrieving feature analytics
export async function getFeatureAnalytics(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { feature, timeRange = '7d', userId } = req.query;

    // Filter metrics based on query parameters
    let filteredMetrics = [...metricsStorage];

    if (feature) {
      filteredMetrics = filteredMetrics.filter(m => m.featureName === feature);
    }

    if (userId) {
      filteredMetrics = filteredMetrics.filter(m => m.userId === userId);
    }

    // Apply time range filter
    const now = new Date();
    const timeRangeMs = {
      '1d': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    }[timeRange as string] || 7 * 24 * 60 * 60 * 1000;

    filteredMetrics = filteredMetrics.filter(m => 
      new Date(m.timestamp).getTime() > now.getTime() - timeRangeMs
    );

    const insights = generateFeatureInsights(filteredMetrics);
    const timeline = generateTimelineData(filteredMetrics, timeRange as string);

    res.status(200).json({
      insights,
      timeline,
      totalMetrics: filteredMetrics.length,
      timeRange,
    });

  } catch (error) {
    console.error('Feature analytics API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function generateTimelineData(metrics: FeatureAdoptionMetrics[], timeRange: string) {
  const bucketSize = {
    '1d': 60 * 60 * 1000, // 1 hour buckets
    '7d': 24 * 60 * 60 * 1000, // 1 day buckets
    '30d': 7 * 24 * 60 * 60 * 1000, // 1 week buckets
  }[timeRange] || 24 * 60 * 60 * 1000;

  const buckets: any = {};
  
  metrics.forEach(metric => {
    const timestamp = new Date(metric.timestamp).getTime();
    const bucketKey = Math.floor(timestamp / bucketSize) * bucketSize;
    
    if (!buckets[bucketKey]) {
      buckets[bucketKey] = {
        timestamp: bucketKey,
        interactions: 0,
        completions: 0,
        uniqueUsers: new Set(),
      };
    }
    
    buckets[bucketKey].interactions++;
    buckets[bucketKey].uniqueUsers.add(metric.userId);
    
    if (metric.action === 'completed') {
      buckets[bucketKey].completions++;
    }
  });

  // Convert to array and clean up
  return Object.values(buckets).map((bucket: any) => ({
    timestamp: bucket.timestamp,
    interactions: bucket.interactions,
    completions: bucket.completions,
    uniqueUsers: bucket.uniqueUsers.size,
    completionRate: bucket.interactions > 0 
      ? (bucket.completions / bucket.interactions) * 100 
      : 0,
  })).sort((a, b) => a.timestamp - b.timestamp);
}