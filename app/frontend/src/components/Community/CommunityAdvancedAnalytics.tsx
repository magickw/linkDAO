/**
 * Community Advanced Analytics Dashboard
 * Provides comprehensive analytics, predictive insights, and custom reporting
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Users,
  MessageSquare,
  Heart,
  Activity,
  Calendar,
  Download,
  Filter,
  AlertCircle,
  Target,
  Award
} from 'lucide-react';
import { Button, GlassPanel } from '@/design-system';
import { Line, Bar } from 'react-chartjs-2';

interface AnalyticsData {
  memberGrowth: { date: string; count: number; new: number; churned: number }[];
  contentMetrics: { date: string; posts: number; comments: number; engagement: number }[];
  engagementRate: { date: string; rate: number }[];
  topContributors: { address: string; handle: string; score: number; posts: number }[];
  retentionCohorts: { cohort: string; day1: number; day7: number; day30: number }[];
  predictions: {
    memberGrowth30d: number;
    churnRisk: number;
    engagementTrend: 'up' | 'down' | 'stable';
    healthScore: number;
  };
}

interface CommunityAdvancedAnalyticsProps {
  communityId: string;
  isAdmin?: boolean;
}

export const CommunityAdvancedAnalytics: React.FC<CommunityAdvancedAnalyticsProps> = ({
  communityId,
  isAdmin = false
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'retention' | 'content' | 'predictions'>('overview');

  useEffect(() => {
    loadAnalytics();
  }, [communityId, timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/communities/${communityId}/analytics/advanced?timeRange=${timeRange}`
      );
      
      if (!response.ok) throw new Error('Failed to load analytics');
      
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => {
    if (!analytics) return null;

    const latestGrowth = analytics.memberGrowth[analytics.memberGrowth.length - 1];
    const avgEngagement = analytics.engagementRate.reduce((sum, item) => sum + item.rate, 0) / analytics.engagementRate.length;

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <GlassPanel className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Health Score</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {analytics.predictions.healthScore}/100
                </p>
              </div>
              <div className={`p-3 rounded-lg ${
                analytics.predictions.healthScore >= 80 ? 'bg-green-500/20' :
                analytics.predictions.healthScore >= 60 ? 'bg-yellow-500/20' :
                'bg-red-500/20'
              }`}>
                <Activity className={`w-6 h-6 ${
                  analytics.predictions.healthScore >= 80 ? 'text-green-400' :
                  analytics.predictions.healthScore >= 60 ? 'text-yellow-400' :
                  'text-red-400'
                }`} />
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">New Members</p>
                <p className="text-3xl font-bold text-white mt-1">
                  +{latestGrowth?.new || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {analytics.predictions.memberGrowth30d > 0 ? '+' : ''}
              {analytics.predictions.memberGrowth30d}% predicted next 30d
            </p>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Engagement Rate</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {avgEngagement.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Heart className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Trending {analytics.predictions.engagementTrend}
            </p>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Churn Risk</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {analytics.predictions.churnRisk.toFixed(1)}%
                </p>
              </div>
              <div className={`p-3 rounded-lg ${
                analytics.predictions.churnRisk < 5 ? 'bg-green-500/20' :
                analytics.predictions.churnRisk < 15 ? 'bg-yellow-500/20' :
                'bg-red-500/20'
              }`}>
                <AlertCircle className={`w-6 h-6 ${
                  analytics.predictions.churnRisk < 5 ? 'text-green-400' :
                  analytics.predictions.churnRisk < 15 ? 'text-yellow-400' :
                  'text-red-400'
                }`} />
              </div>
            </div>
          </GlassPanel>
        </div>

        {/* Member Growth Chart */}
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Member Growth Trend</h3>
          <div className="h-80">
            <Line
              data={{
                labels: analytics.memberGrowth.map(item => 
                  new Date(item.date).toLocaleDateString()
                ),
                datasets: [
                  {
                    label: 'Total Members',
                    data: analytics.memberGrowth.map(item => item.count),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y',
                  },
                  {
                    label: 'New Members',
                    data: analytics.memberGrowth.map(item => item.new),
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y1',
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                  mode: 'index',
                  intersect: false,
                },
                plugins: {
                  legend: {
                    position: 'top',
                    labels: { color: '#fff' }
                  },
                  tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                  }
                },
                scales: {
                  y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    ticks: { color: '#9ca3af' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                  },
                  y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    ticks: { color: '#9ca3af' },
                    grid: { drawOnChartArea: false }
                  },
                  x: {
                    ticks: { color: '#9ca3af' },
                    grid: { display: false }
                  }
                }
              }}
            />
          </div>
        </GlassPanel>

        {/* Top Contributors */}
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Contributors</h3>
          <div className="space-y-3">
            {analytics.topContributors.slice(0, 5).map((contributor, idx) => (
              <div key={contributor.address} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center font-bold text-white">
                    #{idx + 1}
                  </div>
                  <div>
                    <p className="font-medium text-white">{contributor.handle || contributor.address.slice(0, 10)}</p>
                    <p className="text-sm text-gray-400">{contributor.posts} posts</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <Award className="w-4 h-4 text-yellow-400" />
                    <span className="font-semibold text-white">{contributor.score}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>
    );
  };

  const renderRetention = () => {
    if (!analytics) return null;

    return (
      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Member Retention Cohorts</h3>
        <p className="text-sm text-gray-400 mb-6">
          Percentage of members still active after joining
        </p>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Cohort</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Day 1</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Day 7</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Day 30</th>
              </tr>
            </thead>
            <tbody>
              {analytics.retentionCohorts.map((cohort) => (
                <tr key={cohort.cohort} className="border-b border-white/5">
                  <td className="py-3 px-4 text-white">{cohort.cohort}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded text-sm ${
                      cohort.day1 >= 90 ? 'bg-green-500/20 text-green-400' :
                      cohort.day1 >= 70 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {cohort.day1}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded text-sm ${
                      cohort.day7 >= 70 ? 'bg-green-500/20 text-green-400' :
                      cohort.day7 >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {cohort.day7}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded text-sm ${
                      cohort.day30 >= 50 ? 'bg-green-500/20 text-green-400' :
                      cohort.day30 >= 30 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {cohort.day30}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
          <p className="text-sm text-blue-300">
            <Target className="w-4 h-4 inline mr-2" />
            <strong>Insight:</strong> Focus on improving 7-day retention to increase long-term member engagement.
          </p>
        </div>
      </GlassPanel>
    );
  };

  const renderContent = () => {
    if (!analytics) return null;

    return (
      <div className="space-y-6">
        {/* Content Activity Chart */}
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Content Activity</h3>
          <div className="h-80">
            <Bar
              data={{
                labels: analytics.contentMetrics.map(item => 
                  new Date(item.date).toLocaleDateString()
                ),
                datasets: [
                  {
                    label: 'Posts',
                    data: analytics.contentMetrics.map(item => item.posts),
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                  },
                  {
                    label: 'Comments',
                    data: analytics.contentMetrics.map(item => item.comments),
                    backgroundColor: 'rgba(139, 92, 246, 0.8)',
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                    labels: { color: '#fff' }
                  }
                },
                scales: {
                  y: {
                    ticks: { color: '#9ca3af' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                  },
                  x: {
                    ticks: { color: '#9ca3af' },
                    grid: { display: false }
                  }
                }
              }}
            />
          </div>
        </GlassPanel>

        {/* Engagement Rate */}
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Engagement Rate Trend</h3>
          <div className="h-64">
            <Line
              data={{
                labels: analytics.engagementRate.map(item => 
                  new Date(item.date).toLocaleDateString()
                ),
                datasets: [{
                  label: 'Engagement Rate (%)',
                  data: analytics.engagementRate.map(item => item.rate),
                  borderColor: 'rgb(236, 72, 153)',
                  backgroundColor: 'rgba(236, 72, 153, 0.1)',
                  fill: true,
                  tension: 0.4
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  y: {
                    ticks: { color: '#9ca3af' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                  },
                  x: {
                    ticks: { color: '#9ca3af' },
                    grid: { display: false }
                  }
                }
              }}
            />
          </div>
        </GlassPanel>
      </div>
    );
  };

  const renderPredictions = () => {
    if (!analytics) return null;

    return (
      <div className="space-y-6">
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Predictive Insights</h3>
          
          <div className="space-y-4">
            {/* Member Growth Prediction */}
            <div className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  <span className="font-medium text-white">30-Day Member Growth</span>
                </div>
                <span className={`text-2xl font-bold ${
                  analytics.predictions.memberGrowth30d > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {analytics.predictions.memberGrowth30d > 0 ? '+' : ''}
                  {analytics.predictions.memberGrowth30d}%
                </span>
              </div>
              <p className="text-sm text-gray-400">
                Based on current trends, your community is predicted to grow by {analytics.predictions.memberGrowth30d}% over the next 30 days.
              </p>
            </div>

            {/* Churn Risk Alert */}
            <div className={`p-4 rounded-lg ${
              analytics.predictions.churnRisk > 15 
                ? 'bg-red-500/20 border border-red-500/30'
                : analytics.predictions.churnRisk > 10
                ? 'bg-yellow-500/20 border border-yellow-500/30'
                : 'bg-green-500/20 border border-green-500/30'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <AlertCircle className={`w-5 h-5 ${
                    analytics.predictions.churnRisk > 15 ? 'text-red-400' :
                    analytics.predictions.churnRisk > 10 ? 'text-yellow-400' :
                    'text-green-400'
                  }`} />
                  <span className="font-medium text-white">Churn Risk Assessment</span>
                </div>
                <span className={`text-2xl font-bold ${
                  analytics.predictions.churnRisk > 15 ? 'text-red-400' :
                  analytics.predictions.churnRisk > 10 ? 'text-yellow-400' :
                  'text-green-400'
                }`}>
                  {analytics.predictions.churnRisk.toFixed(1)}%
                </span>
              </div>
              <p className="text-sm text-gray-300 mb-3">
                {analytics.predictions.churnRisk > 15
                  ? 'High risk of member churn detected. Consider engagement campaigns.'
                  : analytics.predictions.churnRisk > 10
                  ? 'Moderate churn risk. Monitor engagement levels closely.'
                  : 'Low churn risk. Community health is strong.'}
              </p>
              
              {analytics.predictions.churnRisk > 10 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-sm font-medium text-white mb-2">Recommended Actions:</p>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Increase content posting frequency</li>
                    <li>• Launch member engagement campaign</li>
                    <li>• Create exclusive events for members</li>
                    <li>• Survey members to identify pain points</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Health Score Breakdown */}
            <div className="p-4 bg-white/5 rounded-lg">
              <h4 className="font-medium text-white mb-3">Health Score Breakdown</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Member Activity</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: '85%' }} />
                    </div>
                    <span className="text-sm text-white w-12 text-right">85%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Content Quality</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: '78%' }} />
                    </div>
                    <span className="text-sm text-white w-12 text-right">78%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Growth Rate</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500" style={{ width: '92%' }} />
                    </div>
                    <span className="text-sm text-white w-12 text-right">92%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Governance Participation</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500" style={{ width: '65%' }} />
                    </div>
                    <span className="text-sm text-white w-12 text-right">65%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Advanced Analytics</h2>
          <p className="text-gray-400 mt-1">Data-driven insights for community growth</p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          
          <Button variant="secondary" size="small">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-white/10">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'retention', label: 'Retention', icon: Users },
          { id: 'content', label: 'Content', icon: MessageSquare },
          { id: 'predictions', label: 'Predictions', icon: TrendingUp },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 font-medium transition-colors flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'retention' && renderRetention()}
      {activeTab === 'content' && renderContent()}
      {activeTab === 'predictions' && renderPredictions()}
    </div>
  );
};

export default CommunityAdvancedAnalytics;
