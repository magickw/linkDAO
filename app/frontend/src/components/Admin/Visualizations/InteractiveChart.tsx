import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
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
import zoomPlugin from 'chartjs-plugin-zoom';
import { BaseChartProps, InteractionConfig } from './types';
import { defaultAdminTheme, generateChartJsTheme } from './theme';

// Register Chart.js components and plugins
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
  Filler,
  zoomPlugin
);

interface InteractiveChartProps extends BaseChartProps {
  type: 'line' | 'bar' | 'scatter' | 'bubble';
  interactions: InteractionConfig;
  onDrillDown?: (dataPoint: any, breadcrumb: string[]) => void;
  onFilter?: (filters: Record<string, any>) => void;
  onCrossFilter?: (chartId: string, filters: Record<string, any>) => void;
  chartId?: string;
  breadcrumbs?: string[];
  filters?: Record<string, any>;
}

const InteractiveChart: React.FC<InteractiveChartProps> = ({
  type,
  data,
  options = {},
  interactions,
  onDrillDown,
  onFilter,
  onCrossFilter,
  chartId = 'interactive-chart',
  breadcrumbs = [],
  filters = {},
  width,
  height,
  className = '',
  onDataPointClick,
  onHover,
}) => {
  const chartRef = useRef<ChartJS>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [selectedDataPoints, setSelectedDataPoints] = useState<Set<string>>(new Set());
  const [tooltipData, setTooltipData] = useState<any>(null);

  // Enhanced chart configuration with interactive features
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
      
      // Zoom and pan configuration
      plugins: {
        ...options.plugins,
        zoom: interactions.zoom || interactions.pan ? {
          zoom: {
            wheel: {
              enabled: interactions.zoom,
            },
            pinch: {
              enabled: interactions.zoom,
            },
            mode: 'xy',
            onZoomComplete: ({ chart }: { chart: any }) => {
              setIsZoomed(chart.isZoomedOrPanned());
            },
          },
          pan: {
            enabled: interactions.pan,
            mode: 'xy',
            onPanComplete: ({ chart }: { chart: any }) => {
              setIsZoomed(chart.isZoomedOrPanned());
            },
          },
        } : undefined,
        
        // Enhanced tooltip
        tooltip: {
          ...options.plugins?.tooltip,
          enabled: interactions.tooltip.enabled,
          backgroundColor: interactions.tooltip.backgroundColor || 'rgba(255, 255, 255, 0.95)',
          titleColor: interactions.tooltip.textColor || '#374151',
          bodyColor: interactions.tooltip.textColor || '#6B7280',
          borderColor: interactions.tooltip.borderColor || '#E5E7EB',
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            ...options.plugins?.tooltip?.callbacks,
            title: (context: any) => {
              const title = context[0]?.label || '';
              return breadcrumbs.length > 0 ? `${breadcrumbs.join(' > ')} > ${title}` : title;
            },
            label: (context: any) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y || context.parsed;
              const formattedValue = interactions.tooltip.format 
                ? interactions.tooltip.format(value, label)
                : `${label}: ${typeof value === 'number' ? value.toLocaleString() : value}`;
              
              return formattedValue;
            },
            afterBody: (context: any) => {
              if (interactions.drill && breadcrumbs.length < 3) {
                return ['', 'Click to drill down'];
              }
              return [];
            },
          },
        },
      },

      // Click handler for drill-down and selection
      onClick: (event: any, elements: any[]) => {
        if (elements.length > 0) {
          const element = elements[0];
          const datasetIndex = element.datasetIndex;
          const index = element.index;
          const dataPoint = data.datasets[datasetIndex].data[index];
          const label = data.labels?.[index] || `Point ${index}`;

          // Handle drill-down
          if (interactions.drill && onDrillDown) {
            const newBreadcrumbs = [...breadcrumbs, label.toString()];
            onDrillDown(dataPoint, newBreadcrumbs);
          }

          // Handle selection for filtering
          if (interactions.filter) {
            const pointId = `${datasetIndex}-${index}`;
            const newSelection = new Set(selectedDataPoints);

            if (newSelection.has(pointId)) {
              newSelection.delete(pointId);
            } else {
              newSelection.add(pointId);
            }

            setSelectedDataPoints(newSelection);

            // Trigger filter callback
            if (onFilter) {
              const selectedPoints = Array.from(newSelection).map(id => {
                const [dsIndex, pointIndex] = id.split('-').map(Number);
                return {
                  datasetIndex: dsIndex,
                  index: pointIndex,
                  value: data.datasets[dsIndex].data[pointIndex],
                  label: data.labels?.[pointIndex],
                };
              });
              onFilter({ selectedPoints });
            }
          }

          // Handle cross-filtering
          if (interactions.crossFilter && onCrossFilter) {
            onCrossFilter(chartId, {
              datasetIndex,
              index,
              value: dataPoint,
              label,
            });
          }

          // Original click handler
          if (onDataPointClick) {
            onDataPointClick(dataPoint, index);
          }
        }
      },

      // Hover handler
      onHover: (event: any, elements: any[]) => {
        if (interactions.tooltip.enabled && elements.length > 0) {
          const element = elements[0];
          const datasetIndex = element.datasetIndex;
          const index = element.index;
          const dataPoint = data.datasets[datasetIndex].data[index];

          setTooltipData({
            dataPoint,
            index,
            datasetIndex,
            label: data.labels?.[index],
          });
        } else {
          setTooltipData(null);
        }

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
      data: enhancedData,
      options: baseOptions,
    } as ChartConfiguration;
  }, [type, data, options, interactions, breadcrumbs, selectedDataPoints, onDrillDown, onFilter, onCrossFilter, chartId, onDataPointClick, onHover]);

  // Enhanced data with selection highlighting
  const enhancedData = useMemo(() => {
    return {
      ...data,
      datasets: data.datasets.map((dataset, datasetIndex) => ({
        ...dataset,
        backgroundColor: Array.isArray(dataset.backgroundColor)
          ? dataset.backgroundColor.map((color, index) => {
              const pointId = `${datasetIndex}-${index}`;
              return selectedDataPoints.has(pointId) 
                ? `${color}FF` // Full opacity for selected
                : `${color}80`; // Semi-transparent for unselected
            })
          : dataset.backgroundColor,
        borderColor: Array.isArray(dataset.borderColor)
          ? dataset.borderColor.map((color, index) => {
              const pointId = `${datasetIndex}-${index}`;
              return selectedDataPoints.has(pointId) 
                ? color
                : `${color}80`;
            })
          : dataset.borderColor,
        pointRadius: Array.isArray(dataset.pointRadius)
          ? dataset.pointRadius.map((radius, index) => {
              const pointId = `${datasetIndex}-${index}`;
              return selectedDataPoints.has(pointId) ? (radius || 3) * 1.5 : radius;
            })
          : dataset.pointRadius,
      })),
    };
  }, [data, selectedDataPoints]);

  // Reset zoom function
  const resetZoom = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
      setIsZoomed(false);
    }
  }, []);

  // Clear selection function
  const clearSelection = useCallback(() => {
    setSelectedDataPoints(new Set());
    if (onFilter) {
      onFilter({ selectedPoints: [] });
    }
  }, [onFilter]);

  // Navigate up breadcrumb
  const navigateUp = useCallback((level: number) => {
    if (onDrillDown) {
      const newBreadcrumbs = breadcrumbs.slice(0, level);
      onDrillDown(null, newBreadcrumbs);
    }
  }, [breadcrumbs, onDrillDown]);

  const containerStyle = {
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : '400px',
    position: 'relative' as const,
  };

  return (
    <div className={`interactive-chart-container ${className}`} style={containerStyle}>
      {/* Breadcrumb Navigation */}
      {interactions.drill && breadcrumbs.length > 0 && (
        <div className="breadcrumb-nav mb-4 flex items-center space-x-2 text-sm">
          <button
            onClick={() => navigateUp(0)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Home
          </button>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              <span className="text-gray-400">›</span>
              <button
                onClick={() => navigateUp(index + 1)}
                className={`${
                  index === breadcrumbs.length - 1
                    ? 'text-gray-900 font-semibold'
                    : 'text-blue-600 hover:text-blue-800'
                }`}
              >
                {crumb}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Chart Controls */}
      <div className="chart-controls mb-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {(interactions.zoom || interactions.pan) && isZoomed && (
            <button
              onClick={resetZoom}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
            >
              Reset Zoom
            </button>
          )}
          {interactions.filter && selectedDataPoints.size > 0 && (
            <button
              onClick={clearSelection}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Clear Selection ({selectedDataPoints.size})
            </button>
          )}
        </div>
        
        <div className="flex items-center space-x-4 text-xs text-gray-500">
          {interactions.zoom && <span>Scroll to zoom</span>}
          {interactions.pan && <span>Drag to pan</span>}
          {interactions.drill && <span>Click to drill down</span>}
          {interactions.filter && <span>Click to select</span>}
        </div>
      </div>

      {/* Chart */}
      <div className="chart-wrapper" style={{ height: 'calc(100% - 60px)' }}>
        <Chart
          ref={chartRef}
          type={type}
          data={chartConfig.data}
          options={chartConfig.options}
        />
      </div>

      {/* Custom Tooltip */}
      {interactions.tooltip.enabled && tooltipData && (
        <div className="absolute pointer-events-none bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm z-10">
          <div className="font-semibold">{tooltipData.label}</div>
          <div className="text-gray-600">
            Value: {typeof tooltipData.dataPoint === 'number' 
              ? tooltipData.dataPoint.toLocaleString() 
              : tooltipData.dataPoint}
          </div>
          {interactions.drill && breadcrumbs.length < 3 && (
            <div className="text-xs text-blue-600 mt-1">Click to drill down</div>
          )}
        </div>
      )}
    </div>
  );
};

export default InteractiveChart;