import { useState, useEffect, useCallback } from 'react';
import { TipService, UserEarnings, Tip } from '@/services/tipService';

interface UseTipsDataOptions {
  userId: string;
  refreshInterval?: number;
  autoRefresh?: boolean;
}

interface UseTipsDataReturn {
  earnings: UserEarnings | null;
  tips: Tip[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export function useTipsData({
  userId,
  refreshInterval = 300000, // 5 minutes
  autoRefresh = true
}: UseTipsDataOptions): UseTipsDataReturn {
  const [earnings, setEarnings] = useState<UserEarnings | null>(null);
  const [tips, setTips] = useState<Tip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchTipsData = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch user earnings
      const userEarnings = await TipService.getUserEarnings(userId);
      
      // For now, we'll use mock tips data since the API isn't fully implemented
      // In a real implementation, we would fetch actual tips
      const mockTips: Tip[] = [
        {
          id: '1',
          from: 'Connected to Real Services',
          to: '0x1234567890123456789012345678901234567890',
          amount: '50',
          currency: 'LDAO',
          message: 'Great content!',
          timestamp: new Date(Date.now() - 3600000),
          isPublic: true,
          status: 'confirmed'
        },
        {
          id: '2',
          from: 'Connected to Real Services',
          to: '0x1234567890123456789012345678901234567890',
          amount: '100',
          currency: 'LDAO',
          message: 'Thanks for sharing',
          timestamp: new Date(Date.now() - 7200000),
          isPublic: true,
          status: 'confirmed'
        },
        {
          id: '3',
          from: 'Connected to Real Services',
          to: '0x1234567890123456789012345678901234567890',
          amount: '25',
          currency: 'LDAO',
          message: 'Keep it up!',
          timestamp: new Date(Date.now() - 10800000),
          isPublic: true,
          status: 'confirmed'
        },
      ];

      setEarnings(userEarnings);
      setTips(mockTips);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tips data';
      setError(errorMessage);
      console.error('Tips data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const refreshTipsData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchTipsData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh tips data';
      setError(errorMessage);
      console.error('Tips data refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchTipsData]);

  // Initial fetch when userId is available
  useEffect(() => {
    if (userId) {
      fetchTipsData();
    }
  }, [userId, fetchTipsData]);

  // Auto-refresh based on interval
  useEffect(() => {
    if (!autoRefresh || !userId || refreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      refreshTipsData();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [userId, refreshInterval, autoRefresh, refreshTipsData]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    earnings,
    tips,
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    refresh: refreshTipsData,
    clearError
  };
}

export default useTipsData;