import { NextApiRequest, NextApiResponse } from 'next';

type VisitorData = {
  totalVisitors: number;
  uniqueVisitors: number;
  pageViews: number;
  averageSessionDuration: number; // seconds
  bounceRate: number;
  newVsReturning: { new: number; returning: number };
  topPages: Array<{ page: string; views: number; uniqueViews: number; avgDuration: number }>;
  geographicData: Array<{ country: string; city?: string; visitors: number; percentage: number; latitude?: number; longitude?: number }>;
  deviceBreakdown: { desktop: number; mobile: number; tablet: number };
  browserStats: Array<{ browser: string; users: number; percentage: number }>;
  realTimeVisitors: number;
  hourlyTraffic: Array<{ hour: number; visitors: number }>;
  referrerSources: Array<{ source: string; visitors: number; percentage: number }>;
  lastUpdated: string;
};

// Small helper to generate deterministic-ish numbers from a seed
const seeded = (seed: number) => () => {
  // xorshift32
  let x = seed >>> 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 0xffffffff;
  };
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { timeRange = '24h' } = req.query as { timeRange?: string };

    // Generate a pseudo-random generator seeded by the timeRange so responses are stable per range
    const seedValue = (typeof timeRange === 'string' ? timeRange.length : 24) + 1337;
    // @ts-ignore - initialize a simple seeded RNG
    const randFactory = seeded(seedValue)();

    const now = new Date();
    const totalVisitors = Math.max(1000, Math.floor(10000 * (0.8 + randFactory() * 0.6)));
    const uniqueVisitors = Math.floor(totalVisitors * (0.6 + randFactory() * 0.25));
    const pageViews = Math.floor(totalVisitors * (3 + randFactory() * 6));
    const averageSessionDuration = Math.floor(120 + randFactory() * 400); // seconds
    const bounceRate = parseFloat((20 + randFactory() * 40).toFixed(1));

    const newVisitors = Math.floor(uniqueVisitors * (0.5 + randFactory() * 0.2));
    const returningVisitors = uniqueVisitors - newVisitors;

    const hourlyTraffic = Array.from({ length: 24 }, (_, hour) => {
      const base = hour >= 9 && hour <= 17 ? 80 : 30;
      const variance = Math.floor(randFactory() * 60);
      return { hour, visitors: base + variance };
    });

    const deviceBreakdown = {
      mobile: Math.floor(uniqueVisitors * (0.5 + randFactory() * 0.2)),
      desktop: Math.floor(uniqueVisitors * (0.3 + randFactory() * 0.15)),
      tablet: Math.floor(uniqueVisitors * (0.05 + randFactory() * 0.05))
    };

    const browserStats = [
      { browser: 'Chrome', users: Math.floor(uniqueVisitors * 0.6), percentage: 60 },
      { browser: 'Safari', users: Math.floor(uniqueVisitors * 0.18), percentage: 18 },
      { browser: 'Firefox', users: Math.floor(uniqueVisitors * 0.08), percentage: 8 },
      { browser: 'Edge', users: Math.floor(uniqueVisitors * 0.04), percentage: 4 },
      { browser: 'Other', users: Math.floor(uniqueVisitors * 0.02), percentage: 2 }
    ];

    const referrerSources = [
      { source: 'Direct', visitors: Math.floor(uniqueVisitors * 0.45), percentage: 45 },
      { source: 'Google Search', visitors: Math.floor(uniqueVisitors * 0.25), percentage: 25 },
      { source: 'Social Media', visitors: Math.floor(uniqueVisitors * 0.15), percentage: 15 },
      { source: 'Referral Sites', visitors: Math.floor(uniqueVisitors * 0.10), percentage: 10 },
      { source: 'Email', visitors: Math.floor(uniqueVisitors * 0.05), percentage: 5 }
    ];

    const topPages = [
      { page: '/', views: Math.floor(pageViews * 0.3), uniqueViews: Math.floor(uniqueVisitors * 0.6), avgDuration: 145 },
      { page: '/marketplace', views: Math.floor(pageViews * 0.25), uniqueViews: Math.floor(uniqueVisitors * 0.4), avgDuration: 234 },
      { page: '/analytics', views: Math.floor(pageViews * 0.15), uniqueViews: Math.floor(uniqueVisitors * 0.3), avgDuration: 298 },
      { page: '/messaging', views: Math.floor(pageViews * 0.1), uniqueViews: Math.floor(uniqueVisitors * 0.2), avgDuration: 156 },
      { page: '/admin', views: Math.floor(pageViews * 0.05), uniqueViews: Math.floor(uniqueVisitors * 0.1), avgDuration: 445 }
    ];

    const geographicData = [
      { country: 'United States', city: 'New York', visitors: Math.floor(uniqueVisitors * 0.25), percentage: 25, latitude: 40.7128, longitude: -74.0060 },
      { country: 'United States', city: 'Los Angeles', visitors: Math.floor(uniqueVisitors * 0.15), percentage: 15, latitude: 34.0522, longitude: -118.2437 },
      { country: 'United Kingdom', city: 'London', visitors: Math.floor(uniqueVisitors * 0.12), percentage: 12, latitude: 51.5074, longitude: -0.1278 },
      { country: 'Germany', city: 'Berlin', visitors: Math.floor(uniqueVisitors * 0.1), percentage: 10, latitude: 52.52, longitude: 13.405 },
      { country: 'Canada', city: 'Toronto', visitors: Math.floor(uniqueVisitors * 0.08), percentage: 8, latitude: 43.6532, longitude: -79.3832 }
    ];

    const payload: VisitorData = {
      totalVisitors,
      uniqueVisitors,
      pageViews,
      averageSessionDuration,
      bounceRate,
      newVsReturning: { new: newVisitors, returning: returningVisitors },
      topPages,
      geographicData,
      deviceBreakdown,
      browserStats,
      realTimeVisitors: Math.floor(50 + randFactory() * 200),
      hourlyTraffic,
      referrerSources,
      lastUpdated: now.toISOString()
    };

    return res.status(200).json({ success: true, data: payload });
  } catch (err) {
    console.error('visitor-analytics error', err);
    return res.status(500).json({ success: false, error: 'Failed to generate visitor analytics' });
  }
}