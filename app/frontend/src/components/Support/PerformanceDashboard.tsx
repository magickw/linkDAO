/**
 * Performance Dashboard Component
 * Real-time performance monitoring and optimization dashboard
 */

import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  SignalIcon,
  CpuChipIcon,
  CloudIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import {
  performanceMonitoringService,
  PerformanceMetrics,
  PerformanceAlert,
  NetworkCondition
} from '../../services/performanceMonitoringService';

interface PerformanceDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  isOpen,
  onClose
}) => {
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [networkCondition, setNetworkCondition] = useState<NetworkCondition | null>(null);
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceMetrics[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'vitals' | 'network' | 'alerts'>('overview');

  useEffect(() => {
    if (!isOpen) return;

    // Initialize performance monitoring
    const initializeMonitoring = async () => {
      try {
        await performanceMonitoringService.initialize();
        
        // Get initial data
        const metrics = performanceMonitoringService.getCurrentMetrics();
        setCurrentMetrics(metrics);
        
        const condition = performanceMonitoringService.getNetworkCondition();
        setNetworkCondition(condition);
        
        const history = performanceMonitoringService.getPerformanceHistory(1);
        setPerformanceHistory(history);
        
        const activeAlerts = performanceMonitoringService.getActiveAlerts();
        setAlerts(activeAlerts);
      } catch (error) {
        console.error('Failed to initialize performance monitoring:', error);
      }
    };

    initializeMonitoring();

    // Set up listeners
    const handleMetricsUpdate = (metrics: PerformanceMetrics) => {
      setCurrentMetrics(metrics);
      setPerformanceHistory(prev => [...prev.slice(-99), metrics]);
    };

    const handleAlert = (alert: PerformanceAlert) => {
      setAlerts(prev => [...prev, alert]);
    };

    performanceMonitoringService.addMetricsListener(handleMetricsUpdate);
    performanceMonitoringService.addAlertListener(handleAlert);

    return () => {
      performanceMonitoringService.removeMetricsListener(handleMetricsUpdate);
      performanceMonitoringService.removeAlertListener(handleAlert);
    };
  }, [isOpen]);

  const formatMetric = (value: number | null, unit: string = 'ms'): string => {
    if (value === null) return 'N/A';
    if (unit === 'ms') {
      return value < 1000 ? `${Math.round(value)}ms` : `${(value / 1000).toFixed(1)}s`;
    }
    if (unit === '%') {
      return `${Math.round(value)}%`;
    }
    return `${Math.round(value)}${unit}`;
  };

  const getMetricStatus = (value: number | null, threshold: number): 'good' | 'needs-improvement' | 'poor' => {
    if (value === null) return 'good';
    if (value <= threshold) return 'good';
    if (value <= threshold * 1.5) return 'needs-improvement';
    return 'poor';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-100';
      case 'needs-improvement': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getNetworkIcon = (type: string) => {
    switch (type) {
      case 'wifi': return '📶';
      case '4g': return '📱';
      case '3g': return '📶';
      case '2g': return '📶';
      case 'slow-2g': return '🐌';
      default: return '❓';
    }
  };

  const resolveAlert = (alertId: string) => {
    performanceMonitoringService.resolveAlert(alertId);
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: ChartBarIcon },
    { id: 'vitals' as const, label: 'Core Vitals', icon: ClockIcon },
    { id: 'network' as const, label: 'Network', icon: SignalIcon },
    { id: 'alerts' as const, label: 'Alerts', icon: ExclamationTriangleIcon, count: alerts.length }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <ChartBarIcon className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Performance Dashboard
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="flex">
            {/* Sidebar */}
            <div className="w-64 bg-gray-50 border-r border-gray-200">
              <nav className="p-4 space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="h-5 w-5" />
                        <span>{tab.label}</span>
                      </div>
                      {'count' in tab && tab.count !== undefined && tab.count > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* Overview Tab */}
              {activeTab === 'overview' && currentMetrics && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Performance Overview</h3>
                  
                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Document Load</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatMetric(currentMetrics.documentLoadTime)}
                          </p>
                        </div>
                        <ClockIcon className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                    
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Cache Hit Rate</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatMetric(currentMetrics.cacheHitRate, '%')}
                          </p>
                        </div>
                        <CloudIcon className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                    
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">User Engagement</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatMetric(currentMetrics.userEngagement, '')}
                          </p>
                        </div>
                        <ArrowTrendingUpIcon className="h-8 w-8 text-purple-600" />
                      </div>
                    </div>
                    
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Page Views</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {currentMetrics.pageViews}
                          </p>
                        </div>
                        <ChartBarIcon className="h-8 w-8 text-indigo-600" />
                      </div>
                    </div>
                  </div>

                  {/* Device & Network Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Device Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Memory:</span>
                          <span className="font-medium">{currentMetrics.deviceMemory} GB</span>
                        </div>
                        <div className="flex justify-between">
                          <span>CPU Cores:</span>
                          <span className="font-medium">{currentMetrics.hardwareConcurrency}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Offline Capable:</span>
                          <span className={`font-medium ${currentMetrics.offlineCapability ? 'text-green-600' : 'text-red-600'}`}>
                            {currentMetrics.offlineCapability ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {networkCondition && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">Network Status</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Connection:</span>
                            <span className="font-medium">
                              {getNetworkIcon(networkCondition.effectiveType)} {networkCondition.effectiveType.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Downlink:</span>
                            <span className="font-medium">{networkCondition.downlink} Mbps</span>
                          </div>
                          <div className="flex justify-between">
                            <span>RTT:</span>
                            <span className="font-medium">{networkCondition.rtt} ms</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Core Vitals Tab */}
              {activeTab === 'vitals' && currentMetrics && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Core Web Vitals</h3>
                  
                  <div className="grid gap-4">
                    {[
                      { key: 'lcp', label: 'Largest Contentful Paint', threshold: 2500, description: 'Loading performance' },
                      { key: 'fid', label: 'First Input Delay', threshold: 100, description: 'Interactivity' },
                      { key: 'cls', label: 'Cumulative Layout Shift', threshold: 0.1, description: 'Visual stability' },
                      { key: 'fcp', label: 'First Contentful Paint', threshold: 1800, description: 'Loading performance' },
                      { key: 'ttfb', label: 'Time to First Byte', threshold: 600, description: 'Server response' }
                    ].map((vital) => {
                      const value = currentMetrics[vital.key as keyof PerformanceMetrics] as number;
                      const status = getMetricStatus(value, vital.threshold);
                      
                      return (
                        <div key={vital.key} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900">{vital.label}</h4>
                              <p className="text-sm text-gray-600">{vital.description}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-gray-900">
                                {formatMetric(value, vital.key === 'cls' ? '' : 'ms')}
                              </div>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                                {status === 'good' && <CheckCircleIcon className="h-3 w-3 mr-1" />}
                                {status === 'needs-improvement' && <ExclamationTriangleIcon className="h-3 w-3 mr-1" />}
                                {status === 'poor' && <ExclamationTriangleIcon className="h-3 w-3 mr-1" />}
                                {status.replace('-', ' ')}
                              </span>
                            </div>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  status === 'good' ? 'bg-green-500' :
                                  status === 'needs-improvement' ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{
                                  width: `${Math.min(100, ((value || 0) / (vital.threshold * 2)) * 100)}%`
                                }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span>0</span>
                              <span>Good: &lt; {vital.threshold}{vital.key === 'cls' ? '' : 'ms'}</span>
                              <span>{vital.threshold * 2}{vital.key === 'cls' ? '' : 'ms'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Network Tab */}
              {activeTab === 'network' && networkCondition && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Network Analysis</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="font-semibold text-gray-900 mb-4">Connection Details</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Type:</span>
                          <span className="font-medium">
                            {getNetworkIcon(networkCondition.effectiveType)} {networkCondition.effectiveType.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Downlink:</span>
                          <span className="font-medium">{networkCondition.downlink} Mbps</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">RTT:</span>
                          <span className="font-medium">{networkCondition.rtt} ms</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Save Data:</span>
                          <span className={`font-medium ${networkCondition.saveData ? 'text-orange-600' : 'text-green-600'}`}>
                            {networkCondition.saveData ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="font-semibold text-gray-900 mb-4">Adaptive Loading</h4>
                      <div className="space-y-3">
                        {(() => {
                          const strategy = performanceMonitoringService.getAdaptiveLoadingStrategy();
                          return (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600">Image Quality:</span>
                                <span className="font-medium capitalize">{strategy.imageQuality}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600">Prefetch:</span>
                                <span className={`font-medium ${strategy.prefetchEnabled ? 'text-green-600' : 'text-red-600'}`}>
                                  {strategy.prefetchEnabled ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600">Lazy Loading:</span>
                                <span className="font-medium">{strategy.lazyLoadingThreshold}px</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600">Cache Strategy:</span>
                                <span className="font-medium capitalize">{strategy.cacheStrategy}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Alerts Tab */}
              {activeTab === 'alerts' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Performance Alerts</h3>
                  
                  {alerts.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">No Active Alerts</h4>
                      <p className="text-gray-600">All performance metrics are within acceptable ranges.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {alerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={`border rounded-lg p-4 ${
                            alert.type === 'critical' 
                              ? 'border-red-200 bg-red-50' 
                              : 'border-yellow-200 bg-yellow-50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <ExclamationTriangleIcon 
                                className={`h-5 w-5 mt-0.5 ${
                                  alert.type === 'critical' ? 'text-red-600' : 'text-yellow-600'
                                }`} 
                              />
                              <div>
                                <h4 className={`font-medium ${
                                  alert.type === 'critical' ? 'text-red-900' : 'text-yellow-900'
                                }`}>
                                  {alert.type === 'critical' ? 'Critical' : 'Warning'}: {alert.metric.toUpperCase()}
                                </h4>
                                <p className={`text-sm ${
                                  alert.type === 'critical' ? 'text-red-700' : 'text-yellow-700'
                                }`}>
                                  {alert.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(alert.timestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => resolveAlert(alert.id)}
                              className={`px-3 py-1 text-xs rounded ${
                                alert.type === 'critical'
                                  ? 'bg-red-600 text-white hover:bg-red-700'
                                  : 'bg-yellow-600 text-white hover:bg-yellow-700'
                              } transition-colors`}
                            >
                              Resolve
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};