import React from 'react';
import { LayoutConfig } from '../../../../stores/adminDashboardStore';

interface AlertWidgetProps {
  widget: LayoutConfig;
  isEditMode: boolean;
  onAction: (widgetId: string, action: string) => void;
}

interface Alert {
  id: string;
  type: 'system' | 'security' | 'business' | 'anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export const AlertWidget: React.FC<AlertWidgetProps> = ({
  widget,
  isEditMode,
  onAction
}) => {
  // Mock alerts data
  const mockAlerts: Alert[] = [
    {
      id: '1',
      type: 'security',
      severity: 'critical',
      title: 'Suspicious Login Activity',
      message: 'Multiple failed login attempts detected from IP 192.168.1.100',
      timestamp: new Date(Date.now() - 2 * 60 * 1000),
      acknowledged: false
    },
    {
      id: '2',
      type: 'system',
      severity: 'high',
      title: 'High CPU Usage',
      message: 'CPU usage has exceeded 85% for the last 10 minutes',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      acknowledged: false
    },
    {
      id: '3',
      type: 'business',
      severity: 'medium',
      title: 'Transaction Volume Drop',
      message: 'Transaction volume is 25% below average for this time period',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      acknowledged: true
    },
    {
      id: '4',
      type: 'anomaly',
      severity: 'low',
      title: 'Unusual User Pattern',
      message: 'Detected unusual user behavior pattern in community interactions',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      acknowledged: false
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'security':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      case 'system':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
        );
      case 'business':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'anomaly':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const unacknowledgedAlerts = mockAlerts.filter(alert => !alert.acknowledged);
  const maxItems = widget.config.maxItems || 10;
  const displayAlerts = mockAlerts.slice(0, maxItems);

  if (widget.minimized) {
    return (
      <div className="alert-widget minimized">
        <div className="minimized-content">
          <span className="widget-title">{widget.config.title || 'Alerts'}</span>
          <span className="alert-count">
            {unacknowledgedAlerts.length} unread
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="alert-widget">
      <div className="widget-header">
        <h3 className="widget-title">{widget.config.title || 'System Alerts'}</h3>
        <div className="alert-summary">
          <span className="unread-count">{unacknowledgedAlerts.length} unread</span>
          <button className="refresh-btn">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="widget-content">
        {displayAlerts.length === 0 ? (
          <div className="empty-state">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500 text-sm mt-2">No alerts at this time</p>
          </div>
        ) : (
          <div className="alerts-list">
            {displayAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`alert-item ${alert.acknowledged ? 'acknowledged' : 'unacknowledged'} ${getSeverityColor(alert.severity)}`}
              >
                <div className="alert-header">
                  <div className="alert-type-icon">
                    {getTypeIcon(alert.type)}
                  </div>
                  <div className="alert-meta">
                    <span className="alert-severity">{alert.severity}</span>
                    <span className="alert-time">{formatTimeAgo(alert.timestamp)}</span>
                  </div>
                  {!alert.acknowledged && (
                    <button className="acknowledge-btn">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="alert-content">
                  <h4 className="alert-title">{alert.title}</h4>
                  <p className="alert-message">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isEditMode && (
        <div className="edit-overlay">
          <div className="edit-message">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Configure alerts</span>
          </div>
        </div>
      )}

      <style jsx>{`
        .alert-widget {
          height: 100%;
          display: flex;
          flex-direction: column;
          position: relative;
          background: white;
        }

        .alert-widget.minimized {
          height: 40px;
          overflow: hidden;
        }

        .minimized-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          height: 100%;
        }

        .alert-count {
          font-size: 0.75rem;
          color: #ef4444;
          font-weight: 600;
          background: #fef2f2;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .widget-header {
          padding: 12px 16px 8px;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .widget-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin: 0;
        }

        .alert-summary {
          display: flex;
          align-items: center;
          space-x: 8px;
        }

        .unread-count {
          font-size: 0.75rem;
          color: #ef4444;
          font-weight: 600;
          background: #fef2f2;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .refresh-btn {
          padding: 4px;
          color: #6b7280;
          hover:color: #374151;
          hover:background: #f3f4f6;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .widget-content {
          flex: 1;
          overflow-y: auto;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 32px 16px;
        }

        .alerts-list {
          padding: 8px;
          space-y: 8px;
        }

        .alert-item {
          border: 1px solid;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 8px;
          transition: all 0.2s ease;
        }

        .alert-item:hover {
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .alert-item.acknowledged {
          opacity: 0.6;
        }

        .alert-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .alert-type-icon {
          display: flex;
          align-items: center;
          margin-right: 8px;
        }

        .alert-meta {
          display: flex;
          align-items: center;
          space-x: 8px;
          flex: 1;
        }

        .alert-severity {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .alert-time {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .acknowledge-btn {
          padding: 4px;
          color: currentColor;
          hover:background: rgba(0, 0, 0, 0.1);
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .alert-content {
          margin-left: 32px;
        }

        .alert-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #111827;
          margin: 0 0 4px 0;
        }

        .alert-message {
          font-size: 0.75rem;
          color: #6b7280;
          line-height: 1.4;
          margin: 0;
        }

        .edit-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(59, 130, 246, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease;
          cursor: pointer;
        }

        .alert-widget:hover .edit-overlay {
          opacity: 1;
        }

        .edit-message {
          display: flex;
          align-items: center;
          space-x: 8px;
          color: #3b82f6;
          font-size: 0.875rem;
          font-weight: 500;
          background: white;
          padding: 8px 12px;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .alert-item {
            padding: 8px;
          }
          
          .alert-content {
            margin-left: 24px;
          }
          
          .alert-title {
            font-size: 0.8125rem;
          }
          
          .alert-message {
            font-size: 0.6875rem;
          }
        }
      `}</style>
    </div>
  );
};