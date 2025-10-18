import { useState, useEffect, useCallback, useRef } from 'react';

export interface SystemHealthOverview {
  timestamp: Date;
  healthScore: number;
  status: 'healthy' | 'degraded' | 'critical' | 'unknown';
  metrics: {
    cpu: number;
    memory: number;
    services: {
      total: number;
      healthy: number;
      degraded: number;
      failed: number;
    };
  };
  alerts: {
    total: number;
    critical: number;
    warning: number;
    info: number;
  };
  bottlenecks: {
    total: number;
    critical: number;
    high: number;
  };
  trends: {
    direction: 'improving' | 'stable' | 'degrading';
    changeRate: number;
    confidence: number;
  };
}

export interface SystemStatus {
  timestamp: Date;
  overall: {
    status: string;
    score: number;
    uptime: number;
    lastUpdate: Date;
  };
  services: {
    total: number;
    healthy: number;
    degraded: number;
    failed: number;
  };
  alerts: {
    active: number;
    critical: number;
    recent: Array<{
      id: string;
      severity: string;
      title: string;
      timestamp: Date;
    }>;
  };
  performance: {
    criticalBottlenecks: number;
    trends: {
      direction: string;
      changeRate: number;
      confidence: number;
    };
  };
}

export interface IntelligentAlert {
  id: string;
  ruleId: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  confidence: number;
  predictedImpact: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved' | 'suppressed';
  escalationLevel: number;
  rootCause: string;
  affectedComponents: string[];
  recommendedActions: string[];
}

export interface CapacityData {
  predictions: Array<{
    resource: string;
    timeframe: string;
    predictions: Array<{
      timestamp: Date;
      predicted: number;
      confidence: number;
      upperBound: number;
      lowerBound: number;
    }>;
    thresholds: {
      warning: number;
      critical: number;
    };
    projectedExhaustion?: {
      date: Date;
      confidence: number;
    };
  }>;
  scalingRecommendations: Array<{
    id: string;
    timestamp: Date;
    component: string;
    action: string;
    priority: string;
    trigger: any;
    recommendation: any;
    costOptimization: any;
  }>;
  bottlenecks: Array<{
    id: string;
    component: string;
    type: string;
    severity: string;
    metrics: any;
    impact: any;
    resolution: any;
  }>;
  costAnalysis: {
    timestamp: Date;
    totalCost: number;
    breakdown: any;
    optimizations: any[];
    rightsizing: any[];
  } | null;
  resourceHistory: Array<{
    timestamp: Date;
    cpu: number;
    memory: number;
    storage: number;
    network: number;
    connections: number;
  }>;
}

export interface PerformanceData {
  metrics: Array<{
    name: string;
    value: number;
    unit: string;
    timestamp: Date;
    tags: Record<string, string>;
  }>;
  benchmarks: Array<{
    id: string;
    name: string;
    category: string;
    target: number;
    current: number;
    trend: string;
    sla: any;
    historical: Array<{
      timestamp: Date;
      value: number;
    }>;
  }>;
  optimizationRecommendations: Array<{
    id: string;
    timestamp: Date;
    category: string;
    priority: string;
    issue: any;
    recommendation: any;
    metrics: any;
    riskAssessment: any;
  }>;
  trendAnalyses: Array<{
    metric: string;
    timeframe: string;
    trend: any;
    statistics: any;
    seasonality: any;
    anomalies: any[];
    forecast: any[];
  }>;
  impactAssessments: Array<{
    changeId: string;
    timestamp: Date;
    changeType: string;
    impact: any;
    affectedMetrics: any[];
    userExperienceImpact: any;
  }>;
}

interface UseSystemHealthMonitoringOptions {
  refreshInterval?: number;
  autoRefresh?: boolean;
}

interface UseSystemHealthMonitoringReturn {
  systemHealth: SystemHealthOverview | null;
  systemStatus: SystemStatus | null;
  alerts: IntelligentAlert[] | null;
  capacityData: CapacityData | null;
  performanceData: PerformanceData | null;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  acknowledgeAlert: (alertId: string, acknowledgedBy: string) => Promise<boolean>;
  resolveAlert: (alertId: string) => Promise<boolean>;
}

export const useSystemHealthMonitoring = (
  options: UseSystemHealthMonitoringOptions = {}
): UseSystemHealthMonitoringReturn => {
  const { refreshInterval = 30000, autoRefresh = true } = options;
  
  const [systemHealth, setSystemHealth] = useState<SystemHealthOverview | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [alerts, setAlerts] = useState<IntelligentAlert[] | null>(null);
  const [capacityData, setCapacityData] = useState<CapacityData | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const fetchSystemHealthOverview = async (): Promise<SystemHealthOverview | null> => {
    try {
      const response = await fetch('/api/admin/system-health/overview', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch system health overview');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching system health overview:', error);
      throw error;
    }
  };

  const fetchSystemStatus = async (): Promise<SystemStatus | null> => {
    try {
      const response = await fetch('/api/admin/system-health/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch system status');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching system status:', error);
      throw error;
    }
  };

  const fetchAlerts = async (): Promise<IntelligentAlert[] | null> => {
    try {
      const response = await fetch('/api/admin/system-health/alerts?limit=50', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch alerts');
      }

      return result.data.alerts;
    } catch (error) {
      console.error('Error fetching alerts:', error);
      throw error;
    }
  };

  const fetchCapacityData = async (): Promise<CapacityData | null> => {
    try {
      const response = await fetch('/api/admin/system-health/capacity', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch capacity data');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching capacity data:', error);
      throw error;
    }
  };

  const fetchPerformanceData = async (): Promise<PerformanceData | null> => {
    try {
      const response = await fetch('/api/admin/system-health/performance', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch performance data');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching performance data:', error);
      throw error;
    }
  };

  const refreshData = useCallback(async () => {
    if (!mountedRef.current) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const [
        healthOverview,
        statusData,
        alertsData,
        capacityInfo,
        performanceInfo
      ] = await Promise.all([
        fetchSystemHealthOverview(),
        fetchSystemStatus(),
        fetchAlerts(),
        fetchCapacityData(),
        fetchPerformanceData()
      ]);

      if (mountedRef.current) {
        setSystemHealth(healthOverview);
        setSystemStatus(statusData);
        setAlerts(alertsData);
        setCapacityData(capacityInfo);
        setPerformanceData(performanceInfo);
      }
    } catch (error) {
      if (mountedRef.current) {
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const acknowledgeAlert = useCallback(async (alertId: string, acknowledgedBy: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/system-health/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ acknowledgedBy })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to acknowledge alert');
      }

      // Refresh alerts data
      await refreshData();
      return true;
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      return false;
    }
  }, [refreshData]);

  const resolveAlert = useCallback(async (alertId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/system-health/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to resolve alert');
      }

      // Refresh alerts data
      await refreshData();
      return true;
    } catch (error) {
      console.error('Error resolving alert:', error);
      return false;
    }
  }, [refreshData]);

  // Initial data fetch
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(refreshData, refreshInterval);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, refreshInterval, refreshData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    systemHealth,
    systemStatus,
    alerts,
    capacityData,
    performanceData,
    isLoading,
    error,
    refreshData,
    acknowledgeAlert,
    resolveAlert
  };
};