/**
 * Marketplace Screen
 * Browse products and listings with filters, sorting, and real API integration
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, ActivityIndicator, RefreshControl, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { comparisonService } from '../../src/services/comparisonService';
import { marketplaceService } from '../../src/services';
import { OptimizedFlatList } from '../../src/components/OptimizedFlatList';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

type SortOption = 'recent' | 'price-low' | 'price-high' | 'popular';
type Category = 'All' | string;

interface Product {
  id: string;
  title: string;
  description: string;
  priceAmount: number;
  priceCurrency: string;
  images: string[];
  seller?: {
    id: string;
    displayName?: string;
    storeName?: string;
    rating: number;
    verified: boolean;
    walletAddress: string;
  };
  category?: {
    name: string;
  };
  metadata?: {
    condition?: string;
    brand?: string;
  };
  views: number;
  favorites: number;
  status: string;
  inventory: number;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function MarketplaceScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [cartCount, setCartCount] = useState(0);
  const [comparisonCount, setComparisonCount] = useState(0);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>(['All']);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortOptions: { label: string; value: SortOption }[] = [
    { label: 'Most Recent', value: 'recent' },
    { label: 'Price: Low to High', value: 'price-low' },
    { label: 'Price: High to Low', value: 'price-high' },
    { label: 'Most Popular', value: 'popular' },
  ];

  // Fetch categories
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch products
  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, sortBy]);

  // Load comparison count
  useEffect(() => {
    loadComparisonCount();
  }, []);

  const loadComparisonCount = async () => {
    const count = await comparisonService.getCount();
    setComparisonCount(count);
  };

  const fetchCategories = useCallback(async () => {
    try {
      const categoriesData = await marketplaceService.getCategories();
      if (categoriesData) {
        setCategories(['All', ...categoriesData.map((cat: any) => cat.name)]);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  const fetchProducts = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      if (!append) setLoading(true);
      setError(null);

      const productList = await marketplaceService.getProducts(page, 20, selectedCategory === 'All' ? undefined : selectedCategory);

      if (productList) {
        // Apply client-side sorting
        const sortedList = sortProducts(productList);

        if (append) {
          setProducts(prev => [...prev, ...sortedList]);
        } else {
          setProducts(sortedList);
        }
      } else {
        setError('Failed to fetch products');
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, sortBy]);

  const sortProducts = (productList: Product[]) => {
    return [...productList].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return (a.priceAmount || 0) - (b.priceAmount || 0);
        case 'price-high':
          return (b.priceAmount || 0) - (a.priceAmount || 0);
        case 'popular':
          return (b.views || 0) - (a.views || 0);
        default:
          return 0;
      }
    });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  }, [selectedCategory, sortBy]);

  const addToCart = (product: Product) => {
    setCartCount(prev => prev + 1);
    // TODO: Integrate with real cart service
  };

  const getProductImage = (product: Product) => {
    if (product.images && product.images.length > 0) {
      return product.images[0];
    }
    // Generate color based on product ID for placeholder
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
    const colorIndex = parseInt(product.id) % colors.length;
    return colors[colorIndex];
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'All' ||
      (product.category && product.category.name === selectedCategory);
    const matchesSearch = !searchQuery ||
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.seller?.displayName || product.seller?.storeName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPrice = (product.priceAmount || 0) >= priceRange[0] && (product.priceAmount || 0) <= priceRange[1];
    return matchesCategory && matchesSearch && matchesPrice;
  });

  if (loading && products.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Marketplace</Text>
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => router.push('/marketplace/cart')}
          >
            <Ionicons name="cart-outline" size={24} color="#1f2937" />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const ListHeader = useMemo(() => (
    <>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => fetchProducts(1, false)}
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options-outline" size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <View style={styles.categoriesScroll}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category && styles.categoryTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sort Options */}
      <View style={styles.sortScroll}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortContent}
        >
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.sortButton,
                sortBy === option.value && styles.sortButtonActive,
              ]}
              onPress={() => setSortBy(option.value)}
            >
              <Text
                style={[
                  styles.sortText,
                  sortBy === option.value && styles.sortTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Results Count */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>{filteredProducts.length} products found</Text>
      </View>
    </>
  ), [searchQuery, categories, selectedCategory, sortBy, filteredProducts.length]);

  const renderProduct = useCallback((product: Product) => (
    <TouchableOpacity
      key={product.id}
      style={styles.productCard}
      onPress={() => router.push(`/marketplace/product/${product.id}`)}
    >
      <View style={[styles.productImage, { backgroundColor: getProductImage(product) }]}>
        {product.seller?.verified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
          </View>
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{product.title}</Text>
        <View style={styles.sellerRow}>
          <Text style={styles.productSeller}>
            {product.seller?.displayName || product.seller?.storeName || 'Unknown Seller'}
          </Text>
          {product.seller?.verified && (
            <Ionicons name="checkmark-circle" size={12} color="#3b82f6" />
          )}
        </View>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color="#f59e0b" />
          <Text style={styles.ratingText}>{product.seller?.rating || 0}</Text>
          <Text style={styles.reviewsText}>({product.views || 0})</Text>
        </View>
        <View style={styles.productPriceContainer}>
          <Text style={styles.productPrice}>
            ${product.priceAmount || 0}
          </Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.compareButton}
              onPress={() => {
                comparisonService.addItem(product);
                loadComparisonCount();
              }}
            >
              <Ionicons name="bar-chart-outline" size={16} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => addToCart(product)}
            >
              <Ionicons name="add" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  ), [router]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Marketplace</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.becomeSellerButton}
            onPress={() => router.push('/marketplace/seller/onboarding')}
          >
            <Ionicons name="storefront-outline" size={20} color="#3b82f6" />
            <Text style={styles.becomeSellerButtonText}>Become Seller</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.comparisonButton}
            onPress={() => router.push('/marketplace/compare')}
          >
            <Ionicons name="bar-chart-outline" size={24} color="#1f2937" />
            {comparisonCount > 0 && (
              <View style={styles.comparisonBadge}>
                <Text style={styles.comparisonBadgeText}>{comparisonCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => router.push('/marketplace/cart')}
          >
            <Ionicons name="cart-outline" size={24} color="#1f2937" />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <OptimizedFlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListHeaderComponent={ListHeader}
        loading={loading}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={() => fetchProducts(Math.floor(products.length / 20) + 1, true)}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        estimatedItemSize={250}
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color="#1f2937" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.filterSectionTitle}>Price Range</Text>
              <View style={styles.priceRangeContainer}>
                <Text style={styles.priceRangeText}>${priceRange[0]} - ${priceRange[1]}</Text>
              </View>

              <View style={styles.priceButtons}>
                {[0, 50, 100, 250, 500, 1000].map((price) => (
                  <TouchableOpacity
                    key={price}
                    style={[
                      styles.priceButton,
                      priceRange[1] === price && styles.priceButtonActive,
                    ]}
                    onPress={() => setPriceRange([0, price])}
                  >
                    <Text
                      style={[
                        styles.priceButtonText,
                        priceRange[1] === price && styles.priceButtonTextActive,
                      ]}
                    >
                      ${price}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => {
                  setShowFilters(false);
                  fetchProducts();
                }}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  becomeSellerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3b82f6',
    gap: 4,
  },
  becomeSellerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  cartButton: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  comparisonButton: {
    position: 'relative',
    marginRight: 8,
  },
  comparisonBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  comparisonBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  filterButton: {
    padding: 8,
    marginLeft: 8,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  categoriesContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  categoryTextActive: {
    color: '#ffffff',
  },
  sortScroll: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sortContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  sortButton: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
  },
  sortButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  sortText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  sortTextActive: {
    color: '#ffffff',
  },
  resultsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  resultsText: {
    fontSize: 14,
    color: '#6b7280',
  },
  content: {
    flex: 1,
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
  errorContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    margin: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#ef4444',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  productCard: {
    width: (375 - 48) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 5,
  },
  productImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    position: 'relative',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  productSeller: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 4,
  },
  reviewsText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  productPriceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compareButton: {
    backgroundColor: '#f3f4f6',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
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
    maxHeight: '80%',
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
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  priceRangeContainer: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  priceRangeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  priceButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  priceButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  priceButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  priceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  priceButtonTextActive: {
    color: '#ffffff',
  },
  applyButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
    applyButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#ffffff',
    },
    listContent: {
      paddingBottom: 24,
    },
    columnWrapper: {
      justifyContent: 'space-between',
      paddingHorizontal: 16,
    },
    loadingMoreContainer: {
      paddingVertical: 20,
      alignItems: 'center',
    },
  });
  