import React from 'react';
import { LayoutConfig } from '../../../../stores/adminDashboardStore';

interface MetricWidgetProps {
  widget: LayoutConfig;
  isEditMode: boolean;
  onAction: (widgetId: string, action: string) => void;
}

export const MetricWidget: React.FC<MetricWidgetProps> = ({
  widget,
  isEditMode,
  onAction
}) => {
  // Mock data - in real implementation, this would come from props or API
  const mockData = {
    system: {
      cpu: 67,
      memory: 82,
      disk: 45,
      network: 234
    },
    users: {
      total: 12543,
      active: 892,
      growth: 12.5
    },
    business: {
      revenue: 45678,
      transactions: 1234,
      conversion: 3.2
    }
  };

  const metricType = widget.config.metric || 'system';
  const data = mockData[metricType as keyof typeof mockData] || mockData.system;

  const renderSystemMetrics = () => (
    <div className="metric-grid">
      <div className="metric-item">
        <div className="metric-label">CPU Usage</div>
        <div className="metric-value">{data.cpu}%</div>
        <div className={`metric-trend ${data.cpu > 80 ? 'trend-danger' : data.cpu > 60 ? 'trend-warning' : 'trend-success'}`}>
          {data.cpu > 80 ? '↑' : data.cpu > 60 ? '→' : '↓'}
        </div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Memory</div>
        <div className="metric-value">{data.memory}%</div>
        <div className={`metric-trend ${data.memory > 80 ? 'trend-danger' : data.memory > 60 ? 'trend-warning' : 'trend-success'}`}>
          {data.memory > 80 ? '↑' : data.memory > 60 ? '→' : '↓'}
        </div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Disk Usage</div>
        <div className="metric-value">{data.disk}%</div>
        <div className={`metric-trend ${data.disk > 80 ? 'trend-danger' : data.disk > 60 ? 'trend-warning' : 'trend-success'}`}>
          {data.disk > 80 ? '↑' : data.disk > 60 ? '→' : '↓'}
        </div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Network I/O</div>
        <div className="metric-value">{data.network} MB/s</div>
        <div className="metric-trend trend-info">→</div>
      </div>
    </div>
  );

  const renderUserMetrics = () => (
    <div className="metric-grid">
      <div className="metric-item large">
        <div className="metric-label">Total Users</div>
        <div className="metric-value large">{data.total?.toLocaleString()}</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Active Now</div>
        <div className="metric-value">{data.active}</div>
        <div className="metric-trend trend-success">↑</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Growth Rate</div>
        <div className="metric-value">+{data.growth}%</div>
        <div className="metric-trend trend-success">↑</div>
      </div>
    </div>
  );

  const renderBusinessMetrics = () => (
    <div className="metric-grid">
      <div className="metric-item large">
        <div className="metric-label">Revenue</div>
        <div className="metric-value large">${data.revenue?.toLocaleString()}</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Transactions</div>
        <div className="metric-value">{data.transactions}</div>
        <div className="metric-trend trend-success">↑</div>
      </div>
      <div className="metric-item">
        <div className="metric-label">Conversion</div>
        <div className="metric-value">{data.conversion}%</div>
        <div className="metric-trend trend-warning">→</div>
      </div>
    </div>
  );

  const renderMetrics = () => {
    switch (metricType) {
      case 'users':
        return renderUserMetrics();
      case 'business':
        return renderBusinessMetrics();
      default:
        return renderSystemMetrics();
    }
  };

  if (widget.minimized) {
    return (
      <div className="metric-widget minimized">
        <div className="minimized-content">
          <span className="widget-title">{widget.config.title || 'Metrics'}</span>
          <span className="minimized-summary">
            {metricType === 'system' && `CPU: ${data.cpu}%`}
            {metricType === 'users' && `${data.total?.toLocaleString()} users`}
            {metricType === 'business' && `$${data.revenue?.toLocaleString()}`}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="metric-widget">
      <div className="widget-header">
        <h3 className="widget-title">{widget.config.title || 'System Metrics'}</h3>
        {widget.config.showTrend && (
          <div className="refresh-indicator">
            <div className="pulse-dot"></div>
            <span className="text-xs text-gray-500">Live</span>
          </div>
        )}
      </div>

      <div className="widget-content">
        {renderMetrics()}
      </div>

      {isEditMode && (
        <div className="edit-overlay">
          <div className="edit-message">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Click to configure</span>
          </div>
        </div>
      )}

      <style jsx>{`
        .metric-widget {
          height: 100%;
          display: flex;
          flex-direction: column;
          position: relative;
          background: white;
        }

        .metric-widget.minimized {
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

        .minimized-summary {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 500;
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

        .refresh-indicator {
          display: flex;
          align-items: center;
          space-x: 4px;
        }

        .pulse-dot {
          width: 6px;
          height: 6px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse 2s infinite;
          margin-right: 4px;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .widget-content {
          flex: 1;
          padding: 16px;
          overflow: hidden;
        }

        .metric-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 16px;
          height: 100%;
        }

        .metric-item {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 12px;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px solid #f3f4f6;
          position: relative;
          transition: all 0.2s ease;
        }

        .metric-item:hover {
          background: #f3f4f6;
          border-color: #e5e7eb;
        }

        .metric-item.large {
          grid-column: span 2;
        }

        .metric-label {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 500;
          margin-bottom: 4px;
        }

        .metric-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          line-height: 1.2;
        }

        .metric-value.large {
          font-size: 2rem;
        }

        .metric-trend {
          position: absolute;
          top: 8px;
          right: 8px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .trend-success { color: #10b981; }
        .trend-warning { color: #f59e0b; }
        .trend-danger { color: #ef4444; }
        .trend-info { color: #3b82f6; }

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

        .metric-widget:hover .edit-overlay {
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
          .metric-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          
          .metric-item.large {
            grid-column: span 1;
          }
          
          .widget-content {
            padding: 12px;
          }
          
          .metric-value {
            font-size: 1.25rem;
          }
          
          .metric-value.large {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};