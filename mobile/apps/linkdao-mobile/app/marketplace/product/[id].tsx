/**
 * Product Detail Screen
 * Display full product information with add to cart functionality
 */

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { cartStore } from '../../../src/store/cartStore';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const addToCart = cartStore((state) => state.addToCart);
  const cartItems = cartStore((state) => state.items);

  // Mock product data - in production, fetch from API
  const product = {
    id: id || '1',
    name: 'Web3 Development Course',
    description: 'Complete course on Web3 development including Solidity, smart contracts, and dApp development. Learn from industry experts and build real-world projects.',
    price: 99,
    originalPrice: 199,
    discount: 50,
    images: ['#3b82f6', '#8b5cf6', '#10b981'],
    seller: {
      id: '1',
      name: 'Dev Academy',
      avatar: '#3b82f6',
      rating: 4.8,
      reviews: 234,
      verified: true,
    },
    category: 'Courses',
    tags: ['Web3', 'Blockchain', 'Solidity', 'Smart Contracts'],
    inStock: true,
    stock: 50,
    features: [
      '20+ hours of video content',
      'Hands-on projects',
      'Certificate of completion',
      'Lifetime access',
      'Community support',
      '1-on-1 mentorship',
    ],
    specifications: {
      'Duration': '20 hours',
      'Level': 'Intermediate',
      'Language': 'English',
      'Format': 'Online',
      'Access': 'Lifetime',
    },
    rating: 4.7,
    reviews: 156,
    sold: 1234,
  };

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      quantity,
      seller: product.seller.name,
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
          <View style={[styles.mainImage, { backgroundColor: product.images[selectedImageIndex] }]} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnails}>
            {product.images.map((color, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedImageIndex(index)}
                style={[
                  styles.thumbnail,
                  selectedImageIndex === index && styles.thumbnailSelected,
                ]}
              >
                <View style={[styles.thumbnailImage, { backgroundColor: color }]} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <View style={styles.categoryTag}>
            <Text style={styles.categoryText}>{product.category}</Text>
          </View>
          <Text style={styles.productName}>{product.name}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#f59e0b" />
            <Text style={styles.ratingText}>{product.rating}</Text>
            <Text style={styles.reviewsText}>({product.reviews} reviews)</Text>
            <Text style={styles.soldText}>• {product.sold} sold</Text>
          </View>

          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={styles.price}>${product.price}</Text>
            {product.originalPrice && (
              <Text style={styles.originalPrice}>${product.originalPrice}</Text>
            )}
            {product.discount && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{product.discount}% OFF</Text>
              </View>
            )}
          </View>

          {/* Stock Status */}
          <View style={styles.stockContainer}>
            {product.inStock ? (
              <>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.stockText}>In Stock ({product.stock} available)</Text>
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
          <Text style={styles.sectionTitle}>Features</Text>
          {product.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}

          {/* Specifications */}
          <Text style={styles.sectionTitle}>Specifications</Text>
          {Object.entries(product.specifications).map(([key, value]) => (
            <View key={key} style={styles.specRow}>
              <Text style={styles.specKey}>{key}</Text>
              <Text style={styles.specValue}>{value}</Text>
            </View>
          ))}

          {/* Tags */}
          <View style={styles.tagsContainer}>
            {product.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>

          {/* Seller Info */}
          <View style={styles.sellerContainer}>
            <View style={styles.sellerInfo}>
              <View style={[styles.sellerAvatar, { backgroundColor: product.seller.avatar }]} />
              <View style={styles.sellerDetails}>
                <View style={styles.sellerNameRow}>
                  <Text style={styles.sellerName}>{product.seller.name}</Text>
                  {product.seller.verified && (
                    <Ionicons name="checkmark-circle" size={16} color="#3b82f6" />
                  )}
                </View>
                <View style={styles.sellerRating}>
                  <Ionicons name="star" size={14} color="#f59e0b" />
                  <Text style={styles.sellerRatingText}>{product.seller.rating}</Text>
                  <Text style={styles.sellerReviewsText}>({product.seller.reviews} reviews)</Text>
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
        >
          <Ionicons name="cart" size={20} color="#ffffff" />
          <Text style={styles.addToCartButtonText}>Add to Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.buyNowButton}
          onPress={handleBuyNow}
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
});