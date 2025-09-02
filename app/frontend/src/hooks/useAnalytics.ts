import { useState, useEffect, useCallback } from 'react';
import { analyticsService } from '../services/analyticsService';

interface UseAnalyticsOptions {
  sellerId?: string;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  refreshInterval?: number;
  autoRefresh?: boolean;
}

interface AnalyticsData {
  overviewMetrics: any;
  salesAnalytics: any;
  userBehavior: any;
  marketTrends: any;
  anomalies: any[];
  realTimeStats: any;
  sellerAnalytics?: any;
}

export const useAnalytics = (options: UseAnalyticsOptions = {}) => {
  const {
    sellerId,
    dateRange,
    refreshInterval = 30000,
    autoRefresh = true
  } = options;

  const [data, setData] = useState<AnalyticsData>({
    overviewMetrics: null,
    salesAnalytics: null,
    userBehavior: null,
    marketTrends: null,
    anomalies: [],
    realTimeStats: null,
    sellerAnalytics: null
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setError(null);
      
      const promises: Promise<any>[] = [];
      
      // Always fetch overview metrics and anomalies
      promises.push(
        analyticsService.getOverviewMetrics(dateRange?.startDate, dateRange?.endDate),
        analyticsService.getAnomalies(),
        analyticsService.getRealTimeStats()
      );

      // Conditionally fetch other data based on requirements
      if (!sellerId) {
        // Platform-wide analytics
        promises.push(
          analyticsService.getSalesAnalytics(dateRange?.startDate, dateRange?.endDate),
          analyticsService.getUserBehaviorAnalytics(dateRange?.startDate, dateRange?.endDate),
          analyticsService.getMarketTrends()
        );
      } else {
        // Seller-specific analytics
        promises.push(
          analyticsService.getSellerAnalytics(sellerId, dateRange?.startDate, dateRange?.endDate),
          analyticsService.getSalesAnalytics(dateRange?.startDate, dateRange?.endDate),
          analyticsService.getUserBehaviorAnalytics(dateRange?.startDate, dateRange?.endDate)
        );
      }

      const results = await Promise.allSettled(promises);
      
      const newData: AnalyticsData = {
        overviewMetrics: results[0].status === 'fulfilled' ? results[0].value : null,
        anomalies: results[1].status === 'fulfilled' ? results[1].value : [],
        realTimeStats: results[2].status === 'fulfilled' ? results[2].value : null,
        salesAnalytics: null,
        userBehavior: null,
        marketTrends: null,
        sellerAnalytics: null
      };

      if (!sellerId) {
        // Platform analytics
        newData.salesAnalytics = results[3].status === 'fulfilled' ? results[3].value : null;
        newData.userBehavior = results[4].status === 'fulfilled' ? results[4].value : null;
        newData.marketTrends = results[5].status === 'fulfilled' ? results[5].value : null;
      } else {
        // Seller analytics
        newData.sellerAnalytics = results[3].status === 'fulfilled' ? results[3].value : null;
        newData.salesAnalytics = results[4].status === 'fulfilled' ? results[4].value : null;
        newData.userBehavior = results[5].status === 'fulfilled' ? results[5].value : null;
      }

      setData(newData);
      setLastFetch(new Date());
      
      // Check for any failed requests
      const failedRequests = results.filter(result => result.status === 'rejected');
      if (failedRequests.length > 0) {
        console.warn('Some analytics requests failed:', failedRequests);
      }
      
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
    } finally {
      setIsLoading(false);
    }
  }, [sellerId, dateRange?.startDate, dateRange?.endDate]);

  const refetch = useCallback(() => {
    setIsLoading(true);
    return fetchAnalytics();
  }, [fetchAnalytics]);

  // Initial fetch
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !refreshInterval) return;

    const interval = setInterval(() => {
      fetchAnalytics();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchAnalytics]);

  // Track user events
  const trackEvent = useCallback(async (
    eventType: string,
    eventData: any,
    metadata?: any
  ) => {
    try {
      await analyticsService.trackUserEvent(eventType, eventData, metadata);
    } catch (err) {
      console.error('Error tracking event:', err);
    }
  }, []);

  // Track transactions
  const trackTransaction = useCallback(async (transactionData: any) => {
    try {
      await analyticsService.trackTransaction(transactionData);
    } catch (err) {
      console.error('Error tracking transaction:', err);
    }
  }, []);

  // Generate custom reports
  const generateReport = useCallback(async (
    reportType: string,
    parameters: any = {}
  ) => {
    try {
      setIsLoading(true);
      const report = await analyticsService.generateReport(reportType, parameters);
      return report;
    } catch (err) {
      console.error('Error generating report:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate report');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Export analytics data
  const exportData = useCallback(async (
    format: 'json' | 'csv' = 'json',
    dateRange?: { startDate: Date; endDate: Date }
  ) => {
    try {
      const exportedData = await analyticsService.exportAnalytics(
        dateRange?.startDate,
        dateRange?.endDate,
        format
      );
      
      // Create download link
      const blob = new Blob([
        format === 'json' ? JSON.stringify(exportedData, null, 2) : exportedData
      ], {
        type: format === 'json' ? 'application/json' : 'text/csv'
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-export-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return exportedData;
    } catch (err) {
      console.error('Error exporting data:', err);
      setError(err instanceof Error ? err.message : 'Failed to export data');
      throw err;
    }
  }, []);

  return {
    // Data
    ...data,
    
    // State
    isLoading,
    error,
    lastFetch,
    
    // Actions
    refetch,
    trackEvent,
    trackTransaction,
    generateReport,
    exportData,
    
    // Utilities
    isStale: lastFetch ? (Date.now() - lastFetch.getTime()) > refreshInterval * 2 : true
  };
};

export default useAnalytics;