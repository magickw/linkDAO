import React, { useMemo } from 'react';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { LayoutConfig } from '../../../../stores/adminDashboardStore';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartWidgetProps {
  widget: LayoutConfig;
  isEditMode: boolean;
  onAction: (widgetId: string, action: string) => void;
}

export const ChartWidget: React.FC<ChartWidgetProps> = ({
  widget,
  isEditMode,
  onAction
}) => {
  const chartType = widget.config.chartType || 'line';
  const metricType = widget.config.metric || 'users';

  // Generate mock data based on metric type
  const mockData = useMemo(() => {
    const generateTimeSeriesData = (points: number = 24) => {
      const labels = [];
      const data = [];
      const now = new Date();
      
      for (let i = points - 1; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        labels.push(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        
        // Generate realistic data based on metric type
        let value;
        switch (metricType) {
          case 'users':
            value = Math.floor(Math.random() * 200) + 300 + Math.sin(i / 4) * 50;
            break;
          case 'business':
            value = Math.floor(Math.random() * 1000) + 2000 + Math.sin(i / 6) * 300;
            break;
          case 'system':
            value = Math.random() * 30 + 40 + Math.sin(i / 3) * 20;
            break;
          default:
            value = Math.random() * 100;
        }
        data.push(Math.max(0, value));
      }
      
      return { labels, data };
    };

    const timeSeriesData = generateTimeSeriesData();
    
    return {
      line: {
        labels: timeSeriesData.labels,
        datasets: [
          {
            label: getMetricLabel(metricType),
            data: timeSeriesData.data,
            borderColor: getMetricColor(metricType),
            backgroundColor: getMetricColor(metricType, 0.1),
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
          }
        ]
      },
      bar: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            label: getMetricLabel(metricType),
            data: Array.from({ length: 7 }, () => Math.floor(Math.random() * 1000) + 500),
            backgroundColor: getMetricColor(metricType, 0.8),
            borderColor: getMetricColor(metricType),
            borderWidth: 1,
          }
        ]
      },
      pie: {
        labels: ['Desktop', 'Mobile', 'Tablet', 'Other'],
        datasets: [
          {
            data: [45, 35, 15, 5],
            backgroundColor: [
              '#3b82f6',
              '#10b981',
              '#f59e0b',
              '#ef4444'
            ],
            borderWidth: 2,
            borderColor: '#ffffff'
          }
        ]
      },
      doughnut: {
        labels: ['Active', 'Inactive', 'Pending'],
        datasets: [
          {
            data: [60, 25, 15],
            backgroundColor: [
              '#10b981',
              '#6b7280',
              '#f59e0b'
            ],
            borderWidth: 2,
            borderColor: '#ffffff'
          }
        ]
      }
    };
  }, [metricType]);

  const chartOptions = useMemo(() => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: !widget.minimized,
          position: 'top' as const,
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#374151',
          borderWidth: 1,
        }
      },
      interaction: {
        mode: 'nearest' as const,
        axis: 'x' as const,
        intersect: false
      }
    };

    // Chart-specific options
    if (chartType === 'line' || chartType === 'bar') {
      return {
        ...baseOptions,
        scales: {
          x: {
            display: !widget.minimized,
            grid: {
              display: false
            },
            ticks: {
              font: {
                size: 11
              }
            }
          },
          y: {
            display: !widget.minimized,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              font: {
                size: 11
              }
            }
          }
        }
      };
    }

    return baseOptions;
  }, [chartType, widget.minimized]);

  function getMetricLabel(metric: string): string {
    switch (metric) {
      case 'users': return 'Active Users';
      case 'business': return 'Revenue ($)';
      case 'system': return 'CPU Usage (%)';
      default: return 'Metric';
    }
  }

  function getMetricColor(metric: string, alpha: number = 1): string {
    const colors = {
      users: `rgba(59, 130, 246, ${alpha})`, // Blue
      business: `rgba(16, 185, 129, ${alpha})`, // Green
      system: `rgba(245, 158, 11, ${alpha})`, // Orange
    };
    return colors[metric as keyof typeof colors] || `rgba(107, 114, 128, ${alpha})`;
  }

  const renderChart = () => {
    const data = mockData[chartType as keyof typeof mockData];
    
    switch (chartType) {
      case 'bar':
        return <Bar data={data} options={chartOptions} />;
      case 'pie':
        return <Pie data={data} options={chartOptions} />;
      case 'doughnut':
        return <Doughnut data={data} options={chartOptions} />;
      default:
        return <Line data={data} options={chartOptions} />;
    }
  };

  if (widget.minimized) {
    return (
      <div className="chart-widget minimized">
        <div className="minimized-content">
          <span className="widget-title">{widget.config.title || 'Chart'}</span>
          <span className="chart-type-badge">{chartType}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-widget">
      <div className="widget-header">
        <h3 className="widget-title">{widget.config.title || 'Analytics Chart'}</h3>
        <div className="chart-controls">
          <span className="chart-type-indicator">{chartType}</span>
          <div className="time-range-selector">
            <select className="time-range-select">
              <option value="1h">1H</option>
              <option value="24h" selected>24H</option>
              <option value="7d">7D</option>
              <option value="30d">30D</option>
            </select>
          </div>
        </div>
      </div>

      <div className="widget-content">
        <div className="chart-container">
          {renderChart()}
        </div>
      </div>

      {isEditMode && (
        <div className="edit-overlay">
          <div className="edit-message">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Configure chart</span>
          </div>
        </div>
      )}

      <style jsx>{`
        .chart-widget {
          height: 100%;
          display: flex;
          flex-direction: column;
          position: relative;
          background: white;
        }

        .chart-widget.minimized {
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

        .chart-controls {
          display: flex;
          align-items: center;
          space-x: 8px;
        }

        .chart-type-indicator {
          font-size: 0.75rem;
          color: #6b7280;
          text-transform: uppercase;
          font-weight: 500;
        }

        .chart-type-badge {
          font-size: 0.75rem;
          color: #6b7280;
          text-transform: uppercase;
          font-weight: 500;
          background: #f3f4f6;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .time-range-selector {
          margin-left: 8px;
        }

        .time-range-select {
          font-size: 0.75rem;
          padding: 4px 8px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          background: white;
          color: #374151;
        }

        .widget-content {
          flex: 1;
          padding: 16px;
          overflow: hidden;
        }

        .chart-container {
          height: 100%;
          position: relative;
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

        .chart-widget:hover .edit-overlay {
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
          .widget-header {
            padding: 8px 12px 6px;
          }
          
          .widget-content {
            padding: 12px;
          }
          
          .chart-controls {
            flex-direction: column;
            align-items: flex-end;
            space-y: 4px;
          }
          
          .time-range-selector {
            margin-left: 0;
          }
        }
      `}</style>
    </div>
  );
};