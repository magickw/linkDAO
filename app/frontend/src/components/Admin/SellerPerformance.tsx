import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Star,
  AlertTriangle,
  Users,
  Package,
  Filter,
  Search,
  Calendar,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  BarChart3,
  Activity,
  Target,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { Button, GlassPanel } from '@/design-system';

interface SellerPerformance {
  id: string;
  sellerId: string;
  sellerHandle: string;
  businessName: string;
  metrics: {
    totalSales: number;
    totalRevenue: number;
    averageOrderValue: number;
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    averageRating: number;
    totalReviews: number;
    disputeRate: number;
    responseTime: number; // in hours
    fulfillmentRate: number; // percentage
  };
  trends: {
    salesGrowth: number; // percentage
    revenueGrowth: number;
    ratingTrend: number;
  };
  status: 'excellent' | 'good' | 'warning' | 'critical';
  lastUpdated: string;
}

export function SellerPerformance() {
  const [sellers, setSellers] = useState<SellerPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeller, setSelectedSeller] = useState<SellerPerformance | null>(null);
  const [showDetailedMetrics, setShowDetailedMetrics] = useState(true);
  const [showSalesChart, setShowSalesChart] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    minRating: '',
    search: '',
    sortBy: 'revenue' // 'revenue', 'rating', 'orders', 'disputes'
  });
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  });

  useEffect(() => {
    loadSellerPerformance();
  }, [filters, dateRange, pagination.page]);

  const loadSellerPerformance = async () => {
    try {
      setLoading(true);
      const response = await adminService.getSellerPerformance({
        ...filters,
        ...dateRange,
        page: pagination.page,
        limit: 20
      });

      setSellers(response.sellers);
      setPagination({
        page: response.page,
        totalPages: response.totalPages,
        total: response.total
      });
    } catch (error) {
      console.error('Failed to load seller performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportPerformanceData = async () => {
    try {
      await adminService.exportSellerPerformance({ ...filters, ...dateRange });
    } catch (error) {
      console.error('Failed to export performance data:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-400 bg-green-500/20';
      case 'good': return 'text-blue-400 bg-blue-500/20';
      case 'warning': return 'text-yellow-400 bg-yellow-500/20';
      case 'critical': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return Award;
      case 'good': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'critical': return XCircle;
      default: return Activity;
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return TrendingUp;
    if (trend < 0) return TrendingDown;
    return Activity;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-400';
    if (trend < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Seller Performance</h2>
          <p className="text-gray-400 text-sm">Monitor seller metrics and analytics</p>
        </div>
        <Button
          onClick={exportPerformanceData}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <GlassPanel className="p-6">
        <div className="space-y-4">
          {/* Primary Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-white font-medium">Filters:</span>
            </div>

            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="">All Status</option>
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>

            <select
              value={filters.minRating}
              onChange={(e) => setFilters({ ...filters, minRating: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="">All Ratings</option>
              <option value="4.5">4.5+ Stars</option>
              <option value="4.0">4.0+ Stars</option>
              <option value="3.5">3.5+ Stars</option>
              <option value="3.0">3.0+ Stars</option>
            </select>

            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="revenue">Sort by Revenue</option>
              <option value="rating">Sort by Rating</option>
              <option value="orders">Sort by Orders</option>
              <option value="disputes">Sort by Disputes</option>
            </select>

            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search sellers..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white flex-1 text-sm"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-white text-sm">Date Range:</span>
            </div>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
        </div>
      </GlassPanel>

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassPanel className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Total Revenue</p>
              <p className="text-white text-xl font-bold">
                {formatCurrency(sellers.reduce((sum, s) => sum + s.metrics.totalRevenue, 0))}
              </p>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Total Orders</p>
              <p className="text-white text-xl font-bold">
                {sellers.reduce((sum, s) => sum + s.metrics.totalOrders, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <Star className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Avg Rating</p>
              <p className="text-white text-xl font-bold">
                {sellers.length > 0
                  ? (sellers.reduce((sum, s) => sum + s.metrics.averageRating, 0) / sellers.length).toFixed(1)
                  : '0.0'}
              </p>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Active Sellers</p>
              <p className="text-white text-xl font-bold">{pagination.total}</p>
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* Seller Performance List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">Sellers ({pagination.total})</h3>

          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <GlassPanel key={i} className="p-4 animate-pulse">
                  <div className="h-32 bg-white/10 rounded"></div>
                </GlassPanel>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {sellers.map((seller) => {
                const StatusIcon = getStatusIcon(seller.status);
                return (
                  <GlassPanel
                    key={seller.id}
                    className={`p-4 cursor-pointer transition-colors ${selectedSeller?.id === seller.id ? 'ring-2 ring-purple-500' : 'hover:bg-white/5'
                      }`}
                    onClick={() => setSelectedSeller(seller)}
                  >
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold">
                              {seller.businessName ? seller.businessName.charAt(0).toUpperCase() : '?'}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white font-medium">{seller.businessName || 'N/A'}</span>
                            </div>
                            <p className="text-gray-400 text-sm">@{seller.sellerHandle || 'unknown'}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(seller.status)}`}>
                          <StatusIcon className="w-3 h-3" />
                          {seller.status}
                        </span>
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Revenue</p>
                          <p className="text-white font-semibold text-sm">{formatCurrency(seller.metrics.totalRevenue)}</p>
                          <div className={`flex items-center gap-1 text-xs ${getTrendColor(seller.trends.revenueGrowth)}`}>
                            {React.createElement(getTrendIcon(seller.trends.revenueGrowth), { className: 'w-3 h-3' })}
                            {formatPercentage(seller.trends.revenueGrowth)}
                          </div>
                        </div>

                        <div>
                          <p className="text-gray-400 text-xs mb-1">Orders</p>
                          <p className="text-white font-semibold text-sm">{seller.metrics.totalOrders}</p>
                          <div className={`flex items-center gap-1 text-xs ${getTrendColor(seller.trends.salesGrowth)}`}>
                            {React.createElement(getTrendIcon(seller.trends.salesGrowth), { className: 'w-3 h-3' })}
                            {formatPercentage(seller.trends.salesGrowth)}
                          </div>
                        </div>

                        <div>
                          <p className="text-gray-400 text-xs mb-1">Rating</p>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <p className="text-white font-semibold text-sm">{seller.metrics.averageRating.toFixed(1)}</p>
                          </div>
                          <p className="text-gray-400 text-xs">({seller.metrics.totalReviews} reviews)</p>
                        </div>
                      </div>

                      {/* Quick Stats */}
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <Package className="w-3 h-3 text-green-400" />
                          <span className="text-gray-400">{seller.metrics.fulfillmentRate.toFixed(0)}% fulfilled</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-yellow-400" />
                          <span className="text-gray-400">{seller.metrics.disputeRate.toFixed(1)}% disputes</span>
                        </div>
                      </div>
                    </div>
                  </GlassPanel>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                disabled={pagination.page === 1}
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              >
                Previous
              </Button>
              <span className="text-white px-4 py-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Detailed Performance View */}
        <div>
          {selectedSeller ? (
            <GlassPanel className="p-6 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Performance Details</h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Store
                </Button>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {/* Seller Info */}
                <div>
                  <label className="text-gray-400 text-sm">Seller</label>
                  <p className="text-white font-medium">{selectedSeller.businessName}</p>
                  <p className="text-gray-400 text-sm">@{selectedSeller.sellerHandle}</p>
                </div>

                {/* Performance Status */}
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Performance Status</label>
                  <div className={`p-3 rounded-lg ${getStatusColor(selectedSeller.status)}`}>
                    <div className="flex items-center gap-2">
                      {React.createElement(getStatusIcon(selectedSeller.status), { className: 'w-5 h-5' })}
                      <span className="font-medium capitalize">{selectedSeller.status}</span>
                    </div>
                  </div>
                </div>

                {/* Detailed Metrics */}
                <div className="border-t border-gray-700 pt-4">
                  <button
                    onClick={() => setShowDetailedMetrics(!showDetailedMetrics)}
                    className="flex items-center justify-between w-full text-left mb-3"
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-400" />
                      <span className="text-white font-medium text-sm">Detailed Metrics</span>
                    </div>
                    {showDetailedMetrics ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  {showDetailedMetrics && (
                    <div className="space-y-3">
                      {/* Revenue Metrics */}
                      <div className="p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-sm">Total Revenue</span>
                          <span className="text-white font-bold">{formatCurrency(selectedSeller.metrics.totalRevenue)}</span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-sm">Average Order Value</span>
                          <span className="text-white font-semibold">{formatCurrency(selectedSeller.metrics.averageOrderValue)}</span>
                        </div>
                        <div className={`flex items-center gap-1 text-sm ${getTrendColor(selectedSeller.trends.revenueGrowth)}`}>
                          {React.createElement(getTrendIcon(selectedSeller.trends.revenueGrowth), { className: 'w-4 h-4' })}
                          <span>{formatPercentage(selectedSeller.trends.revenueGrowth)} vs last period</span>
                        </div>
                      </div>

                      {/* Order Metrics */}
                      <div className="p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-sm">Total Orders</span>
                          <span className="text-white font-bold">{selectedSeller.metrics.totalOrders}</span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-sm">Completed</span>
                          <span className="text-green-400 font-semibold">{selectedSeller.metrics.completedOrders}</span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-sm">Cancelled</span>
                          <span className="text-red-400 font-semibold">{selectedSeller.metrics.cancelledOrders}</span>
                        </div>
                        <div className={`flex items-center gap-1 text-sm ${getTrendColor(selectedSeller.trends.salesGrowth)}`}>
                          {React.createElement(getTrendIcon(selectedSeller.trends.salesGrowth), { className: 'w-4 h-4' })}
                          <span>{formatPercentage(selectedSeller.trends.salesGrowth)} vs last period</span>
                        </div>
                      </div>

                      {/* Rating & Reviews */}
                      <div className="p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-sm">Average Rating</span>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span className="text-white font-bold">{selectedSeller.metrics.averageRating.toFixed(1)}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-sm">Total Reviews</span>
                          <span className="text-white font-semibold">{selectedSeller.metrics.totalReviews}</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-400"
                            style={{ width: `${(selectedSeller.metrics.averageRating / 5) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Performance Indicators */}
                      <div className="p-3 bg-white/5 rounded-lg">
                        <div className="space-y-2">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-gray-400 text-sm">Fulfillment Rate</span>
                              <span className="text-white font-semibold">{selectedSeller.metrics.fulfillmentRate.toFixed(1)}%</span>
                            </div>
                            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${selectedSeller.metrics.fulfillmentRate >= 90 ? 'bg-green-400' : selectedSeller.metrics.fulfillmentRate >= 75 ? 'bg-yellow-400' : 'bg-red-400'}`}
                                style={{ width: `${selectedSeller.metrics.fulfillmentRate}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-gray-400 text-sm">Dispute Rate</span>
                              <span className={`font-semibold ${selectedSeller.metrics.disputeRate > 5 ? 'text-red-400' : selectedSeller.metrics.disputeRate > 2 ? 'text-yellow-400' : 'text-green-400'}`}>
                                {selectedSeller.metrics.disputeRate.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${selectedSeller.metrics.disputeRate > 5 ? 'bg-red-400' : selectedSeller.metrics.disputeRate > 2 ? 'bg-yellow-400' : 'bg-green-400'}`}
                                style={{ width: `${Math.min(selectedSeller.metrics.disputeRate * 10, 100)}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <span className="text-gray-400 text-sm">Avg Response Time</span>
                            <span className="text-white font-semibold">{selectedSeller.metrics.responseTime.toFixed(1)}h</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Last Updated */}
                <div className="border-t border-gray-700 pt-4">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>Last updated: {new Date(selectedSeller.lastUpdated).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </GlassPanel>
          ) : (
            <GlassPanel className="p-6 text-center">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">Select a seller to view performance details</p>
            </GlassPanel>
          )}
        </div>
      </div>
    </div>
  );
}
