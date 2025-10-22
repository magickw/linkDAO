/**
 * Real-Time Monitoring Demo
 * Demonstrates the integration of real-time cost monitoring and system health monitoring
 */

import React, { useEffect, useState } from 'react';
import { realTimeCostMonitoringService } from '../services/realTimeCostMonitoringService';
import { paymentSystemHealthMonitor } from '../services/paymentSystemHealthMonitor';
import { paymentSystemAlertingService } from '../services/paymentSystemAlertingService';
import { costChangeNotificationService } from '../services/costChangeNotificationService';
import { prioritizationPerformanceMetrics } from '../services/prioritizationPerformanceMetrics';

interface MonitoringStatus {
  costMonitoring: {
    isActive: boolean;
    monitoredChains: number[];
    lastUpdate: Date | null;
  };
  healthMonitoring: {
    overallStatus: 'healthy' | 'warning' | 'critical';
    activeAlerts: number;
    performanceGrade: string;
  };
  notifications: {
    unreadCount: number;
    recentNotifications: any[];
  };
}

export const RealTimeMonitoringDemo: React.FC = () => {
  const [status, setStatus] = useState<MonitoringStatus>({
    costMonitoring: {
      isActive: false,
      monitoredChains: [],
      lastUpdate: null
    },
    healthMonitoring: {
      overallStatus: 'healthy',
      activeAlerts: 0,
      performanceGrade: 'A'
    },
    notifications: {
      unreadCount: 0,
      recentNotifications: []
    }
  });

  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    // Set up event listeners
    const handleCostDataUpdate = (data: any) => {
      console.log('Cost data updated:', data);
      updateStatus();
    };

    const handleHealthUpdate = (data: any) => {
      console.log('Health metric updated:', data);
      updateStatus();
    };

    const handleNotification = (notification: any) => {
      console.log('New notification:', notification);
      updateStatus();
    };

    const handleAlert = (alert: any) => {
      console.log('System alert:', alert);
      updateStatus();
    };

    // Register event listeners
    realTimeCostMonitoringService.on('cost_data_updated', handleCostDataUpdate);
    realTimeCostMonitoringService.on('cost_change_notification', handleNotification);
    paymentSystemHealthMonitor.on('metric_updated', handleHealthUpdate);
    paymentSystemAlertingService.on('alert_triggered', handleAlert);
    costChangeNotificationService.on('notification_added', handleNotification);

    return () => {
      // Cleanup event listeners
      realTimeCostMonitoringService.off('cost_data_updated', handleCostDataUpdate);
      realTimeCostMonitoringService.off('cost_change_notification', handleNotification);
      paymentSystemHealthMonitor.off('metric_updated', handleHealthUpdate);
      paymentSystemAlertingService.off('alert_triggered', handleAlert);
      costChangeNotificationService.off('notification_added', handleNotification);
    };
  }, []);

  const updateStatus = () => {
    // Update cost monitoring status
    const costStatus = realTimeCostMonitoringService.getMonitoringStatus();
    
    // Update health monitoring status
    const healthSummary = paymentSystemHealthMonitor.getHealthSummary();
    const performanceGrade = prioritizationPerformanceMetrics.getPerformanceGrade();
    
    // Update notifications
    const unreadNotifications = costChangeNotificationService.getUnreadNotifications();
    const activeAlerts = paymentSystemAlertingService.getActiveAlerts();

    setStatus({
      costMonitoring: {
        isActive: costStatus.isActive,
        monitoredChains: costStatus.monitoredChains,
        lastUpdate: costStatus.lastUpdate
      },
      healthMonitoring: {
        overallStatus: healthSummary.overallStatus,
        activeAlerts: activeAlerts.length,
        performanceGrade
      },
      notifications: {
        unreadCount: unreadNotifications.length,
        recentNotifications: unreadNotifications.slice(0, 5)
      }
    });
  };

  const startMonitoring = () => {
    console.log('Starting real-time monitoring services...');
    
    // Start cost monitoring for major chains
    const chains = [1, 137, 42161, 11155111]; // Ethereum, Polygon, Arbitrum, Sepolia
    realTimeCostMonitoringService.startMonitoring(chains);
    
    // Start health monitoring
    paymentSystemHealthMonitor.startMonitoring();
    
    // Start alerting service
    paymentSystemAlertingService.start();
    
    setIsStarted(true);
    updateStatus();
    
    // Simulate some activity for demo purposes
    setTimeout(() => {
      simulateActivity();
    }, 2000);
  };

  const stopMonitoring = () => {
    console.log('Stopping real-time monitoring services...');
    
    realTimeCostMonitoringService.stopMonitoring();
    paymentSystemHealthMonitor.stopMonitoring();
    paymentSystemAlertingService.stop();
    
    setIsStarted(false);
    updateStatus();
  };

  const simulateActivity = () => {
    // Simulate a prioritization session
    const sessionId = prioritizationPerformanceMetrics.startSession({
      availablePaymentMethods: [
        { 
          id: 'eth', 
          type: 'NATIVE_ETH' as any, 
          name: 'ETH', 
          description: 'Native Ethereum',
          chainId: 1,
          enabled: true,
          supportedNetworks: [1]
        },
        { 
          id: 'usdc', 
          type: 'STABLECOIN_USDC' as any, 
          name: 'USDC', 
          description: 'USD Coin Stablecoin',
          chainId: 1,
          enabled: true,
          supportedNetworks: [1]
        }
      ],
      transactionAmount: 100,
      transactionCurrency: 'USD',
      userContext: {
        userAddress: '0x1234567890123456789012345678901234567890',
        chainId: 1,
        walletBalances: [],
        preferences: {
          preferredMethods: [],
          avoidedMethods: [],
          maxGasFeeThreshold: 50,
          preferStablecoins: true,
          preferFiat: false,
          lastUsedMethods: [],
          autoSelectBestOption: true
        }
      },
      marketConditions: {
        gasConditions: [{
          chainId: 1,
          gasPrice: BigInt(30000000000),
          gasPriceUSD: 25,
          networkCongestion: 'medium' as any,
          blockTime: 12,
          lastUpdated: new Date()
        }],
        exchangeRates: [
          {
            fromToken: 'ETH',
            toToken: 'USD',
            rate: 2000,
            source: 'demo',
            lastUpdated: new Date(),
            confidence: 0.95
          },
          {
            fromToken: 'USDC',
            toToken: 'USD',
            rate: 1,
            source: 'demo',
            lastUpdated: new Date(),
            confidence: 0.99
          }
        ],
        networkAvailability: [],
        lastUpdated: new Date()
      }
    });

    // Simulate some performance metrics
    prioritizationPerformanceMetrics.recordCacheHit(sessionId, 'gas_prices_1');
    prioritizationPerformanceMetrics.recordApiCall(
      sessionId,
      'gas_fee_estimation',
      '/gas-price',
      new Date(Date.now() - 500),
      new Date(),
      true
    );

    // Simulate user interaction
    setTimeout(() => {
      prioritizationPerformanceMetrics.recordUserInteraction(
        sessionId,
        'method_selected',
        { 
          id: 'usdc', 
          type: 'STABLECOIN_USDC' as any, 
          name: 'USDC', 
          description: 'USD Coin Stablecoin',
          chainId: 1,
          enabled: true,
          supportedNetworks: [1]
        }
      );
      
      prioritizationPerformanceMetrics.endSession(sessionId);
      updateStatus();
    }, 1000);

    // Simulate a gas price change notification
    setTimeout(() => {
      costChangeNotificationService.notifyGasPriceChange(
        1, // Ethereum
        20, // Old price
        35, // New price
        [{ 
          id: 'eth', 
          type: 'NATIVE_ETH' as any, 
          name: 'ETH', 
          description: 'Native Ethereum',
          chainId: 1,
          enabled: true,
          supportedNetworks: [1]
        }],
        'demo'
      );
      updateStatus();
    }, 3000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600';
      case 'B': return 'text-blue-600';
      case 'C': return 'text-yellow-600';
      case 'D': return 'text-orange-600';
      case 'F': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Real-Time Monitoring Demo
        </h1>
        <p className="text-gray-600">
          Demonstrates real-time cost monitoring, system health monitoring, and alerting services
        </p>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Control Panel</h2>
        <div className="flex space-x-4">
          <button
            onClick={startMonitoring}
            disabled={isStarted}
            className={`px-4 py-2 rounded-md font-medium ${
              isStarted
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Start Monitoring
          </button>
          <button
            onClick={stopMonitoring}
            disabled={!isStarted}
            className={`px-4 py-2 rounded-md font-medium ${
              !isStarted
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            Stop Monitoring
          </button>
        </div>
      </div>

      {/* Status Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Cost Monitoring Status */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Monitoring</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={status.costMonitoring.isActive ? 'text-green-600' : 'text-gray-400'}>
                {status.costMonitoring.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Chains:</span>
              <span className="text-gray-900">
                {status.costMonitoring.monitoredChains.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Last Update:</span>
              <span className="text-gray-900 text-sm">
                {status.costMonitoring.lastUpdate 
                  ? status.costMonitoring.lastUpdate.toLocaleTimeString()
                  : 'Never'
                }
              </span>
            </div>
          </div>
        </div>

        {/* Health Monitoring Status */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Overall Status:</span>
              <span className={getStatusColor(status.healthMonitoring.overallStatus)}>
                {status.healthMonitoring.overallStatus.charAt(0).toUpperCase() + 
                 status.healthMonitoring.overallStatus.slice(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active Alerts:</span>
              <span className={status.healthMonitoring.activeAlerts > 0 ? 'text-red-600' : 'text-green-600'}>
                {status.healthMonitoring.activeAlerts}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Performance Grade:</span>
              <span className={getGradeColor(status.healthMonitoring.performanceGrade)}>
                {status.healthMonitoring.performanceGrade}
              </span>
            </div>
          </div>
        </div>

        {/* Notifications Status */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Unread:</span>
              <span className={status.notifications.unreadCount > 0 ? 'text-orange-600' : 'text-green-600'}>
                {status.notifications.unreadCount}
              </span>
            </div>
            <div className="mt-4">
              <span className="text-gray-600 text-sm">Recent Notifications:</span>
              <div className="mt-2 space-y-1">
                {status.notifications.recentNotifications.length === 0 ? (
                  <p className="text-gray-400 text-sm">No recent notifications</p>
                ) : (
                  status.notifications.recentNotifications.map((notification, index) => (
                    <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                      <div className="font-medium">{notification.title}</div>
                      <div className="text-gray-600">{notification.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">How to Use</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>Click "Start Monitoring" to begin real-time monitoring services</li>
          <li>The system will monitor gas prices, exchange rates, and system health</li>
          <li>Watch the status dashboard update with real-time information</li>
          <li>Notifications will appear when significant changes occur</li>
          <li>The demo will simulate some activity to show the monitoring in action</li>
          <li>Click "Stop Monitoring" to stop all monitoring services</li>
        </ol>
      </div>
    </div>
  );
};

export default RealTimeMonitoringDemo;