import { useState, useEffect, useCallback } from 'react';

interface UserJourneyStep {
  step: string;
  stepOrder: number;
  users: number;
  dropoffRate: number;
  conversionRate: number;
  averageTimeSpent: number;
  timestamp: Date;
}

interface DropOffPoint {
  stepName: string;
  stepOrder: number;
  dropoffRate: number;
  usersLost: number;
  commonExitPages: string[];
  suggestedImprovements: string[];
}

interface JourneyMap {
  pathId: string;
  pathName: string;
  steps: UserJourneyStep[];
  totalUsers: number;
  overallConversionRate: number;
  averageDuration: number;
  dropOffPoints: DropOffPoint[];
}

interface FunnelStep {
  stepName: string;
  stepOrder: number;
  users: number;
  conversionRate: number;
  dropoffRate: number;
  averageTimeToNext: number;
}

interface ConversionFunnel {
  funnelName: string;
  steps: FunnelStep[];
  overallConversionRate: number;
  totalEntries: number;
  totalConversions: number;
}

interface UserSession {
  sessionId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  totalDuration: number;
  pageViews: number;
  events: SessionEvent[];
  deviceType: string;
  browser: string;
  country?: string;
  converted: boolean;
  conversionValue?: number;
}

interface SessionEvent {
  eventType: string;
  pageUrl: string;
  timestamp: Date;
  eventData: any;
  timeFromStart: number;
}

interface JourneySummary {
  dateRange: { startDate: Date; endDate: Date };
  totalSessions: number;
  convertedSessions: number;
  conversionRate: number;
  averageSessionDuration: number;
  averagePageViews: number;
  topPaths: JourneyMap[];
  deviceBreakdown: Record<string, number>;
  totalJourneyPaths: number;
}

interface RealTimeMetrics {
  currentHour: string;
  activeUsers: number;
  pageViews: number;
  topPages: Array<{ page: string; views: number }>;
  conversionEvents: number;
}

interface UseUserJourneyAnalyticsOptions {
  startDate: Date;
  endDate: Date;
  funnelSteps?: string[];
  userId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseUserJourneyAnalyticsReturn {
  journeyMaps: JourneyMap[] | null;
  conversionFunnel: ConversionFunnel | null;
  userSessions: UserSession[] | null;
  journeySummary: JourneySummary | null;
  realTimeMetrics: RealTimeMetrics | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  trackEvent: (eventData: {
    userId: string;
    sessionId: string;
    eventType: string;
    pageUrl: string;
    eventData?: any;
    metadata?: any;
  }) => Promise<void>;
}

export const useUserJourneyAnalytics = (
  options: UseUserJourneyAnalyticsOptions
): UseUserJourneyAnalyticsReturn => {
  const [journeyMaps, setJourneyMaps] = useState<JourneyMap[] | null>(null);
  const [conversionFunnel, setConversionFunnel] = useState<ConversionFunnel | null>(null);
  const [userSessions, setUserSessions] = useState<UserSession[] | null>(null);
  const [journeySummary, setJourneySummary] = useState<JourneySummary | null>(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    startDate,
    endDate,
    funnelSteps = ['landing', 'signup', 'onboarding', 'conversion'],
    userId,
    autoRefresh = false,
    refreshInterval = 30000
  } = options;

  const fetchJourneyMaps = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      const response = await fetch(`/api/admin/user-journey/maps?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch journey maps: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setJourneyMaps(data.data.journeyMaps);
      } else {
        throw new Error(data.message || 'Failed to fetch journey maps');
      }
    } catch (err) {
      console.error('Error fetching journey maps:', err);
      throw err;
    }
  }, [startDate, endDate]);

  const fetchConversionFunnel = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/user-journey/funnel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          funnelSteps,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch conversion funnel: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setConversionFunnel(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch conversion funnel');
      }
    } catch (err) {
      console.error('Error fetching conversion funnel:', err);
      throw err;
    }
  }, [startDate, endDate, funnelSteps]);

  const fetchUserSessions = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: '100'
      });

      if (userId) {
        params.append('userId', userId);
      }

      const response = await fetch(`/api/admin/user-journey/sessions?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user sessions: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setUserSessions(data.data.sessions.map((session: any) => ({
          ...session,
          startTime: new Date(session.startTime),
          endTime: session.endTime ? new Date(session.endTime) : undefined,
          events: session.events.map((event: any) => ({
            ...event,
            timestamp: new Date(event.timestamp)
          }))
        })));
      } else {
        throw new Error(data.message || 'Failed to fetch user sessions');
      }
    } catch (err) {
      console.error('Error fetching user sessions:', err);
      throw err;
    }
  }, [startDate, endDate, userId]);

  const fetchJourneySummary = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      const response = await fetch(`/api/admin/user-journey/summary?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch journey summary: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setJourneySummary({
          ...data.data,
          dateRange: {
            startDate: new Date(data.data.dateRange.startDate),
            endDate: new Date(data.data.dateRange.endDate)
          }
        });
      } else {
        throw new Error(data.message || 'Failed to fetch journey summary');
      }
    } catch (err) {
      console.error('Error fetching journey summary:', err);
      throw err;
    }
  }, [startDate, endDate]);

  const fetchRealTimeMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/user-journey/realtime', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch real-time metrics: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setRealTimeMetrics(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch real-time metrics');
      }
    } catch (err) {
      console.error('Error fetching real-time metrics:', err);
      throw err;
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchJourneyMaps(),
        fetchConversionFunnel(),
        fetchUserSessions(),
        fetchJourneySummary(),
        fetchRealTimeMetrics()
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [
    fetchJourneyMaps,
    fetchConversionFunnel,
    fetchUserSessions,
    fetchJourneySummary,
    fetchRealTimeMetrics
  ]);

  const trackEvent = useCallback(async (eventData: {
    userId: string;
    sessionId: string;
    eventType: string;
    pageUrl: string;
    eventData?: any;
    metadata?: any;
  }) => {
    try {
      const response = await fetch('/api/admin/user-journey/track', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        throw new Error(`Failed to track event: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to track event');
      }
    } catch (err) {
      console.error('Error tracking event:', err);
      throw err;
    }
  }, []);

  const refetch = useCallback(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchRealTimeMetrics();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchRealTimeMetrics]);

  return {
    journeyMaps,
    conversionFunnel,
    userSessions,
    journeySummary,
    realTimeMetrics,
    isLoading,
    error,
    refetch,
    trackEvent
  };
};