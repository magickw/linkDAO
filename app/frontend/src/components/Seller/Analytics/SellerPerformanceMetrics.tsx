import React, { useState, useEffect } from 'react';
import { SellerPerformanceMetrics as MetricsType } from '../../../services/sellerAnalyticsService';
import { sellerAnalyticsService } from '../../../services/sellerAnalyticsService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface SellerPerformanceMetricsProps {
  metrics: MetricsType;
  dateRange: {
    startDate?: Date;
    endDate?: Date;
  };
  className?: string;
}

export const SellerPerformanceMetrics: React.FC<SellerPerformanceMetricsProps> = ({
  metrics,
  dateRange,
  className = ''
}) => {
  const [trends, setTrends] = useState<{
    sales: Array<{ date: string; value: number }>;
    orders: Array<{ date: string; value: number }>;
    satisfaction: Array<{ date: string; value: number }>;
  }>({
    sales: [],
    orders: [],
    satisfaction: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTrends();
  }, [metrics.sellerId, dateRange]);

  const loadTrends = async () => {
    try {
      setLoading(true);
      const [salesTrends, ordersTrends, satisfactionTrends] = await Promise.all([
        sellerAnalyticsService.getSellerPerformanceTrends(metrics.sellerId, 'total_sales', 'day', 30),
        sellerAnalyticsService.getSellerPerformanceTrends(metrics.sellerId, 'total_orders', 'day', 30),
        sellerAnalyticsService.getSellerPerformanceTrends(metrics.sellerId, 'customer_satisfaction', 'day', 30)
      ]);

      setTrends({
        sales: salesTrends,
        orders: ordersTrends,
        satisfaction: satisfactionTrends
      });
    } catch (error) {
      console.error('Error loading performance trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  const getMetricColor = (value: number, good: number, excellent: number) => {
    if (value >= excellent) return 'text-green-600';
    if (value >= good) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMetricIcon = (value: number, good: number, excellent: number) => {
    if (value >= excellent) return '📈';
    if (value >= good) return '📊';
    return '📉';
  };

  // Prepare chart data
  const topProductsData = metrics.topProducts.slice(0, 5).map(product => ({
    name: product.title.length > 20 ? product.title.substring(0, 20) + '...' : product.title,
    revenue: product.revenue,
    units: product.units
  }));

  const demographicsData = metrics.customerInsights.demographics.ageGroups.map(group => ({
    name: group.range,
    value: group.percentage
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className={`seller-performance-metrics ${className}`}>
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Sales */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.totalSales)}</p>
              <p className={`text-sm ${getMetricColor(metrics.revenueGrowth, 5, 15)}`}>
                {getMetricIcon(metrics.revenueGrowth, 5, 15)} {formatPercentage(metrics.revenueGrowth)} growth
              </p>
            </div>
            <div className="text-3xl">💰</div>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalOrders.toLocaleString()}</p>
              <p className="text-sm text-gray-500">
                {formatCurrency(metrics.averageOrderValue)} avg value
              </p>
            </div>
            <div className="text-3xl">📦</div>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{formatPercentage(metrics.conversionRate)}</p>
              <p className={`text-sm ${getMetricColor(metrics.conversionRate, 2, 4)}`}>
                {getMetricIcon(metrics.conversionRate, 2, 4)} Industry avg: 2.5%
              </p>
            </div>
            <div className="text-3xl">🎯</div>
          </div>
        </div>

        {/* Customer Satisfaction */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Customer Satisfaction</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.customerSatisfaction.toFixed(1)}/5</p>
              <p className={`text-sm ${getMetricColor(metrics.customerSatisfaction, 4, 4.5)}`}>
                {getMetricIcon(metrics.customerSatisfaction, 4, 4.5)} {formatPercentage(metrics.repeatCustomerRate)} repeat customers
              </p>
            </div>
            <div className="text-3xl">⭐</div>
          </div>
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Response & Shipping Times */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Response & Shipping</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Response Time</span>
              <span className={`font-medium ${getMetricColor(3600 - metrics.responseTime, 1800, 900)}`}>
                {formatTime(metrics.responseTime)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Shipping Time</span>
              <span className={`font-medium ${getMetricColor(86400 - metrics.shippingTime, 43200, 21600)}`}>
                {formatTime(metrics.shippingTime)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Return Rate</span>
              <span className={`font-medium ${getMetricColor(10 - metrics.returnRate, 5, 2)}`}>
                {formatPercentage(metrics.returnRate)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Dispute Rate</span>
              <span className={`font-medium ${getMetricColor(5 - metrics.disputeRate, 2, 1)}`}>
                {formatPercentage(metrics.disputeRate)}
              </span>
            </div>
          </div>
        </div>

        {/* Financial Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Profit Margin</span>
              <span className={`font-medium ${getMetricColor(metrics.profitMargin, 15, 25)}`}>
                {formatPercentage(metrics.profitMargin)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Customer LTV</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(metrics.customerLifetimeValue)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Inventory Turnover</span>
              <span className={`font-medium ${getMetricColor(metrics.inventoryTurnover, 3, 6)}`}>
                {metrics.inventoryTurnover.toFixed(1)}x
              </span>
            </div>
          </div>
        </div>

        {/* Customer Insights Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Insights</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Session Duration</span>
              <span className="font-medium text-gray-900">
                {formatTime(metrics.customerInsights.behavior.averageSessionDuration)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Pages/Session</span>
              <span className="font-medium text-gray-900">
                {metrics.customerInsights.behavior.pagesPerSession.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Bounce Rate</span>
              <span className={`font-medium ${getMetricColor(100 - metrics.customerInsights.behavior.bounceRate, 50, 70)}`}>
                {formatPercentage(metrics.customerInsights.behavior.bounceRate)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Purchase Frequency</span>
              <span className="font-medium text-gray-900">
                {metrics.customerInsights.behavior.purchaseFrequency.toFixed(1)}/month
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Sales Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend (30 Days)</h3>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="text-gray-500">Loading chart data...</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trends.sales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: number) => [formatCurrency(value), 'Sales']}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products by Revenue</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topProductsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value: number) => [formatCurrency(value), 'Revenue']} />
              <Bar dataKey="revenue" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Customer Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Age Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Age Groups</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={demographicsData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {demographicsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Categories */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Categories</h3>
          <div className="space-y-3">
            {metrics.customerInsights.preferences.topCategories.map((category, index) => (
              <div key={category.category} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{category.category}</span>
                <div className="flex items-center">
                  <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${category.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {formatPercentage(category.percentage)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h3>
          <div className="space-y-3">
            {metrics.customerInsights.preferences.paymentMethods.map((method, index) => (
              <div key={method.method} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{method.method}</span>
                <div className="flex items-center">
                  <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${method.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {formatPercentage(method.percentage)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};