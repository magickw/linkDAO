import { useState, useEffect, useCallback } from 'react';

interface CohortData {
  cohortPeriod: string;
  cohortSize: number;
  retentionRates: number[];
  periods: string[];
  userIds: string[];
  averageLifetimeValue: number;
  churnRate: number;
}

interface RetentionTrend {
  period: string;
  retentionRate: number;
  cohortCount: number;
  trend: 'up' | 'down' | 'stable';
}

interface ChurnAnalysis {
  overallChurnRate: number;
  churnByPeriod: Array<{ period: string; churnRate: number; usersLost: number }>;
  churnReasons: Array<{ reason: string; percentage: number }>;
  riskFactors: Array<{ factor: string; impact: number }>;
}

interface CohortAnalysis {
  cohorts: CohortData[];
  overallRetentionRate: number;
  averageCohortSize: number;
  bestPerformingCohort: CohortData;
  worstPerformingCohort: CohortData;
  retentionTrends: RetentionTrend[];
  churnAnalysis: ChurnAnalysis;
}

interface CohortComparison {
  cohortA: CohortData;
  cohortB: CohortData;
  retentionDifference: number[];
  statisticalSignificance: boolean;
  insights: string[];
}

interface CohortHeatmapData {
  cohortPeriod: string;
  cohortSize: number;
  retentionRates: number[];
  periods: string[];
}

interface UseCohortAnalyticsOptions {
  startDate: Date;
  endDate: Date;
  cohortType: 'daily' | 'weekly' | 'monthly';
  retentionPeriods: number;
  comparisonCohorts?: {
    cohortA: string;
    cohortB: string;
  };
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseCohortAnalyticsReturn {
  cohortAnalysis: CohortAnalysis | null;
  cohortComparison: CohortComparison | null;
  heatmapData: CohortHeatmapData[] | null;
  retentionTrends: RetentionTrend[] | null;
  churnAnalysis: ChurnAnalysis | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useCohortAnalytics = (
  options: UseCohortAnalyticsOptions
): UseCohortAnalyticsReturn => {
  const [cohortAnalysis, setCohortAnalysis] = useState<CohortAnalysis | null>(null);
  const [cohortComparison, setCohortComparison] = useState<CohortComparison | null>(null);
  const [heatmapData, setHeatmapData] = useState<CohortHeatmapData[] | null>(null);
  const [retentionTrends, setRetentionTrends] = useState<RetentionTrend[] | null>(null);
  const [churnAnalysis, setChurnAnalysis] = useState<ChurnAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    startDate,
    endDate,
    cohortType,
    retentionPeriods,
    comparisonCohorts,
    autoRefresh = false,
    refreshInterval = 60000
  } = options;

  const fetchCohortAnalysis = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        cohortType,
        retentionPeriods: retentionPeriods.toString()
      });

      const response = await fetch(`/api/admin/cohort-analysis?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch cohort analysis: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setCohortAnalysis(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch cohort analysis');
      }
    } catch (err) {
      console.error('Error fetching cohort analysis:', err);
      throw err;
    }
  }, [startDate, endDate, cohortType, retentionPeriods]);

  const fetchCohortComparison = useCallback(async () => {
    if (!comparisonCohorts?.cohortA || !comparisonCohorts?.cohortB) {
      setCohortComparison(null);
      return;
    }

    try {
      const response = await fetch('/api/admin/cohort-analysis/compare', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cohortA: comparisonCohorts.cohortA,
          cohortB: comparisonCohorts.cohortB,
          cohortType
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch cohort comparison: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setCohortComparison(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch cohort comparison');
      }
    } catch (err) {
      console.error('Error fetching cohort comparison:', err);
      throw err;
    }
  }, [comparisonCohorts, cohortType]);

  const fetchHeatmapData = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        cohortType,
        retentionPeriods: retentionPeriods.toString()
      });

      const response = await fetch(`/api/admin/cohort-analysis/heatmap?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch heatmap data: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setHeatmapData(data.data.heatmapData);
      } else {
        throw new Error(data.message || 'Failed to fetch heatmap data');
      }
    } catch (err) {
      console.error('Error fetching heatmap data:', err);
      throw err;
    }
  }, [startDate, endDate, cohortType, retentionPeriods]);

  const fetchRetentionTrends = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        cohortType,
        retentionPeriods: retentionPeriods.toString()
      });

      const response = await fetch(`/api/admin/cohort-analysis/trends?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch retention trends: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setRetentionTrends(data.data.retentionTrends);
      } else {
        throw new Error(data.message || 'Failed to fetch retention trends');
      }
    } catch (err) {
      console.error('Error fetching retention trends:', err);
      throw err;
    }
  }, [startDate, endDate, cohortType, retentionPeriods]);

  const fetchChurnAnalysis = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        cohortType,
        retentionPeriods: retentionPeriods.toString()
      });

      const response = await fetch(`/api/admin/cohort-analysis/churn?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch churn analysis: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setChurnAnalysis(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch churn analysis');
      }
    } catch (err) {
      console.error('Error fetching churn analysis:', err);
      throw err;
    }
  }, [startDate, endDate, cohortType, retentionPeriods]);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchCohortAnalysis(),
        fetchHeatmapData(),
        fetchRetentionTrends(),
        fetchChurnAnalysis()
      ]);

      // Fetch comparison data if cohorts are selected
      if (comparisonCohorts?.cohortA && comparisonCohorts?.cohortB) {
        await fetchCohortComparison();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [
    fetchCohortAnalysis,
    fetchHeatmapData,
    fetchRetentionTrends,
    fetchChurnAnalysis,
    fetchCohortComparison,
    comparisonCohorts
  ]);

  const refetch = useCallback(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Fetch comparison data when cohorts change
  useEffect(() => {
    if (comparisonCohorts?.cohortA && comparisonCohorts?.cohortB) {
      fetchCohortComparison();
    } else {
      setCohortComparison(null);
    }
  }, [fetchCohortComparison, comparisonCohorts]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAllData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchAllData]);

  return {
    cohortAnalysis,
    cohortComparison,
    heatmapData,
    retentionTrends,
    churnAnalysis,
    isLoading,
    error,
    refetch
  };
};