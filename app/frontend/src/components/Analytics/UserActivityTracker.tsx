/**
 * UserActivityTracker Component
 * Tracks user activity across all features and provides analytics dashboard
 * Implements requirements 4.7, 6.2, 6.3 from the interconnected social platform spec
 */

import React, { useEffect, useState } from 'react';
import { useWalletAuth } from '../../hooks/useWalletAuth';
import { userActivityService, UserEngagementMetrics, UserRecommendations } from '../../services/userActivityService';
import { ActivityTimeline } from './ActivityTimeline';
import { EngagementMetrics } from './EngagementMetrics';
import { ReputationDisplay } from './ReputationDisplay';
import { PersonalizedRecommendations } from './PersonalizedRecommendations';
import { CrossFeatureInsights } from './CrossFeatureInsights';

interface UserActivityTrackerProps {
  className?: string;
  showRecommendations?: boolean;
  showInsights?: boolean;
  compact?: boolean;
}

export const UserActivityTracker: React.FC<UserActivityTrackerProps> = ({
  className = '',
  showRecommendations = true,
  showInsights = true,
  compact = false
}) => {
  const { walletInfo: { address } } = useWalletAuth();
  const [engagementMetrics, setEngagementMetrics] = useState<UserEngagementMetrics | null>(null);
  const [recommendations, setRecommendations] = useState<UserRecommendations | null>(null);
  const [crossFeatureInsights, setCrossFeatureInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'reputation' | 'recommendations' | 'insights'>('overview');

  // Load user data
  useEffect(() => {
    if (address) {
      loadUserData();
    }
  }, [address]);

  // Set up activity tracking
  useEffect(() => {
    if (address) {
      // Track page view
      userActivityService.trackActivity('profile_view', 'user', address, {
        section: 'activity_tracker'
      });
    }
  }, [address]);

  const loadUserData = async () => {
    if (!address) return;

    try {
      setLoading(true);
      setError(null);

      // Load data in parallel
      const [metricsData, recommendationsData, insightsData] = await Promise.all([
        userActivityService.getUserEngagementMetrics(address),
        showRecommendations ? userActivityService.getPersonalizedRecommendations(address) : null,
        showInsights ? userActivityService.getCrossFeatureInsights(address) : null
      ]);

      setEngagementMetrics(metricsData);
      setRecommendations(recommendationsData);
      setCrossFeatureInsights(insightsData);
    } catch (err) {
      console.error('Error loading user data:', err);
      setError('Failed to load activity data');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    
    // Track tab interaction
    if (address) {
      userActivityService.trackActivity('profile_view', 'user', address, {
        section: 'activity_tracker',
        tab
      });
    }
  };

  if (!address) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>Connect your wallet to view activity tracking</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading activity data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 dark:text-red-400 mb-4">
          <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>{error}</p>
        </div>
        <button
          onClick={loadUserData}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={`user-activity-tracker ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Activity Dashboard
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Track your engagement and discover personalized insights
        </p>
      </div>

      {/* Navigation Tabs */}
      {!compact && (
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'timeline', label: 'Timeline', icon: '📅' },
              { id: 'reputation', label: 'Reputation', icon: '🏆' },
              ...(showRecommendations ? [{ id: 'recommendations', label: 'Recommendations', icon: '💡' }] : []),
              ...(showInsights ? [{ id: 'insights', label: 'Insights', icon: '🔍' }] : [])
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as typeof activeTab)}
                className={`
                  flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Content */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {(activeTab === 'overview' || compact) && engagementMetrics && (
          <div className="space-y-6">
            <EngagementMetrics 
              metrics={engagementMetrics} 
              compact={compact}
            />
            
            {!compact && recommendations && (
              <PersonalizedRecommendations 
                recommendations={recommendations}
                onRecommendationClick={(type, id) => {
                  userActivityService.trackActivity('profile_view', type as any, id, {
                    source: 'recommendations'
                  });
                }}
              />
            )}
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && !compact && (
          <ActivityTimeline 
            userAddress={address}
            onActivityClick={(activity) => {
              userActivityService.trackActivity('profile_view', activity.targetType, activity.targetId, {
                source: 'timeline'
              });
            }}
          />
        )}

        {/* Reputation Tab */}
        {activeTab === 'reputation' && !compact && (
          <ReputationDisplay 
            userAddress={address}
            onBadgeClick={(badgeId) => {
              userActivityService.trackActivity('profile_view', 'user', address, {
                section: 'badge',
                badgeId
              });
            }}
          />
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && !compact && recommendations && (
          <PersonalizedRecommendations 
            recommendations={recommendations}
            detailed={true}
            onRecommendationClick={(type, id) => {
              userActivityService.trackActivity('profile_view', type as any, id, {
                source: 'recommendations_detailed'
              });
            }}
          />
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && !compact && crossFeatureInsights && (
          <CrossFeatureInsights 
            insights={crossFeatureInsights}
            onInsightClick={(insight) => {
              userActivityService.trackActivity('profile_view', 'user', address, {
                section: 'insights',
                insight: insight.feature
              });
            }}
          />
        )}
      </div>

      {/* Quick Actions */}
      {!compact && (
        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
            Quick Actions
          </h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                userActivityService.trackActivity('profile_view', 'user', address, {
                  action: 'export_data'
                });
                // TODO: Implement data export
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Export Activity Data
            </button>
            
            <button
              onClick={() => {
                userActivityService.trackActivity('profile_view', 'user', address, {
                  action: 'privacy_settings'
                });
                // TODO: Open privacy settings
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
            >
              Privacy Settings
            </button>
            
            <button
              onClick={loadUserData}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              Refresh Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserActivityTracker;