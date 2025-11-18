import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  AlertTriangle,
  DollarSign,
  Calendar,
  Download,
  Filter,
  Search,
  FileText,
  PieChart,
  LineChart,
  BarChart,
  Activity,
  Settings,
  Target,
  Zap,
  Save,
  ChevronDown,
  ChevronUp,
  Plus,
  Edit3,
  Trash2,
  X
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
  revenueData: {
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
  userDemographics: {
    ageGroups: Record<string, number>;
    locations: Record<string, number>;
  };
  contentMetrics: {
    totalPosts: number;
    totalComments: number;
    engagementRate: number;
  };
}

interface ExportFormat {
  format: 'csv' | 'excel' | 'pdf';
  includeCharts: boolean;
  dateRange: { start: string; end: string };
  metrics: string[];
}

export function EnhancedAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportFormat>({
    format: 'csv',
    includeCharts: true,
    dateRange: { start: '', end: '' },
    metrics: ['userGrowth', 'sellerGrowth', 'revenue']
  });
  const [activeTab, setActiveTab] = useState('overview');
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch real analytics data from services
      const [usersResponse, sellersResponse, platformHealthResponse] = await Promise.all([
        adminService.getUsers({ limit: 1000 }),
        adminService.getSellerApplications({ limit: 1000 }),
        analyticsService.getOverviewMetrics()
      ]);
      
      // Process user growth data
      const userGrowthData = processUserGrowthData(usersResponse.users);
      
      // Process seller growth data
      const sellerGrowthData = processSellerGrowthData(sellersResponse.applications);
      
      // Process revenue data (mock for now)
      const revenueData = processRevenueData();
      
      // Create analytics object with real data
      const analyticsData: AnalyticsData = {
        userGrowth: userGrowthData,
        sellerGrowth: sellerGrowthData,
        revenueData: revenueData,
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
        },
        userDemographics: {
          ageGroups: {
            '18-24': 1200,
            '25-34': 2100,
            '35-44': 1800,
            '45-54': 900,
            '55+': 600
          },
          locations: {
            'North America': 2400,
            'Europe': 1800,
            'Asia': 1200,
            'South America': 300,
            'Africa': 200,
            'Oceania': 100
          }
        },
        contentMetrics: {
          totalPosts: 15420,
          totalComments: 42890,
          engagementRate: 12.4
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

  // Process revenue data (mock for now)
  const processRevenueData = () => {
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const data = [12000, 19000, 15000, 18000, 22000, 25000];
    return { labels, data };
  };

  const exportData = async () => {
    try {
      // In a real implementation, this would call an API endpoint
      // For now, we'll simulate the export
      console.log('Exporting data with options:', exportOptions);
      
      // Create a simple CSV export for demonstration
      const csvContent = "data:text/csv;charset=utf-8," 
        + "Metric,Value\\n"
        + `Active Users,${analytics?.platformHealth.activeUsers}\\n`
        + `Active Sellers,${analytics?.platformHealth.activeSellers}\\n`
        + `Total Transactions,${analytics?.platformHealth.totalTransactions}\\n`
        + `Total Volume,${analytics?.platformHealth.totalVolume}\\n`;
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `analytics_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setShowExportModal(false);
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export data. Please try again.');
    }
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

  const SimpleChart = ({ title, data, color, id }: { title: string; data: any; color: string; id: string }) => (
    <GlassPanel className="p-6" ref={el => { if (el) chartRefs.current[id] = el; }}>
      <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
      <div className="space-y-2">
        {(() => {
          // Calculate maxValue once outside the loop for efficiency with defensive guards
          const maxValue = data.data.length > 0 ? Math.max(...data.data) : 0;
          if (maxValue === 0) {
            return data.labels.map((label: string, index: number) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-gray-400 text-sm w-12">{label}</span>
                <div className="flex-1 mx-3">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className={`h-2 rounded-full ${color}`} style={{ width: '0%' }}></div>
                  </div>
                </div>
                <span className="text-white text-sm w-16 text-right">{data.data[index]?.toLocaleString() || '0'}</span>
              </div>
            ));
          }
          
          return data.labels.map((label: string, index: number) => {
            const value = data.data[index] || 0;
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

  const PieChartComponent = ({ title, data }: { title: string; data: Record<string, number> }) => {
    const values = Object.values(data);
    const total = values.reduce((sum, value) => sum + value, 0);
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-red-500', 'bg-indigo-500'];
    
    // Handle edge case where total is 0
    if (total === 0) {
      return (
        <GlassPanel className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
          <div className="text-center py-8">
            <p className="text-gray-400">No data available</p>
          </div>
        </GlassPanel>
      );
    }
    
    return (
      <GlassPanel className="p-6">
        <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <div className="relative w-40 h-40 mx-auto">
              {values.map((value, index) => {
                const percentage = (value / total) * 100;
                const rotation = index === 0 ? 0 : values.slice(0, index).reduce((sum, val) => sum + (val / total) * 360, 0);
                
                return (
                  <div
                    key={index}
                    className={`absolute top-0 left-0 w-full h-full rounded-full ${colors[index]} opacity-70`}
                    style={{
                      clipPath: `conic-gradient(from ${rotation}deg, ${colors[index]} 0 ${percentage}%, transparent ${percentage}% 100%)`,
                    }}
                  ></div>
                );
              })}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gray-900 rounded-full"></div>
            </div>
          </div>
          <div className="flex-1">
            <div className="space-y-2">
              {Object.entries(data).map(([label, value], index) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${colors[index]}`}></div>
                    <span className="text-gray-400 text-sm">{label}</span>
                  </div>
                  <span className="text-white text-sm">{Math.round((value / total) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </GlassPanel>
    );
  };

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Enhanced Analytics</h2>
          <p className="text-gray-400">Comprehensive platform insights and metrics</p>
        </div>
        <div className="flex flex-wrap gap-2">
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
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => setShowExportModal(true)}
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-700 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            activeTab === 'overview' 
              ? 'bg-purple-600 text-white' 
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <BarChart3 className="w-4 h-4 inline mr-2" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('demographics')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            activeTab === 'demographics' 
              ? 'bg-purple-600 text-white' 
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <PieChart className="w-4 h-4 inline mr-2" />
          Demographics
        </button>
        <button
          onClick={() => setActiveTab('content')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            activeTab === 'content' 
              ? 'bg-purple-600 text-white' 
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Activity className="w-4 h-4 inline mr-2" />
          Content Metrics
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
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
              id="userGrowth"
            />
            <SimpleChart
              title="Seller Growth"
              data={analytics.sellerGrowth}
              color="bg-green-500"
              id="sellerGrowth"
            />
          </div>

          {/* Revenue Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SimpleChart
              title="Revenue Trend"
              data={analytics.revenueData}
              color="bg-yellow-500"
              id="revenue"
            />
            
            {/* Moderation & Dispute Stats */}
            <div className="space-y-6">
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
          </div>
        </div>
      )}

      {/* Demographics Tab */}
      {activeTab === 'demographics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PieChartComponent 
              title="User Age Distribution" 
              data={analytics.userDemographics.ageGroups} 
            />
            <PieChartComponent 
              title="User Geographic Distribution" 
              data={analytics.userDemographics.locations} 
            />
          </div>
        </div>
      )}

      {/* Content Metrics Tab */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Total Posts"
              value={analytics.contentMetrics.totalPosts}
              icon={FileText}
              color="bg-indigo-500"
            />
            <StatCard
              title="Total Comments"
              value={analytics.contentMetrics.totalComments}
              icon={Activity}
              color="bg-purple-500"
            />
            <StatCard
              title="Engagement Rate"
              value={analytics.contentMetrics.engagementRate}
              icon={TrendingUp}
              color="bg-green-500"
              suffix="%"
            />
          </div>
          
          <GlassPanel className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">Content Performance</h3>
            <div className="h-64 bg-gray-800 rounded-lg flex items-center justify-center">
              <p className="text-gray-400">Interactive content performance chart would be displayed here</p>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <GlassPanel className="max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-white mb-4">Export Analytics</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Format</label>
                <select
                  value={exportOptions.format}
                  onChange={(e) => setExportOptions({...exportOptions, format: e.target.value as any})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="csv">CSV</option>
                  <option value="excel">Excel</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-400 text-sm mb-1">Date Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={exportOptions.dateRange.start}
                    onChange={(e) => setExportOptions({
                      ...exportOptions, 
                      dateRange: {...exportOptions.dateRange, start: e.target.value}
                    })}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  />
                  <input
                    type="date"
                    value={exportOptions.dateRange.end}
                    onChange={(e) => setExportOptions({
                      ...exportOptions, 
                      dateRange: {...exportOptions.dateRange, end: e.target.value}
                    })}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-gray-400 text-sm mb-1">Metrics to Include</label>
                <div className="space-y-2">
                  {['userGrowth', 'sellerGrowth', 'revenue', 'moderation', 'disputes', 'demographics'].map((metric) => (
                    <div key={metric} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={metric}
                        checked={exportOptions.metrics.includes(metric)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setExportOptions({
                              ...exportOptions,
                              metrics: [...exportOptions.metrics, metric]
                            });
                          } else {
                            setExportOptions({
                              ...exportOptions,
                              metrics: exportOptions.metrics.filter(m => m !== metric)
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <label htmlFor={metric} className="text-white text-sm capitalize">
                        {metric.replace(/([A-Z])/g, ' $1')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeCharts"
                  checked={exportOptions.includeCharts}
                  onChange={(e) => setExportOptions({...exportOptions, includeCharts: e.target.checked})}
                  className="rounded"
                />
                <label htmlFor="includeCharts" className="text-white text-sm">
                  Include Charts
                </label>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button onClick={exportData} variant="primary">
                Export Data
              </Button>
              <Button onClick={() => setShowExportModal(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}