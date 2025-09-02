import React, { useMemo } from 'react';
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
import { Line, Bar, Doughnut, Pie, Area } from 'react-chartjs-2';
import { GlassPanel } from '../../design-system/components/GlassPanel';
import { LoadingSkeleton } from '../../design-system/components/LoadingSkeleton';

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

interface ChartContainerProps {
  title: string;
  type: 'line' | 'bar' | 'doughnut' | 'pie' | 'area';
  data: any;
  height?: number;
  loading?: boolean;
  options?: any;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  type,
  data,
  height = 300,
  loading = false,
  options: customOptions
}) => {
  const chartOptions = useMemo(() => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            color: '#E5E7EB',
            font: {
              size: 12
            }
          }
        },
        title: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.9)',
          titleColor: '#F9FAFB',
          bodyColor: '#E5E7EB',
          borderColor: 'rgba(75, 85, 99, 0.5)',
          borderWidth: 1
        }
      },
      scales: type === 'line' || type === 'bar' || type === 'area' ? {
        x: {
          grid: {
            color: 'rgba(75, 85, 99, 0.3)'
          },
          ticks: {
            color: '#9CA3AF'
          }
        },
        y: {
          grid: {
            color: 'rgba(75, 85, 99, 0.3)'
          },
          ticks: {
            color: '#9CA3AF'
          }
        }
      } : undefined
    };

    return { ...baseOptions, ...customOptions };
  }, [type, customOptions]);

  const chartData = useMemo(() => {
    if (!data) return null;

    // Default color palette for Web3 theme
    const colors = [
      'rgba(99, 102, 241, 0.8)',   // Indigo
      'rgba(6, 182, 212, 0.8)',    // Cyan
      'rgba(139, 92, 246, 0.8)',   // Violet
      'rgba(236, 72, 153, 0.8)',   // Pink
      'rgba(34, 197, 94, 0.8)',    // Green
      'rgba(251, 146, 60, 0.8)',   // Orange
      'rgba(239, 68, 68, 0.8)',    // Red
      'rgba(168, 85, 247, 0.8)'    // Purple
    ];

    const borderColors = colors.map(color => color.replace('0.8', '1'));

    if (Array.isArray(data)) {
      // Time series data
      return {
        labels: data.map(item => item.date || item.label),
        datasets: [{
          label: title,
          data: data.map(item => item.value || item.sales || item.revenue || item.count),
          backgroundColor: type === 'area' ? 'rgba(99, 102, 241, 0.2)' : colors[0],
          borderColor: borderColors[0],
          borderWidth: 2,
          fill: type === 'area',
          tension: type === 'line' || type === 'area' ? 0.4 : 0
        }]
      };
    } else if (data.datasets) {
      // Chart.js format data
      return {
        ...data,
        datasets: data.datasets.map((dataset: any, index: number) => ({
          ...dataset,
          backgroundColor: dataset.backgroundColor || colors.slice(0, dataset.data?.length || 1),
          borderColor: dataset.borderColor || borderColors.slice(0, dataset.data?.length || 1),
          borderWidth: dataset.borderWidth || 2
        }))
      };
    } else {
      // Object with labels and values
      const labels = Object.keys(data);
      const values = Object.values(data) as number[];
      
      return {
        labels,
        datasets: [{
          label: title,
          data: values,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: borderColors.slice(0, labels.length),
          borderWidth: 2
        }]
      };
    }
  }, [data, title, type]);

  const renderChart = () => {
    if (!chartData) return null;

    const commonProps = {
      data: chartData,
      options: chartOptions,
      height
    };

    switch (type) {
      case 'line':
        return <Line {...commonProps} />;
      case 'bar':
        return <Bar {...commonProps} />;
      case 'doughnut':
        return <Doughnut {...commonProps} />;
      case 'pie':
        return <Pie {...commonProps} />;
      case 'area':
        return <Line {...commonProps} />;
      default:
        return <Line {...commonProps} />;
    }
  };

  if (loading) {
    return (
      <GlassPanel className="p-6">
        <div className="mb-4">
          <div className="h-5 bg-gray-600 rounded w-1/3 animate-pulse"></div>
        </div>
        <LoadingSkeleton className="w-full" style={{ height }} />
      </GlassPanel>
    );
  }

  return (
    <GlassPanel className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      
      <div style={{ height }}>
        {chartData ? (
          renderChart()
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm">No data available</p>
            </div>
          </div>
        )}
      </div>
    </GlassPanel>
  );
};

export default ChartContainer;