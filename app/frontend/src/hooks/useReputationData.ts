import { useState, useEffect, useCallback } from 'react';
import { reputationService } from '@/services/reputationService';
import { UserReputation, ReputationEvent } from '@/types/reputation';

interface UseReputationDataOptions {
  userId: string;
  refreshInterval?: number;
  autoRefresh?: boolean;
}

interface UseReputationDataReturn {
  reputation: UserReputation | null;
  events: ReputationEvent[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export function useReputationData({
  userId,
  refreshInterval = 300000, // 5 minutes
  autoRefresh = true
}: UseReputationDataOptions): UseReputationDataReturn {
  const [reputation, setReputation] = useState<UserReputation | null>(null);
  const [events, setEvents] = useState<ReputationEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchReputationData = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);

      const userReputation = await reputationService.getUserReputation(userId).catch(err => {
        if (err?.message?.includes('400') || err?.response?.status === 400) {
          return null;
        }
        throw err;
      });
      
      const reputationEvents = await reputationService.getReputationEvents(userId, 10).catch(err => {
        if (err?.message?.includes('400') || err?.response?.status === 400) {
          return [];
        }
        throw err;
      });

      setReputation(userReputation);
      setEvents(reputationEvents || []);
      setLastUpdated(new Date());
    } catch (err: any) {
      if (err?.message?.includes('400') || err?.response?.status === 400) {
        setReputation(null);
        setEvents([]);
        setError(null);
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch reputation data';
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const refreshReputationData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchReputationData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh reputation data';
      setError(errorMessage);
      console.error('Reputation data refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchReputationData]);

  // Initial fetch when userId is available
  useEffect(() => {
    if (userId) {
      fetchReputationData();
    }
  }, [userId, fetchReputationData]);

  // Auto-refresh based on interval
  useEffect(() => {
    if (!autoRefresh || !userId || refreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      refreshReputationData();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [userId, refreshInterval, autoRefresh, refreshReputationData]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    reputation,
    events,
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    refresh: refreshReputationData,
    clearError
  };
}

export default useReputationData;