import React, { useMemo } from 'react';
import BaseChart from './BaseChart';
import { BarChartProps } from './types';
import { adminColors } from './theme';

const BarChart: React.FC<BarChartProps> = ({
  data,
  options = {},
  horizontal = false,
  stacked = false,
  grouped = true,
  showValues = false,
  ...baseProps
}) => {
  // Enhanced data with bar-specific styling
  const enhancedData = useMemo(() => {
    return {
      ...data,
      datasets: data.datasets.map((dataset, index) => ({
        ...dataset,
        backgroundColor: dataset.backgroundColor || adminColors.primary[index % adminColors.primary.length],
        borderColor: dataset.borderColor || adminColors.primary[index % adminColors.primary.length],
        borderWidth: 1,
        borderRadius: horizontal ? { topRight: 4, bottomRight: 4 } : { topLeft: 4, topRight: 4 },
        borderSkipped: false,
        barThickness: grouped && data.datasets.length > 1 ? 'flex' : undefined,
        maxBarThickness: 60,
      })),
    };
  }, [data, horizontal, grouped]);

  // Enhanced options for bar charts
  const enhancedOptions = useMemo(() => {
    const indexAxis = horizontal ? 'y' : 'x';
    
    return {
      ...options,
      indexAxis: indexAxis as 'x' | 'y',
      scales: {
        ...options.scales,
        x: {
          ...options.scales?.x,
          stacked,
          grid: {
            display: !horizontal,
            color: '#E5E7EB',
            borderDash: [2, 2],
          },
          ticks: {
            maxRotation: horizontal ? 0 : 45,
            minRotation: 0,
          },
        },
        y: {
          ...options.scales?.y,
          stacked,
          grid: {
            display: horizontal,
            color: '#E5E7EB',
            borderDash: [2, 2],
          },
          beginAtZero: true,
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
          callbacks: {
            ...options.plugins?.tooltip?.callbacks,
            label: (context: any) => {
              const label = context.dataset.label || '';
              const value = context.parsed[horizontal ? 'x' : 'y'];
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
            pointStyle: 'rect',
            padding: 20,
            font: {
              size: 12,
              weight: '500',
            },
          },
        },
        datalabels: showValues ? {
          display: true,
          anchor: 'end' as const,
          align: 'top' as const,
          formatter: (value: number) => value.toLocaleString(),
          font: {
            size: 10,
            weight: '500',
          },
          color: '#6B7280',
        } : false,
      },
      animation: {
        ...options.animation,
        duration: 750,
        easing: 'easeInOutQuart' as const,
      },
      interaction: {
        intersect: false,
        mode: 'index' as const,
      },
    };
  }, [options, horizontal, stacked, showValues]);

  return (
    <BaseChart
      type="bar"
      data={enhancedData}
      options={enhancedOptions}
      {...baseProps}
    />
  );
};

export default BarChart;