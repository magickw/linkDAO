import React, { useState } from 'react';
import { 
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CohortData {
  cohortPeriod: string;
  cohortSize: number;
  retentionRates: number[];
  periods: string[];
  userIds: string[];
  averageLifetimeValue: number;
  churnRate: number;
}

interface CohortComparison {
  cohortA: CohortData;
  cohortB: CohortData;
  retentionDifference: number[];
  statisticalSignificance: boolean;
  insights: string[];
}

interface CohortComparisonProps {
  comparison: CohortComparison;
  cohortType: 'daily' | 'weekly' | 'monthly';
  className?: string;
  onSwapCohorts?: () => void;
}

export const CohortComparisonComponent: React.FC<CohortComparisonProps> = ({
  comparison,
  cohortType,
  className = '',
  onSwapCohorts
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'retention' | 'insights'>('overview');

  const { cohortA, cohortB, retentionDifference, statisticalSignificance, insights } = comparison;

  // Prepare data for retention chart
  const chartData = React.useMemo(() => {
    const maxPeriods = Math.max(cohortA.retentionRates.length, cohortB.retentionRates.length);
    const data = [];

    for (let i = 0; i < maxPeriods; i++) {
      data.push({
        period: `Period ${i + 1}`,
        cohortA: cohortA.retentionRates[i] || null,
        cohortB: cohortB.retentionRates[i] || null,
        difference: retentionDifference[i] || null
      });
    }

    return data;
  }, [cohortA.retentionRates, cohortB.retentionRates, retentionDifference]);

  const formatCohortPeriod = (period: string): string => {
    if (cohortType === 'monthly') {
      const [year, month] = period.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    }
    return period;
  };

  const getPerformanceWinner = (): 'A' | 'B' | 'tie' => {
    const avgRetentionA = cohortA.retentionRates.reduce((sum, rate) => sum + rate, 0) / cohortA.retentionRates.length;
    const avgRetentionB = cohortB.retentionRates.reduce((sum, rate) => sum + rate, 0) / cohortB.retentionRates.length;
    
    const difference = Math.abs(avgRetentionA - avgRetentionB);
    if (difference < 2) return 'tie';
    
    return avgRetentionA > avgRetentionB ? 'A' : 'B';
  };

  const winner = getPerformanceWinner();

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ArrowsRightLeftIcon },
    { id: 'retention', name: 'Retention Chart', icon: CheckCircleIcon },
    { id: 'insights', name: 'Insights', icon: LightBulbIcon }
  ];

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <ArrowsRightLeftIcon className="w-6 h-6 mr-2 text-blue-600" />
              Cohort Comparison
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Comparing {formatCohortPeriod(cohortA.cohortPeriod)} vs {formatCohortPeriod(cohortB.cohortPeriod)}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Statistical Significance Indicator */}
            <div className="flex items-center space-x-2">
              {statisticalSignificance ? (
                <CheckCircleIcon className="w-5 h-5 text-green-500" />
              ) : (
                <XCircleIcon className="w-5 h-5 text-red-500" />
              )}
              <span className="text-sm text-gray-600">
                {statisticalSignificance ? 'Statistically Significant' : 'Not Significant'}
              </span>
            </div>
            
            {onSwapCohorts && (
              <button
                onClick={onSwapCohorts}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Swap Cohorts
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
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

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Winner Banner */}
            {winner !== 'tie' && (
              <div className={`p-4 rounded-lg ${
                winner === 'A' ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className="flex items-center">
                  <CheckCircleIcon className={`w-6 h-6 mr-2 ${
                    winner === 'A' ? 'text-green-600' : 'text-blue-600'
                  }`} />
                  <span className={`font-medium ${
                    winner === 'A' ? 'text-green-900' : 'text-blue-900'
                  }`}>
                    Cohort {winner} ({formatCohortPeriod(winner === 'A' ? cohortA.cohortPeriod : cohortB.cohortPeriod)}) 
                    performs better overall
                  </span>
                </div>
              </div>
            )}

            {/* Comparison Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cohort A */}
              <div className="bg-green-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-green-900 mb-4">
                  Cohort A: {formatCohortPeriod(cohortA.cohortPeriod)}
                </h4>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-green-600 font-medium">Cohort Size</div>
                      <div className="text-2xl font-bold text-green-900">
                        {cohortA.cohortSize.toLocaleString()}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-green-600 font-medium">Avg LTV</div>
                      <div className="text-2xl font-bold text-green-900">
                        ${cohortA.averageLifetimeValue.toFixed(0)}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-green-600 font-medium">Churn Rate</div>
                      <div className="text-2xl font-bold text-green-900">
                        {cohortA.churnRate.toFixed(1)}%
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-green-600 font-medium">First Period Retention</div>
                      <div className="text-2xl font-bold text-green-900">
                        {cohortA.retentionRates[0]?.toFixed(1) || 'N/A'}%
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-green-600 font-medium mb-2">Retention Trend</div>
                    <div className="flex space-x-1">
                      {cohortA.retentionRates.slice(0, 6).map((rate, index) => (
                        <div
                          key={index}
                          className="flex-1 bg-green-200 rounded h-8 flex items-center justify-center text-xs font-medium text-green-800"
                          style={{ opacity: 0.5 + (rate / 100) * 0.5 }}
                        >
                          {rate.toFixed(0)}%
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cohort B */}
              <div className="bg-blue-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-blue-900 mb-4">
                  Cohort B: {formatCohortPeriod(cohortB.cohortPeriod)}
                </h4>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-blue-600 font-medium">Cohort Size</div>
                      <div className="text-2xl font-bold text-blue-900">
                        {cohortB.cohortSize.toLocaleString()}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-blue-600 font-medium">Avg LTV</div>
                      <div className="text-2xl font-bold text-blue-900">
                        ${cohortB.averageLifetimeValue.toFixed(0)}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-blue-600 font-medium">Churn Rate</div>
                      <div className="text-2xl font-bold text-blue-900">
                        {cohortB.churnRate.toFixed(1)}%
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-blue-600 font-medium">First Period Retention</div>
                      <div className="text-2xl font-bold text-blue-900">
                        {cohortB.retentionRates[0]?.toFixed(1) || 'N/A'}%
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-blue-600 font-medium mb-2">Retention Trend</div>
                    <div className="flex space-x-1">
                      {cohortB.retentionRates.slice(0, 6).map((rate, index) => (
                        <div
                          key={index}
                          className="flex-1 bg-blue-200 rounded h-8 flex items-center justify-center text-xs font-medium text-blue-800"
                          style={{ opacity: 0.5 + (rate / 100) * 0.5 }}
                        >
                          {rate.toFixed(0)}%
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Differences */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Key Differences</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Size Difference</div>
                  <div className={`text-2xl font-bold ${
                    cohortA.cohortSize > cohortB.cohortSize ? 'text-green-600' : 'text-blue-600'
                  }`}>
                    {Math.abs(cohortA.cohortSize - cohortB.cohortSize).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {cohortA.cohortSize > cohortB.cohortSize ? 'A is larger' : 'B is larger'}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">LTV Difference</div>
                  <div className={`text-2xl font-bold ${
                    cohortA.averageLifetimeValue > cohortB.averageLifetimeValue ? 'text-green-600' : 'text-blue-600'
                  }`}>
                    ${Math.abs(cohortA.averageLifetimeValue - cohortB.averageLifetimeValue).toFixed(0)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {cohortA.averageLifetimeValue > cohortB.averageLifetimeValue ? 'A is higher' : 'B is higher'}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Churn Difference</div>
                  <div className={`text-2xl font-bold ${
                    cohortA.churnRate < cohortB.churnRate ? 'text-green-600' : 'text-blue-600'
                  }`}>
                    {Math.abs(cohortA.churnRate - cohortB.churnRate).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {cohortA.churnRate < cohortB.churnRate ? 'A is lower' : 'B is lower'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'retention' && (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Retention Rate Comparison</h4>
            
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis 
                    label={{ value: 'Retention Rate (%)', angle: -90, position: 'insideLeft' }}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      value ? `${value.toFixed(1)}%` : 'N/A',
                      name === 'cohortA' ? `Cohort A (${formatCohortPeriod(cohortA.cohortPeriod)})` :
                      name === 'cohortB' ? `Cohort B (${formatCohortPeriod(cohortB.cohortPeriod)})` :
                      'Difference'
                    ]}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="cohortA" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    name="Cohort A"
                    connectNulls={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cohortB" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    name="Cohort B"
                    connectNulls={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="difference" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Difference (A - B)"
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <LightBulbIcon className="w-6 h-6 mr-2 text-yellow-500" />
              Analysis Insights
            </h4>
            
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div key={index} className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-yellow-600 text-sm font-medium">{index + 1}</span>
                  </div>
                  <p className="text-yellow-800">{insight}</p>
                </div>
              ))}
              
              {insights.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <LightBulbIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No specific insights available for this comparison.</p>
                  <p className="text-sm mt-2">
                    Try comparing cohorts with more significant differences or larger sample sizes.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CohortComparisonComponent;