/**
 * AdvancedAnalytics - Comprehensive analytics and insights dashboard
 * Features: Real-time metrics, predictive analytics, marketplace insights, user behavior analysis
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, BarChart3, PieChart, Activity, Users, 
  DollarSign, Package, Clock, Star, AlertTriangle, Target, Eye,
  Calendar, Filter, Download, RefreshCw, Zap, Shield, Globe, Settings
} from 'lucide-react';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { GlassPanel } from '../../../design-system/components/GlassPanel';
import { Button } from '../../../design-system/components/Button';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

interface AnalyticsMetric {
  id: string;
  name: string;
  value: string | number;
  change: number; // Percentage change from previous period
  trend: 'up' | 'down' | 'stable';
  icon: React.ComponentType<any>;
  color: string;
  description: string;
}

interface TimeSeriesData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    fill?: boolean;
  }>;
}

interface AdvancedAnalyticsProps {
  timeRange?: '24h' | '7d' | '30d' | '90d' | '1y';
  userType?: 'admin' | 'seller' | 'buyer';
  marketplaceId?: string;
}

export const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({
  timeRange = '30d',
  userType = 'admin',
  marketplaceId
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([]);
  const [chartData, setChartData] = useState<Record<string, TimeSeriesData>>({});
  const [insights, setInsights] = useState<any[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string>('revenue');
  const [realTimeData, setRealTimeData] = useState<any>(null);

  // Mock data generation
  useEffect(() => {
    const generateMockData = () => {
      const mockMetrics: AnalyticsMetric[] = [
        {
          id: 'revenue',
          name: 'Total Revenue',
          value: '245.8 ETH',
          change: 12.5,
          trend: 'up',
          icon: DollarSign,
          color: 'green',
          description: 'Total marketplace revenue'
        },
        {
          id: 'transactions',
          name: 'Transactions',
          value: '1,247',
          change: 8.3,
          trend: 'up',
          icon: Activity,
          color: 'blue',
          description: 'Total completed transactions'
        },
        {
          id: 'users',
          name: 'Active Users',
          value: '5,892',
          change: -2.1,
          trend: 'down',
          icon: Users,
          color: 'purple',
          description: 'Monthly active users'
        },
        {
          id: 'listings',
          name: 'Active Listings',
          value: '3,456',
          change: 15.7,
          trend: 'up',
          icon: Package,
          color: 'orange',
          description: 'Current active marketplace listings'
        },
        {
          id: 'avg_order',
          name: 'Avg Order Value',
          value: '0.197 ETH',
          change: 5.2,
          trend: 'up',
          icon: Target,
          color: 'yellow',
          description: 'Average order value'
        },
        {
          id: 'satisfaction',
          name: 'Satisfaction Score',
          value: '4.7/5',
          change: 3.1,
          trend: 'up',
          icon: Star,
          color: 'pink',
          description: 'Customer satisfaction rating'
        },
        {
          id: 'disputes',
          name: 'Dispute Rate',
          value: '1.2%',
          change: -0.8,
          trend: 'down',
          icon: AlertTriangle,
          color: 'red',
          description: 'Percentage of transactions with disputes'
        },
        {
          id: 'gas_savings',
          name: 'Gas Savings',
          value: '12.4 ETH',
          change: 25.3,
          trend: 'up',
          icon: Zap,
          color: 'cyan',
          description: 'Total gas fees saved through sponsorship'
        }
      ];

      // Generate time series data
      const labels = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });

      const generateDataPoints = (base: number, variance: number) => 
        Array.from({ length: 30 }, () => base + (Math.random() - 0.5) * variance);

      const mockChartData = {
        revenue: {
          labels,
          datasets: [
            {
              label: 'Daily Revenue (ETH)',
              data: generateDataPoints(8, 4),
              borderColor: 'rgb(34, 197, 94)',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              fill: true
            }
          ]
        },
        transactions: {
          labels,
          datasets: [
            {
              label: 'Daily Transactions',
              data: generateDataPoints(42, 15),
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              fill: true
            }
          ]
        },
        users: {
          labels,
          datasets: [
            {
              label: 'Daily Active Users',
              data: generateDataPoints(195, 50),
              borderColor: 'rgb(147, 51, 234)',
              backgroundColor: 'rgba(147, 51, 234, 0.1)',
              fill: true
            }
          ]
        }
      };

      const mockInsights = [
        {
          type: 'trend',
          title: 'Revenue Growth Accelerating',
          description: 'Marketplace revenue has increased 45% over the past quarter, driven primarily by NFT and digital goods sales.',
          severity: 'positive',
          actionable: true,
          recommendations: ['Expand NFT marketplace features', 'Increase marketing for digital goods']
        },
        {
          type: 'alert',
          title: 'Gas Fee Impact on Small Transactions',
          description: 'Transactions under 0.1 ETH have decreased 12% due to high gas fees. Gas sponsorship program showing positive results.',
          severity: 'warning',
          actionable: true,
          recommendations: ['Expand gas sponsorship eligibility', 'Implement layer 2 solutions']
        },
        {
          type: 'opportunity',
          title: 'International Expansion Potential',
          description: 'European users account for 35% of traffic but only 18% of transactions. Localization could unlock growth.',
          severity: 'info',
          actionable: true,
          recommendations: ['Add European payment methods', 'Implement multi-language support']
        }
      ];

      setMetrics(mockMetrics);
      setChartData(mockChartData);
      setInsights(mockInsights);
      setLoading(false);
    };

    generateMockData();
  }, [selectedTimeRange]);

  // Real-time data simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setRealTimeData({
        activeUsers: Math.floor(Math.random() * 50) + 150,
        liveTransactions: Math.floor(Math.random() * 10) + 5,
        gasPrice: (Math.random() * 50 + 20).toFixed(1),
        networkLoad: Math.floor(Math.random() * 30) + 70
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getMetricColor = (color: string) => {
    const colors = {
      green: 'text-green-400 bg-green-400/10',
      blue: 'text-blue-400 bg-blue-400/10',
      purple: 'text-purple-400 bg-purple-400/10',
      orange: 'text-orange-400 bg-orange-400/10',
      yellow: 'text-yellow-400 bg-yellow-400/10',
      pink: 'text-pink-400 bg-pink-400/10',
      red: 'text-red-400 bg-red-400/10',
      cyan: 'text-cyan-400 bg-cyan-400/10'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getTrendIcon = (trend: string, change: number) => {
    if (trend === 'up') {
      return <TrendingUp size={16} className="text-green-400" />;
    } else if (trend === 'down') {
      return <TrendingDown size={16} className="text-red-400" />;
    }
    return <div className="w-4 h-4 bg-gray-400 rounded" />;
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)'
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)'
        }
      }
    }
  };

  if (loading) {
    return (
      <GlassPanel variant="primary" className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500/30 border-t-blue-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <BarChart3 size={32} className="mr-3 text-blue-500" />
            Advanced Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive marketplace insights and predictive analytics
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
          
          <Button variant="outline" className="flex items-center">
            <Download size={16} className="mr-2" />
            Export
          </Button>
          
          <Button variant="primary" className="flex items-center">
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Real-time Status */}
      {realTimeData && (
        <GlassPanel variant="primary" className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Activity size={20} className="mr-2 text-green-400" />
              Real-time Status
            </h3>
            <div className="flex items-center space-x-2 text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm">Live</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{realTimeData.activeUsers}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Users Online</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{realTimeData.liveTransactions}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Live Transactions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">{realTimeData.gasPrice} Gwei</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Gas Price</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">{realTimeData.networkLoad}%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Network Load</div>
            </div>
          </div>
        </GlassPanel>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => {
          const IconComponent = metric.icon;
          const colorClasses = getMetricColor(metric.color);
          
          return (
            <motion.div
              key={metric.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              className={`cursor-pointer ${selectedMetric === metric.id ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setSelectedMetric(metric.id)}
            >
              <GlassPanel variant="primary" className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${colorClasses}`}>
                    <IconComponent size={24} />
                  </div>
                  <div className="flex items-center space-x-1">
                    {getTrendIcon(metric.trend, metric.change)}
                    <span className={`text-sm font-medium ${
                      metric.trend === 'up' ? 'text-green-400' : 
                      metric.trend === 'down' ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {metric.change > 0 ? '+' : ''}{metric.change}%
                    </span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {metric.name}
                  </h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {metric.value}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {metric.description}
                  </p>
                </div>
              </GlassPanel>
            </motion.div>
          );
        })}
      </div>

      {/* Main Chart */}
      <GlassPanel variant="primary" className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {metrics.find(m => m.id === selectedMetric)?.name || 'Revenue'} Trend
          </h3>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="small">
              <Filter size={16} className="mr-2" />
              Filter
            </Button>
          </div>
        </div>
        
        <div className="h-80">
          {chartData[selectedMetric] && (
            <Line 
              data={chartData[selectedMetric]} 
              options={chartOptions}
            />
          )}
        </div>
      </GlassPanel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Insights Panel */}
        <GlassPanel variant="primary" className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <Eye size={20} className="mr-2 text-purple-500" />
            AI-Powered Insights
          </h3>
          
          <div className="space-y-4">
            {insights.map((insight, index) => {
              const severityColors = {
                positive: 'border-green-500/50 bg-green-500/10 text-green-400',
                warning: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400',
                info: 'border-blue-500/50 bg-blue-500/10 text-blue-400'
              };
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-lg border ${severityColors[insight.severity as keyof typeof severityColors]}`}
                >
                  <h4 className="font-semibold mb-2">{insight.title}</h4>
                  <p className="text-sm opacity-80 mb-3">{insight.description}</p>
                  
                  {insight.recommendations && (
                    <div>
                      <p className="text-xs font-medium mb-2">Recommendations:</p>
                      <ul className="text-xs space-y-1 opacity-70">
                        {insight.recommendations.map((rec: string, i: number) => (
                          <li key={i} className="flex items-center">
                            <div className="w-1 h-1 bg-current rounded-full mr-2" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </GlassPanel>

        {/* Performance Breakdown */}
        <GlassPanel variant="primary" className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <PieChart size={20} className="mr-2 text-orange-500" />
            Performance Breakdown
          </h3>
          
          <div className="space-y-6">
            {/* Category Performance */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Revenue by Category</h4>
              <div className="space-y-2">
                {[
                  { name: 'NFTs', value: 45, color: 'bg-purple-500' },
                  { name: 'Digital Goods', value: 28, color: 'bg-blue-500' },
                  { name: 'Physical Items', value: 18, color: 'bg-green-500' },
                  { name: 'Services', value: 9, color: 'bg-yellow-500' }
                ].map((category) => (
                  <div key={category.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded ${category.color}`} />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {category.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${category.color}`}
                          style={{ width: `${category.value}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white w-8">
                        {category.value}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Geographic Distribution */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Geographic Distribution</h4>
              <div className="space-y-2">
                {[
                  { region: 'North America', value: 42, flag: '🇺🇸' },
                  { region: 'Europe', value: 35, flag: '🇪🇺' },
                  { region: 'Asia', value: 18, flag: '🌏' },
                  { region: 'Other', value: 5, flag: '🌍' }
                ].map((region) => (
                  <div key={region.region} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{region.flag}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {region.region}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {region.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};

// Analytics Configuration Panel
export const AnalyticsConfig: React.FC = () => {
  const [alertSettings, setAlertSettings] = useState({
    revenueThreshold: 10,
    disputeRateAlert: 5,
    gasFeeSavingsGoal: 50,
    userGrowthTarget: 15
  });

  return (
    <GlassPanel variant="primary" className="p-6">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
        <Settings size={20} className="mr-2 text-gray-500" />
        Analytics Configuration
      </h3>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Revenue Drop Alert Threshold (%)
          </label>
          <input
            type="number"
            value={alertSettings.revenueThreshold}
            onChange={(e) => setAlertSettings(prev => ({ ...prev, revenueThreshold: parseInt(e.target.value) }))}
            className="w-full p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Dispute Rate Alert (%)
          </label>
          <input
            type="number"
            value={alertSettings.disputeRateAlert}
            onChange={(e) => setAlertSettings(prev => ({ ...prev, disputeRateAlert: parseInt(e.target.value) }))}
            className="w-full p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
          />
        </div>
        
        <Button variant="primary" className="w-full">
          Save Configuration
        </Button>
      </div>
    </GlassPanel>
  );
};