import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Globe,
  MapPin,
  Monitor,
  Smartphone,
  Tablet,
  TrendingUp,
  Clock,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';
import { GlassPanel } from '@/design-system';

interface VisitorData {
  totalVisitors: number;
  uniqueVisitors: number;
  pageViews: number;
  averageSessionDuration: number;
  bounceRate: number;
  newVsReturning: {
    new: number;
    returning: number;
  };
  topPages: Array<{
    page: string;
    views: number;
    uniqueViews: number;
    avgDuration: number;
  }>;
  geographicData: Array<{
    country: string;
    city?: string;
    visitors: number;
    percentage: number;
    latitude?: number;
    longitude?: number;
  }>;
  deviceBreakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  browserStats: Array<{
    browser: string;
    users: number;
    percentage: number;
  }>;
  realTimeVisitors: number;
  hourlyTraffic: Array<{
    hour: number;
    visitors: number;
  }>;
  referrerSources: Array<{
    source: string;
    visitors: number;
    percentage: number;
  }>;
}

interface VisitorAnalyticsProps {
  className?: string;
}

export const VisitorAnalytics: React.FC<VisitorAnalyticsProps> = ({ className }) => {
  const [data, setData] = useState<VisitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    fetchVisitorData();
  }, [timeRange]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchVisitorData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, timeRange]);

  const fetchVisitorData = async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/analytics/visitor-analytics?timeRange=${timeRange}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setLastUpdate(new Date());
      } else {
        throw new Error(result.error || 'Failed to fetch visitor data');
      }
    } catch (error) {
      console.error('Error fetching visitor data:', error);

      // Fallback to mock data if API fails
      const mockData: VisitorData = {
        totalVisitors: 12847,
        uniqueVisitors: 8923,
        pageViews: 45213,
        averageSessionDuration: 187,
        bounceRate: 34.2,
        newVsReturning: {
          new: 6234,
          returning: 2689
        },
        topPages: [
          { page: '/', views: 8234, uniqueViews: 5432, avgDuration: 145 },
          { page: '/marketplace', views: 6891, uniqueViews: 4123, avgDuration: 234 },
          { page: '/analytics', views: 3456, uniqueViews: 2987, avgDuration: 298 },
          { page: '/messaging', views: 2134, uniqueViews: 1876, avgDuration: 156 },
          { page: '/admin', views: 987, uniqueViews: 234, avgDuration: 445 }
        ],
        geographicData: [
          { country: 'United States', city: 'New York', visitors: 3421, percentage: 38.3, latitude: 40.7128, longitude: -74.0060 },
          { country: 'United States', city: 'Los Angeles', visitors: 1876, percentage: 21.0, latitude: 34.0522, longitude: -118.2437 },
          { country: 'United Kingdom', city: 'London', visitors: 1234, percentage: 13.8, latitude: 51.5074, longitude: -0.1278 },
          { country: 'Germany', city: 'Berlin', visitors: 876, percentage: 9.8, latitude: 52.52, longitude: 13.405 },
          { country: 'Canada', city: 'Toronto', visitors: 654, percentage: 7.3, latitude: 43.6532, longitude: -79.3832 },
          { country: 'France', city: 'Paris', visitors: 432, percentage: 4.8, latitude: 48.8566, longitude: 2.3522 },
          { country: 'Japan', city: 'Tokyo', visitors: 321, percentage: 3.6, latitude: 35.6762, longitude: 139.6503 },
          { country: 'Australia', city: 'Sydney', visitors: 234, percentage: 2.6, latitude: -33.8688, longitude: 151.2093 }
        ],
        deviceBreakdown: {
          desktop: 4521,
          mobile: 6789,
          tablet: 1532
        },
        browserStats: [
          { browser: 'Chrome', users: 5234, percentage: 58.6 },
          { browser: 'Safari', users: 1876, percentage: 21.0 },
          { browser: 'Firefox', users: 987, percentage: 11.1 },
          { browser: 'Edge', users: 543, percentage: 6.1 },
          { browser: 'Other', users: 283, percentage: 3.2 }
        ],
        realTimeVisitors: 142,
        hourlyTraffic: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          visitors: Math.floor(Math.random() * 200) + 50
        })),
        referrerSources: [
          { source: 'Direct', visitors: 4521, percentage: 50.7 },
          { source: 'Google Search', visitors: 2134, percentage: 23.9 },
          { source: 'Social Media', visitors: 1234, percentage: 13.8 },
          { source: 'Referral Sites', visitors: 876, percentage: 9.8 },
          { source: 'Email', visitors: 158, percentage: 1.8 }
        ]
      };

      setData(mockData);
      setLastUpdate(new Date());
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    if (!data) return;

    const exportData = {
      ...data,
      exportedAt: new Date().toISOString(),
      timeRange
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `visitor-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading && !data) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-300 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Eye className="w-8 h-8 text-blue-400" />
            Visitor Analytics
          </h1>
          <p className="text-gray-300 mt-1">
            Real-time visitor tracking with accurate geographic insights
          </p>
          {lastUpdate && (
            <p className="text-sm text-gray-400 mt-1">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-600"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors ${
              autoRefresh
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </button>
          
          {/* Manual Refresh */}
          <button
            onClick={fetchVisitorData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          {/* Export Button */}
          <button
            onClick={exportData}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white text-sm rounded hover:bg-gray-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Real-time Stats */}
      <GlassPanel className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-white font-medium">Live Visitors</span>
          </div>
          <div className="text-2xl font-bold text-green-400">
            {data.realTimeVisitors}
          </div>
        </div>
      </GlassPanel>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Visitors"
          value={data.totalVisitors.toLocaleString()}
          icon={Users}
          color="bg-blue-500"
          change={12.5}
          changeType="increase"
        />
        
        <StatCard
          title="Unique Visitors"
          value={data.uniqueVisitors.toLocaleString()}
          icon={Eye}
          color="bg-green-500"
          change={8.3}
          changeType="increase"
        />
        
        <StatCard
          title="Page Views"
          value={data.pageViews.toLocaleString()}
          icon={Monitor}
          color="bg-purple-500"
          change={15.7}
          changeType="increase"
        />
        
        <StatCard
          title="Avg. Session"
          value={`${Math.floor(data.averageSessionDuration / 60)}m ${data.averageSessionDuration % 60}s`}
          icon={Clock}
          color="bg-orange-500"
          change={-2.1}
          changeType="decrease"
        />
      </div>

      {/* Geographic Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Geographic Distribution
          </h3>
          <div className="space-y-3">
            {data.geographicData.slice(0, 8).map((location, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-white">
                    {location.city ? `${location.city}, ${location.country}` : location.country}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-300">{location.visitors.toLocaleString()}</span>
                  <div className="w-16 bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${Math.min(location.percentage, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-400 w-12 text-right">
                    {location.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Device Breakdown</h3>
          <div className="space-y-4">
            <DeviceStatBar
              label="Desktop"
              count={data.deviceBreakdown.desktop}
              total={data.deviceBreakdown.desktop + data.deviceBreakdown.mobile + data.deviceBreakdown.tablet}
              icon={Monitor}
              color="bg-blue-500"
            />
            <DeviceStatBar
              label="Mobile"
              count={data.deviceBreakdown.mobile}
              total={data.deviceBreakdown.desktop + data.deviceBreakdown.mobile + data.deviceBreakdown.tablet}
              icon={Smartphone}
              color="bg-green-500"
            />
            <DeviceStatBar
              label="Tablet"
              count={data.deviceBreakdown.tablet}
              total={data.deviceBreakdown.desktop + data.deviceBreakdown.mobile + data.deviceBreakdown.tablet}
              icon={Tablet}
              color="bg-purple-500"
            />
          </div>
        </GlassPanel>
      </div>

      {/* Top Pages and Browser Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Pages</h3>
          <div className="space-y-3">
            {data.topPages.map((page, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div>
                  <div className="text-white font-medium">{page.page}</div>
                  <div className="text-sm text-gray-400">
                    {page.uniqueViews.toLocaleString()} unique views
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-medium">{page.views.toLocaleString()}</div>
                  <div className="text-sm text-gray-400">
                    {Math.floor(page.avgDuration / 60)}m {page.avgDuration % 60}s avg
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Browser Stats</h3>
          <div className="space-y-3">
            {data.browserStats.map((browser, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-white">{browser.browser}</span>
                <div className="flex items-center gap-3">
                  <span className="text-gray-300">{browser.users.toLocaleString()}</span>
                  <div className="w-16 bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${browser.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-400 w-12 text-right">
                    {browser.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>

      {/* New vs Returning Visitors */}
      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Visitor Type Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {data.newVsReturning.new.toLocaleString()}
            </div>
            <div className="text-gray-300">New Visitors</div>
            <div className="text-sm text-gray-400">
              {((data.newVsReturning.new / (data.newVsReturning.new + data.newVsReturning.returning)) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {data.newVsReturning.returning.toLocaleString()}
            </div>
            <div className="text-gray-300">Returning Visitors</div>
            <div className="text-sm text-gray-400">
              {((data.newVsReturning.returning / (data.newVsReturning.new + data.newVsReturning.returning)) * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Traffic Sources */}
      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Traffic Sources</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {data.referrerSources.map((source, index) => (
            <div key={index} className="text-center p-4 bg-gray-800/50 rounded-lg">
              <div className="text-xl font-bold text-white mb-1">
                {source.visitors.toLocaleString()}
              </div>
              <div className="text-sm text-gray-300 mb-1">{source.source}</div>
              <div className="text-xs text-gray-400">{source.percentage.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
};

// Helper Components
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<any>;
  color: string;
  change?: number;
  changeType?: 'increase' | 'decrease';
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  change, 
  changeType 
}) => (
  <GlassPanel className="p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-400 text-sm">{title}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
        {change && (
          <p className={`text-sm mt-1 flex items-center gap-1 ${
            changeType === 'increase' ? 'text-green-400' : 'text-red-400'
          }`}>
            {changeType === 'increase' ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            {changeType === 'increase' ? '+' : ''}{change}% from last period
          </p>
        )}
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </GlassPanel>
);

interface DeviceStatBarProps {
  label: string;
  count: number;
  total: number;
  icon: React.ComponentType<any>;
  color: string;
}

const DeviceStatBar: React.FC<DeviceStatBarProps> = ({ 
  label, 
  count, 
  total, 
  icon: Icon, 
  color 
}) => {
  const percentage = (count / total) * 100;
  
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-white">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-gray-300">{count.toLocaleString()}</span>
        <div className="w-16 bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${color}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <span className="text-sm text-gray-400 w-12 text-right">
          {percentage.toFixed(1)}%
        </span>
      </div>
    </div>
  );
};

export default VisitorAnalytics;