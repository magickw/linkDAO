import React, { useRef, useEffect, useCallback, useMemo } from 'react';
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
  Filler,
  ChartConfiguration,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { BaseChartProps } from './types';
import { defaultAdminTheme, generateChartJsTheme, applyThemeToChart } from './theme';

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

interface BaseChartComponentProps extends BaseChartProps {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'radar' | 'polarArea' | 'scatter' | 'bubble';
  plugins?: any[];
}

const BaseChart: React.FC<BaseChartComponentProps> = ({
  type,
  data,
  options = {},
  width,
  height,
  className = '',
  onDataPointClick,
  onHover,
  realTime = false,
  refreshInterval = 5000,
  plugins = [],
}) => {
  const chartRef = useRef<ChartJS>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Memoized chart configuration with theme
  const chartConfig = useMemo(() => {
    const baseOptions: ChartOptions<any> = {
      ...generateChartJsTheme(defaultAdminTheme),
      ...options,
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index',
      },
      onClick: (event: any, elements: any) => {
        if (onDataPointClick && elements.length > 0) {
          const element = elements[0];
          const datasetIndex = element.datasetIndex;
          const index = element.index;
          const dataPoint = data.datasets[datasetIndex].data[index];
          onDataPointClick(dataPoint, index);
        }
      },
      onHover: (event: any, elements: any) => {
        if (onHover && elements.length > 0) {
          const element = elements[0];
          const datasetIndex = element.datasetIndex;
          const index = element.index;
          const dataPoint = data.datasets[datasetIndex].data[index];
          onHover(dataPoint, index);
        }
      },
    };

    return {
      type,
      data,
      options: baseOptions,
      plugins,
    } as ChartConfiguration;
  }, [type, data, options, onDataPointClick, onHover, plugins]);

  // Real-time data update handler
  const updateChartData = useCallback((newData: ChartData<any>) => {
    if (chartRef.current) {
      chartRef.current.data = newData;
      chartRef.current.update('none'); // Update without animation for real-time
    }
  }, []);

  // Real-time update effect
  useEffect(() => {
    if (!realTime) return;

    const interval = setInterval(() => {
      // This would typically fetch new data from an API
      // For now, we'll just trigger the onDataUpdate callback if provided
      if (onDataPointClick) {
        // Placeholder for real-time data fetching
        console.log('Real-time update triggered');
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [realTime, refreshInterval, onDataPointClick]);

  // Resize handler for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current) {
        chartRef.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Chart destruction cleanup
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  const containerStyle = {
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : '400px',
    position: 'relative' as const,
  };

  return (
    <div 
      ref={containerRef}
      className={`chart-container ${className}`}
      style={containerStyle}
    >
      <Chart
        ref={chartRef}
        type={type}
        data={data}
        options={chartConfig.options}
        plugins={plugins}
      />
    </div>
  );
};

export default BaseChart;