import React, { useMemo } from 'react';
import BaseChart from './BaseChart';
import { LineChartProps } from './types';
import { adminColors, generateGradient } from './theme';

const LineChart: React.FC<LineChartProps> = ({
  data,
  options = {},
  smooth = true,
  showPoints = true,
  fillArea = false,
  multiAxis = false,
  ...baseProps
}) => {
  // Enhanced data with line-specific styling
  const enhancedData = useMemo(() => {
    return {
      ...data,
      datasets: data.datasets.map((dataset, index) => ({
        ...dataset,
        borderColor: dataset.borderColor || adminColors.primary[index % adminColors.primary.length],
        backgroundColor: fillArea 
          ? dataset.backgroundColor || `${adminColors.primary[index % adminColors.primary.length]}20`
          : 'transparent',
        pointBackgroundColor: dataset.pointBackgroundColor || adminColors.primary[index % adminColors.primary.length],
        pointBorderColor: dataset.pointBorderColor || '#ffffff',
        pointBorderWidth: 2,
        pointRadius: showPoints ? 4 : 0,
        pointHoverRadius: showPoints ? 6 : 0,
        tension: smooth ? 0.4 : 0,
        fill: fillArea,
        borderWidth: 2,
        yAxisID: multiAxis && index > 0 ? 'y1' : 'y',
      })),
    };
  }, [data, fillArea, showPoints, smooth, multiAxis]);

  // Enhanced options for line charts
  const enhancedOptions = useMemo(() => {
    const baseOptions = {
      ...options,
      scales: {
        ...options.scales,
        x: {
          ...options.scales?.x,
          grid: {
            display: true,
            color: '#E5E7EB',
            borderDash: [2, 2],
          },
        },
        y: {
          ...options.scales?.y,
          grid: {
            display: true,
            color: '#E5E7EB',
            borderDash: [2, 2],
          },
          beginAtZero: true,
        },
      },
      elements: {
        point: {
          hoverBorderWidth: 3,
        },
        line: {
          borderCapStyle: 'round' as const,
          borderJoinStyle: 'round' as const,
        },
      },
      plugins: {
        ...options.plugins,
        tooltip: {
          ...options.plugins?.tooltip,
          mode: 'index' as const,
          intersect: false,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          titleColor: '#374151',
          bodyColor: '#6B7280',
          borderColor: '#E5E7EB',
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            ...options.plugins?.tooltip?.callbacks,
            label: (context: any) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${typeof value === 'number' ? value.toLocaleString() : value}`;
            },
          },
        },
        legend: {
          ...options.plugins?.legend,
          position: 'top' as const,
          align: 'end' as const,
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 20,
            font: {
              size: 12,
              weight: '500',
            },
          },
        },
      },
      animation: {
        ...options.animation,
        duration: 750,
        easing: 'easeInOutQuart' as const,
      },
    };

    // Add second y-axis for multi-axis charts
    if (multiAxis) {
      baseOptions.scales.y1 = {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: adminColors.primary[1],
        },
      };
    }

    return baseOptions;
  }, [options, multiAxis]);

  return (
    <BaseChart
      type="line"
      data={enhancedData}
      options={enhancedOptions}
      {...baseProps}
    />
  );
};

export default LineChart;