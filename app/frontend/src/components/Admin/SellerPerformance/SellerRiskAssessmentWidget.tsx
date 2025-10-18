import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { SellerRiskProfile, RiskFactor } from '../../../types/sellerPerformance';
import { sellerPerformanceService } from '../../../services/sellerPerformanceService';

interface SellerRiskAssessmentWidgetProps {
  walletAddress: string;
  className?: string;
}

export const SellerRiskAssessmentWidget: React.FC<SellerRiskAssessmentWidgetProps> = ({
  walletAddress,
  className = ''
}) => {
  const [riskProfile, setRiskProfile] = useState<SellerRiskProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'factors' | 'mitigation'>('overview');
  const [riskTrend, setRiskTrend] = useState<{
    currentRisk: number;
    previousRisk: number;
    trend: 'improving' | 'stable' | 'deteriorating';
    changePercent: number;
  } | null>(null);

  useEffect(() => {
    loadRiskAssessment();
  }, [walletAddress]);

  const loadRiskAssessment = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let data = await sellerPerformanceService.getSellerRiskAssessment(walletAddress);
      
      // If no assessment exists, create one
      if (!data) {
        data = await sellerPerformanceService.assessSellerRisk(walletAddress);
      }
      
      setRiskProfile(data);

      // Load risk trend
      const trend = await sellerPerformanceService.getSellerRiskTrend(walletAddress);
      setRiskTrend(trend);
    } catch (err) {
      console.error('Error loading seller risk assessment:', err);
      setError('Failed to load seller risk assessment');
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelBadge = (level: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800 border-green-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      critical: 'bg-red-100 text-red-800 border-red-300'
    };

    const icons = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴'
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${colors[level as keyof typeof colors] || colors.medium}`}>
        <span className="mr-1">{icons[level as keyof typeof icons] || '⚪'}</span>
        {level.charAt(0).toUpperCase() + level.slice(1)} Risk
      </span>
    );
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600';
    if (score >= 60) return 'text-orange-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getRiskScoreBackground = (score: number) => {
    if (score >= 80) return 'bg-red-50 border-red-200';
    if (score >= 60) return 'bg-orange-50 border-orange-200';
    if (score >= 40) return 'bg-yellow-50 border-yellow-200';
    return 'bg-green-50 border-green-200';
  };

  const getSeverityColor = (severity: string) => {
    return sellerPerformanceService.getSeverityColor(severity);
  };

  const prepareRiskDimensionsData = () => {
    if (!riskProfile) return [];

    return [
      {
        dimension: 'Financial Risk',
        score: riskProfile.riskDimensions.financialRisk,
        color: '#EF4444'
      },
      {
        dimension: 'Operational Risk',
        score: riskProfile.riskDimensions.operationalRisk,
        color: '#F59E0B'
      },
      {
        dimension: 'Reputation Risk',
        score: riskProfile.riskDimensions.reputationRisk,
        color: '#8B5CF6'
      },
      {
        dimension: 'Compliance Risk',
        score: riskProfile.riskDimensions.complianceRisk,
        color: '#06B6D4'
      }
    ];
  };

  const prepareRiskFactorsData = () => {
    if (!riskProfile?.riskFactors) return [];

    return riskProfile.riskFactors.map(factor => ({
      factor: factor.factor.replace(/_/g, ' '),
      impact: factor.impact,
      severity: factor.severity,
      category: factor.category
    }));
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'deteriorating': return '📉';
      case 'stable': return '➡️';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-600';
      case 'deteriorating': return 'text-red-600';
      case 'stable': return 'text-gray-600';
      default: return 'text-gray-600';
    }
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
            onClick={loadRiskAssessment}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!riskProfile) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center text-gray-500">
          No risk assessment data available
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Seller Risk Assessment</h3>
            <p className="text-sm text-gray-500 mt-1">
              Last assessed: {new Date(riskProfile.lastAssessedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {riskTrend && (
              <div className="text-right">
                <div className={`flex items-center space-x-1 ${getTrendColor(riskTrend.trend)}`}>
                  <span>{getTrendIcon(riskTrend.trend)}</span>
                  <span className="text-sm font-medium">
                    {riskTrend.changePercent > 0 ? '+' : ''}{riskTrend.changePercent.toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-gray-500">vs previous</div>
              </div>
            )}
            {getRiskLevelBadge(riskProfile.riskLevel)}
            <div className={`text-right p-3 rounded-lg border-2 ${getRiskScoreBackground(riskProfile.overallRiskScore)}`}>
              <div className={`text-2xl font-bold ${getRiskScoreColor(riskProfile.overallRiskScore)}`}>
                {sellerPerformanceService.formatScore(riskProfile.overallRiskScore)}
              </div>
              <div className="text-xs text-gray-600">Risk Score</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'factors', label: 'Risk Factors' },
            { key: 'mitigation', label: 'Mitigation' }
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
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Risk Dimensions Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-4">Risk Dimensions</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={prepareRiskDimensionsData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="score"
                      >
                        {prepareRiskDimensionsData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}%`, 'Risk Score']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-4">Risk Breakdown</h4>
                <div className="space-y-4">
                  {Object.entries(riskProfile.riskDimensions).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className={`text-sm font-semibold ${getRiskScoreColor(value)}`}>
                            {sellerPerformanceService.formatScore(value)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              value >= 80 ? 'bg-red-500' :
                              value >= 60 ? 'bg-orange-500' :
                              value >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(100, value)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Risk Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Risk Assessment Summary</h4>
              <p className="text-sm text-gray-600">
                This seller has a <strong>{riskProfile.riskLevel}</strong> risk level with an overall risk score of{' '}
                <strong>{sellerPerformanceService.formatScore(riskProfile.overallRiskScore)}</strong>.
                {riskProfile.riskFactors.length > 0 && (
                  <> There are <strong>{riskProfile.riskFactors.length}</strong> identified risk factors that require attention.</>
                )}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'factors' && (
          <div className="space-y-6">
            {riskProfile.riskFactors.length > 0 ? (
              <>
                {/* Risk Factors Chart */}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={prepareRiskFactorsData()}>
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
                      <Bar dataKey="impact" fill="#EF4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Risk Factors List */}
                <div className="space-y-4">
                  {riskProfile.riskFactors.map((factor, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h5 className="text-sm font-medium text-gray-900 capitalize">
                              {factor.factor.replace(/_/g, ' ')}
                            </h5>
                            <span 
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                              style={{ 
                                backgroundColor: `${getSeverityColor(factor.severity)}20`,
                                color: getSeverityColor(factor.severity)
                              }}
                            >
                              {factor.severity}
                            </span>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {factor.category}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{factor.description}</p>
                        </div>
                        <div className="text-right ml-4">
                          <div className={`text-lg font-semibold ${getRiskScoreColor(factor.impact)}`}>
                            {factor.impact}%
                          </div>
                          <div className="text-xs text-gray-500">Impact</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <div className="text-green-500 text-2xl mb-2">✅</div>
                <p>No significant risk factors identified</p>
                <p className="text-sm mt-1">This seller shows low risk across all categories</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'mitigation' && (
          <div className="space-y-4">
            {riskProfile.mitigationRecommendations.length > 0 ? (
              riskProfile.mitigationRecommendations.map((recommendation, index) => (
                <div key={index} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-orange-600 text-sm font-medium">{index + 1}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-orange-800">{recommendation}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">
                <div className="text-green-500 text-2xl mb-2">✅</div>
                <p>No specific mitigation recommendations needed</p>
                <p className="text-sm mt-1">Current risk levels are within acceptable ranges</p>
              </div>
            )}

            {/* General Risk Management Tips */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-3">General Risk Management Best Practices</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Maintain consistent communication with customers</li>
                <li>• Keep accurate product descriptions and inventory</li>
                <li>• Respond promptly to customer inquiries and disputes</li>
                <li>• Complete profile verification and maintain good standing</li>
                <li>• Monitor performance metrics regularly</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Assessment ID: {riskProfile.id} • AI Risk Engine v2.0
          </div>
          <button
            onClick={loadRiskAssessment}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Refresh Assessment
          </button>
        </div>
      </div>
    </div>
  );
};