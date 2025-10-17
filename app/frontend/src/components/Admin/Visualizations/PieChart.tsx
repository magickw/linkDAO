import React, { useMemo } from 'react';
import BaseChart from './BaseChart';
import { PieChartProps } from './types';
import { adminColors } from './theme';

const PieChart: React.FC<PieChartProps> = ({
  data,
  options = {},
  showLegend = true,
  showPercentages = true,
  innerRadius = 0,
  outerRadius,
  ...baseProps
}) => {
  // Enhanced data with pie-specific styling
  const enhancedData = useMemo(() => {
    const totalValue = data.datasets[0]?.data?.reduce((sum: number, value: any) => {
      return sum + (typeof value === 'number' ? value : 0);
    }, 0) || 0;

    return {
      ...data,
      datasets: data.datasets.map((dataset, datasetIndex) => ({
        ...dataset,
        backgroundColor: dataset.backgroundColor || adminColors.primary,
        borderColor: dataset.borderColor || '#ffffff',
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverOffset: 8,
        // Add percentage data for tooltips
        percentages: dataset.data.map((value: any) => {
          const numValue = typeof value === 'number' ? value : 0;
          return totalValue > 0 ? ((numValue / totalValue) * 100).toFixed(1) : '0.0';
        }),
      })),
    };
  }, [data]);

  // Enhanced options for pie charts
  const enhancedOptions = useMemo(() => {
    return {
      ...options,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        ...options.plugins,
        legend: {
          ...options.plugins?.legend,
          display: showLegend,
          position: 'right' as const,
          align: 'center' as const,
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 15,
            font: {
              size: 12,
              weight: '500',
            },
            generateLabels: (chart: any) => {
              const data = chart.data;
              if (data.labels.length && data.datasets.length) {
                return data.labels.map((label: string, i: number) => {
                  const dataset = data.datasets[0];
                  const value = dataset.data[i];
                  const percentage = dataset.percentages?.[i] || '0.0';
                  
                  return {
                    text: showPercentages ? `${label} (${percentage}%)` : label,
                    fillStyle: dataset.backgroundColor[i],
                    strokeStyle: dataset.borderColor,
                    lineWidth: dataset.borderWidth,
                    hidden: false,
                    index: i,
                  };
                });
              }
              return [];
            },
          },
        },
        tooltip: {
          ...options.plugins?.tooltip,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          titleColor: '#374151',
          bodyColor: '#6B7280',
          borderColor: '#E5E7EB',
          borderWidth: 1,
          cornerRadius: 8,
          callbacks: {
            ...options.plugins?.tooltip?.callbacks,
            label: (context: any) => {
              const label = context.label || '';
              const value = context.parsed;
              const percentage = context.dataset.percentages?.[context.dataIndex] || '0.0';
              return `${label}: ${value.toLocaleString()} (${percentage}%)`;
            },
          },
        },
      },
      animation: {
        ...options.animation,
        animateRotate: true,
        animateScale: true,
        duration: 1000,
        easing: 'easeInOutQuart' as const,
      },
      interaction: {
        intersect: true,
      },
      elements: {
        arc: {
          borderAlign: 'inner' as const,
        },
      },
    };
  }, [options, showLegend, showPercentages]);

  return (
    <BaseChart
      type="pie"
      data={enhancedData}
      options={enhancedOptions}
      {...baseProps}
    />
  );
};

export default PieChart;