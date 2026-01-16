/**
 * Seller Store Page
 * Public-facing store page for viewing a seller's products
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';

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
  reviews: number;
  reputation: number;
}

interface Product {
  id: string;
  title: string;
  description: string;
  priceAmount: number;
  priceCurrency: string;
  images: string[];
  inventory: number;
  status: string;
  views: number;
  favorites: number;
  createdAt: string;
}

export default function SellerStoreScreen() {
  const { sellerId } = useLocalSearchParams<{ sellerId: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sellerId) {
      fetchStoreData();
    }
  }, [sellerId]);

  const fetchStoreData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [profileRes, productsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/sellers/${sellerId}`),
        fetch(`${API_BASE_URL}/api/sellers/${sellerId}/listings`),
      ]);

      if (profileRes.ok) {
        const profileResult = await profileRes.json();
        if (profileResult.success && profileResult.data) {
          setProfile(profileResult.data);
        }
      }

      if (productsRes.ok) {
        const productsResult = await productsRes.json();
        if (productsResult.success && productsResult.data) {
          setProducts(productsResult.data.products || productsResult.data || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch store data:', err);
      setError('Failed to load store');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStoreData();
    setRefreshing(false);
  };

  const handleContactSeller = () => {
    if (profile?.websiteUrl) {
      Linking.openURL(profile.websiteUrl);
    }
  };

  const getProductImage = (product: Product) => {
    if (product.images && product.images.length > 0) {
      return product.images[0];
    }
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
    const colorIndex = parseInt(product.id) % colors.length;
    return colors[colorIndex];
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading store...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Store</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error || 'Store not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchStoreData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Store</Text>
        <TouchableOpacity onPress={() => router.push(`/marketplace/seller/${sellerId}/contact`)}>
          <Ionicons name="mail-outline" size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Cover Image */}
        <View style={[styles.coverImage, profile.coverImage ? {} : { backgroundColor: '#3b82f6' }]}>
          {profile.coverImage ? (
            <Image source={{ uri: profile.coverImage }} style={styles.coverImage} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="storefront" size={48} color="#ffffff" />
            </View>
          )}
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <View style={styles.profileImageContainer}>
              {profile.profileImage ? (
                <Image source={{ uri: profile.profileImage }} style={styles.profileImage} />
              ) : (
                <View style={[styles.profileImage, { backgroundColor: '#8b5cf6' }]}>
                  <Ionicons name="person" size={32} color="#ffffff" />
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
              <View style={styles.verifiedBadges}>
                {profile.verified && (
                  <View style={styles.badge}>
                    <Ionicons name="checkmark-circle" size={14} color="#3b82f6" />
                    <Text style={styles.badgeText}>Verified</Text>
                  </View>
                )}
                {profile.daoApproved && (
                  <View style={styles.badge}>
                    <Ionicons name="shield-checkmark" size={14} color="#10b981" />
                    <Text style={styles.badgeText}>DAO Approved</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={20} color="#f59e0b" />
              <Text style={styles.statValue}>{profile.rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>{profile.reviews} reviews</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="cube" size={20} color="#3b82f6" />
              <Text style={styles.statValue}>{products.length}</Text>
              <Text style={styles.statLabel}>Products</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="diamond" size={20} color="#8b5cf6" />
              <Text style={styles.statValue}>{profile.reputation}</Text>
              <Text style={styles.statLabel}>Reputation</Text>
            </View>
          </View>

          {/* Bio */}
          {profile.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}

          {/* Description */}
          {profile.storeDescription && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{profile.storeDescription}</Text>
            </View>
          )}

          {/* Location */}
          {profile.location && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color="#6b7280" />
              <Text style={styles.infoText}>{profile.location}</Text>
            </View>
          )}

          {/* Website */}
          {profile.websiteUrl && (
            <TouchableOpacity style={styles.infoRow} onPress={handleContactSeller}>
              <Ionicons name="globe-outline" size={20} color="#6b7280" />
              <Text style={styles.infoLink}>{profile.websiteUrl}</Text>
            </TouchableOpacity>
          )}

          {/* Contact Button */}
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => router.push(`/marketplace/seller/${sellerId}/contact`)}
          >
            <Ionicons name="mail" size={20} color="#ffffff" />
            <Text style={styles.contactButtonText}>Contact Seller</Text>
          </TouchableOpacity>
        </View>

        {/* Products Section */}
        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>Products ({products.length})</Text>

          {products.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={64} color="#9ca3af" />
              <Text style={styles.emptyText}>No products yet</Text>
              <Text style={styles.emptySubtext}>This seller hasn't listed any products</Text>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {products.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.productCard}
                  onPress={() => router.push(`/marketplace/product/${product.id}`)}
                >
                  <View style={[styles.productImage, { backgroundColor: getProductImage(product) }]}>
                    <View style={[styles.productStatus, { backgroundColor: product.status === 'active' ? '#10b981' : '#6b7280' }]}>
                      <Text style={styles.productStatusText}>{product.status}</Text>
                    </View>
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productTitle} numberOfLines={2}>{product.title}</Text>
                    <View style={styles.productMeta}>
                      <Text style={styles.productPrice}>${product.priceAmount}</Text>
                      <View style={styles.productViews}>
                        <Ionicons name="eye" size={14} color="#6b7280" />
                        <Text style={styles.productViewsText}>{product.views}</Text>
                      </View>
                      <View style={styles.productFavorites}>
                        <Ionicons name="heart" size={14} color="#ef4444" />
                        <Text style={styles.productFavoritesText}>{product.favorites}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
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
  coverImage: {
    height: 200,
  },
  coverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 16,
    marginTop: -40,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e5e7eb',
    borderWidth: 4,
    borderColor: '#ffffff',
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
    marginTop: 40,
  },
  storeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  verifiedBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e5e7eb',
  },
  bio: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  descriptionSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  infoLink: {
    fontSize: 14,
    color: '#3b82f6',
    marginLeft: 8,
    textDecorationLine: 'underline',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  productsSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCard: {
    width: (375 - 52) / 2,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  productImage: {
    height: 120,
    position: 'relative',
  },
  productStatus: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  productStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  productInfo: {
    padding: 12,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  productViews: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productViewsText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  productFavorites: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productFavoritesText: {
    fontSize: 12,
    color: '#ef4444',
    marginLeft: 4,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});