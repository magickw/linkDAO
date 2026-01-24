/**
 * Wishlist Screen
 * Mobile-optimized wishlist for buyers
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface WishlistItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  price: string;
  originalPrice?: string;
  sellerName: string;
  sellerId: string;
  inStock: boolean;
  addedAt: string;
  discount?: number;
}

export default function WishlistScreen() {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/user/wishlists`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setWishlist(result.data || []);
      } else {
        setWishlist([]);
      }
    } catch (error) {
      console.error('Failed to load wishlist:', error);
      setWishlist([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWishlist();
    setRefreshing(false);
  };

  const handleRemoveItem = async (itemId: string) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from your wishlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Call API to remove item
              setWishlist(prev => prev.filter(item => item.id !== itemId));
              Alert.alert('Success', 'Item removed from wishlist');
            } catch (error) {
              Alert.alert('Error', 'Failed to remove item');
            }
          },
        },
      ]
    );
  };

  const handleRemoveSelected = async () => {
    if (selectedItems.size === 0) {
      Alert.alert('No Items Selected', 'Please select items to remove');
      return;
    }

    Alert.alert(
      'Remove Selected Items',
      `Are you sure you want to remove ${selectedItems.size} item(s) from your wishlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Call API to remove items
              setWishlist(prev => prev.filter(item => !selectedItems.has(item.id)));
              setSelectedItems(new Set());
              setSelectAll(false);
              Alert.alert('Success', 'Items removed from wishlist');
            } catch (error) {
              Alert.alert('Error', 'Failed to remove items');
            }
          },
        },
      ]
    );
  };

  const handleAddToCart = async (item: WishlistItem) => {
    try {
      // TODO: Call API to add to cart
      Alert.alert('Success', `${item.productName} added to cart`);
    } catch (error) {
      Alert.alert('Error', 'Failed to add to cart');
    }
  };

  const handleBuyNow = (item: WishlistItem) => {
    router.push(`/marketplace/product/${item.productId}`);
  };

  const toggleSelectItem = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(wishlist.map(item => item.id)));
    }
    setSelectAll(!selectAll);
  };

  const renderWishlistItem = (item: WishlistItem) => (
    <View key={item.id} style={styles.itemCard}>
      <TouchableOpacity
        style={styles.selectCheckbox}
        onPress={() => toggleSelectItem(item.id)}
      >
        <View style={[styles.checkbox, selectedItems.has(item.id) && styles.checkboxChecked]}>
          {selectedItems.has(item.id) && <Ionicons name="checkmark" size={16} color="#ffffff" />}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.itemContent}
        onPress={() => router.push(`/marketplace/product/${item.productId}`)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: item.productImage }} style={styles.itemImage} />

        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={2}>{item.productName}</Text>
          <Text style={styles.itemSeller}>by {item.sellerName}</Text>

          <View style={styles.priceContainer}>
            <Text style={styles.itemPrice}>${item.price}</Text>
            {item.originalPrice && (
              <Text style={styles.itemOriginalPrice}>${item.originalPrice}</Text>
            )}
            {item.discount && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{item.discount}%</Text>
              </View>
            )}
          </View>

          {!item.inStock && (
            <View style={styles.outOfStockBadge}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveItem(item.id)}
      >
        <Ionicons name="close-circle" size={24} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading wishlist...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Wishlist</Text>
        <Text style={styles.headerSubtitle}>{wishlist.length} items</Text>
      </View>

      {/* Selection Bar */}
      {selectedItems.size > 0 && (
        <View style={styles.selectionBar}>
          <TouchableOpacity onPress={toggleSelectAll}>
            <Text style={styles.selectionText}>
              {selectAll ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRemoveSelected}>
            <Text style={styles.removeSelectedText}>Remove ({selectedItems.size})</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {wishlist.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
            <Text style={styles.emptySubtitle}>
              Save items you love by tapping the heart icon
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => router.push('/marketplace')}
            >
              <Text style={styles.browseButtonText}>Browse Marketplace</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.wishlistList}>
            {wishlist.map(renderWishlistItem)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#eff6ff',
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  removeSelectedText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ef4444',
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  wishlistList: {
    padding: 16,
    gap: 12,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectCheckbox: {
    justifyContent: 'center',
    marginRight: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
    lineHeight: 18,
  },
  itemSeller: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
    marginRight: 8,
  },
  itemOriginalPrice: {
    fontSize: 13,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  discountBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#d97706',
  },
  outOfStockBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  outOfStockText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#dc2626',
  },
  removeButton: {
    justifyContent: 'center',
    paddingLeft: 8,
  },
});