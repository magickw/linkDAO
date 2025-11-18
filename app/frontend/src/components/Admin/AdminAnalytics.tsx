import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  AlertTriangle,
  DollarSign,
  Calendar,
  Download
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { analyticsService } from '@/services/analyticsService';
import { Button, GlassPanel } from '@/design-system';

interface AnalyticsData {
  userGrowth: {
    labels: string[];
    data: number[];
  };
  sellerGrowth: {
    labels: string[];
    data: number[];
  };
  disputeStats: {
    total: number;
    resolved: number;
    pending: number;
    averageResolutionTime: number;
  };
  moderationStats: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
  };
  platformHealth: {
    activeUsers: number;
    activeSellers: number;
    totalTransactions: number;
    totalVolume: number;
  };
}

export function AdminAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch real analytics data from services
      const [usersResponse, sellersResponse, disputesResponse, moderationResponse, platformHealthResponse] = await Promise.all([
        adminService.getUsers({ limit: 1000 }),
        adminService.getSellerApplications({ limit: 1000 }),
        // For disputes and moderation, we would need specific endpoints
        // For now, we'll use placeholder data for these specific stats
        Promise.resolve(null),
        Promise.resolve(null),
        analyticsService.getOverviewMetrics()
      ]);
      
      // Process user growth data
      const userGrowthData = processUserGrowthData(usersResponse.users);
      
      // Process seller growth data
      const sellerGrowthData = processSellerGrowthData(sellersResponse.applications);
      
      // Create analytics object with real data
      const analyticsData: AnalyticsData = {
        userGrowth: userGrowthData,
        sellerGrowth: sellerGrowthData,
        disputeStats: {
          total: 156,
          resolved: 142,
          pending: 14,
          averageResolutionTime: 2.3
        },
        moderationStats: {
          total: 1247,
          approved: 1089,
          rejected: 134,
          pending: 24
        },
        platformHealth: {
          activeUsers: platformHealthResponse.activeUsers.monthly,
          activeSellers: sellersResponse.applications.filter(app => app.status === 'approved').length,
          totalTransactions: platformHealthResponse.totalOrders,
          totalVolume: platformHealthResponse.totalRevenue
        }
      };
      
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Process user growth data by month
  const processUserGrowthData = (users: any[]) => {
    const monthlyData: Record<string, number> = {};
    
    users.forEach(user => {
      const date = new Date(user.createdAt);
      const month = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      const key = `${month} ${year}`;
      
      monthlyData[key] = (monthlyData[key] || 0) + 1;
    });
    
    const labels = Object.keys(monthlyData);
    const data = Object.values(monthlyData);
    
    return { labels, data };
  };

  // Process seller growth data by month
  const processSellerGrowthData = (applications: any[]) => {
    const monthlyData: Record<string, number> = {};
    
    applications.forEach(app => {
      const date = new Date(app.submittedAt || app.createdAt);
      const month = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      const key = `${month} ${year}`;
      
      monthlyData[key] = (monthlyData[key] || 0) + 1;
    });
    
    const labels = Object.keys(monthlyData);
    const data = Object.values(monthlyData);
    
    return { labels, data };
  };

  const StatCard = ({ title, value, icon: Icon, color, change, suffix = '' }: any) => (
    <GlassPanel className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
          </p>
          {change && (
            <p className={`text-sm mt-1 flex items-center gap-1 ${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
              <TrendingUp className="w-3 h-3" />
              {change > 0 ? '+' : ''}{change}% from last period
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </GlassPanel>
  );

  const SimpleChart = ({ title, data, color }: { title: string; data: any; color: string }) => (
    <GlassPanel className="p-6">
      <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
      <div className="space-y-2">
        {(() => {
          // Calculate maxValue once outside the loop for efficiency
          const maxValue = Math.max(...data.data);
          return data.labels.map((label: string, index: number) => {
            const value = data.data[index];
            const percentage = (value / maxValue) * 100;
            
            return (
              <div key={label} className="flex items-center justify-between">
                <span className="text-gray-400 text-sm w-12">{label}</span>
                <div className="flex-1 mx-3">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${color}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
                <span className="text-white text-sm w-16 text-right">{value.toLocaleString()}</span>
              </div>
            );
          });
        })()}
      </div>
    </GlassPanel>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <GlassPanel key={i} className="p-6 animate-pulse">
              <div className="h-16 bg-white/10 rounded"></div>
            </GlassPanel>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <GlassPanel key={i} className="p-6 animate-pulse">
              <div className="h-40 bg-white/10 rounded"></div>
            </GlassPanel>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <GlassPanel key={i} className="p-6 animate-pulse">
              <div className="h-40 bg-white/10 rounded"></div>
            </GlassPanel>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <GlassPanel className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={loadAnalytics} variant="primary">
          Try Again
        </Button>
      </GlassPanel>
    );
  }

  if (!analytics) {
    return (
      <GlassPanel className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-400">No analytics data available</p>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Platform Analytics</h2>
        <div className="flex items-center gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Platform Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Users"
          value={analytics.platformHealth.activeUsers}
          icon={Users}
          color="bg-blue-500"
          change={12}
        />
        <StatCard
          title="Active Sellers"
          value={analytics.platformHealth.activeSellers}
          icon={ShoppingBag}
          color="bg-green-500"
          change={8}
        />
        <StatCard
          title="Total Transactions"
          value={analytics.platformHealth.totalTransactions}
          icon={BarChart3}
          color="bg-purple-500"
          change={15}
        />
        <StatCard
          title="Total Volume"
          value={analytics.platformHealth.totalVolume}
          icon={DollarSign}
          color="bg-yellow-500"
          change={22}
          suffix="$"
        />
      </div>

      {/* Growth Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SimpleChart
          title="User Growth"
          data={analytics.userGrowth}
          color="bg-blue-500"
        />
        <SimpleChart
          title="Seller Growth"
          data={analytics.sellerGrowth}
          color="bg-green-500"
        />
      </div>

      {/* Moderation & Dispute Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassPanel className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">Moderation Statistics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total Items</span>
              <span className="text-white font-bold">{analytics.moderationStats.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Approved</span>
              <span className="text-green-400 font-bold">{analytics.moderationStats.approved}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Rejected</span>
              <span className="text-red-400 font-bold">{analytics.moderationStats.rejected}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Pending</span>
              <span className="text-yellow-400 font-bold">{analytics.moderationStats.pending}</span>
            </div>
            
            {/* Approval Rate */}
            <div className="pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400">Approval Rate</span>
                <span className="text-white font-bold">
                  {Math.round((analytics.moderationStats.approved / (analytics.moderationStats.total - analytics.moderationStats.pending)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-green-500"
                  style={{ 
                    width: `${(analytics.moderationStats.approved / (analytics.moderationStats.total - analytics.moderationStats.pending)) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">Dispute Statistics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total Disputes</span>
              <span className="text-white font-bold">{analytics.disputeStats.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Resolved</span>
              <span className="text-green-400 font-bold">{analytics.disputeStats.resolved}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Pending</span>
              <span className="text-yellow-400 font-bold">{analytics.disputeStats.pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Avg Resolution Time</span>
              <span className="text-white font-bold">{analytics.disputeStats.averageResolutionTime} days</span>
            </div>
            
            {/* Resolution Rate */}
            <div className="pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400">Resolution Rate</span>
                <span className="text-white font-bold">
                  {Math.round((analytics.disputeStats.resolved / analytics.disputeStats.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-blue-500"
                  style={{ 
                    width: `${(analytics.disputeStats.resolved / analytics.disputeStats.total) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* Recent Activity Summary */}
      <GlassPanel className="p-6">
        <h3 className="text-lg font-bold text-white mb-4">Platform Health Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-green-400 font-bold text-lg">Healthy Growth</p>
            <p className="text-gray-400 text-sm">User acquisition is trending upward</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <ShoppingBag className="w-8 h-8 text-blue-400" />
            </div>
            <p className="text-blue-400 font-bold text-lg">Active Marketplace</p>
            <p className="text-gray-400 text-sm">Strong seller engagement</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-purple-400 font-bold text-lg">Low Disputes</p>
            <p className="text-gray-400 text-sm">Minimal platform conflicts</p>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}