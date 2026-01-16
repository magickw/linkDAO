/**
 * Admin Dashboard Page
 * Mobile admin interface for managing the platform
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
import { adminService, AdminStats, ModerationItem, SellerApplication } from '../../src/services/adminService';
import { useAuthStore } from '../../src/store/authStore';
import { THEME } from '../../src/constants/theme';

type AdminTab = 'dashboard' | 'moderation' | 'sellers' | 'users';

export default function AdminDashboardPage() {
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [moderationQueue, setModerationQueue] = useState<ModerationItem[]>([]);
  const [sellerApplications, setSellerApplications] = useState<SellerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsData, moderationData, sellerData] = await Promise.all([
        adminService.getAdminStats(),
        adminService.getModerationQueue('pending'),
        adminService.getSellerApplications('pending'),
      ]);

      setStats(statsData);
      setModerationQueue(moderationData);
      setSellerApplications(sellerData);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const renderStatCard = (title: string, value: number, icon: string, color: string) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon as any} size={24} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
    </View>
  );

  const renderModerationItem = (item: ModerationItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.itemCard}
      onPress={() => router.push(`/admin/moderation/${item.id}`)}
    >
      <View style={styles.itemHeader}>
        <View style={styles.itemTypeBadge}>
          <Ionicons
            name={item.type === 'post' ? 'document-text' : item.type === 'comment' ? 'chatbubble' : 'person'} as any
            size={16}
            color={THEME.colors.white}
          />
          <Text style={styles.itemTypeText}>{item.type.toUpperCase()}</Text>
        </View>
        <Text style={styles.itemDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      <Text style={styles.itemReason} numberOfLines={2}>
        {item.reason}
      </Text>
      <View style={styles.itemFooter}>
        <Text style={styles.itemReporter}>Reported by: {item.reportedBy.slice(0, 8)}...</Text>
        <Ionicons name="chevron-forward" size={20} color={THEME.colors.gray} />
      </View>
    </TouchableOpacity>
  );

  const renderSellerApplication = (app: SellerApplication) => (
    <TouchableOpacity
      key={app.id}
      style={styles.itemCard}
      onPress={() => router.push(`/admin/seller/${app.id}`)}
    >
      <View style={styles.itemHeader}>
        <Text style={styles.storeName}>{app.storeName}</Text>
        <Text style={styles.itemDate}>{new Date(app.submittedAt).toLocaleDateString()}</Text>
      </View>
      <Text style={styles.itemDescription} numberOfLines={2}>
        {app.description}
      </Text>
      <View style={styles.itemFooter}>
        <Text style={styles.itemReporter}>Applicant: {app.userId.slice(0, 8)}...</Text>
        <Ionicons name="chevron-forward" size={20} color={THEME.colors.gray} />
      </View>
    </TouchableOpacity>
  );

  const renderTabButton = (tab: AdminTab, label: string, icon: string, badge?: number) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons
        name={icon as any}
        size={20}
        color={activeTab === tab ? THEME.colors.primary : THEME.colors.gray}
      />
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{label}</Text>
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color={THEME.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        {renderTabButton('dashboard', 'Dashboard', 'grid-outline')}
        {renderTabButton('moderation', 'Moderation', 'shield-outline', moderationQueue.length)}
        {renderTabButton('sellers', 'Sellers', 'storefront-outline', sellerApplications.length)}
        {renderTabButton('users', 'Users', 'people-outline')}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        ) : (
          <>
            {activeTab === 'dashboard' && stats && (
              <View style={styles.dashboardContent}>
                <Text style={styles.sectionTitle}>Overview</Text>
                <View style={styles.statsGrid}>
                  {renderStatCard('Total Users', stats.totalUsers, 'people', THEME.colors.primary)}
                  {renderStatCard('Active Users', stats.activeUsers, 'person-circle', THEME.colors.success)}
                  {renderStatCard('Total Posts', stats.totalPosts, 'document-text', THEME.colors.secondary)}
                  {renderStatCard('Communities', stats.totalCommunities, 'chatbubbles', THEME.colors.warning)}
                </View>

                <View style={styles.statsGrid}>
                  {renderStatCard('Pending Reports', stats.pendingReports, 'alert-circle', THEME.colors.error)}
                  {renderStatCard('Seller Applications', stats.pendingSellerApplications, 'storefront', THEME.colors.info)}
                  {renderStatCard('Today Signups', stats.todaySignups, 'person-add', THEME.colors.success)}
                  {renderStatCard('Today Posts', stats.todayPosts, 'create', THEME.colors.primary)}
                </View>

                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => router.push('/admin/users')}
                >
                  <Ionicons name="people" size={20} color={THEME.colors.primary} />
                  <Text style={styles.quickActionText}>Manage Users</Text>
                  <Ionicons name="chevron-forward" size={20} color={THEME.colors.gray} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => router.push('/admin/system-health')}
                >
                  <Ionicons name="pulse" size={20} color={THEME.colors.success} />
                  <Text style={styles.quickActionText}>System Health</Text>
                  <Ionicons name="chevron-forward" size={20} color={THEME.colors.gray} />
                </TouchableOpacity>
              </View>
            )}

            {activeTab === 'moderation' && (
              <View style={styles.listContent}>
                <Text style={styles.sectionTitle}>
                  Pending Reports ({moderationQueue.length})
                </Text>
                {moderationQueue.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="checkmark-circle" size={48} color={THEME.colors.success} />
                    <Text style={styles.emptyText}>No pending reports</Text>
                  </View>
                ) : (
                  moderationQueue.map(renderModerationItem)
                )}
              </View>
            )}

            {activeTab === 'sellers' && (
              <View style={styles.listContent}>
                <Text style={styles.sectionTitle}>
                  Pending Applications ({sellerApplications.length})
                </Text>
                {sellerApplications.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="checkmark-circle" size={48} color={THEME.colors.success} />
                    <Text style={styles.emptyText}>No pending applications</Text>
                  </View>
                ) : (
                  sellerApplications.map(renderSellerApplication)
                )}
              </View>
            )}

            {activeTab === 'users' && (
              <View style={styles.listContent}>
                <Text style={styles.sectionTitle}>User Management</Text>
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => router.push('/admin/users')}
                >
                  <Ionicons name="search" size={20} color={THEME.colors.primary} />
                  <Text style={styles.quickActionText}>Search Users</Text>
                  <Ionicons name="chevron-forward" size={20} color={THEME.colors.gray} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => router.push('/admin/users?status=suspended')}
                >
                  <Ionicons name="ban" size={20} color={THEME.colors.error} />
                  <Text style={styles.quickActionText}>Suspended Users</Text>
                  <Ionicons name="chevron-forward" size={20} color={THEME.colors.gray} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => router.push('/admin/users?role=admin')}
                >
                  <Ionicons name="shield" size={20} color={THEME.colors.warning} />
                  <Text style={styles.quickActionText}>Admin Users</Text>
                  <Ionicons name="chevron-forward" size={20} color={THEME.colors.gray} />
                </TouchableOpacity>
              </View>
            )}
          </>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.white,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTabButton: {
    backgroundColor: THEME.colors.primary + '10',
  },
  tabText: {
    marginLeft: 6,
    fontSize: 12,
    color: THEME.colors.gray,
  },
  activeTabText: {
    color: THEME.colors.primary,
    fontWeight: '600',
  },
  badge: {
    marginLeft: 4,
    backgroundColor: THEME.colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: THEME.colors.white,
    fontSize: 10,
    fontWeight: 'bold',
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
  dashboardContent: {},
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
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
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTitle: {
    marginLeft: 8,
    fontSize: 12,
    color: THEME.colors.gray,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  quickActionButton: {
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
  quickActionText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: THEME.colors.text,
  },
  listContent: {},
  itemCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  itemTypeText: {
    marginLeft: 4,
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.white,
  },
  itemDate: {
    fontSize: 12,
    color: THEME.colors.gray,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  itemReason: {
    fontSize: 14,
    color: THEME.colors.text,
    marginBottom: 8,
  },
  itemDescription: {
    fontSize: 14,
    color: THEME.colors.gray,
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemReporter: {
    fontSize: 12,
    color: THEME.colors.gray,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: THEME.colors.gray,
  },
});