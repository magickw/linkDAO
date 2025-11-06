import React, { useState, useEffect, useRef } from 'react';
import { requestInterceptor, connectivityDiagnostics } from '../../utils/debugTools';

interface DashboardData {
  timestamp: string;
  connectivity: {
    status: string;
    lastCheck: number;
  };
  performance: {
    totalRequests: number;
    recentRequests: number;
    recentErrors: number;
    errorRate: number;
    avgResponseTime: number;
    uptime: number;
  };
  circuitBreakers: Record<string, any>;
  recentRequests: Array<{
    id: string;
    method: string;
    url: string;
    status?: number;
    duration?: number;
    timestamp: string;
  }>;
}

interface MonitoringDashboardProps {
  isVisible?: boolean;
  onToggle?: () => void;
}

export const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({
  isVisible = false,
  onToggle
}) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'diagnostics'>('overview');
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isVisible) {
      // Update data immediately
      updateData();
      
      // Set up interval for updates
      intervalRef.current = setInterval(updateData, 2000);
    } else {
      // Clear interval when hidden
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isVisible]);

  const updateData = () => {
    try {
      // Get data from debug system
      const dashboardData = (window as any).debugLinkDAO?.monitoring?.getDashboardData();
      if (dashboardData) {
        setData(dashboardData);
      }
    } catch (error) {
      console.error('Failed to update dashboard data:', error);
    }
  };

  const runDiagnostics = async () => {
    try {
      const results = await connectivityDiagnostics.runDiagnostics();
      console.log('Diagnostics completed:', results);
      // Update data after diagnostics
      updateData();
    } catch (error) {
      console.error('Diagnostics failed:', error);
    }
  };

  const clearRequestLog = () => {
    try {
      (window as any).debugLinkDAO?.monitoring?.clearRequestLog();
      requestInterceptor.clearHistory();
      updateData();
    } catch (error) {
      console.error('Failed to clear request log:', error);
    }
  };

  if (!isVisible || !data) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#4CAF50';
      case 'degraded': return '#FF9800';
      case 'offline': return '#F44336';
      default: return '#888';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return '🟢';
      case 'degraded': return '🟡';
      case 'offline': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        width: isExpanded ? '600px' : '350px',
        maxHeight: isExpanded ? '80vh' : '400px',
        background: 'rgba(0, 0, 0, 0.95)',
        color: 'white',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 10000,
        overflow: 'hidden',
        border: '1px solid #333',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 15px',
          borderBottom: '1px solid #333',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0, 123, 204, 0.2)'
        }}
      >
        <div>
          <strong>🔍 LinkDAO Debug Monitor</strong>
          <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
            {new Date(data.timestamp).toLocaleTimeString()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'none',
              border: '1px solid #555',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px'
            }}
          >
            {isExpanded ? '📉' : '📈'}
          </button>
          <button
            onClick={onToggle}
            style={{
              background: 'none',
              border: '1px solid #555',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px'
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tabs */}
      {isExpanded && (
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #333',
            background: 'rgba(255, 255, 255, 0.05)'
          }}
        >
          {(['overview', 'requests', 'diagnostics'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? 'rgba(0, 123, 204, 0.3)' : 'none',
                border: 'none',
                color: 'white',
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '11px',
                textTransform: 'capitalize',
                borderBottom: activeTab === tab ? '2px solid #007acc' : 'none'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div
        style={{
          padding: '15px',
          overflowY: 'auto',
          maxHeight: isExpanded ? 'calc(80vh - 120px)' : '320px'
        }}
      >
        {/* Overview Tab */}
        {(!isExpanded || activeTab === 'overview') && (
          <div>
            {/* Connectivity Status */}
            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                <strong>Connectivity:</strong>
                <span style={{ color: getStatusColor(data.connectivity.status) }}>
                  {getStatusIcon(data.connectivity.status)} {data.connectivity.status.toUpperCase()}
                </span>
              </div>
              {data.connectivity.lastCheck && (
                <div style={{ fontSize: '10px', color: '#888' }}>
                  Last check: {Math.round((Date.now() - data.connectivity.lastCheck) / 1000)}s ago
                </div>
              )}
            </div>

            {/* Performance Metrics */}
            <div style={{ marginBottom: '15px' }}>
              <strong>Performance (5min):</strong>
              <div style={{ marginTop: '5px', lineHeight: '1.4' }}>
                <div>• Requests: {data.performance.recentRequests}</div>
                <div>• Errors: {data.performance.recentErrors} ({data.performance.errorRate}%)</div>
                <div>• Avg Response: {data.performance.avgResponseTime}ms</div>
                <div>• Uptime: {Math.round(data.performance.uptime / 1000)}s</div>
              </div>
            </div>

            {/* Circuit Breakers */}
            <div style={{ marginBottom: '15px' }}>
              <strong>Circuit Breakers:</strong>
              <div style={{ marginTop: '5px' }}>
                {Object.entries(data.circuitBreakers).length > 0 ? (
                  Object.entries(data.circuitBreakers).map(([service, state]: [string, any]) => (
                    <div key={service} style={{ fontSize: '11px', marginBottom: '2px' }}>
                      • {service}: 
                      <span style={{ 
                        color: state.state === 'CLOSED' ? '#4CAF50' : 
                               state.state === 'OPEN' ? '#F44336' : '#FF9800',
                        marginLeft: '4px'
                      }}>
                        {state.state}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '11px', color: '#888' }}>None active</div>
                )}
              </div>
            </div>

            {/* Recent Requests */}
            <div>
              <strong>Recent Requests:</strong>
              <div style={{ marginTop: '5px', maxHeight: '120px', overflowY: 'auto' }}>
                {data.recentRequests.length > 0 ? (
                  data.recentRequests.map((req) => (
                    <div
                      key={req.id}
                      style={{
                        fontSize: '10px',
                        marginBottom: '2px',
                        color: req.status && req.status >= 400 ? '#F44336' : 
                               req.status && req.status >= 200 ? '#4CAF50' : '#888',
                        padding: '2px 0'
                      }}
                    >
                      {req.method} {req.url.split('?')[0]} 
                      {req.duration && ` (${Math.round(req.duration)}ms)`}
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '11px', color: '#888' }}>No recent requests</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Requests Tab */}
        {isExpanded && activeTab === 'requests' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <strong>Request Log</strong>
              <button
                onClick={clearRequestLog}
                style={{
                  background: '#dc3545',
                  border: 'none',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '10px'
                }}
              >
                Clear Log
              </button>
            </div>
            
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {requestInterceptor.getRequests().slice(-20).reverse().map((req) => (
                <div
                  key={req.id}
                  style={{
                    border: '1px solid #333',
                    borderRadius: '4px',
                    padding: '8px',
                    marginBottom: '8px',
                    background: 'rgba(255, 255, 255, 0.02)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 'bold' }}>
                      {req.method} {req.url.split('?')[0]}
                    </span>
                    <span style={{ fontSize: '10px', color: '#888' }}>
                      {new Date(req.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {req.response && (
                    <div style={{ fontSize: '10px', color: getStatusColor(req.response.status >= 400 ? 'offline' : 'online') }}>
                      Status: {req.response.status} ({Math.round(req.response.duration)}ms)
                    </div>
                  )}
                  
                  {req.error && (
                    <div style={{ fontSize: '10px', color: '#F44336' }}>
                      Error: {req.error.message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Diagnostics Tab */}
        {isExpanded && activeTab === 'diagnostics' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <strong>Connectivity Diagnostics</strong>
              <button
                onClick={runDiagnostics}
                style={{
                  background: '#007acc',
                  border: 'none',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                Run Diagnostics
              </button>
            </div>

            <div style={{ fontSize: '11px', lineHeight: '1.5' }}>
              <div style={{ marginBottom: '10px' }}>
                <strong>Available Tests:</strong>
                <div style={{ marginTop: '5px', color: '#888' }}>
                  • Basic connectivity test<br/>
                  • CORS configuration validation<br/>
                  • API endpoints health check<br/>
                  • WebSocket connection test<br/>
                  • Network latency measurement<br/>
                  • DNS resolution test
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <strong>Quick Actions:</strong>
                <div style={{ marginTop: '5px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => (window as any).debugLinkDAO?.monitoring?.diagnoseConnectivityIssues()}
                    style={{
                      background: '#28a745',
                      border: 'none',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '10px'
                    }}
                  >
                    Quick Diagnosis
                  </button>
                  <button
                    onClick={() => console.log((window as any).debugLinkDAO?.monitoring?.getPerformanceMetrics())}
                    style={{
                      background: '#6f42c1',
                      border: 'none',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '10px'
                    }}
                  >
                    Performance Report
                  </button>
                </div>
              </div>

              <div style={{ 
                background: 'rgba(255, 193, 7, 0.1)', 
                border: '1px solid #ffc107', 
                borderRadius: '4px', 
                padding: '8px',
                color: '#ffc107'
              }}>
                <strong>💡 Tip:</strong> Check the browser console for detailed diagnostic results and recommendations.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonitoringDashboard;