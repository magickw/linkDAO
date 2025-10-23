import React, { useState, useMemo } from 'react';
import { 
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon
} from '@heroicons/react/24/outline';
import HeatmapChart from '@/components/Admin/Visualizations/HeatmapChart';
import { HeatmapData } from '@/components/Admin/Visualizations/types';

interface CohortHeatmapData {
  cohortPeriod: string;
  cohortSize: number;
  retentionRates: number[];
  periods: string[];
}

interface CohortHeatmapProps {
  data: CohortHeatmapData[];
  cohortType: 'daily' | 'weekly' | 'monthly';
  className?: string;
  onCellClick?: (cohort: string, period: number, rate: number) => void;
}

export const CohortHeatmap: React.FC<CohortHeatmapProps> = ({
  data,
  cohortType,
  className = '',
  onCellClick
}) => {
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{
    cohort: string;
    period: number;
    rate: number;
  } | null>(null);

  // Transform data for heatmap chart
  const heatmapData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const heatmapPoints: HeatmapData[] = [];
    
    data.forEach((cohort, cohortIndex) => {
      cohort.retentionRates.forEach((rate, periodIndex) => {
        if (rate !== null && rate !== undefined) {
          heatmapPoints.push({
            x: cohortIndex,
            y: periodIndex,
            value: rate,
            label: `${cohort.cohortPeriod} - Period ${periodIndex + 1}`,
            cohort: cohort.cohortPeriod,
            period: periodIndex,
            size: cohort.cohortSize
          });
        }
      });
    });
    
    return heatmapPoints;
  }, [data]);

  // Generate cohort labels for x-axis
  const cohortLabels = useMemo(() => {
    return data.map(cohort => cohort.cohortPeriod);
  }, [data]);

  // Generate period labels for y-axis
  const maxPeriods = useMemo(() => {
    return Math.max(...data.map(cohort => cohort.retentionRates.length));
  }, [data]);

  const periodLabels = useMemo(() => {
    return Array.from({ length: maxPeriods }, (_, i) => `Period ${i + 1}`);
  }, [maxPeriods]);

  // Calculate the maximum number of periods across all cohorts
  const maxPeriodsCount = useMemo(() => {
    return Math.max(...data.map(cohort => cohort.retentionRates.length));
  }, [data]);

  // Generate period headers
  const periodHeaders = useMemo(() => {
    const headers = [];
    for (let i = 0; i < maxPeriodsCount; i++) {
      headers.push(`Period ${i + 1}`);
    }
    return headers;
  }, [maxPeriodsCount]);

  // Color scale for retention rates
  const getRetentionColor = (rate: number): string => {
    if (rate >= 80) return 'bg-green-600';
    if (rate >= 60) return 'bg-green-500';
    if (rate >= 40) return 'bg-yellow-500';
    if (rate >= 20) return 'bg-orange-500';
    if (rate > 0) return 'bg-red-500';
    return 'bg-gray-200';
  };

  const getRetentionTextColor = (rate: number): string => {
    if (rate >= 40) return 'text-white';
    return 'text-gray-800';
  };

  // Calculate trend for each cohort
  const getCohortTrend = (retentionRates: number[]): 'up' | 'down' | 'stable' => {
    if (retentionRates.length < 3) return 'stable';
    
    const firstThird = retentionRates.slice(0, Math.floor(retentionRates.length / 3));
    const lastThird = retentionRates.slice(-Math.floor(retentionRates.length / 3));
    
    const avgFirst = firstThird.reduce((sum, rate) => sum + rate, 0) / firstThird.length;
    const avgLast = lastThird.reduce((sum, rate) => sum + rate, 0) / lastThird.length;
    
    const difference = avgLast - avgFirst;
    
    if (Math.abs(difference) < 2) return 'stable';
    return difference > 0 ? 'up' : 'down';
  };

  const handleCellClick = (cohort: string, period: number, rate: number) => {
    if (onCellClick) {
      onCellClick(cohort, period, rate);
    }
  };

  const handleCellHover = (cohort: string, period: number, rate: number) => {
    setHoveredCell({ cohort, period, rate });
  };

  const formatCohortPeriod = (period: string): string => {
    if (cohortType === 'monthly') {
      const [year, month] = period.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    }
    return period;
  };

  const getCohortSizeColor = (size: number): string => {
    const maxSize = Math.max(...data.map(c => c.cohortSize));
    const ratio = size / maxSize;
    
    if (ratio >= 0.8) return 'text-blue-600 font-bold';
    if (ratio >= 0.6) return 'text-blue-500 font-semibold';
    if (ratio >= 0.4) return 'text-blue-400';
    return 'text-gray-600';
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <CalendarIcon className="w-6 h-6 mr-2 text-blue-600" />
              Cohort Retention Heatmap
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {cohortType.charAt(0).toUpperCase() + cohortType.slice(1)} cohort retention rates over time
            </p>
          </div>
          
          {/* Legend */}
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <div className="text-gray-600 mb-2">Retention Rate</div>
              <div className="flex items-center space-x-1">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-xs">0-20%</span>
                <div className="w-4 h-4 bg-orange-500 rounded ml-2"></div>
                <span className="text-xs">20-40%</span>
                <div className="w-4 h-4 bg-yellow-500 rounded ml-2"></div>
                <span className="text-xs">40-60%</span>
                <div className="w-4 h-4 bg-green-500 rounded ml-2"></div>
                <span className="text-xs">60-80%</span>
                <div className="w-4 h-4 bg-green-600 rounded ml-2"></div>
                <span className="text-xs">80%+</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* D3 Heatmap Visualization */}
      <div className="p-6">
        <div className="h-96 mb-8">
          <HeatmapChart
            data={heatmapData}
            width={800}
            height={350}
            showTooltip={true}
            onCellClick={(d) => {
              if (onCellClick && d.cohort && d.period !== undefined) {
                onCellClick(d.cohort, d.period, d.value);
              }
            }}
          />
        </div>
      </div>

      {/* Traditional Table View */}
      <div className="p-6 border-t border-gray-200">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Detailed Retention Data</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cohort
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trend
                </th>
                {periodHeaders.map((header, index) => (
                  <th
                    key={index}
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-16"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((cohort, cohortIndex) => {
                const trend = getCohortTrend(cohort.retentionRates);
                
                return (
                  <tr
                    key={cohort.cohortPeriod}
                    className={`hover:bg-gray-50 ${
                      selectedCohort === cohort.cohortPeriod ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedCohort(
                      selectedCohort === cohort.cohortPeriod ? null : cohort.cohortPeriod
                    )}
                  >
                    {/* Cohort Period */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCohortPeriod(cohort.cohortPeriod)}
                    </td>
                    
                    {/* Cohort Size */}
                    <td className={`px-4 py-3 whitespace-nowrap text-sm ${getCohortSizeColor(cohort.cohortSize)}`}>
                      {cohort.cohortSize.toLocaleString()}
                    </td>
                    
                    {/* Trend */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {trend === 'up' && (
                        <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />
                      )}
                      {trend === 'down' && (
                        <ArrowTrendingDownIcon className="w-5 h-5 text-red-500" />
                      )}
                      {trend === 'stable' && (
                        <MinusIcon className="w-5 h-5 text-gray-500" />
                      )}
                    </td>
                    
                    {/* Retention Rates */}
                    {cohort.retentionRates.map((rate, periodIndex) => (
                      <td
                        key={periodIndex}
                        className={`px-2 py-3 text-center text-xs font-medium cursor-pointer ${
                          getRetentionTextColor(rate)
                        } ${getRetentionColor(rate)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCellClick(cohort.cohortPeriod, periodIndex, rate);
                        }}
                        onMouseEnter={() => handleCellHover(cohort.cohortPeriod, periodIndex, rate)}
                      >
                        {rate > 0 ? `${rate.toFixed(0)}%` : '-'}
                      </td>
                    ))}
                    
                    {/* Fill empty cells if needed */}
                    {Array.from({ length: maxPeriodsCount - cohort.retentionRates.length }).map((_, index) => (
                      <td key={`empty-${index}`} className="px-2 py-3 text-center text-xs text-gray-400">
                        -
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CohortHeatmap;