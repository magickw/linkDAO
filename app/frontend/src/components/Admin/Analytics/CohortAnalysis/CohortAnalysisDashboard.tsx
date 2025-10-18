import React, { useState, useEffect } from 'react';
import { 
  CalendarIcon, 
  ArrowPathIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import CohortHeatmap from './CohortHeatmap';
import CohortComparisonComponent from './CohortComparison';
import { useCohortAnalytics } from '../../../../hooks/useCohortAnalytics';

interface CohortAnalysisDashboardProps {
  className?: string;
}

export const CohortAnalysisDashboard: React.FC<CohortAnalysisDashboardProps> = ({
  className = ''
}) => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year ago
    endDate: new Date().toISOString().split('T')[0]
  });
  
  const [cohortType, setCohortType] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [retentionPeriods, setRetentionPeriods] = useState(12);
  const [activeTab, setActiveTab] = useState<'overview' | 'heatmap' | 'comparison' | 'trends'>('overview');
  const [comparisonCohorts, setComparisonCohorts] = useState<{
    cohortA: string | null;
    cohortB: string | null;
  }>({
    cohortA: null,
    cohortB: null
  });

  const {
    cohortAnalysis,
    cohortComparison,
    heatmapData,
    retentionTrends,
    churnAnalysis,
    isLoading,
    error,
    refetch
  } = useCohortAnalytics({
    startDate: new Date(dateRange.startDate),
    endDate: new Date(dateRange.endDate),
    cohortType,
    retentionPeriods,
    comparisonCohorts: comparisonCohorts.cohortA && comparisonCohorts.cohortB ? 
      { 
        cohortA: comparisonCohorts.cohortA, 
        cohortB: comparisonCohorts.cohortB 
      } : 
      undefined
  });

  const handleDateRangeChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleCohortSelect = (cohortPeriod: string, position: 'A' | 'B') => {
    setComparisonCohorts(prev => ({
      ...prev,
      [`cohort${position}`]: cohortPeriod
    }));
    
    if (position === 'B' && comparisonCohorts.cohortA) {
      setActiveTab('comparison');
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'heatmap', name: 'Retention Heatmap', icon: CalendarIcon },
    { id: 'comparison', name: 'Cohort Comparison', icon: UsersIcon },
    { id: 'trends', name: 'Trends & Churn', icon: ArrowTrendingUpIcon }
  ];

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="text-center text-red-600">
          <p>Error loading cohort analytics: {error}</p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Cohort Analysis</h2>
            <p className="text-gray-600 mt-1">
              Analyze user retention patterns and lifecycle behavior
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mt-4 lg:mt-0">
            {/* Cohort Type Selector */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Cohort Type:</label>
              <select
                value={cohortType}
                onChange={(e) => setCohortType(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {/* Retention Periods */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Periods:</label>
              <select
                value={retentionPeriods}
                onChange={(e) => setRetentionPeriods(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value={6}>6 Periods</option>
                <option value={12}>12 Periods</option>
                <option value={18}>18 Periods</option>
                <option value={24}>24 Periods</option>
              </select>
            </div>
            
            {/* Date Range */}
            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {cohortAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <UsersIcon className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Cohorts</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {cohortAnalysis.cohorts.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <ArrowTrendingUpIcon className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Overall Retention</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {cohortAnalysis.overallRetentionRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Cohort Size</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {Math.round(cohortAnalysis.averageCohortSize).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <ArrowTrendingDownIcon className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Churn Rate</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {cohortAnalysis.churnAnalysis.overallChurnRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading cohort analysis...</span>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && cohortAnalysis && (
                <div className="space-y-6">
                  {/* Best and Worst Performing Cohorts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-green-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-green-900 mb-4">
                        Best Performing Cohort
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-green-700">Period:</span>
                          <span className="font-medium text-green-900">
                            {cohortAnalysis.bestPerformingCohort.cohortPeriod}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700">Size:</span>
                          <span className="font-medium text-green-900">
                            {cohortAnalysis.bestPerformingCohort.cohortSize.toLocaleString()} users
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700">Retention:</span>
                          <span className="font-medium text-green-900">
                            {cohortAnalysis.bestPerformingCohort.retentionRates[1]?.toFixed(1) || 'N/A'}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700">Churn Rate:</span>
                          <span className="font-medium text-green-900">
                            {cohortAnalysis.bestPerformingCohort.churnRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-red-900 mb-4">
                        Worst Performing Cohort
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-red-700">Period:</span>
                          <span className="font-medium text-red-900">
                            {cohortAnalysis.worstPerformingCohort.cohortPeriod}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-700">Size:</span>
                          <span className="font-medium text-red-900">
                            {cohortAnalysis.worstPerformingCohort.cohortSize.toLocaleString()} users
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-700">Retention:</span>
                          <span className="font-medium text-red-900">
                            {cohortAnalysis.worstPerformingCohort.retentionRates[1]?.toFixed(1) || 'N/A'}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-700">Churn Rate:</span>
                          <span className="font-medium text-red-900">
                            {cohortAnalysis.worstPerformingCohort.churnRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Retention Trends */}
                  {retentionTrends && (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Retention Trends
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {retentionTrends.slice(0, 6).map((trend, index) => (
                          <div key={index} className="bg-white rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-600">
                                {trend.period}
                              </span>
                              <div className="flex items-center">
                                {trend.trend === 'up' && (
                                  <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                                )}
                                {trend.trend === 'down' && (
                                  <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
                                )}
                                {trend.trend === 'stable' && (
                                  <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
                                )}
                              </div>
                            </div>
                            <div className="text-2xl font-bold text-gray-900">
                              {trend.retentionRate.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-500">
                              {trend.cohortCount} cohorts
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'heatmap' && heatmapData && (
                <CohortHeatmap
                  data={heatmapData}
                  cohortType={cohortType}
                  onCellClick={(cohort, period, rate) => {
                    console.log('Cell clicked:', { cohort, period, rate });
                  }}
                />
              )}

              {activeTab === 'comparison' && (
                <div className="space-y-6">
                  {/* Cohort Selection */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Select Cohorts to Compare
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cohort A
                        </label>
                        <select
                          value={comparisonCohorts.cohortA || ''}
                          onChange={(e) => handleCohortSelect(e.target.value, 'A')}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="">Select a cohort...</option>
                          {cohortAnalysis?.cohorts.map(cohort => (
                            <option key={cohort.cohortPeriod} value={cohort.cohortPeriod}>
                              {cohort.cohortPeriod} ({cohort.cohortSize.toLocaleString()} users)
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cohort B
                        </label>
                        <select
                          value={comparisonCohorts.cohortB || ''}
                          onChange={(e) => handleCohortSelect(e.target.value, 'B')}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="">Select a cohort...</option>
                          {cohortAnalysis?.cohorts.map(cohort => (
                            <option key={cohort.cohortPeriod} value={cohort.cohortPeriod}>
                              {cohort.cohortPeriod} ({cohort.cohortSize.toLocaleString()} users)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Comparison Results */}
                  {cohortComparison && (
                    <CohortComparisonComponent
                      comparison={cohortComparison}
                      cohortType={cohortType}
                      onSwapCohorts={() => {
                        setComparisonCohorts(prev => ({
                          cohortA: prev.cohortB,
                          cohortB: prev.cohortA
                        }));
                      }}
                    />
                  )}
                </div>
              )}

              {activeTab === 'trends' && churnAnalysis && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Churn Analysis */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Churn Analysis
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="bg-red-50 rounded-lg p-4">
                          <div className="text-sm text-red-600 font-medium">Overall Churn Rate</div>
                          <div className="text-3xl font-bold text-red-900">
                            {churnAnalysis.overallChurnRate.toFixed(1)}%
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Top Churn Reasons</h4>
                          <div className="space-y-2">
                            {churnAnalysis.churnReasons.slice(0, 3).map((reason, index) => (
                              <div key={index} className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">{reason.reason}</span>
                                <span className="text-sm font-medium text-gray-900">
                                  {reason.percentage}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Risk Factors */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Churn Risk Factors
                      </h3>
                      
                      <div className="space-y-3">
                        {churnAnalysis.riskFactors.map((factor, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">{factor.factor}</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-red-500 h-2 rounded-full"
                                  style={{ width: `${factor.impact * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {(factor.impact * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CohortAnalysisDashboard;