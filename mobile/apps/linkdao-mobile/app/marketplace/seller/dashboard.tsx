/**
 * Comprehensive Seller Dashboard Screen
 * Mobile-optimized full-featured seller dashboard matching web app features
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { enhancedAuthService } from '@linkdao/shared/services/enhancedAuthService';

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
  tierProgress?: number;
  currentTier?: string;
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
  // Business info
  businessType?: 'individual' | 'business';
  legalBusinessName?: string;
  taxId?: string;
  registeredAddressStreet?: string;
  registeredAddressCity?: string;
  registeredAddressState?: string;
  registeredAddressPostalCode?: string;
  registeredAddressCountry?: string;
  // Social links
  twitterHandle?: string;
  discordHandle?: string;
  telegramHandle?: string;
  linkedinHandle?: string;
  ensHandle?: string;
  // Payout
  payoutMethod?: 'crypto' | 'bank' | 'paypal';
  cryptoAddress?: string;
  preferredCurrency?: string;
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
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  createdAt: string;
  updatedAt?: string;
  shippingAddress?: string;
  trackingNumber?: string;
  items: Array<{
    productId: string;
    title: string;
    quantity: number;
    price: string;
  }>;
  timeline?: Array<{
    status: string;
    timestamp: string;
    note?: string;
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

type TabType = 'overview' | 'listings' | 'orders' | 'analytics' | 'settings';
type SettingsTab = 'profile' | 'business' | 'social' | 'payout';

export default function SellerDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('profile');
  const [saving, setSaving] = useState(false);

  // Search and filter state
  const [listingSearch, setListingSearch] = useState('');
  const [listingFilter, setListingFilter] = useState<'all' | 'active' | 'draft' | 'sold'>('all');
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'processing' | 'shipped' | 'delivered'>('all');

  // Form data for editing
  const [editFormData, setEditFormData] = useState({
    // Profile
    storeName: '',
    bio: '',
    storeDescription: '',
    location: '',
    websiteUrl: '',
    profileImage: '',
    coverImage: '',
    // Business
    businessType: 'individual' as 'individual' | 'business',
    legalBusinessName: '',
    taxId: '',
    registeredAddressStreet: '',
    registeredAddressCity: '',
    registeredAddressState: '',
    registeredAddressPostalCode: '',
    registeredAddressCountry: '',
    // Social
    twitterHandle: '',
    discordHandle: '',
    telegramHandle: '',
    linkedinHandle: '',
    ensHandle: '',
    // Payout
    payoutMethod: 'crypto' as 'crypto' | 'bank' | 'paypal',
    cryptoAddress: '',
    preferredCurrency: 'USDC',
  });

  // Order detail modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [updatingOrderStatus, setUpdatingOrderStatus] = useState(false);
  const [profileNotFound, setProfileNotFound] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setProfileNotFound(false);

      const token = await enhancedAuthService.getAuthToken();
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

      if (profileRes.status === 404) {
        setProfileNotFound(true);
        setLoading(false);
        return;
      }

      if (profileRes.ok) {
        const profileResult = await profileRes.json();
        if (profileResult.success && profileResult.data) {
          setProfile(profileResult.data);
          initializeFormData(profileResult.data);
        } else {
          setProfileNotFound(true);
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
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const initializeFormData = (profileData: SellerProfile) => {
    setEditFormData({
      storeName: profileData.storeName || '',
      bio: profileData.bio || '',
      storeDescription: profileData.storeDescription || '',
      location: profileData.location || '',
      websiteUrl: profileData.websiteUrl || '',
      profileImage: profileData.profileImage || '',
      coverImage: profileData.coverImage || '',
      businessType: profileData.businessType || 'individual',
      legalBusinessName: profileData.legalBusinessName || '',
      taxId: profileData.taxId || '',
      registeredAddressStreet: profileData.registeredAddressStreet || '',
      registeredAddressCity: profileData.registeredAddressCity || '',
      registeredAddressState: profileData.registeredAddressState || '',
      registeredAddressPostalCode: profileData.registeredAddressPostalCode || '',
      registeredAddressCountry: profileData.registeredAddressCountry || '',
      twitterHandle: profileData.twitterHandle || '',
      discordHandle: profileData.discordHandle || '',
      telegramHandle: profileData.telegramHandle || '',
      linkedinHandle: profileData.linkedinHandle || '',
      ensHandle: profileData.ensHandle || '',
      payoutMethod: profileData.payoutMethod || 'crypto',
      cryptoAddress: profileData.cryptoAddress || profileData.walletAddress || '',
      preferredCurrency: profileData.preferredCurrency || 'USDC',
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const pickImage = async (type: 'profile' | 'cover') => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'profile' ? [1, 1] : [3, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;

        // Upload image to server
        const uploadedUrl = await uploadImage(imageUri, type);
        if (uploadedUrl) {
          setEditFormData(prev => ({
            ...prev,
            [type === 'profile' ? 'profileImage' : 'coverImage']: uploadedUrl
          }));
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const uploadImage = async (uri: string, type: 'profile' | 'cover'): Promise<string | null> => {
    try {
      const token = await enhancedAuthService.getAuthToken();
      if (!token) return null;

      const formData = new FormData();
      formData.append('image', {
        uri,
        type: 'image/jpeg',
        name: `${type}_image.jpg`,
      } as any);
      formData.append('context', type);

      const response = await fetch(`${API_BASE_URL}/api/images/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();
      if (result.success && result.data?.cdnUrl) {
        return result.data.cdnUrl;
      }
      return null;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setSaving(true);

      const token = await enhancedAuthService.getAuthToken();
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

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingOrderStatus(true);
      const token = await enhancedAuthService.getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/sellers/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        // Update local state
        setOrders(prev => prev.map(order =>
          order.id === orderId ? { ...order, status: newStatus as Order['status'] } : order
        ));
        if (selectedOrder?.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus as Order['status'] });
        }
        Alert.alert('Success', `Order status updated to ${newStatus}`);
      } else {
        Alert.alert('Error', result.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
      Alert.alert('Error', 'Failed to update order status');
    } finally {
      setUpdatingOrderStatus(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'processing': return '#3b82f6';
      case 'shipped': return '#8b5cf6';
      case 'delivered': return '#10b981';
      case 'cancelled': return '#ef4444';
      case 'refunded': return '#6b7280';
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
      case 'refunded': return 'return-down-back-outline';
      default: return 'help-outline';
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const statusFlow: Record<string, string> = {
      'pending': 'processing',
      'processing': 'shipped',
      'shipped': 'delivered',
    };
    return statusFlow[currentStatus] || null;
  };

  // Filter listings
  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.title.toLowerCase().includes(listingSearch.toLowerCase());
    const matchesFilter = listingFilter === 'all' || listing.status === listingFilter;
    return matchesSearch && matchesFilter;
  });

  // Filter orders
  const filteredOrders = orders.filter(order => {
    return orderFilter === 'all' || order.status === orderFilter;
  });

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

  const renderProfileHeader = () => (
    <View style={styles.profileHeaderContainer}>
      {/* Cover Image */}
      <View style={styles.coverImageContainer}>
        {profile?.coverImage ? (
          <Image source={{ uri: profile.coverImage }} style={styles.coverImage} />
        ) : (
          <View style={[styles.coverImage, { backgroundColor: '#3b82f6' }]} />
        )}
        <TouchableOpacity
          style={styles.editCoverButton}
          onPress={() => { setShowEditProfile(true); setSettingsTab('profile'); }}
        >
          <Ionicons name="camera-outline" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.profileImageContainer}>
          {profile?.profileImage ? (
            <Image source={{ uri: profile.profileImage }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileImage, { backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="storefront" size={32} color="#ffffff" />
            </View>
          )}
          {profile?.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
            </View>
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.storeName}>{profile?.storeName || 'My Store'}</Text>
          <Text style={styles.bio} numberOfLines={2}>{profile?.bio || 'Welcome to my store'}</Text>
          <View style={styles.profileStats}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={16} color="#f59e0b" />
              <Text style={styles.statValue}>{profile?.rating?.toFixed(1) || '0.0'}</Text>
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
          {stats?.currentTier && (
            <View style={styles.tierBadge}>
              <Ionicons name="ribbon" size={14} color="#8b5cf6" />
              <Text style={styles.tierText}>{stats.currentTier}</Text>
              {stats.tierProgress !== undefined && (
                <View style={styles.tierProgress}>
                  <View style={[styles.tierProgressBar, { width: `${stats.tierProgress}%` }]} />
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const renderStatsCards = () => (
    <View style={styles.statsSection}>
      <Text style={styles.sectionTitle}>Overview</Text>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { borderLeftColor: '#10b981' }]}>
          <View style={[styles.statIconContainer, { backgroundColor: '#10b981' }]}>
            <Ionicons name="cash" size={24} color="#ffffff" />
          </View>
          <Text style={styles.statCardValue}>{stats?.totalRevenue || '$0'}</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#3b82f6' }]}>
          <View style={[styles.statIconContainer, { backgroundColor: '#3b82f6' }]}>
            <Ionicons name="cart" size={24} color="#ffffff" />
          </View>
          <Text style={styles.statCardValue}>{stats?.totalSales || 0}</Text>
          <Text style={styles.statLabel}>Sales</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#f59e0b' }]}>
          <View style={[styles.statIconContainer, { backgroundColor: '#f59e0b' }]}>
            <Ionicons name="list" size={24} color="#ffffff" />
          </View>
          <Text style={styles.statCardValue}>{stats?.activeListings || 0}</Text>
          <Text style={styles.statLabel}>Listings</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#ef4444' }]}>
          <View style={[styles.statIconContainer, { backgroundColor: '#ef4444' }]}>
            <Ionicons name="time" size={24} color="#ffffff" />
          </View>
          <Text style={styles.statCardValue}>{stats?.pendingOrders || 0}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>
    </View>
  );

  const renderOverviewTab = () => (
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
        onPress={() => router.push('/marketplace/seller/analytics')}
      >
        <Ionicons name="bar-chart" size={24} color="#3b82f6" />
        <Text style={styles.actionButtonText}>View Analytics</Text>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => { setShowEditProfile(true); setSettingsTab('payout'); }}
      >
        <Ionicons name="wallet" size={24} color="#3b82f6" />
        <Text style={styles.actionButtonText}>Payout Settings</Text>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </TouchableOpacity>

      {/* Recent Notifications */}
      {notifications.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Recent Notifications</Text>
          {notifications.slice(0, 5).map((notif) => (
            <View key={notif.id} style={styles.notificationItem}>
              <Ionicons
                name={
                  notif.type === 'order' ? 'cart-outline' :
                  notif.type === 'message' ? 'chatbubble-outline' :
                  notif.type === 'review' ? 'star-outline' : 'notifications-outline'
                }
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
  );

  const renderListingsTab = () => (
    <View>
      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search listings..."
            placeholderTextColor="#9ca3af"
            value={listingSearch}
            onChangeText={setListingSearch}
          />
          {listingSearch.length > 0 && (
            <TouchableOpacity onPress={() => setListingSearch('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {(['all', 'active', 'draft', 'sold'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterChip, listingFilter === filter && styles.filterChipActive]}
            onPress={() => setListingFilter(filter)}
          >
            <Text style={[styles.filterChipText, listingFilter === filter && styles.filterChipTextActive]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/marketplace/seller/create-listing')}
      >
        <Ionicons name="add" size={24} color="#ffffff" />
      </TouchableOpacity>

      {filteredListings.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="list-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyText}>
            {listingSearch ? 'No listings found' : 'No listings yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            {listingSearch ? 'Try a different search term' : 'Create your first listing to start selling'}
          </Text>
        </View>
      ) : (
        filteredListings.map((listing) => (
          <TouchableOpacity
            key={listing.id}
            style={styles.listingCard}
            onPress={() => router.push(`/marketplace/seller/listing/${listing.id}`)}
          >
            <View style={styles.listingImageContainer}>
              {listing.images && listing.images.length > 0 ? (
                <Image source={{ uri: listing.images[0] }} style={styles.listingImage} />
              ) : (
                <View style={[styles.listingImage, { backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="image-outline" size={32} color="#9ca3af" />
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
                <View style={styles.listingStats}>
                  <Ionicons name="eye" size={14} color="#6b7280" />
                  <Text style={styles.listingStatsText}>{listing.views}</Text>
                  <Ionicons name="heart" size={14} color="#ef4444" style={{ marginLeft: 8 }} />
                  <Text style={styles.listingStatsText}>{listing.favorites}</Text>
                </View>
              </View>
              <Text style={styles.listingInventory}>
                {listing.inventory > 0 ? `${listing.inventory} in stock` : 'Out of stock'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.listingAction}
              onPress={() => router.push(`/marketplace/seller/listing/${listing.id}/edit`)}
            >
              <Ionicons name="create-outline" size={20} color="#3b82f6" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const renderOrdersTab = () => (
    <View>
      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {(['all', 'pending', 'processing', 'shipped', 'delivered'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterChip, orderFilter === filter && styles.filterChipActive]}
            onPress={() => setOrderFilter(filter)}
          >
            <Text style={[styles.filterChipText, orderFilter === filter && styles.filterChipTextActive]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filteredOrders.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyText}>No orders found</Text>
          <Text style={styles.emptySubtext}>
            {orderFilter !== 'all' ? 'Try a different filter' : 'Orders will appear here when customers purchase your products'}
          </Text>
        </View>
      ) : (
        filteredOrders.map((order) => (
          <TouchableOpacity
            key={order.id}
            style={styles.orderCard}
            onPress={() => { setSelectedOrder(order); setShowOrderDetail(true); }}
          >
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
              {order.items.slice(0, 2).map((item, index) => (
                <View key={index} style={styles.orderItem}>
                  <Text style={styles.orderItemTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.orderItemDetails}>Qty: {item.quantity} × ${item.price}</Text>
                </View>
              ))}
              {order.items.length > 2 && (
                <Text style={styles.moreItems}>+{order.items.length - 2} more items</Text>
              )}
            </View>
            <View style={styles.orderFooter}>
              <Text style={styles.orderTotal}>Total: {order.totalAmount}</Text>
              {getNextStatus(order.status) && (
                <TouchableOpacity
                  style={styles.orderQuickAction}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleUpdateOrderStatus(order.id, getNextStatus(order.status)!);
                  }}
                >
                  <Text style={styles.orderQuickActionText}>
                    Mark as {getNextStatus(order.status)}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const renderAnalyticsTab = () => (
    <View>
      <TouchableOpacity
        style={styles.analyticsLink}
        onPress={() => router.push('/marketplace/seller/analytics')}
      >
        <View style={styles.analyticsLinkContent}>
          <Ionicons name="bar-chart" size={48} color="#3b82f6" />
          <Text style={styles.analyticsLinkTitle}>View Full Analytics</Text>
          <Text style={styles.analyticsLinkSubtext}>
            Detailed metrics, top products, trends, and more
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#3b82f6" />
      </TouchableOpacity>

      {/* Quick Stats Preview */}
      <Text style={styles.sectionTitle}>Quick Stats</Text>
      <View style={styles.quickStatsGrid}>
        <View style={styles.quickStatCard}>
          <Text style={styles.quickStatValue}>{stats?.completedOrders || 0}</Text>
          <Text style={styles.quickStatLabel}>Completed Orders</Text>
        </View>
        <View style={styles.quickStatCard}>
          <Text style={styles.quickStatValue}>{stats?.reviews || 0}</Text>
          <Text style={styles.quickStatLabel}>Reviews</Text>
        </View>
        <View style={styles.quickStatCard}>
          <Text style={styles.quickStatValue}>{stats?.rating?.toFixed(1) || '0.0'}</Text>
          <Text style={styles.quickStatLabel}>Avg Rating</Text>
        </View>
      </View>
    </View>
  );

  const renderSettingsModal = () => (
    <Modal
      visible={showEditProfile}
      animationType="slide"
      transparent
      onRequestClose={() => setShowEditProfile(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Settings</Text>
            <TouchableOpacity onPress={() => setShowEditProfile(false)}>
              <Ionicons name="close" size={24} color="#1f2937" />
            </TouchableOpacity>
          </View>

          {/* Settings Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.settingsTabs}>
            {([
              { id: 'profile', label: 'Profile', icon: 'person-outline' },
              { id: 'business', label: 'Business', icon: 'briefcase-outline' },
              { id: 'social', label: 'Social', icon: 'share-social-outline' },
              { id: 'payout', label: 'Payout', icon: 'wallet-outline' },
            ] as const).map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.settingsTab, settingsTab === tab.id && styles.settingsTabActive]}
                onPress={() => setSettingsTab(tab.id)}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={18}
                  color={settingsTab === tab.id ? '#3b82f6' : '#6b7280'}
                />
                <Text style={[styles.settingsTabText, settingsTab === tab.id && styles.settingsTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView style={styles.modalBody}>
            {settingsTab === 'profile' && (
              <>
                {/* Profile Image */}
                <View style={styles.imageUploadSection}>
                  <Text style={styles.label}>Profile Image</Text>
                  <TouchableOpacity style={styles.imageUploadButton} onPress={() => pickImage('profile')}>
                    {editFormData.profileImage ? (
                      <Image source={{ uri: editFormData.profileImage }} style={styles.uploadPreview} />
                    ) : (
                      <View style={styles.uploadPlaceholder}>
                        <Ionicons name="camera-outline" size={32} color="#9ca3af" />
                        <Text style={styles.uploadPlaceholderText}>Upload Photo</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Cover Image */}
                <View style={styles.imageUploadSection}>
                  <Text style={styles.label}>Cover Image</Text>
                  <TouchableOpacity style={[styles.imageUploadButton, styles.coverUploadButton]} onPress={() => pickImage('cover')}>
                    {editFormData.coverImage ? (
                      <Image source={{ uri: editFormData.coverImage }} style={styles.coverPreview} />
                    ) : (
                      <View style={styles.uploadPlaceholder}>
                        <Ionicons name="image-outline" size={32} color="#9ca3af" />
                        <Text style={styles.uploadPlaceholderText}>Upload Cover</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Store Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={editFormData.storeName}
                    onChangeText={(value) => setEditFormData({ ...editFormData, storeName: value })}
                    placeholder="My Store"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Bio</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={editFormData.bio}
                    onChangeText={(value) => setEditFormData({ ...editFormData, bio: value })}
                    placeholder="Tell buyers about yourself..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Store Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={editFormData.storeDescription}
                    onChangeText={(value) => setEditFormData({ ...editFormData, storeDescription: value })}
                    placeholder="Describe what you offer..."
                    placeholderTextColor="#9ca3af"
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
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Website URL</Text>
                  <TextInput
                    style={styles.input}
                    value={editFormData.websiteUrl}
                    onChangeText={(value) => setEditFormData({ ...editFormData, websiteUrl: value })}
                    placeholder="https://yourwebsite.com"
                    placeholderTextColor="#9ca3af"
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </View>
              </>
            )}

            {settingsTab === 'business' && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Business Type</Text>
                  <View style={styles.radioGroup}>
                    <TouchableOpacity
                      style={[styles.radioOption, editFormData.businessType === 'individual' && styles.radioOptionActive]}
                      onPress={() => setEditFormData({ ...editFormData, businessType: 'individual' })}
                    >
                      <View style={[styles.radioCircle, editFormData.businessType === 'individual' && styles.radioCircleActive]} />
                      <Text style={styles.radioLabel}>Individual</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.radioOption, editFormData.businessType === 'business' && styles.radioOptionActive]}
                      onPress={() => setEditFormData({ ...editFormData, businessType: 'business' })}
                    >
                      <View style={[styles.radioCircle, editFormData.businessType === 'business' && styles.radioCircleActive]} />
                      <Text style={styles.radioLabel}>Business</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {editFormData.businessType === 'business' && (
                  <>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Legal Business Name</Text>
                      <TextInput
                        style={styles.input}
                        value={editFormData.legalBusinessName}
                        onChangeText={(value) => setEditFormData({ ...editFormData, legalBusinessName: value })}
                        placeholder="Company Name LLC"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Tax ID (EIN/SSN)</Text>
                      <TextInput
                        style={styles.input}
                        value={editFormData.taxId}
                        onChangeText={(value) => setEditFormData({ ...editFormData, taxId: value })}
                        placeholder="XX-XXXXXXX"
                        placeholderTextColor="#9ca3af"
                        secureTextEntry
                      />
                    </View>
                  </>
                )}

                <Text style={[styles.label, { marginTop: 16, marginBottom: 8 }]}>Registered Address</Text>

                <View style={styles.inputContainer}>
                  <Text style={styles.labelSmall}>Street Address</Text>
                  <TextInput
                    style={styles.input}
                    value={editFormData.registeredAddressStreet}
                    onChangeText={(value) => setEditFormData({ ...editFormData, registeredAddressStreet: value })}
                    placeholder="123 Main Street"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.rowInputs}>
                  <View style={[styles.inputContainer, { flex: 1 }]}>
                    <Text style={styles.labelSmall}>City</Text>
                    <TextInput
                      style={styles.input}
                      value={editFormData.registeredAddressCity}
                      onChangeText={(value) => setEditFormData({ ...editFormData, registeredAddressCity: value })}
                      placeholder="City"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                  <View style={[styles.inputContainer, { flex: 1, marginLeft: 12 }]}>
                    <Text style={styles.labelSmall}>State</Text>
                    <TextInput
                      style={styles.input}
                      value={editFormData.registeredAddressState}
                      onChangeText={(value) => setEditFormData({ ...editFormData, registeredAddressState: value })}
                      placeholder="State"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>

                <View style={styles.rowInputs}>
                  <View style={[styles.inputContainer, { flex: 1 }]}>
                    <Text style={styles.labelSmall}>Postal Code</Text>
                    <TextInput
                      style={styles.input}
                      value={editFormData.registeredAddressPostalCode}
                      onChangeText={(value) => setEditFormData({ ...editFormData, registeredAddressPostalCode: value })}
                      placeholder="12345"
                      placeholderTextColor="#9ca3af"
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={[styles.inputContainer, { flex: 1, marginLeft: 12 }]}>
                    <Text style={styles.labelSmall}>Country</Text>
                    <TextInput
                      style={styles.input}
                      value={editFormData.registeredAddressCountry}
                      onChangeText={(value) => setEditFormData({ ...editFormData, registeredAddressCountry: value })}
                      placeholder="USA"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>
              </>
            )}

            {settingsTab === 'social' && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Twitter / X Handle</Text>
                  <View style={styles.socialInputContainer}>
                    <Ionicons name="logo-twitter" size={20} color="#1DA1F2" />
                    <TextInput
                      style={styles.socialInput}
                      value={editFormData.twitterHandle}
                      onChangeText={(value) => setEditFormData({ ...editFormData, twitterHandle: value })}
                      placeholder="@username"
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Discord</Text>
                  <View style={styles.socialInputContainer}>
                    <Ionicons name="logo-discord" size={20} color="#5865F2" />
                    <TextInput
                      style={styles.socialInput}
                      value={editFormData.discordHandle}
                      onChangeText={(value) => setEditFormData({ ...editFormData, discordHandle: value })}
                      placeholder="username#1234"
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Telegram</Text>
                  <View style={styles.socialInputContainer}>
                    <Ionicons name="send" size={20} color="#0088cc" />
                    <TextInput
                      style={styles.socialInput}
                      value={editFormData.telegramHandle}
                      onChangeText={(value) => setEditFormData({ ...editFormData, telegramHandle: value })}
                      placeholder="@username"
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>LinkedIn</Text>
                  <View style={styles.socialInputContainer}>
                    <Ionicons name="logo-linkedin" size={20} color="#0A66C2" />
                    <TextInput
                      style={styles.socialInput}
                      value={editFormData.linkedinHandle}
                      onChangeText={(value) => setEditFormData({ ...editFormData, linkedinHandle: value })}
                      placeholder="linkedin.com/in/username"
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>ENS Name</Text>
                  <View style={styles.socialInputContainer}>
                    <Text style={styles.ensIcon}>🔷</Text>
                    <TextInput
                      style={styles.socialInput}
                      value={editFormData.ensHandle}
                      onChangeText={(value) => setEditFormData({ ...editFormData, ensHandle: value })}
                      placeholder="yourname.eth"
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              </>
            )}

            {settingsTab === 'payout' && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Payout Method</Text>
                  <View style={styles.payoutOptions}>
                    {([
                      { id: 'crypto', label: 'Crypto', icon: 'logo-bitcoin' },
                      { id: 'bank', label: 'Bank', icon: 'business-outline' },
                      { id: 'paypal', label: 'PayPal', icon: 'logo-paypal' },
                    ] as const).map((option) => (
                      <TouchableOpacity
                        key={option.id}
                        style={[styles.payoutOption, editFormData.payoutMethod === option.id && styles.payoutOptionActive]}
                        onPress={() => setEditFormData({ ...editFormData, payoutMethod: option.id })}
                      >
                        <Ionicons
                          name={option.icon as any}
                          size={24}
                          color={editFormData.payoutMethod === option.id ? '#3b82f6' : '#6b7280'}
                        />
                        <Text style={[styles.payoutOptionText, editFormData.payoutMethod === option.id && styles.payoutOptionTextActive]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {editFormData.payoutMethod === 'crypto' && (
                  <>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Wallet Address</Text>
                      <TextInput
                        style={styles.input}
                        value={editFormData.cryptoAddress}
                        onChangeText={(value) => setEditFormData({ ...editFormData, cryptoAddress: value })}
                        placeholder="0x..."
                        placeholderTextColor="#9ca3af"
                        autoCapitalize="none"
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Preferred Currency</Text>
                      <View style={styles.currencyOptions}>
                        {['USDC', 'USDT', 'ETH', 'DAI'].map((currency) => (
                          <TouchableOpacity
                            key={currency}
                            style={[styles.currencyOption, editFormData.preferredCurrency === currency && styles.currencyOptionActive]}
                            onPress={() => setEditFormData({ ...editFormData, preferredCurrency: currency })}
                          >
                            <Text style={[styles.currencyOptionText, editFormData.preferredCurrency === currency && styles.currencyOptionTextActive]}>
                              {currency}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </>
                )}

                {editFormData.payoutMethod === 'bank' && (
                  <View style={styles.comingSoon}>
                    <Ionicons name="construct-outline" size={48} color="#9ca3af" />
                    <Text style={styles.comingSoonText}>Bank payouts coming soon</Text>
                    <Text style={styles.comingSoonSubtext}>We're working on integrating bank transfers</Text>
                  </View>
                )}

                {editFormData.payoutMethod === 'paypal' && (
                  <View style={styles.comingSoon}>
                    <Ionicons name="construct-outline" size={48} color="#9ca3af" />
                    <Text style={styles.comingSoonText}>PayPal payouts coming soon</Text>
                    <Text style={styles.comingSoonSubtext}>We're working on PayPal integration</Text>
                  </View>
                )}
              </>
            )}
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
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderOrderDetailModal = () => (
    <Modal
      visible={showOrderDetail}
      animationType="slide"
      transparent
      onRequestClose={() => setShowOrderDetail(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Order Details</Text>
            <TouchableOpacity onPress={() => setShowOrderDetail(false)}>
              <Ionicons name="close" size={24} color="#1f2937" />
            </TouchableOpacity>
          </View>

          {selectedOrder && (
            <ScrollView style={styles.modalBody}>
              {/* Order Header */}
              <View style={styles.orderDetailHeader}>
                <Text style={styles.orderDetailNumber}>{selectedOrder.orderNumber}</Text>
                <View style={[styles.orderStatus, { backgroundColor: `${getStatusColor(selectedOrder.status)}20` }]}>
                  <Ionicons name={getStatusIcon(selectedOrder.status) as any} size={16} color={getStatusColor(selectedOrder.status)} />
                  <Text style={[styles.orderStatusText, { color: getStatusColor(selectedOrder.status) }]}>
                    {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                  </Text>
                </View>
              </View>

              <Text style={styles.orderDetailDate}>
                Placed on {new Date(selectedOrder.createdAt).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>

              {/* Status Actions */}
              {getNextStatus(selectedOrder.status) && (
                <TouchableOpacity
                  style={[styles.statusUpdateButton, updatingOrderStatus && styles.buttonDisabled]}
                  onPress={() => handleUpdateOrderStatus(selectedOrder.id, getNextStatus(selectedOrder.status)!)}
                  disabled={updatingOrderStatus}
                >
                  {updatingOrderStatus ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
                      <Text style={styles.statusUpdateButtonText}>
                        Mark as {getNextStatus(selectedOrder.status)}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Order Timeline */}
              {selectedOrder.timeline && selectedOrder.timeline.length > 0 && (
                <>
                  <Text style={styles.orderDetailSectionTitle}>Order Timeline</Text>
                  <View style={styles.timeline}>
                    {selectedOrder.timeline.map((event, index) => (
                      <View key={index} style={styles.timelineItem}>
                        <View style={[styles.timelineDot, { backgroundColor: getStatusColor(event.status) }]} />
                        {index < selectedOrder.timeline!.length - 1 && <View style={styles.timelineLine} />}
                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineStatus}>
                            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                          </Text>
                          <Text style={styles.timelineDate}>
                            {new Date(event.timestamp).toLocaleString()}
                          </Text>
                          {event.note && <Text style={styles.timelineNote}>{event.note}</Text>}
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* Order Items */}
              <Text style={styles.orderDetailSectionTitle}>Items</Text>
              {selectedOrder.items.map((item, index) => (
                <View key={index} style={styles.orderDetailItem}>
                  <View style={styles.orderDetailItemInfo}>
                    <Text style={styles.orderDetailItemTitle}>{item.title}</Text>
                    <Text style={styles.orderDetailItemMeta}>Qty: {item.quantity}</Text>
                  </View>
                  <Text style={styles.orderDetailItemPrice}>${item.price}</Text>
                </View>
              ))}

              <View style={styles.orderDetailTotal}>
                <Text style={styles.orderDetailTotalLabel}>Total</Text>
                <Text style={styles.orderDetailTotalValue}>{selectedOrder.totalAmount}</Text>
              </View>

              {/* Shipping Info */}
              {selectedOrder.shippingAddress && (
                <>
                  <Text style={styles.orderDetailSectionTitle}>Shipping Address</Text>
                  <Text style={styles.orderDetailAddress}>{selectedOrder.shippingAddress}</Text>
                </>
              )}

              {selectedOrder.trackingNumber && (
                <>
                  <Text style={styles.orderDetailSectionTitle}>Tracking</Text>
                  <View style={styles.trackingContainer}>
                    <Ionicons name="cube-outline" size={20} color="#3b82f6" />
                    <Text style={styles.trackingNumber}>{selectedOrder.trackingNumber}</Text>
                  </View>
                </>
              )}

              {/* Buyer Info */}
              <Text style={styles.orderDetailSectionTitle}>Buyer</Text>
              <View style={styles.buyerInfo}>
                <Ionicons name="wallet-outline" size={20} color="#6b7280" />
                <Text style={styles.buyerAddress} numberOfLines={1}>
                  {selectedOrder.buyerAddress}
                </Text>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  if (profileNotFound) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Seller Dashboard</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="storefront-outline" size={80} color="#3b82f6" />
          <Text style={styles.emptyText}>Become a Seller</Text>
          <Text style={styles.emptySubtext}>
            Start selling your products on LinkDAO Marketplace.
            Complete the onboarding process to set up your store.
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { paddingHorizontal: 32, marginTop: 24 }]}
            onPress={() => router.push('/marketplace/seller/onboarding')}
          >
            <Text style={styles.primaryButtonText}>Start Onboarding</Text>
          </TouchableOpacity>
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
        <TouchableOpacity onPress={() => { setShowEditProfile(true); setSettingsTab('profile'); }}>
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
        {profile && renderProfileHeader()}

        {/* Stats Cards */}
        {stats && renderStatsCards()}

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {([
            { id: 'overview', icon: 'grid', label: 'Overview' },
            { id: 'listings', icon: 'list', label: 'Listings' },
            { id: 'orders', icon: 'receipt', label: 'Orders' },
            { id: 'analytics', icon: 'bar-chart', label: 'Analytics' },
          ] as const).map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons name={tab.icon as any} size={20} color={activeTab === tab.id ? '#ffffff' : '#6b7280'} />
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'listings' && renderListingsTab()}
          {activeTab === 'orders' && renderOrdersTab()}
          {activeTab === 'analytics' && renderAnalyticsTab()}
        </View>
      </ScrollView>

      {/* Modals */}
      {renderSettingsModal()}
      {renderOrderDetailModal()}
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
  // Profile Header
  profileHeaderContainer: {
    backgroundColor: '#ffffff',
  },
  coverImageContainer: {
    height: 120,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  editCoverButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    padding: 8,
  },
  profileSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: -40,
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
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  profileInfo: {
    flex: 1,
    paddingTop: 40,
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
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  tierText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8b5cf6',
    marginLeft: 4,
  },
  tierProgress: {
    width: 40,
    height: 4,
    backgroundColor: '#e9d5ff',
    borderRadius: 2,
    marginLeft: 8,
    overflow: 'hidden',
  },
  tierProgressBar: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderRadius: 2,
  },
  // Stats Section
  statsSection: {
    backgroundColor: '#ffffff',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginTop: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
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
  // Actions
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
  // Notifications
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
  // Search
  searchContainer: {
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1f2937',
  },
  // Filters
  filterContainer: {
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterChipText: {
    fontSize: 14,
    color: '#6b7280',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 0,
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
    zIndex: 100,
  },
  // Empty State
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
  // Listings
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
  listingImageContainer: {
    position: 'relative',
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
    textTransform: 'uppercase',
  },
  listingInfo: {
    flex: 1,
    padding: 12,
  },
  listingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  listingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  listingPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  listingStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listingStatsText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  listingInventory: {
    fontSize: 12,
    color: '#6b7280',
  },
  listingAction: {
    padding: 12,
    justifyContent: 'center',
  },
  // Orders
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
    paddingHorizontal: 10,
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
  moreItems: {
    fontSize: 12,
    color: '#3b82f6',
    marginTop: 4,
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
  orderQuickAction: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  orderQuickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Analytics
  analyticsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  analyticsLinkContent: {
    flex: 1,
    alignItems: 'center',
  },
  analyticsLinkTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 12,
  },
  analyticsLinkSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  quickStatsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  // Modal
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
  // Settings Tabs
  settingsTabs: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
  },
  settingsTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    gap: 6,
  },
  settingsTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  settingsTabText: {
    fontSize: 14,
    color: '#6b7280',
  },
  settingsTabTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  // Form Inputs
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
  },
  // Image Upload
  imageUploadSection: {
    marginBottom: 20,
  },
  imageUploadButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  coverUploadButton: {
    width: '100%',
    height: 120,
    borderRadius: 12,
  },
  uploadPreview: {
    width: '100%',
    height: '100%',
  },
  coverPreview: {
    width: '100%',
    height: '100%',
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  uploadPlaceholderText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  // Radio Group
  radioGroup: {
    flexDirection: 'row',
    gap: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  radioOptionActive: {},
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 8,
  },
  radioCircleActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#3b82f6',
  },
  radioLabel: {
    fontSize: 14,
    color: '#1f2937',
  },
  // Social Inputs
  socialInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },
  socialInput: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  ensIcon: {
    fontSize: 18,
  },
  // Payout Options
  payoutOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  payoutOption: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  payoutOptionActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  payoutOptionText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  payoutOptionTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  // Currency Options
  currencyOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  currencyOptionActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  currencyOptionText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  currencyOptionTextActive: {
    color: '#3b82f6',
  },
  // Coming Soon
  comingSoon: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  comingSoonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 12,
  },
  comingSoonSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  // Order Detail Modal
  orderDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderDetailNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  orderDetailDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  statusUpdateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  statusUpdateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  orderDetailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 12,
  },
  // Timeline
  timeline: {
    paddingLeft: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
    position: 'relative',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    marginTop: 4,
  },
  timelineLine: {
    position: 'absolute',
    left: 5,
    top: 16,
    width: 2,
    height: 40,
    backgroundColor: '#e5e7eb',
  },
  timelineContent: {
    flex: 1,
  },
  timelineStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  timelineDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  timelineNote: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Order Detail Items
  orderDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  orderDetailItemInfo: {
    flex: 1,
  },
  orderDetailItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  orderDetailItemMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  orderDetailItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  orderDetailTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
  },
  orderDetailTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  orderDetailTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  orderDetailAddress: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
  },
  trackingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  trackingNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  buyerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buyerAddress: {
    flex: 1,
    fontSize: 14,
    color: '#6b7280',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
