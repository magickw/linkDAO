/**
 * Product Detail Screen
 * Display full product information with add to cart functionality
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { cartStore } from '../../../src/store/cartStore';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const addToCart = cartStore((state) => state.addToCart);
  const cartItems = cartStore((state) => state.items);

  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/marketplace/listings/${id}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setProduct(result.data);
      } else {
        Alert.alert('Error', 'Product not found');
        router.back();
      }
    } catch (error) {
      console.error('Failed to load product:', error);
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    addToCart({
      id: product.id,
      name: product.title,
      price: product.priceAmount,
      image: product.images && product.images.length > 0 ? product.images[0] : null,
      quantity,
      seller: product.seller?.storeName || product.seller?.displayName || 'Unknown Seller',
    });

    Alert.alert(
      'Added to Cart',
      `${product.name} has been added to your cart`,
      [
        { text: 'Continue Shopping', style: 'cancel' },
        {
          text: 'View Cart',
          onPress: () => router.push('/marketplace/cart'),
        },
      ]
    );
  };

  const handleBuyNow = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      quantity,
      seller: product.seller.name,
    });
    router.push('/marketplace/checkout');
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const increaseQuantity = () => {
    if (quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const handleContactSeller = () => {
    router.push(`/messages/new?seller=${product.seller.id}`);
  };

  const cartItemCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading product...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <TouchableOpacity onPress={() => router.push('/marketplace/cart')} style={styles.cartButton}>
          <Ionicons name="cart-outline" size={24} color="#1f2937" />
          {cartItemCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Product Images */}
        <View style={styles.imageContainer}>
          {product.images && product.images.length > 0 ? (
            <Image source={{ uri: product.images[selectedImageIndex] }} style={styles.mainImage} />
          ) : (
            <View style={[styles.mainImage, { backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="image-outline" size={64} color="#9ca3af" />
            </View>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnails}>
            {product.images?.map((url: string, index: number) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedImageIndex(index)}
                style={[
                  styles.thumbnail,
                  selectedImageIndex === index && styles.thumbnailSelected,
                ]}
              >
                <Image source={{ uri: url }} style={styles.thumbnailImage} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          {product.category && (
            <View style={styles.categoryTag}>
              <Text style={styles.categoryText}>{product.category.name || product.category}</Text>
            </View>
          )}
          <Text style={styles.productName}>{product.title}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#f59e0b" />
            <Text style={styles.ratingText}>{product.seller?.rating || 0}</Text>
            <Text style={styles.reviewsText}>({product.views || 0} views)</Text>
            <Text style={styles.soldText}>• {product.soldCount || 0} sold</Text>
          </View>

          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={styles.price}>${product.priceAmount}</Text>
            {product.discountAmount > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>SALE</Text>
              </View>
            )}
          </View>

          {/* Stock Status */}
          <View style={styles.stockContainer}>
            {product.inventory > 0 ? (
              <>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.stockText}>In Stock ({product.inventory} available)</Text>
              </>
            ) : (
              <>
                <Ionicons name="close-circle" size={16} color="#ef4444" />
                <Text style={styles.stockText}>Out of Stock</Text>
              </>
            )}
          </View>

          {/* Description */}
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{product.description}</Text>

          {/* Features */}
          {product.metadata?.features && product.metadata.features.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Features</Text>
              {product.metadata.features.map((feature: string, index: number) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </>
          )}

          {/* Specifications */}
          {product.metadata?.specifications && Object.keys(product.metadata.specifications).length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Specifications</Text>
              {Object.entries(product.metadata.specifications).map(([key, value]: [string, any]) => (
                <View key={key} style={styles.specRow}>
                  <Text style={styles.specKey}>{key}</Text>
                  <Text style={styles.specValue}>{String(value)}</Text>
                </View>
              ))}
            </>
          )}

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {product.tags.map((tag: string, index: number) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Seller Info */}
          <View style={styles.sellerContainer}>
            <View style={styles.sellerInfo}>
              {product.seller?.avatar ? (
                <Image source={{ uri: product.seller.avatar }} style={styles.sellerAvatar} />
              ) : (
                <View style={[styles.sellerAvatar, { backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="person" size={24} color="#ffffff" />
                </View>
              )}
              <View style={styles.sellerDetails}>
                <View style={styles.sellerNameRow}>
                  <Text style={styles.sellerName}>{product.seller?.storeName || product.seller?.displayName || 'Unknown Seller'}</Text>
                  {product.seller?.verified && (
                    <Ionicons name="checkmark-circle" size={16} color="#3b82f6" />
                  )}
                </View>
                <View style={styles.sellerRating}>
                  <Ionicons name="star" size={14} color="#f59e0b" />
                  <Text style={styles.sellerRatingText}>{product.seller?.rating || 0}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleContactSeller}
            >
              <Ionicons name="chatbubble-outline" size={16} color="#3b82f6" />
              <Text style={styles.contactButtonText}>Contact</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={decreaseQuantity}
          >
            <Ionicons name="remove" size={20} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={increaseQuantity}
          >
            <Ionicons name="add" size={20} color="#1f2937" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={handleAddToCart}
          disabled={product.inventory <= 0}
        >
          <Ionicons name="cart" size={20} color={product.inventory <= 0 ? "#9ca3af" : "#ffffff"} />
          <Text style={[styles.addToCartButtonText, product.inventory <= 0 && { color: "#9ca3af" }]}>Add to Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.buyNowButton, product.inventory <= 0 && { backgroundColor: '#9ca3af' }]}
          onPress={handleBuyNow}
          disabled={product.inventory <= 0}
        >
          <Text style={styles.buyNowButtonText}>Buy Now</Text>
        </TouchableOpacity>
      </View>
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  cartButton: {
    padding: 8,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    backgroundColor: '#f9fafb',
    padding: 16,
  },
  mainImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 12,
  },
  thumbnails: {
    marginTop: 8,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailSelected: {
    borderColor: '#3b82f6',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  productInfo: {
    padding: 16,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 4,
  },
  reviewsText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  soldText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  originalPrice: {
    fontSize: 18,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  discountBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 12,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stockText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 24,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 15,
    color: '#4b5563',
    marginLeft: 8,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  specKey: {
    fontSize: 14,
    color: '#6b7280',
  },
  specValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  tag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 13,
    color: '#6b7280',
  },
  sellerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  sellerDetails: {
    flex: 1,
  },
  sellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginRight: 4,
  },
  sellerRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerRatingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 4,
  },
  sellerReviewsText: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 4,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginLeft: 4,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginRight: 12,
  },
  quantityButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    paddingHorizontal: 16,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
    flex: 1,
    justifyContent: 'center',
  },
  addToCartButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 4,
  },
  buyNowButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  buyNowButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
});