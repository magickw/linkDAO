import React, { useMemo } from 'react';
import BaseChart from './BaseChart';
import { DoughnutChartProps } from './types';
import { adminColors } from './theme';

const DoughnutChart: React.FC<DoughnutChartProps> = ({
  data,
  options = {},
  showLegend = true,
  showPercentages = true,
  centerText,
  centerValue,
  ...baseProps
}) => {
  // Enhanced data with doughnut-specific styling
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
        cutout: '60%', // Creates the doughnut hole
        // Add percentage data for tooltips
        percentages: dataset.data.map((value: any) => {
          const numValue = typeof value === 'number' ? value : 0;
          return totalValue > 0 ? ((numValue / totalValue) * 100).toFixed(1) : '0.0';
        }),
      })),
    };
  }, [data]);

  // Center text plugin for doughnut charts
  const centerTextPlugin = useMemo(() => {
    if (!centerText && !centerValue) return null;

    return {
      id: 'centerText',
      beforeDraw: (chart: any) => {
        const { ctx, chartArea: { top, bottom, left, right, width, height } } = chart;
        
        ctx.save();
        
        const centerX = left + width / 2;
        const centerY = top + height / 2;
        
        // Draw center text
        if (centerText) {
          ctx.font = 'bold 14px Inter, sans-serif';
          ctx.fillStyle = '#6B7280';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          const textY = centerValue ? centerY - 10 : centerY;
          ctx.fillText(centerText, centerX, textY);
        }
        
        // Draw center value
        if (centerValue) {
          ctx.font = 'bold 24px Inter, sans-serif';
          ctx.fillStyle = '#374151';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          const valueY = centerText ? centerY + 15 : centerY;
          ctx.fillText(centerValue.toString(), centerX, valueY);
        }
        
        ctx.restore();
      },
    };
  }, [centerText, centerValue]);

  // Enhanced options for doughnut charts
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
          position: 'bottom' as const,
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

  const plugins = centerTextPlugin ? [centerTextPlugin] : [];

  return (
    <BaseChart
      type="doughnut"
      data={enhancedData}
      options={enhancedOptions}
      plugins={plugins}
      {...baseProps}
    />
  );
};

export default DoughnutChart;