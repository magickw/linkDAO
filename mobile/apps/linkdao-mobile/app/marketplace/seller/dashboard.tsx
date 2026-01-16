/**
 * Comprehensive Seller Dashboard Screen
 * Mobile-optimized full-featured seller dashboard based on web app
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface DashboardStats {
  totalSales: number;
  totalRevenue: string;
  activeListings: number;
  pendingOrders: number;
  completedOrders: number;
  rating: number;
  reviews: number;
  views: number;
  favorites: number;
}

interface SellerProfile {
  id: string;
  walletAddress: string;
  storeName: string;
  bio: string;
  storeDescription: string;
  location: string;
  websiteUrl: string;
  profileImage: string;
  coverImage: string;
  verified: boolean;
  daoApproved: boolean;
  rating: number;
  reputation: number;
}

interface Listing {
  id: string;
  title: string;
  priceAmount: number;
  priceCurrency: string;
  images: string[];
  inventory: number;
  status: string;
  views: number;
  favorites: number;
  createdAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  buyerAddress: string;
  totalAmount: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  items: Array<{
    productId: string;
    title: string;
    quantity: number;
    price: string;
  }>;
}

interface Notification {
  id: string;
  type: 'order' | 'message' | 'review' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function SellerDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'orders' | 'analytics' | 'settings'>('overview');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editFormData, setEditFormData] = useState({
    storeName: '',
    bio: '',
    storeDescription: '',
    location: '',
    websiteUrl: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Authentication Required', 'Please connect your wallet first');
        router.push('/auth');
        return;
      }

      // Fetch all data in parallel
      const [profileRes, statsRes, listingsRes, ordersRes, notifRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/sellers/profile`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/sellers/dashboard`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/sellers/listings`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/sellers/orders`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/sellers/notifications`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (profileRes.ok) {
        const profileResult = await profileRes.json();
        if (profileResult.success && profileResult.data) {
          setProfile(profileResult.data);
          setEditFormData({
            storeName: profileResult.data.storeName || '',
            bio: profileResult.data.bio || '',
            storeDescription: profileResult.data.storeDescription || '',
            location: profileResult.data.location || '',
            websiteUrl: profileResult.data.websiteUrl || '',
          });
        }
      }

      if (statsRes.ok) {
        const statsResult = await statsRes.json();
        if (statsResult.success && statsResult.data) {
          setStats(statsResult.data);
        }
      }

      if (listingsRes.ok) {
        const listingsResult = await listingsRes.json();
        if (listingsResult.success && listingsResult.data) {
          setListings(listingsResult.data.products || listingsResult.data || []);
        }
      }

      if (ordersRes.ok) {
        const ordersResult = await ordersRes.json();
        if (ordersResult.success && ordersResult.data) {
          setOrders(ordersResult.data.orders || []);
        }
      }

      if (notifRes.ok) {
        const notifResult = await notifRes.json();
        if (notifResult.success && notifResult.data) {
          setNotifications(notifResult.data.notifications || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const handleUpdateProfile = async () => {
    try {
      setSaving(true);

      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/sellers/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(editFormData),
      });

      const result = await response.json();

      if (result.success) {
        setProfile({ ...profile!, ...editFormData });
        setShowEditProfile(false);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        Alert.alert('Error', result.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setSaving(false);
    }
  };

  const getAuthToken = async (): Promise<string | null> => {
    // TODO: Implement proper token retrieval from secure storage
    return null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'processing': return '#3b82f6';
      case 'shipped': return '#8b5cf6';
      case 'delivered': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'processing': return 'cog-outline';
      case 'shipped': return 'cube-outline';
      case 'delivered': return 'checkmark-circle-outline';
      case 'cancelled': return 'close-circle-outline';
      default: return 'help-outline';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seller Dashboard</Text>
        <TouchableOpacity onPress={() => setShowEditProfile(true)}>
          <Ionicons name="settings-outline" size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Header */}
        {profile && (
          <View style={styles.profileSection}>
            <View style={styles.profileImageContainer}>
              {profile.profileImage ? (
                <Image source={{ uri: profile.profileImage }} style={styles.profileImage} />
              ) : (
                <View style={[styles.profileImage, { backgroundColor: '#3b82f6' }]}>
                  <Ionicons name="storefront" size={32} color="#ffffff" />
                </View>
              )}
              {profile.verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.storeName}>{profile.storeName}</Text>
              <Text style={styles.bio} numberOfLines={2}>{profile.bio}</Text>
              <View style={styles.profileStats}>
                <View style={styles.statItem}>
                  <Ionicons name="star" size={16} color="#f59e0b" />
                  <Text style={styles.statValue}>{profile.rating.toFixed(1)}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Ionicons name="eye" size={16} color="#6b7280" />
                  <Text style={styles.statValue}>{stats?.views || 0}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Ionicons name="heart" size={16} color="#ef4444" />
                  <Text style={styles.statValue}>{stats?.favorites || 0}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={styles.statIconContainer} style={{ backgroundColor: '#10b981' }}>
                  <Ionicons name="cash" size={24} color="#ffffff" />
                </View>
                <Text style={styles.statValue}>{stats.totalRevenue}</Text>
                <Text style={styles.statLabel}>Revenue</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statIconContainer} style={{ backgroundColor: '#3b82f6' }}>
                  <Ionicons name="cart" size={24} color="#ffffff" />
                </View>
                <Text style={styles.statValue}>{stats.totalSales}</Text>
                <Text style={styles.statLabel}>Sales</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statIconContainer} style={{ backgroundColor: '#f59e0b' }}>
                  <Ionicons name="list" size={24} color="#ffffff" />
                </View>
                <Text style={styles.statValue}>{stats.activeListings}</Text>
                <Text style={styles.statLabel}>Listings</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statIconContainer} style={{ backgroundColor: '#ef4444' }}>
                  <Ionicons name="time" size={24} color="#ffffff" />
                </View>
                <Text style={styles.statValue}>{stats.pendingOrders}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
            </View>
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Ionicons name="grid" size={20} color={activeTab === 'overview' ? '#ffffff' : '#6b7280'} />
            <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'listings' && styles.tabActive]}
            onPress={() => setActiveTab('listings')}
          >
            <Ionicons name="list" size={20} color={activeTab === 'listings' ? '#ffffff' : '#6b7280'} />
            <Text style={[styles.tabText, activeTab === 'listings' && styles.tabTextActive]}>Listings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'orders' && styles.tabActive]}
            onPress={() => setActiveTab('orders')}
          >
            <Ionicons name="receipt" size={20} color={activeTab === 'orders' ? '#ffffff' : '#6b7280'} />
            <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'analytics' && styles.tabActive]}
            onPress={() => setActiveTab('analytics')}
          >
            <Ionicons name="bar-chart" size={20} color={activeTab === 'analytics' ? '#ffffff' : '#6b7280'} />
            <Text style={[styles.tabText, activeTab === 'analytics' && styles.tabTextActive]}>Analytics</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'overview' && (
            <View>
              {/* Quick Actions */}
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/marketplace/seller/create-listing')}
              >
                <Ionicons name="add-circle" size={24} color="#3b82f6" />
                <Text style={styles.actionButtonText}>Create New Listing</Text>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setActiveTab('orders')}
              >
                <Ionicons name="cube" size={24} color="#3b82f6" />
                <Text style={styles.actionButtonText}>Manage Orders</Text>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/marketplace/seller/payouts')}
              >
                <Ionicons name="wallet" size={24} color="#3b82f6" />
                <Text style={styles.actionButtonText}>Payouts</Text>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>

              {/* Recent Notifications */}
              {notifications.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Recent Notifications</Text>
                  {notifications.slice(0, 5).map((notif) => (
                    <View key={notif.id} style={styles.notificationItem}>
                      <Ionicons
                        name="notifications-outline"
                        size={20}
                        color={notif.read ? '#9ca3af' : '#3b82f6'}
                      />
                      <View style={styles.notificationContent}>
                        <Text style={styles.notificationTitle}>{notif.title}</Text>
                        <Text style={styles.notificationMessage} numberOfLines={1}>{notif.message}</Text>
                      </View>
                      <Text style={styles.notificationTime}>
                        {new Date(notif.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}

          {activeTab === 'listings' && (
            <View>
              <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push('/marketplace/seller/create-listing')}
              >
                <Ionicons name="add" size={24} color="#ffffff" />
              </TouchableOpacity>
              {listings.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="list-outline" size={64} color="#9ca3af" />
                  <Text style={styles.emptyText}>No listings yet</Text>
                  <Text style={styles.emptySubtext}>Create your first listing to start selling</Text>
                </View>
              ) : (
                listings.map((listing) => (
                  <View key={listing.id} style={styles.listingCard}>
                    <View style={styles.listingImage}>
                      {listing.images && listing.images.length > 0 ? (
                        <Image source={{ uri: listing.images[0] }} style={styles.listingImage} />
                      ) : (
                        <View style={[styles.listingImage, { backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' }]}>
                          <Ionicons name="image-outline" size={32} color="#ffffff" />
                        </View>
                      )}
                      <View style={[styles.statusBadge, { backgroundColor: listing.status === 'active' ? '#10b981' : '#6b7280' }]}>
                        <Text style={styles.statusText}>{listing.status}</Text>
                      </View>
                    </View>
                    <View style={styles.listingInfo}>
                      <Text style={styles.listingTitle} numberOfLines={2}>{listing.title}</Text>
                      <View style={styles.listingMeta}>
                        <Text style={styles.listingPrice}>${listing.priceAmount}</Text>
                        <View style={styles.listingViews}>
                          <Ionicons name="eye" size={14} color="#6b7280" />
                          <Text style={styles.listingViewsText}>{listing.views}</Text>
                        </View>
                        <View style={styles.listingFavorites}>
                          <Ionicons name="heart" size={14} color="#ef4444" />
                          <Text style={styles.listingFavoritesText}>{listing.favorites}</Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.listingAction}
                      onPress={() => router.push(`/marketplace/seller/listing/${listing.id}`)}
                    >
                      <Ionicons name="create-outline" size={20} color="#3b82f6" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === 'orders' && (
            <View>
              {orders.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="receipt-outline" size={64} color="#9ca3af" />
                  <Text style={styles.emptyText}>No orders yet</Text>
                  <Text style={styles.emptySubtext}>Orders will appear here when customers purchase your products</Text>
                </View>
              ) : (
                orders.map((order) => (
                  <View key={order.id} style={styles.orderCard}>
                    <View style={styles.orderHeader}>
                      <View>
                        <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                        <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString()}</Text>
                      </View>
                      <View style={[styles.orderStatus, { backgroundColor: `${getStatusColor(order.status)}20` }]}>
                        <Ionicons name={getStatusIcon(order.status) as any} size={16} color={getStatusColor(order.status)} />
                        <Text style={[styles.orderStatusText, { color: getStatusColor(order.status) }]}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.orderItems}>
                      {order.items.map((item, index) => (
                        <View key={index} style={styles.orderItem}>
                          <Text style={styles.orderItemTitle}>{item.title}</Text>
                          <Text style={styles.orderItemDetails}>Qty: {item.quantity} × ${item.price}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.orderFooter}>
                      <Text style={styles.orderTotal}>Total: {order.totalAmount}</Text>
                      <TouchableOpacity
                        style={styles.orderAction}
                        onPress={() => router.push(`/marketplace/seller/order/${order.id}`)}
                      >
                        <Text style={styles.orderActionText}>View Details</Text>
                        <Ionicons name="chevron-forward" size={16} color="#3b82f6" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === 'analytics' && (
            <View style={styles.emptyState}>
              <Ionicons name="bar-chart-outline" size={64} color="#9ca3af" />
              <Text style={styles.emptyText}>Analytics Coming Soon</Text>
              <Text style={styles.emptySubtext}>Detailed analytics and reports will be available here</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfile}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditProfile(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditProfile(false)}>
                <Ionicons name="close" size={24} color="#1f2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Store Name</Text>
                <TextInput
                  style={styles.input}
                  value={editFormData.storeName}
                  onChangeText={(value) => setEditFormData({ ...editFormData, storeName: value })}
                  placeholder="My Store"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editFormData.bio}
                  onChangeText={(value) => setEditFormData({ ...editFormData, bio: value })}
                  placeholder="Tell buyers about yourself..."
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Store Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editFormData.storeDescription}
                  onChangeText={(value) => setEditFormData({ ...editFormData, storeDescription: value })}
                  placeholder="Describe what you offer..."
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Location</Text>
                <TextInput
                  style={styles.input}
                  value={editFormData.location}
                  onChangeText={(value) => setEditFormData({ ...editFormData, location: value })}
                  placeholder="City, Country"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Website URL</Text>
                <TextInput
                  style={styles.input}
                  value={editFormData.websiteUrl}
                  onChangeText={(value) => setEditFormData({ ...editFormData, websiteUrl: value })}
                  placeholder="https://yourwebsite.com"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowEditProfile(false)}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary, saving && styles.modalButtonDisabled]}
                onPress={handleUpdateProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalButtonTextPrimary}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
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
  profileSection: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 4,
  },
  profileInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  profileStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 4,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 12,
  },
  statsSection: {
    backgroundColor: '#ffffff',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: (375 - 64) / 2,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  tabActive: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  tabContent: {
    padding: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginLeft: 12,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  notificationContent: {
    flex: 1,
    marginLeft: 12,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  notificationMessage: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  notificationTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  listingCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  listingImage: {
    width: 100,
    height: 100,
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  listingInfo: {
    flex: 1,
    padding: 12,
  },
  listingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  listingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listingPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  listingViews: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listingViewsText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  listingFavorites: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listingFavoritesText: {
    fontSize: 12,
    color: '#ef4444',
    marginLeft: 4,
  },
  listingAction: {
    padding: 12,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  orderDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  orderStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  orderStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderItems: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  orderItem: {
    marginBottom: 8,
  },
  orderItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  orderItemDetails: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  orderAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalBody: {
    padding: 20,
    paddingBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: '#f3f4f6',
  },
  modalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalButtonPrimary: {
    backgroundColor: '#3b82f6',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});