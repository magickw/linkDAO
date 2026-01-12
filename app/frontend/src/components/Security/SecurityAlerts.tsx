/**
 * Security Alert UI Component
 * Displays security alerts and notifications to users
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, X, Info, AlertCircle, XCircle } from 'lucide-react';
import { securityMonitorService, SecurityAlert } from '@/services/securityMonitorService';

interface SecurityAlertBannerProps {
  className?: string;
  onResolve?: (alertId: string) => void;
}

export const SecurityAlertBanner: React.FC<SecurityAlertBannerProps> = ({
  className = '',
  onResolve,
}) => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load initial alerts
    loadAlerts();

    // Register for new alerts
    const callbackId = securityMonitorService.onAlert((alert) => {
      loadAlerts();
    });

    // Refresh alerts every 30 seconds
    const interval = setInterval(loadAlerts, 30000);

    return () => {
      securityMonitorService.offAlert(callbackId);
      clearInterval(interval);
    };
  }, []);

  const loadAlerts = () => {
    const activeAlerts = securityMonitorService.getAlerts({
      resolved: false,
      limit: 10,
    });
    setAlerts(activeAlerts);
  };

  const handleDismiss = (alertId: string) => {
    setDismissed(new Set([...dismissed, alertId]));
  };

  const handleResolve = (alertId: string) => {
    securityMonitorService.resolveAlert(alertId);
    handleDismiss(alertId);
    onResolve?.(alertId);
  };

  const getSeverityColor = (severity: SecurityAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 border-red-600 text-red-50';
      case 'high':
        return 'bg-orange-500 border-orange-600 text-orange-50';
      case 'medium':
        return 'bg-yellow-500 border-yellow-600 text-yellow-50';
      case 'low':
        return 'bg-blue-500 border-blue-600 text-blue-50';
      default:
        return 'bg-gray-500 border-gray-600 text-gray-50';
    }
  };

  const getSeverityIcon = (severity: SecurityAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-5 h-5" />;
      case 'high':
        return <AlertTriangle className="w-5 h-5" />;
      case 'medium':
        return <AlertCircle className="w-5 h-5" />;
      case 'low':
        return <Info className="w-5 h-5" />;
      default:
        return <Shield className="w-5 h-5" />;
    }
  };

  const visibleAlerts = alerts.filter(alert => !dismissed.has(alert.id));

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 space-y-2 ${className}`}>
      {visibleAlerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-start gap-3 p-4 rounded-lg shadow-lg border-2 max-w-md animate-slide-in ${getSeverityColor(alert.severity)}`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {getSeverityIcon(alert.severity)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">
                {alert.severity}
              </span>
              <span className="text-xs opacity-75">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </span>
            </div>
            
            <p className="text-sm font-medium mb-1">
              {alert.message}
            </p>
            
            {alert.type && (
              <p className="text-xs opacity-75">
                Type: {alert.type}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <button
              onClick={() => handleDismiss(alert.id)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
            {alert.severity !== 'low' && (
              <button
                onClick={() => handleResolve(alert.id)}
                className="p-1 hover:bg-white/10 rounded transition-colors text-xs"
                aria-label="Resolve"
              >
                <Shield className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

interface SecurityMetricsProps {
  className?: string;
}

export const SecurityMetrics: React.FC<SecurityMetricsProps> = ({ className = '' }) => {
  const [metrics, setMetrics] = useState(securityMonitorService.getMetrics());

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(securityMonitorService.getMetrics());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Security Metrics</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded p-3">
          <div className="text-2xl font-bold text-gray-900">{metrics.activeAlerts}</div>
          <div className="text-sm text-gray-600">Active Alerts</div>
        </div>

        <div className="bg-red-50 rounded p-3">
          <div className="text-2xl font-bold text-red-600">{metrics.criticalAlerts}</div>
          <div className="text-sm text-gray-600">Critical</div>
        </div>

        <div className="bg-orange-50 rounded p-3">
          <div className="text-2xl font-bold text-orange-600">{metrics.highAlerts}</div>
          <div className="text-sm text-gray-600">High</div>
        </div>

        <div className="bg-yellow-50 rounded p-3">
          <div className="text-2xl font-bold text-yellow-600">{metrics.mediumAlerts}</div>
          <div className="text-sm text-gray-600">Medium</div>
        </div>

        <div className="bg-blue-50 rounded p-3">
          <div className="text-2xl font-bold text-blue-600">{metrics.lowAlerts}</div>
          <div className="text-sm text-gray-600">Low</div>
        </div>

        <div className="bg-green-50 rounded p-3">
          <div className="text-2xl font-bold text-green-600">{metrics.resolvedAlerts}</div>
          <div className="text-sm text-gray-600">Resolved</div>
        </div>
      </div>
    </div>
  );
};

interface SecurityAlertsListProps {
  className?: string;
  onResolve?: (alertId: string) => void;
}

export const SecurityAlertsList: React.FC<SecurityAlertsListProps> = ({
  className = '',
  onResolve,
}) => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('active');

  useEffect(() => {
    loadAlerts();
  }, [filter]);

  const loadAlerts = () => {
    const filteredAlerts = securityMonitorService.getAlerts({
      resolved: filter === 'resolved' ? true : filter === 'active' ? false : undefined,
    });
    setAlerts(filteredAlerts);
  };

  const handleResolve = (alertId: string) => {
    securityMonitorService.resolveAlert(alertId);
    loadAlerts();
    onResolve?.(alertId);
  };

  const getSeverityBadge = (severity: SecurityAlert['severity']) => {
    const colors = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800',
    };
    return colors[severity];
  };

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Security Alerts</h3>
          </div>

          <div className="flex gap-2">
            {(['all', 'active', 'resolved'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="divide-y max-h-96 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Shield className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No security alerts found</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getSeverityBadge(alert.severity)}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-600">
                    {new Date(alert.timestamp).toLocaleString()}
                  </span>
                </div>

                {alert.type && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {alert.type}
                  </span>
                )}
              </div>

              <p className="text-gray-900 mb-2">{alert.message}</p>

              {alert.details && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                    View Details
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto text-xs">
                    {JSON.stringify(alert.details, null, 2)}
                  </pre>
                </details>
              )}

              {!alert.resolved && (
                <button
                  onClick={() => handleResolve(alert.id)}
                  className="mt-3 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  Mark as Resolved
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};