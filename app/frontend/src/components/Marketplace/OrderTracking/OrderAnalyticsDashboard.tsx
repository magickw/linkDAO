/**
 * OrderAnalyticsDashboard - Comprehensive analytics dashboard for order tracking
 * Features: Real-time metrics, trend analysis, performance insights
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  Users,
  DollarSign,
  Package,
  Clock,
  Star,
  AlertTriangle,
  Target,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Zap,
  Truck,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Line, Bar, Pie } from 'react-chartjs-2';
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
import { useAccount } from 'wagmi';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import { useToast } from '@/context/ToastContext';
import { orderService } from '@/services/orderService';
import { OrderAnalytics } from '@/types/orderAnalytics';
import { useWebSocketContext } from '@/contexts/WebSocketContext';

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

interface OrderAnalyticsDashboardProps {
  className?: string;
  userType?: 'buyer' | 'seller';
}

export const OrderAnalyticsDashboard: React.FC<OrderAnalyticsDashboardProps> = ({
  className = '',
  userType = 'buyer'
}) => {
  const { address: walletAddress } = useAccount();
  const { addToast } = useToast();
  const webSocket = useWebSocketContext();
  const [analytics, setAnalytics] = useState<OrderAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'year'>('month');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    if (walletAddress) {
      loadAnalytics();
    }
  }, [walletAddress, selectedTimeframe]);

  // Set up WebSocket event listeners for real-time updates
  useEffect(() => {
    if (!webSocket.isConnected || !walletAddress) return;

    const handleOrderCreated = (data: any) => {
      // When a new order is created, refresh analytics
      if (data.buyerAddress === walletAddress || data.sellerAddress === walletAddress) {
        loadAnalytics();
        setLastUpdated(new Date());
        addToast('New order created', 'info');
      }
    };

    const handleOrderStatusChanged = (data: any) => {
      // When order status changes, refresh analytics
      if (data.order.buyerWalletAddress === walletAddress || data.order.sellerWalletAddress === walletAddress) {
        loadAnalytics();
        setLastUpdated(new Date());
        addToast(`Order status updated to ${data.order.status}`, 'info');
      }
    };

    const handleOrderCompleted = (data: any) => {
      // When order is completed, refresh analytics
      if (data.buyerAddress === walletAddress || data.sellerAddress === walletAddress) {
        loadAnalytics();
        setLastUpdated(new Date());
        addToast('Order completed', 'success');
      }
    };

    // Listen for order-related events
    webSocket.on('new_order', handleOrderCreated);
    webSocket.on('order_status_changed', handleOrderStatusChanged);
    webSocket.on('order_completed', handleOrderCompleted);

    // Cleanup listeners
    return () => {
      webSocket.off('new_order', handleOrderCreated);
      webSocket.off('order_status_changed', handleOrderStatusChanged);
      webSocket.off('order_completed', handleOrderCompleted);
    };
  }, [webSocket.isConnected, walletAddress]);

  const loadAnalytics = async () => {
    if (!walletAddress) return;

    try {
      setLoading(true);
      const data = await orderService.getOrderAnalytics(walletAddress, selectedTimeframe);
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      addToast('Failed to load analytics data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
    setLastUpdated(new Date());
  };

  const handleExport = async () => {
    if (!analytics) return;

    try {
      const dataStr = JSON.stringify(analytics, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-analytics-${walletAddress}-${selectedTimeframe}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('Analytics exported successfully', 'success');
    } catch (error) {
      console.error('Error exporting analytics:', error);
      addToast('Failed to export analytics', 'error');
    }
  };

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

  const getTrendIcon = (value: number) => {
    if (value > 0) {
      return <TrendingUp size={16} className="text-green-400" />;
    } else if (value < 0) {
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

  if (loading && !analytics) {
    return (
      <GlassPanel variant="primary" className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500/30 border-t-blue-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
      </GlassPanel>
    );
  }

  if (!analytics) {
    return (
      <GlassPanel variant="primary" className="p-8 text-center">
        <BarChart3 size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Analytics Data Available
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Analytics data will be available once you have orders.
        </p>
      </GlassPanel>
    );
  }

  // Prepare chart data
  const trendLabels = analytics.monthlyTrends.map(trend => trend.month || trend.date || '');
  const trendData = analytics.monthlyTrends.map(trend => parseFloat(trend.volume));
  const orderCountData = analytics.monthlyTrends.map(trend => trend.orderCount);
  const completionRateData = analytics.monthlyTrends.map(trend => trend.completionRate * 100);

  const volumeChart = {
    labels: trendLabels,
    datasets: [
      {
        label: 'Order Volume',
        data: trendData,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true
      }
    ]
  };

  const ordersChart = {
    labels: trendLabels,
    datasets: [
      {
        label: 'Order Count',
        data: orderCountData,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true
      }
    ]
  };

  const completionChart = {
    labels: trendLabels,
    datasets: [
      {
        label: 'Completion Rate (%)',
        data: completionRateData,
        borderColor: 'rgb(147, 51, 234)',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        fill: true
      }
    ]
  };

  const categoryData = {
    labels: analytics.topCategories.map(cat => cat.category),
    datasets: [
      {
        label: 'Order Volume',
        data: analytics.topCategories.map(cat => parseFloat(cat.volume)),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(147, 51, 234, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(147, 51, 234, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <BarChart3 size={32} className="mr-3 text-blue-500" />
            Order Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive insights into your order performance
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as any)}
            className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="year">Last 12 Months</option>
          </select>
          
          <Button variant="outline" onClick={handleExport}>
            <Download size={16} className="mr-2" />
            Export
          </Button>
          
          <Button 
            variant="primary" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
        >
          <GlassPanel variant="primary" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${getMetricColor('blue')}`}>
                <Package size={24} />
              </div>
              <div className="flex items-center space-x-1">
                {getTrendIcon(0)}
                <span className="text-sm font-medium text-gray-400">
                  0%
                </span>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Total Orders
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {analytics.totalOrders}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                All orders in selected period
              </p>
            </div>
          </GlassPanel>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
        >
          <GlassPanel variant="primary" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${getMetricColor('green')}`}>
                <DollarSign size={24} />
              </div>
              <div className="flex items-center space-x-1">
                {getTrendIcon(parseFloat(analytics.totalRevenue) - parseFloat(analytics.totalVolume) / 2)}
                <span className={`text-sm font-medium ${
                  parseFloat(analytics.totalRevenue) > parseFloat(analytics.totalVolume) / 2 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {((parseFloat(analytics.totalRevenue) - parseFloat(analytics.totalVolume) / 2) / (parseFloat(analytics.totalVolume) / 2) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Total Revenue
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                ${parseFloat(analytics.totalRevenue).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Revenue from completed orders
              </p>
            </div>
          </GlassPanel>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
        >
          <GlassPanel variant="primary" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${getMetricColor('yellow')}`}>
                <Target size={24} />
              </div>
              <div className="flex items-center space-x-1">
                {getTrendIcon(analytics.averageOrderValue ? parseFloat(analytics.averageOrderValue) - 50 : 0)}
                <span className={`text-sm font-medium ${
                  analytics.averageOrderValue && parseFloat(analytics.averageOrderValue) > 50 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {analytics.averageOrderValue ? ((parseFloat(analytics.averageOrderValue) - 50) / 50 * 100).toFixed(1) : '0.0'}%
                </span>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Avg Order Value
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                ${analytics.averageOrderValue ? parseFloat(analytics.averageOrderValue).toFixed(2) : '0.00'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Average value per order
              </p>
            </div>
          </GlassPanel>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.02 }}
        >
          <GlassPanel variant="primary" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${getMetricColor('purple')}`}>
                <CheckCircle size={24} />
              </div>
              <div className="flex items-center space-x-1">
                {getTrendIcon((analytics.completionRate * 100) - 85)}
                <span className={`text-sm font-medium ${
                  analytics.completionRate * 100 > 85 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {((analytics.completionRate * 100) - 85).toFixed(1)}%
                </span>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Completion Rate
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {(analytics.completionRate * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Successful order completions
              </p>
            </div>
          </GlassPanel>
        </motion.div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Trend Chart */}
        <GlassPanel variant="primary" className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <Activity size={20} className="mr-2 text-blue-500" />
            Order Volume Trend
          </h3>
          
          <div className="h-80">
            <Line data={volumeChart} options={chartOptions} />
          </div>
        </GlassPanel>

        {/* Order Count Chart */}
        <GlassPanel variant="primary" className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <BarChart3 size={20} className="mr-2 text-green-500" />
            Order Count Trend
          </h3>
          
          <div className="h-80">
            <Bar data={ordersChart} options={chartOptions} />
          </div>
        </GlassPanel>

        {/* Completion Rate Chart */}
        <GlassPanel variant="primary" className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <CheckCircle size={20} className="mr-2 text-purple-500" />
            Completion Rate Trend
          </h3>
          
          <div className="h-80">
            <Line data={completionChart} options={chartOptions} />
          </div>
        </GlassPanel>

        {/* Category Distribution */}
        <GlassPanel variant="primary" className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <PieChart size={20} className="mr-2 text-orange-500" />
            Category Distribution
          </h3>
          
          <div className="h-80">
            <Pie data={categoryData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: {
                    color: 'rgba(255, 255, 255, 0.7)'
                  }
                }
              }
            }} />
          </div>
        </GlassPanel>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassPanel variant="primary" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${getMetricColor('red')}`}>
                <AlertTriangle size={24} />
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Dispute Rate
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {(analytics.disputeRate * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Orders with disputes
              </p>
            </div>
          </GlassPanel>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <GlassPanel variant="primary" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${getMetricColor('cyan')}`}>
                <Truck size={24} />
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Avg Shipping Time
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {analytics.avgShippingTime.toFixed(1)}h
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Average time to ship
              </p>
            </div>
          </GlassPanel>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <GlassPanel variant="primary" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${getMetricColor('pink')}`}>
                <Clock size={24} />
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Avg Response Time
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {analytics.avgResponseTime.toFixed(1)}m
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Average response time
              </p>
            </div>
          </GlassPanel>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <GlassPanel variant="primary" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${getMetricColor('orange')}`}>
                <Users size={24} />
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Repeat Customers
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {(analytics.repeatCustomerRate * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Returning customer rate
              </p>
            </div>
          </GlassPanel>
        </motion.div>
      </div>

      {/* Order Status Breakdown */}
      <GlassPanel variant="primary" className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
          <Package size={20} className="mr-2 text-indigo-500" />
          Order Status Breakdown
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-500/10 rounded-lg">
            <p className="text-2xl font-bold text-blue-500">{analytics.processingOrders}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Processing</p>
          </div>
          <div className="text-center p-4 bg-green-500/10 rounded-lg">
            <p className="text-2xl font-bold text-green-500">{analytics.completedOrders}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
          </div>
          <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
            <p className="text-2xl font-bold text-yellow-500">{analytics.disputedOrders}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Disputed</p>
          </div>
          <div className="text-center p-4 bg-red-500/10 rounded-lg">
            <p className="text-2xl font-bold text-red-500">{analytics.cancelledOrders}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Cancelled</p>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
};

export default OrderAnalyticsDashboard;