/**
 * Product Comparison Screen
 * Compare up to 5 products side by side
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { comparisonService, Product, ComparisonState } from '../../src/services/comparisonService';

export default function ComparisonScreen() {
  const router = useRouter();
  const [state, setState] = useState<ComparisonState>({ items: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComparison();
    
    const unsubscribe = comparisonService.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  const loadComparison = async () => {
    setLoading(true);
    const currentState = await comparisonService.getComparisonState();
    setState(currentState);
    setLoading(false);
  };

  const handleRemoveItem = async (productId: string) => {
    await comparisonService.removeItem(productId);
  };

  const handleClearAll = async () => {
    await comparisonService.clearComparison();
    router.back();
  };

  const handleGoToProduct = (productId: string) => {
    router.push(`/marketplace/product/${productId}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </SafeAreaView>
    );
  }

  if (state.items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons name="bar-chart-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No Products to Compare</Text>
          <Text style={styles.emptyText}>
            Add products from the marketplace to compare them
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.replace('/(tabs)/marketplace')}
          >
            <Text style={styles.browseButtonText}>Browse Marketplace</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Compare Products</Text>
        <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Comparison Grid */}
        <View style={styles.comparisonGrid}>
          {/* Feature Labels Column */}
          <View style={styles.labelsColumn}>
            <View style={styles.headerCell}>
              <Text style={styles.headerCellText}>Features</Text>
            </View>
            
            <View style={styles.featureRow}>
              <Text style={styles.featureLabel}>Price</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureLabel}>Seller</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureLabel}>Rating</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureLabel}>Condition</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureLabel}>Category</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureLabel}>Inventory</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureLabel}>Views</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureLabel}>Favorites</Text>
            </View>
          </View>

          {/* Product Columns */}
          {state.items.map((product) => (
            <View key={product.id} style={styles.productColumn}>
              <View style={styles.productHeaderCell}>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveItem(product.id)}
                >
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>

              <View style={styles.productCell}>
                <Text style={styles.priceText}>
                  ${product.priceAmount.toFixed(2)}
                </Text>
              </View>

              <View style={styles.productCell}>
                <Text style={styles.sellerText}>
                  {product.seller?.storeName || product.seller?.displayName || 'Unknown'}
                </Text>
                {product.seller?.verified && (
                  <Ionicons name="checkmark-circle" size={14} color="#3b82f6" />
                )}
              </View>

              <View style={styles.productCell}>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color="#fbbf24" />
                  <Text style={styles.ratingText}>
                    {product.seller?.rating || 0}/5
                  </Text>
                </View>
              </View>

              <View style={styles.productCell}>
                <Text style={styles.valueText}>
                  {product.metadata?.condition || 'N/A'}
                </Text>
              </View>

              <View style={styles.productCell}>
                <Text style={styles.valueText}>
                  {product.category?.name || 'N/A'}
                </Text>
              </View>

              <View style={styles.productCell}>
                <Text style={styles.valueText}>
                  {product.inventory} available
                </Text>
              </View>

              <View style={styles.productCell}>
                <Text style={styles.valueText}>
                  {product.views} views
                </Text>
              </View>

              <View style={styles.productCell}>
                <Text style={styles.valueText}>
                  {product.favorites} favorites
                </Text>
              </View>

              {/* View Details Button */}
              <View style={styles.actionCell}>
                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() => handleGoToProduct(product.id)}
                >
                  <Text style={styles.viewButtonText}>View Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Add More Column */}
          {state.items.length < 5 && (
            <View style={styles.productColumn}>
              <View style={styles.productHeaderCell}>
                <Text style={styles.addMoreText}>+ Add</Text>
              </View>
              <View style={styles.productCell} style={{ flex: 1 }}>
                <TouchableOpacity
                  style={styles.addMoreButton}
                  onPress={() => router.back()}
                >
                  <Ionicons name="add" size={32} color="#9ca3af" />
                  <Text style={styles.addMoreLabel}>
                    Add more products
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Comparison Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Best Price:</Text>
            <Text style={styles.summaryValue}>
              ${Math.min(...state.items.map(p => p.priceAmount)).toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Highest Rated:</Text>
            <Text style={styles.summaryValue}>
              {Math.max(...state.items.map(p => p.seller?.rating || 0)).toFixed(1)}/5
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Products:</Text>
            <Text style={styles.summaryValue}>{state.items.length}</Text>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  clearButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  comparisonGrid: {
    flexDirection: 'row',
    padding: 16,
  },
  labelsColumn: {
    width: 120,
    marginRight: 8,
  },
  productColumn: {
    flex: 1,
    marginLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#e5e7eb',
    paddingLeft: 8,
  },
  headerCell: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  headerCellText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  featureRow: {
    height: 50,
    justifyContent: 'center',
    marginBottom: 8,
  },
  featureLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  productHeaderCell: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  removeButton: {
    padding: 4,
  },
  productCell: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  sellerText: {
    fontSize: 12,
    color: '#1f2937',
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    color: '#1f2937',
  },
  valueText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
  actionCell: {
    height: 50,
    justifyContent: 'center',
    marginTop: 8,
  },
  viewButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  addMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  addMoreButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    padding: 16,
  },
  addMoreLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  summarySection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
});