/**
 * Animation Performance Hook
 * Hook for monitoring and optimizing animation performance
 */

import { useCallback, useEffect, useState } from 'react';
import { useAnimation } from '../components/CommunityEnhancements/SharedComponents/AnimationProvider';

interface PerformanceOptimizationSettings {
  maxConcurrentAnimations: number;
  frameRateThreshold: number;
  autoOptimize: boolean;
  enableProfiling: boolean;
}

interface PerformanceReport {
  timestamp: number;
  metrics: {
    totalAnimations: number;
    averageFrameRate: number;
    droppedFrames: number;
    performanceScore: 'excellent' | 'good' | 'fair' | 'poor';
    recommendations: string[];
  };
  deviceInfo: {
    userAgent: string;
    hardwareConcurrency: number;
    deviceMemory?: number;
  };
}

export const useAnimationPerformance = (settings?: Partial<PerformanceOptimizationSettings>) => {
  const { getPerformanceMetrics, isAnimationEnabled, setAnimationEnabled } = useAnimation();
  
  const defaultSettings: PerformanceOptimizationSettings = {
    maxConcurrentAnimations: 5,
    frameRateThreshold: 45,
    autoOptimize: true,
    enableProfiling: false,
    ...settings,
  };

  const [performanceReports, setPerformanceReports] = useState<PerformanceReport[]>([]);
  const [isOptimized, setIsOptimized] = useState(false);

  // Generate performance report
  const generateReport = useCallback((): PerformanceReport => {
    const metrics = getPerformanceMetrics();
    
    return {
      timestamp: Date.now(),
      metrics,
      deviceInfo: {
        userAgent: navigator.userAgent,
        hardwareConcurrency: navigator.hardwareConcurrency || 1,
        deviceMemory: (navigator as any).deviceMemory,
      },
    };
  }, [getPerformanceMetrics]);

  // Auto-optimization based on performance
  const optimizePerformance = useCallback(() => {
    const report = generateReport();
    const { metrics } = report;
    
    if (!defaultSettings.autoOptimize) return;
    
    let optimizationApplied = false;
    
    // Disable animations if performance is poor
    if (metrics.performanceScore === 'poor' && isAnimationEnabled) {
      setAnimationEnabled(false);
      optimizationApplied = true;
      console.warn('Animation performance is poor. Animations have been disabled.');
    }
    
    // Re-enable animations if performance improves
    if (metrics.performanceScore === 'excellent' && !isAnimationEnabled && isOptimized) {
      setAnimationEnabled(true);
      optimizationApplied = true;
      console.info('Animation performance has improved. Animations have been re-enabled.');
    }
    
    setIsOptimized(optimizationApplied);
    
    return optimizationApplied;
  }, [generateReport, defaultSettings.autoOptimize, isAnimationEnabled, setAnimationEnabled, isOptimized]);

  // Periodic performance monitoring
  useEffect(() => {
    if (!defaultSettings.enableProfiling) return;
    
    const interval = setInterval(() => {
      const report = generateReport();
      
      setPerformanceReports(prev => {
        const newReports = [...prev, report];
        // Keep only last 10 reports
        return newReports.slice(-10);
      });
      
      // Auto-optimize if enabled
      optimizePerformance();
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, [defaultSettings.enableProfiling, generateReport, optimizePerformance]);

  // Get current performance status
  const getCurrentPerformance = useCallback(() => {
    return generateReport();
  }, [generateReport]);

  // Get performance trend
  const getPerformanceTrend = useCallback(() => {
    if (performanceReports.length < 2) return 'stable';
    
    const recent = performanceReports.slice(-3);
    const avgRecent = recent.reduce((sum, report) => sum + report.metrics.averageFrameRate, 0) / recent.length;
    
    const older = performanceReports.slice(-6, -3);
    if (older.length === 0) return 'stable';
    
    const avgOlder = older.reduce((sum, report) => sum + report.metrics.averageFrameRate, 0) / older.length;
    
    const difference = avgRecent - avgOlder;
    
    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }, [performanceReports]);

  // Export performance data
  const exportPerformanceData = useCallback(() => {
    const data = {
      settings: defaultSettings,
      reports: performanceReports,
      currentPerformance: getCurrentPerformance(),
      trend: getPerformanceTrend(),
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `animation-performance-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }, [defaultSettings, performanceReports, getCurrentPerformance, getPerformanceTrend]);

  // Performance recommendations
  const getRecommendations = useCallback(() => {
    const current = getCurrentPerformance();
    const recommendations = [...current.metrics.recommendations];
    
    // Add device-specific recommendations
    if (current.deviceInfo.hardwareConcurrency <= 2) {
      recommendations.push('Consider reducing animation complexity on low-end devices');
    }
    
    if (current.deviceInfo.deviceMemory && current.deviceInfo.deviceMemory <= 4) {
      recommendations.push('Limit concurrent animations on devices with limited memory');
    }
    
    // Add trend-based recommendations
    const trend = getPerformanceTrend();
    if (trend === 'declining') {
      recommendations.push('Performance is declining - consider reducing animation load');
    }
    
    return [...new Set(recommendations)]; // Remove duplicates
  }, [getCurrentPerformance, getPerformanceTrend]);

  return {
    // Current state
    isAnimationEnabled,
    isOptimized,
    
    // Performance data
    getCurrentPerformance,
    getPerformanceTrend,
    performanceReports,
    
    // Actions
    optimizePerformance,
    exportPerformanceData,
    getRecommendations,
    
    // Settings
    settings: defaultSettings,
  };
};

export default useAnimationPerformance;