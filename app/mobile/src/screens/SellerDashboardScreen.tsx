import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Types
interface SellerStats {
  totalSales: number;
  activeListings: number;
  pendingOrders: number;
  reputationScore: number;
  monthlyRevenue: number;
  responseRate: number;
  averageRating: number;
}

interface SalesData {
  date: string;
  sales: number;
  revenue: number;
}

interface Order {
  id: string;
  customerName: string;
  items: string;
  amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  date: string;
}

interface Listing {
  id: string;
  name: string;
  price: number;
  views: number;
  sales: number;
  status: 'active' | 'sold' | 'draft';
}

export default function SellerDashboardScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'listings' | 'analytics'>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<SellerStats>({
    totalSales: 0,
    activeListings: 0,
    pendingOrders: 0,
    reputationScore: 0,
    monthlyRevenue: 0,
    responseRate: 0,
    averageRating: 0,
  });
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API calls
      // const statsResponse = await fetch(`${API_BASE_URL}/api/seller/stats`);
      // const ordersResponse = await fetch(`${API_BASE_URL}/api/seller/orders`);
      // const listingsResponse = await fetch(`${API_BASE_URL}/api/seller/listings`);
      
      // Mock data
      setStats({
        totalSales: 156,
        activeListings: 23,
        pendingOrders: 8,
        reputationScore: 4.8,
        monthlyRevenue: 12450.00,
        responseRate: 98.5,
        averageRating: 4.9,
      });

      setSalesData([
        { date: '2024-01-20', sales: 12, revenue: 1200 },
        { date: '2024-01-21', sales: 15, revenue: 1500 },
        { date: '2024-01-22', sales: 8, revenue: 800 },
        { date: '2024-01-23', sales: 20, revenue: 2000 },
        { date: '2024-01-24', sales: 18, revenue: 1800 },
        { date: '2024-01-25', sales: 25, revenue: 2500 },
        { date: '2024-01-26', sales: 22, revenue: 2200 },
      ]);

      setOrders([
        { id: '1', customerName: 'John Doe', items: '2 items', amount: 150.00, status: 'pending', date: '2024-01-26' },
        { id: '2', customerName: 'Jane Smith', items: '1 item', amount: 75.00, status: 'processing', date: '2024-01-25' },
        { id: '3', customerName: 'Bob Johnson', items: '3 items', amount: 300.00, status: 'shipped', date: '2024-01-24' },
      ]);

      setListings([
        { id: '1', name: 'Premium Widget', price: 99.99, views: 1250, sales: 45, status: 'active' },
        { id: '2', name: 'Gadget Pro', price: 149.99, views: 890, sales: 32, status: 'active' },
        { id: '3', name: 'Tool Set', price: 79.99, views: 560, sales: 18, status: 'active' },
      ]);
    } catch (error) {
      console.error('Error loading seller data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderOverviewTab = () => (
    <ScrollView
      style={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Key Metrics */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total Sales</Text>
          <Text style={styles.metricValue}>{stats.totalSales}</Text>
          <Text style={styles.metricChange}>+12.5%</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Monthly Revenue</Text>
          <Text style={styles.metricValue}>${stats.monthlyRevenue.toLocaleString()}</Text>
          <Text style={[styles.metricChange, styles.positiveChange]}>+18.2%</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Active Listings</Text>
          <Text style={styles.metricValue}>{stats.activeListings}</Text>
          <Text style={styles.metricChange}>+3 this week</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Pending Orders</Text>
          <Text style={[styles.metricValue, styles.warningValue]}>{stats.pendingOrders}</Text>
          <Text style={styles.metricChange}>Requires action</Text>
        </View>
      </View>

      {/* Performance Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Metrics</Text>
        <View style={styles.performanceRow}>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceLabel}>Reputation Score</Text>
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingValue}>{stats.reputationScore}</Text>
              <Text style={styles.ratingStars}>⭐⭐⭐⭐⭐</Text>
            </View>
          </View>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceLabel}>Response Rate</Text>
            <Text style={styles.performanceValue}>{stats.responseRate}%</Text>
          </View>
        </View>
        <View style={styles.performanceRow}>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceLabel}>Average Rating</Text>
            <Text style={styles.performanceValue}>{stats.averageRating}/5.0</Text>
          </View>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceLabel}>On-Time Delivery</Text>
            <Text style={[styles.performanceValue, styles.goodValue]}>97.3%</Text>
          </View>
        </View>
      </View>

      {/* Sales Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sales Trend (Last 7 Days)</Text>
        <View style={styles.chartContainer}>
          {salesData.map((data, index) => (
            <View key={index} style={styles.chartBarContainer}>
              <View
                style={[
                  styles.chartBar,
                  { height: `${(data.sales / 30) * 100}%` },
                ]}
              />
              <Text style={styles.chartLabel}>{data.date.split('-')[2]}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>➕</Text>
            <Text style={styles.actionText}>Create Listing</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>📦</Text>
            <Text style={styles.actionText}>Manage Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionText}>View Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>⚙️</Text>
            <Text style={styles.actionText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderOrdersTab = () => (
    <ScrollView
      style={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.ordersHeader}>
        <Text style={styles.ordersTitle}>Orders</Text>
        <View style={styles.orderFilter}>
          <TouchableOpacity style={[styles.filterButton, styles.activeFilter]}>
            <Text style={styles.filterButtonText}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterButtonText}>Pending</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterButtonText}>Shipped</Text>
          </TouchableOpacity>
        </View>
      </View>

      {orders.map((order) => (
        <View key={order.id} style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <View>
              <Text style={styles.orderCustomer}>{order.customerName}</Text>
              <Text style={styles.orderDate}>{order.date}</Text>
            </View>
            <View style={[
              styles.statusBadge,
              order.status === 'pending' && styles.pendingBadge,
              order.status === 'processing' && styles.processingBadge,
              order.status === 'shipped' && styles.shippedBadge,
            ]}>
              <Text style={styles.statusText}>{order.status}</Text>
            </View>
          </View>
          <View style={styles.orderDetails}>
            <Text style={styles.orderItems}>{order.items}</Text>
            <Text style={styles.orderAmount}>${order.amount.toFixed(2)}</Text>
          </View>
          <View style={styles.orderActions}>
            <TouchableOpacity style={styles.orderActionButton}>
              <Text style={styles.orderActionText}>View Details</Text>
            </TouchableOpacity>
            {order.status === 'pending' && (
              <TouchableOpacity style={[styles.orderActionButton, styles.primaryActionButton]}>
                <Text style={[styles.orderActionText, styles.primaryActionText]}>Process Order</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderListingsTab = () => (
    <ScrollView
      style={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.listingsHeader}>
        <Text style={styles.listingsTitle}>My Listings</Text>
        <TouchableOpacity style={styles.createButton}>
          <Text style={styles.createButtonText}>+ Add New</Text>
        </TouchableOpacity>
      </View>

      {listings.map((listing) => (
        <View key={listing.id} style={styles.listingCard}>
          <View style={styles.listingHeader}>
            <Text style={styles.listingName}>{listing.name}</Text>
            <Text style={styles.listingPrice}>${listing.price.toFixed(2)}</Text>
          </View>
          <View style={styles.listingMetrics}>
            <View style={styles.listingMetric}>
              <Text style={styles.listingMetricLabel}>Views</Text>
              <Text style={styles.listingMetricValue}>{listing.views}</Text>
            </View>
            <View style={styles.listingMetric}>
              <Text style={styles.listingMetricLabel}>Sales</Text>
              <Text style={styles.listingMetricValue}>{listing.sales}</Text>
            </View>
            <View style={styles.listingMetric}>
              <Text style={styles.listingMetricLabel}>Status</Text>
              <Text style={[styles.listingMetricValue, styles.activeStatus]}>{listing.status}</Text>
            </View>
          </View>
          <View style={styles.listingActions}>
            <TouchableOpacity style={styles.listingActionButton}>
              <Text style={styles.listingActionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.listingActionButton}>
              <Text style={styles.listingActionText}>Duplicate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.listingActionButton}>
              <Text style={[styles.listingActionText, styles.dangerText]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderAnalyticsTab = () => (
    <ScrollView
      style={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.analyticsTitle}>Analytics Dashboard</Text>

      {/* Revenue Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue Overview</Text>
        <View style={styles.revenueSummary}>
          <View style={styles.revenueItem}>
            <Text style={styles.revenueLabel}>Today</Text>
            <Text style={styles.revenueValue}>$450.00</Text>
          </View>
          <View style={styles.revenueItem}>
            <Text style={styles.revenueLabel}>This Week</Text>
            <Text style={styles.revenueValue}>$3,200.00</Text>
          </View>
          <View style={styles.revenueItem}>
            <Text style={styles.revenueLabel}>This Month</Text>
            <Text style={styles.revenueValue}>$12,450.00</Text>
          </View>
        </View>
      </View>

      {/* Top Performing Listings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Performing Listings</Text>
        {listings.slice(0, 3).map((listing, index) => (
          <View key={listing.id} style={styles.topListingRow}>
            <Text style={styles.topListingRank}>#{index + 1}</Text>
            <Text style={styles.topListingName}>{listing.name}</Text>
            <Text style={styles.topListingSales}>{listing.sales} sales</Text>
          </View>
        ))}
      </View>

      {/* Customer Insights */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Insights</Text>
        <View style={styles.insightRow}>
          <Text style={styles.insightLabel}>Repeat Customers</Text>
          <Text style={styles.insightValue}>34%</Text>
        </View>
        <View style={styles.insightRow}>
          <Text style={styles.insightLabel}>Average Order Value</Text>
          <Text style={styles.insightValue}>$79.85</Text>
        </View>
        <View style={styles.insightRow}>
          <Text style={styles.insightLabel}>Customer Satisfaction</Text>
          <Text style={[styles.insightValue, styles.goodValue]}>96.8%</Text>
        </View>
      </View>

      {/* Export Reports */}
      <TouchableOpacity style={styles.exportButton}>
        <Text style={styles.exportButtonText}>📥 Export Sales Report</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Seller Dashboard</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Text style={styles.notificationIcon}>🔔</Text>
          {stats.pendingOrders > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{stats.pendingOrders}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'orders' && styles.activeTab]}
          onPress={() => setActiveTab('orders')}
        >
          <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>
            Orders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'listings' && styles.activeTab]}
          onPress={() => setActiveTab('listings')}
        >
          <Text style={[styles.tabText, activeTab === 'listings' && styles.activeTabText]}>
            Listings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'analytics' && styles.activeTab]}
          onPress={() => setActiveTab('analytics')}
        >
          <Text style={[styles.tabText, activeTab === 'analytics' && styles.activeTabText]}>
            Analytics
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'orders' && renderOrdersTab()}
      {activeTab === 'listings' && renderListingsTab()}
      {activeTab === 'analytics' && renderAnalyticsTab()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationIcon: {
    fontSize: 24,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  content: {
    flex: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  metricChange: {
    fontSize: 12,
    color: '#10b981',
  },
  positiveChange: {
    color: '#10b981',
  },
  warningValue: {
    color: '#f59e0b',
  },
  section: {
    backgroundColor: 'white',
    margin: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  performanceItem: {
    flex: 1,
  },
  performanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  goodValue: {
    color: '#10b981',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  ratingStars: {
    fontSize: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
    paddingTop: 20,
  },
  chartBarContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  chartBar: {
    width: 24,
    backgroundColor: '#3b82f6',
    borderRadius: 4,
    marginBottom: 8,
  },
  chartLabel: {
    fontSize: 10,
    color: '#666',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  ordersHeader: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  ordersTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  orderFilter: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  activeFilter: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  orderCard: {
    backgroundColor: 'white',
    margin: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderCustomer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
  },
  processingBadge: {
    backgroundColor: '#dbeafe',
  },
  shippedBadge: {
    backgroundColor: '#d1fae5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
    color: '#333',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  orderItems: {
    fontSize: 14,
    color: '#666',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  orderActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  orderActionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  primaryActionButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  orderActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  primaryActionText: {
    color: 'white',
  },
  listingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  listingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  createButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  listingCard: {
    backgroundColor: 'white',
    margin: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listingName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  listingPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  listingMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  listingMetric: {
    alignItems: 'center',
  },
  listingMetricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  listingMetricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  activeStatus: {
    color: '#10b981',
  },
  listingActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  listingActionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  listingActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  dangerText: {
    color: '#ef4444',
  },
  analyticsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  revenueSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  revenueItem: {
    alignItems: 'center',
  },
  revenueLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  revenueValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  topListingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  topListingRank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginRight: 12,
  },
  topListingName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  topListingSales: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  insightLabel: {
    fontSize: 14,
    color: '#666',
  },
  insightValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  exportButton: {
    backgroundColor: '#3b82f6',
    margin: 12,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});