/**
 * Real-time Compliance Dashboard Component
 * 
 * React component that displays real-time compliance monitoring data
 * with live updates via WebSocket connection.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useComplianceWebSocket, ComplianceAlert, ComplianceMetrics } from '../../../services/complianceWebSocketClient';

interface RealTimeComplianceDashboardProps {
  userId: string;
  permissions?: string[];
  selectedSellerId?: string;
}

export const RealTimeComplianceDashboard: React.FC<RealTimeComplianceDashboardProps> = ({
  userId,
  permissions = ['read_compliance'],
  selectedSellerId
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sellerData, setSellerData] = useState<any>(null);

  const {
    isConnected: wsConnected,
    lastUpdate: wsLastUpdate,
    error: wsError,
    subscribeToCompliance,
    subscribeToAlerts,
    subscribeToSeller,
    authenticate,
    requestSnapshot
  } = useComplianceWebSocket();

  // Update connection state
  useEffect(() => {
    setIsConnected(wsConnected);
  }, [wsConnected]);

  // Update error state
  useEffect(() => {
    setError(wsError);
  }, [wsError]);

  // Update last update time
  useEffect(() => {
    setLastUpdate(wsLastUpdate);
  }, [wsLastUpdate]);

  // Authenticate on mount
  useEffect(() => {
    if (wsConnected) {
      authenticate(userId, permissions);
    }
  }, [wsConnected, userId, permissions, authenticate]);

  // Subscribe to compliance updates
  useEffect(() => {
    if (!wsConnected) return;

    const unsubscribe = subscribeToCompliance((update) => {
      console.log('Compliance update received:', update);
      
      // Update metrics if included
      if (update.data.metrics) {
        setMetrics(update.data.metrics);
      }

      // Handle dashboard updates
      if (update.type === 'dashboard_updated' && update.data.widgets) {
        // Process widget data
        console.log('Dashboard widgets updated:', update.data.widgets);
      }
    });

    return unsubscribe;
  }, [wsConnected, subscribeToCompliance]);

  // Subscribe to alerts
  useEffect(() => {
    if (!wsConnected) return;

    const unsubscribe = subscribeToAlerts((alert) => {
      console.log('Alert received:', alert);
      setAlerts(prev => [alert, ...prev.slice(0, 9)]); // Keep last 10 alerts
    });

    return unsubscribe;
  }, [wsConnected, subscribeToAlerts]);

  // Subscribe to specific seller if selected
  useEffect(() => {
    if (!wsConnected || !selectedSellerId) return;

    const unsubscribe = subscribeToSeller(selectedSellerId, (data) => {
      console.log('Seller data received:', data);
      setSellerData(data);
    });

    // Request initial snapshot
    requestSnapshot(selectedSellerId);

    return unsubscribe;
  }, [wsConnected, selectedSellerId, subscribeToSeller, requestSnapshot]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString();
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Real-time Compliance Monitoring</h2>
        
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Last Update */}
          {lastUpdate && (
            <div className="text-sm text-gray-500">
              Last update: {formatTime(lastUpdate)}
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{metrics.totalSellers}</div>
            <div className="text-sm text-blue-800">Total Sellers</div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {metrics.averageComplianceScore.toFixed(1)}%
            </div>
            <div className="text-sm text-green-800">Avg Compliance Score</div>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{metrics.criticalViolations}</div>
            <div className="text-sm text-red-800">Critical Violations</div>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{metrics.pendingAlerts}</div>
            <div className="text-sm text-orange-800">Pending Alerts</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Alerts */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Recent Alerts</h3>
          
          {alerts.length === 0 ? (
            <p className="text-gray-500">No recent alerts</p>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="bg-white p-3 rounded border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(alert.timestamp)}
                    </span>
                  </div>
                  
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {alert.sellerName}
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    {alert.message}
                  </div>
                  
                  {alert.requiresAction && (
                    <div className="mt-2 text-xs text-red-600 font-medium">
                      Action Required
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Seller Details */}
        {sellerData && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">
              Seller: {sellerData.sellerName}
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Compliance Score:</span>
                <span className="text-sm font-medium">
                  {sellerData.complianceScore}%
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Processing Time:</span>
                <span className="text-sm font-medium">
                  {sellerData.processingTimeCompliance}%
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Approval Rate:</span>
                <span className="text-sm font-medium">
                  {sellerData.approvalRateDeviation}% deviation
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Violations:</span>
                <span className="text-sm font-medium">
                  {sellerData.violations?.length || 0}
                </span>
              </div>
              
              {sellerData.recommendations && (
                <div className="mt-4">
                  <div className="text-sm font-medium text-gray-900 mb-2">Recommendations:</div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {sellerData.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Instructions when no seller selected */}
      {!selectedSellerId && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            Select a seller to view detailed compliance information and real-time updates.
          </p>
        </div>
      )}
    </div>
  );
};

export default RealTimeComplianceDashboard;