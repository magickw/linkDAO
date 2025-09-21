import React, { useState, useEffect } from 'react';
import { ParticipationMetrics } from '../../types/governance';
import { governanceService } from '../../services/governanceService';

interface VotingParticipationMetricsProps {
  communityId: string;
  userAddress?: string;
  participationMetrics?: ParticipationMetrics;
  showHistoricalData?: boolean;
  className?: string;
}

interface HistoricalData {
  periods: Array<{
    period: string;
    participationRate: number;
    totalProposals: number;
    avgVotingPower: number;
  }>;
  trend: 'increasing' | 'decreasing' | 'stable';
}

const VotingParticipationMetrics: React.FC<VotingParticipationMetricsProps> = ({
  communityId,
  userAddress,
  participationMetrics,
  showHistoricalData = false,
  className = ''
}) => {
  const [metrics, setMetrics] = useState<ParticipationMetrics | null>(participationMetrics || null);
  const [historicalData, setHistoricalData] = useState<HistoricalData | null>(null);
  const [loading, setLoading] = useState(!participationMetrics);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!participationMetrics) {
      fetchParticipationMetrics();
    }
    if (showHistoricalData) {
      fetchHistoricalData();
    }
  }, [communityId, userAddress, participationMetrics, showHistoricalData]);

  const fetchParticipationMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await governanceService.getParticipationMetrics(communityId, userAddress);
      setMetrics(data);
    } catch (err) {
      setError('Failed to load participation metrics');
      console.error('Error fetching participation metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalData = async () => {
    try {
      const data = await governanceService.getHistoricalParticipation(communityId, 'month');
      setHistoricalData(data);
    } catch (err) {
      console.error('Error fetching historical data:', err);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'decreasing':
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        );
    }
  };

  const getParticipationColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getParticipationBgColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className={`animate-pulse space-y-3 ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        <div className="h-2 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <div className="text-red-600 mb-2">
          <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm text-gray-600">{error || 'Unable to load participation metrics'}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Participation Rate */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Current Participation</span>
          <div className="flex items-center space-x-1">
            <span className={`text-sm font-semibold ${getParticipationColor(metrics.currentParticipationRate)}`}>
              {metrics.currentParticipationRate.toFixed(1)}%
            </span>
            {metrics.participationTrend && getTrendIcon(metrics.participationTrend)}
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getParticipationBgColor(metrics.currentParticipationRate)}`}
            style={{ width: `${Math.min(metrics.currentParticipationRate, 100)}%` }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-gray-500">
          <span>{metrics.totalVoters.toLocaleString()} voters</span>
          <span>{metrics.eligibleVoters.toLocaleString()} eligible</span>
        </div>
      </div>

      {/* User Voting Weight */}
      {userAddress && metrics.userVotingWeight > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Your Voting Weight</span>
            <span className="text-sm font-semibold text-blue-600">
              {metrics.userVotingWeightPercentage.toFixed(3)}%
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(metrics.userVotingWeightPercentage * 10, 100)}%` }}
            />
          </div>
          
          <div className="text-xs text-gray-500">
            {metrics.userVotingWeight.toFixed(2)} voting power
          </div>
        </div>
      )}

      {/* Quorum Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Quorum Progress</span>
          <span className="text-sm font-semibold text-purple-600">
            {metrics.quorumProgress.toFixed(1)}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div 
            className={`h-1.5 rounded-full transition-all duration-300 ${
              metrics.quorumProgress >= 100 ? 'bg-green-500' : 'bg-purple-500'
            }`}
            style={{ width: `${Math.min(metrics.quorumProgress, 100)}%` }}
          />
        </div>
      </div>

      {/* Toggle Details Button */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium py-2 border-t border-gray-100"
      >
        {showDetails ? 'Hide Details' : 'Show Details'}
      </button>

      {/* Detailed Metrics */}
      {showDetails && (
        <div className="space-y-3 pt-2 border-t border-gray-100">
          {/* Historical Comparison */}
          {metrics.historicalParticipationRate && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">vs. Historical Avg</span>
              <div className="flex items-center space-x-1">
                <span className="text-sm font-medium">
                  {metrics.historicalParticipationRate.toFixed(1)}%
                </span>
                <span className={`text-xs ${
                  metrics.currentParticipationRate > metrics.historicalParticipationRate 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  ({metrics.currentParticipationRate > metrics.historicalParticipationRate ? '+' : ''}
                  {(metrics.currentParticipationRate - metrics.historicalParticipationRate).toFixed(1)}%)
                </span>
              </div>
            </div>
          )}

          {/* Average Participation */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Community Average</span>
            <span className="text-sm font-medium">{metrics.averageParticipationRate.toFixed(1)}%</span>
          </div>

          {/* Historical Data */}
          {showHistoricalData && historicalData && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Recent Trends</span>
                <div className="flex items-center space-x-1">
                  {getTrendIcon(historicalData.trend)}
                  <span className="text-xs text-gray-500 capitalize">{historicalData.trend}</span>
                </div>
              </div>
              
              <div className="space-y-1">
                {historicalData.periods.slice(-3).map((period, index) => (
                  <div key={index} className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">{period.period}</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{period.participationRate.toFixed(1)}%</span>
                      <span className="text-gray-400">({period.totalProposals} proposals)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VotingParticipationMetrics;