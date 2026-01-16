/**
 * Seller Analytics Dashboard
 * Comprehensive analytics for sellers
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { sellerAnalyticsService, SellerMetrics, TopProduct } from '../../src/services/sellerAnalyticsService';
import { THEME } from '../../src/constants/theme';

type Timeframe = 'day' | 'week' | 'month';

export default function SellerAnalyticsPage() {
  const [timeframe, setTimeframe] = useState<Timeframe>('week');
  const [metrics, setMetrics] = useState<SellerMetrics | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [orderStats, setOrderStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [metricsData, productsData, orderData] = await Promise.all([
        sellerAnalyticsService.getMetrics(timeframe),
        sellerAnalyticsService.getTopProducts(),
        sellerAnalyticsService.getOrderStats(),
      ]);

      setMetrics(metricsData);
      setTopProducts(productsData);
      setOrderStats(orderData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  // Refresh data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const renderMetricCard = (title: string, value: string | number, icon: string, color: string, trend?: number) => (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <View style={styles.metricHeader}>
        <Ionicons name={icon as any} size={20} color={color} />
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      {trend !== undefined && (
        <View style={styles.metricTrend}>
          <Ionicons
            name={trend >= 0 ? 'trending-up' : 'trending-down'}
            size={14}
            color={trend >= 0 ? THEME.colors.success : THEME.colors.error}
          />
          <Text style={[styles.metricTrendText, trend >= 0 ? styles.trendUp : styles.trendDown]}>
            {Math.abs(trend)}%
          </Text>
        </View>
      )}
    </View>
  );

  const renderTimeframeButton = (tf: Timeframe) => (
    <TouchableOpacity
      style={[styles.timeframeButton, timeframe === tf && styles.activeTimeframeButton]}
      onPress={() => setTimeframe(tf)}
    >
      <Text style={[styles.timeframeText, timeframe === tf && styles.activeTimeframeText]}>
        {tf.charAt(0).toUpperCase() + tf.slice(1)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={THEME.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seller Analytics</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.headerButton}>
          <Ionicons name="refresh" size={24} color={THEME.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.timeframeContainer}>
        {renderTimeframeButton('day')}
        {renderTimeframeButton('week')}
        {renderTimeframeButton('month')}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        ) : metrics ? (
          <>
            {/* Revenue Metrics */}
            <Text style={styles.sectionTitle}>Revenue & Sales</Text>
            <View style={styles.metricsGrid}>
              {renderMetricCard('Total Sales', `$${metrics.totalSales.toLocaleString()}`, 'cash', THEME.colors.success, metrics.revenueGrowth)}
              {renderMetricCard('Total Orders', metrics.totalOrders.toLocaleString(), 'cart', THEME.colors.primary)}
              {renderMetricCard('Avg Order Value', `$${metrics.averageOrderValue.toFixed(2)}`, 'trending-up', THEME.colors.info)}
              {renderMetricCard('Conversion Rate', `${metrics.conversionRate}%`, 'people', THEME.colors.warning)}
            </View>

            {/* Performance Metrics */}
            <Text style={styles.sectionTitle}>Performance</Text>
            <View style={styles.metricsGrid}>
              {renderMetricCard('Customer Satisfaction', `${metrics.customerSatisfaction}/5`, 'star', THEME.colors.warning)}
              {renderMetricCard('Response Time', `${metrics.responseTime}h`, 'time', THEME.colors.info)}
              {renderMetricCard('Return Rate', `${metrics.returnRate}%`, 'refresh', THEME.colors.error)}
              {renderMetricCard('Repeat Rate', `${metrics.repeatCustomerRate}%`, 'repeat', THEME.colors.success)}
            </View>

            {/* Order Status */}
            {orderStats && (
              <>
                <Text style={styles.sectionTitle}>Order Status</Text>
                <View style={styles.orderStatsCard}>
                  <View style={styles.orderStatItem}>
                    <Text style={styles.orderStatValue}>{orderStats.pending}</Text>
                    <Text style={styles.orderStatLabel}>Pending</Text>
                  </View>
                  <View style={styles.orderStatItem}>
                    <Text style={styles.orderStatValue}>{orderStats.processing}</Text>
                    <Text style={styles.orderStatLabel}>Processing</Text>
                  </View>
                  <View style={styles.orderStatItem}>
                    <Text style={styles.orderStatValue}>{orderStats.shipped}</Text>
                    <Text style={styles.orderStatLabel}>Shipped</Text>
                  </View>
                  <View style={styles.orderStatItem}>
                    <Text style={styles.orderStatValue}>{orderStats.delivered}</Text>
                    <Text style={styles.orderStatLabel}>Delivered</Text>
                  </View>
                  {orderStats.returns > 0 && (
                    <View style={styles.orderStatItem}>
                      <Text style={[styles.orderStatValue, { color: THEME.colors.error }]}>{orderStats.returns}</Text>
                      <Text style={styles.orderStatLabel}>Returns</Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {/* Top Products */}
            <Text style={styles.sectionTitle}>Top Products</Text>
            <View style={styles.productsContainer}>
              {topProducts.map((product, index) => (
                <View key={product.productId} style={styles.productCard}>
                  <View style={styles.productRank}>
                    <Text style={styles.productRankText}>#{index + 1}</Text>
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productTitle} numberOfLines={1}>
                      {product.title}
                    </Text>
                    <Text style={styles.productStats}>
                      {product.sales} sales • ${product.revenue.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.productConversion}>
                    <Text style={styles.productConversionRate}>{product.conversionRate}%</Text>
                    <Text style={styles.productConversionLabel}>Conv</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/marketplace/seller/create-listing')}
            >
              <Ionicons name="add-circle" size={24} color={THEME.colors.primary} />
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Create Listing</Text>
                <Text style={styles.actionDescription}>Add a new product to your store</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={THEME.colors.gray} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/marketplace/seller/dashboard')}
            >
              <Ionicons name="grid" size={24} color={THEME.colors.secondary} />
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Manage Orders</Text>
                <Text style={styles.actionDescription}>View and manage your orders</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={THEME.colors.gray} />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color={THEME.colors.error} />
            <Text style={styles.errorText}>Failed to load analytics</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: THEME.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  timeframeContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.white,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTimeframeButton: {
    backgroundColor: THEME.colors.primary + '10',
  },
  timeframeText: {
    fontSize: 14,
    color: THEME.colors.gray,
  },
  activeTimeframeText: {
    color: THEME.colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: THEME.colors.gray,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: THEME.colors.error,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.colors.text,
    marginTop: 20,
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: THEME.colors.white,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    marginLeft: 8,
    fontSize: 12,
    color: THEME.colors.gray,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  metricTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metricTrendText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  trendUp: {
    color: THEME.colors.success,
  },
  trendDown: {
    color: THEME.colors.error,
  },
  orderStatsCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: THEME.colors.white,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  orderStatItem: {
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
  },
  orderStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  orderStatLabel: {
    fontSize: 12,
    color: THEME.colors.gray,
    marginTop: 4,
  },
  productsContainer: {
    backgroundColor: THEME.colors.white,
    borderRadius: 12,
    padding: 16,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  productRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.primary,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: 2,
  },
  productStats: {
    fontSize: 12,
    color: THEME.colors.gray,
  },
  productConversion: {
    alignItems: 'flex-end',
  },
  productConversionRate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.success,
  },
  productConversionLabel: {
    fontSize: 10,
    color: THEME.colors.gray,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  actionDescription: {
    fontSize: 13,
    color: THEME.colors.gray,
  },
});