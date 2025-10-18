import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ScatterChart,
  Scatter
} from 'recharts';
import { SellerGrowthProjection, ProjectionData, SuccessFactor, ImprovementRecommendation } from '../../../types/sellerPerformance';
import { sellerPerformanceService } from '../../../services/sellerPerformanceService';

interface SellerGrowthProjectionWidgetProps {
  walletAddress: string;
  className?: string;
}

export const SellerGrowthProjectionWidget: React.FC<SellerGrowthProjectionWidgetProps> = ({
  walletAddress,
  className = ''
}) => {
  const [projections, setProjections] = useState<SellerGrowthProjection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'projections' | 'factors' | 'recommendations'>('projections');
  const [selectedProjection, setSelectedProjection] = useState<'revenue' | 'orders' | 'customerBase' | 'marketShare'>('revenue');

  useEffect(() => {
    loadProjections();
  }, [walletAddress]);

  const loadProjections = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let data = await sellerPerformanceService.getSellerGrowthProjections(walletAddress);
      
      // If no projections exist, generate them
      if (!data) {
        data = await sellerPerformanceService.generateSellerGrowthProjections(walletAddress);
      }
      
      setProjections(data);
    } catch (err) {
      console.error('Error loading seller growth projections:', err);
      setError('Failed to load seller growth projections');
    } finally {
      setLoading(false);
    }
  };

  const getTrajectoryIcon = (trajectory: string) => {
    switch (trajectory) {
      case 'exponential': return '🚀';
      case 'linear': return '📈';
      case 'logarithmic': return '📊';
      case 'declining': return '📉';
      default: return '📈';
    }
  };

  const getTrajectoryColor = (trajectory: string) => {
    switch (trajectory) {
      case 'exponential': return 'text-green-600';
      case 'linear': return 'text-blue-600';
      case 'logarithmic': return 'text-yellow-600';
      case 'declining': return 'text-red-600';
      default: return 'text-blue-600';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-blue-600';
    if (confidence >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBackground = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-50 border-green-200';
    if (confidence >= 60) return 'bg-blue-50 border-blue-200';
    if (confidence >= 40) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'strong': return 'text-green-600';
      case 'moderate': return 'text-yellow-600';
      case 'weak': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBackground = (status: string) => {
    switch (status) {
      case 'strong': return 'bg-green-100';
      case 'moderate': return 'bg-yellow-100';
      case 'weak': return 'bg-red-100';
      default: return 'bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '🟢';
      case 'moderate': return '🟡';
      case 'hard': return '🔴';
      default: return '⚪';
    }
  };

  const formatProjectionValue = (type: string, value: number) => {
    switch (type) {
      case 'revenue':
        return sellerPerformanceService.formatCurrency(value);
      case 'orders':
        return Math.round(value).toLocaleString();
      case 'customerBase':
        return Math.round(value).toLocaleString();
      case 'marketShare':
        return sellerPerformanceService.formatPercentage(value);
      default:
        return value.toLocaleString();
    }
  };

  const prepareProjectionChart = (projection: ProjectionData) => {
    const data = [];
    const monthlyGrowthRate = Math.pow(projection.projectedValue / projection.currentValue, 1 / projection.projectionPeriodMonths) - 1;
    
    // Add current value as starting point
    data.push({
      month: 0,
      value: projection.currentValue,
      type: 'current'
    });

    // Add milestones
    projection.milestones.forEach(milestone => {
      data.push({
        month: milestone.month,
        value: milestone.projectedValue,
        type: 'milestone',
        probability: milestone.probability
      });
    });

    // Add final projection
    data.push({
      month: projection.projectionPeriodMonths,
      value: projection.projectedValue,
      type: 'projected'
    });

    return data;
  };

  const prepareSuccessFactorsChart = () => {
    if (!projections?.successFactors) return [];

    return projections.successFactors.map(factor => ({
      factor: factor.factor.substring(0, 15) + (factor.factor.length > 15 ? '...' : ''),
      impact: factor.impact,
      status: factor.currentStatus,
      category: factor.category
    }));
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadProjections}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!projections) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center text-gray-500">
          No growth projection data available
        </div>
      </div>
    );
  }

  const currentProjection = projections.projections[selectedProjection];

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Seller Growth Projections</h3>
            <p className="text-sm text-gray-500 mt-1">
              AI-powered growth forecasting • Model v{projections.modelVersion}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`text-right p-3 rounded-lg border-2 ${getConfidenceBackground(projections.confidenceLevel)}`}>
              <div className={`text-2xl font-bold ${getConfidenceColor(projections.confidenceLevel)}`}>
                {projections.confidenceLevel}%
              </div>
              <div className="text-xs text-gray-600">Confidence</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { key: 'projections', label: 'Projections' },
            { key: 'factors', label: 'Success Factors' },
            { key: 'recommendations', label: 'Recommendations' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'projections' && (
          <div className="space-y-6">
            {/* Projection Type Selector */}
            <div className="flex space-x-2 bg-gray-100 rounded-lg p-1">
              {[
                { key: 'revenue', label: 'Revenue' },
                { key: 'orders', label: 'Orders' },
                { key: 'customerBase', label: 'Customers' },
                { key: 'marketShare', label: 'Market Share' }
              ].map((type) => (
                <button
                  key={type.key}
                  onClick={() => setSelectedProjection(type.key as any)}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    selectedProjection === type.key
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            {/* Current Projection Details */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">Current Value</p>
                    <p className="text-lg font-bold text-blue-600">
                      {formatProjectionValue(selectedProjection, currentProjection.currentValue)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-900">Projected Value</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatProjectionValue(selectedProjection, currentProjection.projectedValue)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-900">Growth Rate</p>
                    <p className="text-lg font-bold text-purple-600">
                      {currentProjection.growthRate > 0 ? '+' : ''}{sellerPerformanceService.formatPercentage(currentProjection.growthRate)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-900">Trajectory</p>
                    <div className="flex items-center space-x-1">
                      <span className="text-lg">{getTrajectoryIcon(currentProjection.trajectory)}</span>
                      <span className={`text-sm font-medium ${getTrajectoryColor(currentProjection.trajectory)} capitalize`}>
                        {currentProjection.trajectory}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Projection Chart */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-4">
                {selectedProjection.charAt(0).toUpperCase() + selectedProjection.slice(1)} Projection ({currentProjection.projectionPeriodMonths} months)
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={prepareProjectionChart(currentProjection)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Months', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => formatProjectionValue(selectedProjection, value)}
                    />
                    <Tooltip 
                      formatter={(value, name) => [
                        formatProjectionValue(selectedProjection, value as number),
                        'Value'
                      ]}
                      labelFormatter={(label) => `Month ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
                      activeDot={{ r: 8, stroke: '#3B82F6', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Milestones */}
            {currentProjection.milestones.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-4">Key Milestones</h4>
                <div className="space-y-3">
                  {currentProjection.milestones.map((milestone, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="text-sm font-medium text-gray-900">
                              Month {milestone.month}
                            </div>
                            <div className="text-sm font-semibold text-blue-600">
                              {formatProjectionValue(selectedProjection, milestone.projectedValue)}
                            </div>
                            <div className={`text-xs px-2 py-1 rounded-full ${getConfidenceBackground(milestone.probability * 100)}`}>
                              {Math.round(milestone.probability * 100)}% probability
                            </div>
                          </div>
                          <div className="mt-2">
                            <p className="text-xs text-gray-600">Key factors:</p>
                            <ul className="text-xs text-gray-500 mt-1">
                              {milestone.keyFactors.slice(0, 2).map((factor, i) => (
                                <li key={i}>• {factor}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'factors' && (
          <div className="space-y-6">
            {/* Success Factors Chart */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-4">Success Factor Impact Analysis</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prepareSuccessFactorsChart()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="factor" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="impact" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Success Factors List */}
            <div className="space-y-4">
              {projections.successFactors.map((factor, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h5 className="text-sm font-medium text-gray-900">{factor.factor}</h5>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBackground(factor.currentStatus)} ${getStatusColor(factor.currentStatus)}`}>
                          {factor.currentStatus}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {factor.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{factor.description}</p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-lg font-semibold text-blue-600">
                        {factor.impact}%
                      </div>
                      <div className="text-xs text-gray-500">Impact</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="space-y-4">
            {projections.improvementRecommendations.length > 0 ? (
              projections.improvementRecommendations.map((rec, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h5 className="text-sm font-medium text-gray-900">{rec.area}</h5>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                          {rec.priority} priority
                        </span>
                        <span className="flex items-center space-x-1 text-xs text-gray-500">
                          <span>{getDifficultyIcon(rec.difficulty)}</span>
                          <span>{rec.difficulty}</span>
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 mb-2">{rec.recommendation}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Expected Impact: +{rec.expectedImpact}%</span>
                        <span>Timeframe: {rec.timeframe}</span>
                      </div>
                    </div>
                  </div>
                  
                  {rec.resources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-700 mb-1">Required Resources:</p>
                      <div className="flex flex-wrap gap-1">
                        {rec.resources.map((resource, i) => (
                          <span key={i} className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                            {resource}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">
                <div className="text-green-500 text-2xl mb-2">✅</div>
                <p>No specific improvement recommendations</p>
                <p className="text-sm mt-1">Current growth trajectory looks strong!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Generated: {new Date(projections.createdAt).toLocaleDateString()} • 
            Confidence: {projections.confidenceLevel}% • 
            Model: v{projections.modelVersion}
          </div>
          <button
            onClick={loadProjections}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Regenerate Projections
          </button>
        </div>
      </div>
    </div>
  );
};