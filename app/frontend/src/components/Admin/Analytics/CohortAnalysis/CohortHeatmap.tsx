import React, { useState, useMemo } from 'react';
import { 
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon
} from '@heroicons/react/24/outline';

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

  // Calculate the maximum number of periods across all cohorts
  const maxPeriods = useMemo(() => {
    return Math.max(...data.map(cohort => cohort.retentionRates.length));
  }, [data]);

  // Generate period headers
  const periodHeaders = useMemo(() => {
    const headers = [];
    for (let i = 0; i < maxPeriods; i++) {
      headers.push(`Period ${i + 1}`);
    }
    return headers;
  }, [maxPeriods]);

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

      {/* Heatmap */}
      <div className="p-6">
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
                        <MinusIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </td>
                    
                    {/* Retention Rate Cells */}
                    {Array.from({ length: maxPeriods }, (_, periodIndex) => {
                      const rate = cohort.retentionRates[periodIndex];
                      const hasData = rate !== undefined;
                      
                      return (
                        <td
                          key={periodIndex}
                          className="px-2 py-3 text-center cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (hasData) {
                              handleCellClick(cohort.cohortPeriod, periodIndex, rate);
                            }
                          }}
                          onMouseEnter={() => {
                            if (hasData) {
                              handleCellHover(cohort.cohortPeriod, periodIndex, rate);
                            }
                          }}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          {hasData ? (
                            <div
                              className={`
                                w-12 h-8 rounded flex items-center justify-center text-xs font-medium
                                ${getRetentionColor(rate)} ${getRetentionTextColor(rate)}
                                hover:scale-110 transition-transform duration-200
                              `}
                            >
                              {rate.toFixed(0)}%
                            </div>
                          ) : (
                            <div className="w-12 h-8 bg-gray-100 rounded flex items-center justify-center">
                              <span className="text-gray-400 text-xs">-</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Tooltip */}
        {hoveredCell && (
          <div className="fixed z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg pointer-events-none">
            <div className="font-medium">
              {formatCohortPeriod(hoveredCell.cohort)}
            </div>
            <div>
              Period {hoveredCell.period + 1}: {hoveredCell.rate.toFixed(1)}% retention
            </div>
          </div>
        )}

        {/* Selected Cohort Details */}
        {selectedCohort && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">
              Cohort Details: {formatCohortPeriod(selectedCohort)}
            </h4>
            
            {(() => {
              const cohort = data.find(c => c.cohortPeriod === selectedCohort);
              if (!cohort) return null;
              
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-blue-600 font-medium">Cohort Size</div>
                    <div className="text-blue-900 font-semibold">
                      {cohort.cohortSize.toLocaleString()} users
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-blue-600 font-medium">First Period Retention</div>
                    <div className="text-blue-900 font-semibold">
                      {cohort.retentionRates[0]?.toFixed(1) || 'N/A'}%
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-blue-600 font-medium">Latest Retention</div>
                    <div className="text-blue-900 font-semibold">
                      {cohort.retentionRates[cohort.retentionRates.length - 1]?.toFixed(1) || 'N/A'}%
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-blue-600 font-medium">Trend</div>
                    <div className="text-blue-900 font-semibold flex items-center">
                      {(() => {
                        const trend = getCohortTrend(cohort.retentionRates);
                        return (
                          <>
                            {trend === 'up' && <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />}
                            {trend === 'down' && <ArrowTrendingDownIcon className="w-4 h-4 text-red-500 mr-1" />}
                            {trend === 'stable' && <MinusIcon className="w-4 h-4 text-gray-400 mr-1" />}
                            {trend.charAt(0).toUpperCase() + trend.slice(1)}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default CohortHeatmap;