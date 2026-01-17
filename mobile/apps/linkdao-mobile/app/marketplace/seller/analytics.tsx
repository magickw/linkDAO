/**
 * Advanced Analytics Screen
 * Comprehensive analytics dashboard for sellers
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';

type TimeRange = '7d' | '30d' | '90d' | '1y';

interface AnalyticsData {
  revenue: number;
  orders: number;
  visitors: number;
  conversionRate: number;
  averageOrderValue: number;
  topProducts: ProductStat[];
  recentActivity: Activity[];
}

interface ProductStat {
  id: string;
  name: string;
  sales: number;
  revenue: number;
  views: number;
}

interface Activity {
  id: string;
  type: 'order' | 'view' | 'review';
  productName: string;
  timestamp: string;
  amount?: string;
}

export default function SellerAnalyticsScreen() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    revenue: 12450.00,
    orders: 156,
    visitors: 3420,
    conversionRate: 4.56,
    averageOrderValue: 79.81,
    topProducts: [
      { id: '1', name: 'Premium Wireless Headphones', sales: 45, revenue: 6749.55, views: 1250 },
      { id: '2', name: 'Smart Watch Pro', sales: 32, revenue: 9599.68, views: 890 },
      { id: '3', name: 'Portable Speaker', sales: 28, revenue: 1677.16, views: 670 },
    ],
    recentActivity: [
      { id: '1', type: 'order', productName: 'Premium Wireless Headphones', timestamp: new Date().toISOString(), amount: '149.99' },
      { id: '2', type: 'view', productName: 'Smart Watch Pro', timestamp: new Date(Date.now() - 3600000).toISOString() },
      { id: '3', type: 'review', productName: 'Portable Speaker', timestamp: new Date(Date.now() - 7200000).toISOString() },
    ],
  });

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
    // TODO: Fetch analytics for selected time range
  };

  const formatCurrency = (value: number): string => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (value: number): string => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  const getChangeColor = (positive: boolean) => positive ? '#10b981' : '#ef4444';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <TouchableOpacity>
          <Ionicons name="download-outline" size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          {(['7d', '30d', '90d', '1y'] as TimeRange[]).map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.timeRangeButton,
                timeRange === range && styles.timeRangeButtonActive,
              ]}
              onPress={() => handleTimeRangeChange(range)}
            >
              <Text style={[
                styles.timeRangeText,
                timeRange === range && styles.timeRangeTextActive,
              ]}>
                {range === '1y' ? '1 Year' : range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <View style={[styles.metricIcon, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="wallet-outline" size={24} color="#3b82f6" />
              </View>
              <View style={[styles.metricChange, { backgroundColor: '#d1fae5' }]}>
                <Ionicons name="arrow-up" size={12} color="#10b981" />
                <Text style={styles.metricChangeText}>+12.5%</Text>
              </View>
            </View>
            <Text style={styles.metricValue}>{formatCurrency(analytics.revenue)}</Text>
            <Text style={styles.metricLabel}>Revenue</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <View style={[styles.metricIcon, { backgroundColor: '#d1fae5' }]}>
                <Ionicons name="cart-outline" size={24} color="#10b981" />
              </View>
              <View style={[styles.metricChange, { backgroundColor: '#d1fae5' }]}>
                <Ionicons name="arrow-up" size={12} color="#10b981" />
                <Text style={styles.metricChangeText}>+8.3%</Text>
              </View>
            </View>
            <Text style={styles.metricValue}>{formatNumber(analytics.orders)}</Text>
            <Text style={styles.metricLabel}>Orders</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <View style={[styles.metricIcon, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="eye-outline" size={24} color="#f59e0b" />
              </View>
              <View style={[styles.metricChange, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="arrow-down" size={12} color="#ef4444" />
                <Text style={styles.metricChangeText}>-2.1%</Text>
              </View>
            </View>
            <Text style={styles.metricValue}>{formatNumber(analytics.visitors)}</Text>
            <Text style={styles.metricLabel}>Visitors</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <View style={[styles.metricIcon, { backgroundColor: '#ede9fe' }]}>
                <Ionicons name="trending-up-outline" size={24} color="#8b5cf6" />
              </View>
              <View style={[styles.metricChange, { backgroundColor: '#d1fae5' }]}>
                <Ionicons name="arrow-up" size={12} color="#10b981" />
                <Text style={styles.metricChangeText}>+5.2%</Text>
              </View>
            </View>
            <Text style={styles.metricValue}>{analytics.conversionRate}%</Text>
            <Text style={styles.metricLabel}>Conversion Rate</Text>
          </View>
        </View>

        {/* Average Order Value */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Average Order Value</Text>
          <View style={styles.aovCard}>
            <Text style={styles.aovValue}>{formatCurrency(analytics.averageOrderValue)}</Text>
            <View style={styles.aovTrend}>
              <Ionicons name="arrow-up" size={16} color="#10b981" />
              <Text style={styles.aovTrendText}>+3.8% vs last period</Text>
            </View>
          </View>
        </View>

        {/* Top Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Products</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.productsList}>
            {analytics.topProducts.map((product, index) => (
              <View key={product.id} style={styles.productCard}>
                <View style={styles.productRank}>
                  <Text style={styles.productRankText}>#{index + 1}</Text>
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                  <View style={styles.productStats}>
                    <Text style={styles.productStatText}>{product.sales} sales</Text>
                    <Text style={styles.productStatSeparator}>•</Text>
                    <Text style={styles.productStatText}>{formatNumber(product.views)} views</Text>
                  </View>
                </View>
                <View style={styles.productRevenue}>
                  <Text style={styles.productRevenueValue}>{formatCurrency(product.revenue)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>

          <View style={styles.activityList}>
            {analytics.recentActivity.map((activity) => (
              <View key={activity.id} style={styles.activityCard}>
                <View style={[
                  styles.activityIcon,
                  activity.type === 'order' && { backgroundColor: '#d1fae5' },
                  activity.type === 'view' && { backgroundColor: '#dbeafe' },
                  activity.type === 'review' && { backgroundColor: '#fef3c7' },
                ]}>
                  <Ionicons
                    name={
                      activity.type === 'order' ? 'cart-outline' :
                      activity.type === 'view' ? 'eye-outline' :
                      'star-outline'
                    }
                    size={20}
                    color={
                      activity.type === 'order' ? '#10b981' :
                      activity.type === 'view' ? '#3b82f6' :
                      '#f59e0b'
                    }
                  />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>
                    {activity.type === 'order' ? 'New order' :
                     activity.type === 'view' ? 'Product viewed' :
                     'New review'}
                  </Text>
                  <Text style={styles.activityProduct}>{activity.productName}</Text>
                  <Text style={styles.activityTime}>
                    {new Date(activity.timestamp).toLocaleString()}
                  </Text>
                </View>
                {activity.amount && (
                  <Text style={styles.activityAmount}>{activity.amount}</Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Performance Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Insights</Text>

          <View style={styles.insightsList}>
            <View style={styles.insightCard}>
              <Ionicons name="lightbulb-outline" size={20} color="#f59e0b" />
              <Text style={styles.insightText}>
                Your top product accounts for 54% of total revenue. Consider increasing inventory.
              </Text>
            </View>
            <View style={styles.insightCard}>
              <Ionicons name="trending-up-outline" size={20} color="#10b981" />
              <Text style={styles.insightText}>
                Conversion rate improved by 5.2% this period. Keep up the great work!
              </Text>
            </View>
            <View style={styles.insightCard}>
              <Ionicons name="information-circle-outline" size={20} color="#3b82f6" />
              <Text style={styles.insightText}>
                Weekend traffic is 23% higher. Consider scheduling promotions for Saturday.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  content: {
    flex: 1,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: '#3b82f6',
  },
  timeRangeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  timeRangeTextActive: {
    color: '#ffffff',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricChange: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  metricChangeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '500',
  },
  aovCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  aovValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  aovTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aovTrendText: {
    fontSize: 13,
    color: '#10b981',
  },
  productsList: {
    gap: 8,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  productRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  productRankText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  productStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  productStatText: {
    fontSize: 12,
    color: '#6b7280',
  },
  productStatSeparator: {
    fontSize: 12,
    color: '#9ca3af',
  },
  productRevenue: {
    marginLeft: 12,
  },
  productRevenueValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  activityList: {
    gap: 8,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  activityProduct: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  insightsList: {
    gap: 12,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
});