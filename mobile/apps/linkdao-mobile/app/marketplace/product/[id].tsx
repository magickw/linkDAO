/**
 * Product Detail Screen
 * Display full product information with add to cart functionality
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Modal, TextInput, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { cartStore } from '../../../src/store/cartStore';
import { aiRecommendationService, Recommendation } from '../../../src/services/aiRecommendationService';
import { reviewService, Review } from '../../../src/services/reviewService';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  // New state for enhancements
  const [similarItems, setSimilarItems] = useState<Recommendation[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const addToCart = cartStore((state) => state.addToCart);
  const cartItems = cartStore((state) => state.items);

  useEffect(() => {
    if (id) {
      loadProduct();
      loadAdditionalData();
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

  const loadAdditionalData = async () => {
    try {
      const [similar, productReviews] = await Promise.all([
        aiRecommendationService.getSimilarItems(id as string, 'product', 6),
        reviewService.getReviewsForProduct(id as string)
      ]);
      setSimilarItems(similar);
      setReviews(productReviews);
    } catch (error) {
      console.error('Failed to load additional data:', error);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
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
      `${product.title} has been added to your cart`,
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
    if (!product) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    addToCart({
      id: product.id,
      name: product.title,
      price: product.priceAmount,
      image: product.images && product.images.length > 0 ? product.images[0] : null,
      quantity,
      seller: product.seller?.storeName || product.seller?.displayName || 'Unknown Seller',
    });
    router.push('/marketplace/checkout');
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setQuantity(quantity - 1);
    }
  };

  const increaseQuantity = () => {
    if (quantity < (product.inventory || product.stock)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setQuantity(quantity + 1);
    }
  };

  const handleContactSeller = () => {
    router.push(`/messages/new?seller=${product.seller.id}`);
  };

  const handleSubmitReview = async () => {
    if (!reviewTitle.trim() || !reviewComment.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setSubmittingReview(true);
    try {
      const result = await reviewService.submitReview({
        revieweeId: product.seller.id,
        rating: reviewRating,
        title: reviewTitle,
        comment: reviewComment,
      });

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', 'Your review has been submitted!');
        setShowReviewModal(false);
        setReviewTitle('');
        setReviewComment('');
        loadAdditionalData(); // Refresh reviews
      } else {
        Alert.alert('Error', result.error || 'Failed to submit review');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setSubmittingReview(false);
    }
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
            {(product.inventory || product.stock) > 0 ? (
              <>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.stockText}>In Stock ({product.inventory || product.stock} available)</Text>
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

          {/* Reviews Section */}
          <View style={styles.reviewsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Customer Reviews</Text>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowReviewModal(true); }}>
                <Text style={styles.writeReviewText}>Write a Review</Text>
              </TouchableOpacity>
            </View>
            
            {reviews.length === 0 ? (
              <View style={styles.emptyReviews}>
                <Ionicons name="star-outline" size={40} color="#d1d5db" />
                <Text style={styles.emptyReviewsText}>No reviews yet. Be the first to review!</Text>
              </View>
            ) : (
              reviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerInfo}>
                      <View style={styles.reviewerAvatar}>
                        <Ionicons name="person" size={16} color="#9ca3af" />
                      </View>
                      <Text style={styles.reviewerName}>{review.reviewerName}</Text>
                    </View>
                    <View style={styles.reviewStars}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons key={s} name="star" size={12} color={s <= review.rating ? "#f59e0b" : "#d1d5db"} />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewTitle}>{review.title}</Text>
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                  <Text style={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString()}</Text>
                </View>
              ))
            )}
          </View>

          {/* AI Recommendations Section */}
          {similarItems.length > 0 && (
            <View style={styles.similarSection}>
              <Text style={styles.sectionTitle}>Similar Items You May Like</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.similarScroll}>
                {similarItems.map((item) => (
                  <TouchableOpacity 
                    key={item.id} 
                    style={styles.similarCard}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push(`/marketplace/product/${item.itemId}`);
                    }}
                  >
                    <Image source={{ uri: item.metadata?.thumbnail }} style={styles.similarImage} />
                    <View style={styles.similarInfo}>
                      <Text style={styles.similarTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.similarReason}>{item.reason}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Review Modal */}
      <Modal visible={showReviewModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write a Review</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Ionicons name="close" size={24} color="#1f2937" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.ratingSelector}>
              <Text style={styles.label}>Your Rating</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity key={s} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setReviewRating(s); }}>
                    <Ionicons name={s <= reviewRating ? "star" : "star-outline"} size={32} color="#f59e0b" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Review Title</Text>
              <TextInput
                style={styles.textInput}
                value={reviewTitle}
                onChangeText={setReviewTitle}
                placeholder="Summarize your experience"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Detailed Review</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={reviewComment}
                onChangeText={setReviewComment}
                placeholder="What did you like or dislike?"
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, submittingReview && styles.disabledButton]}
              onPress={handleSubmitReview}
              disabled={submittingReview}
            >
              {submittingReview ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Review</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
          disabled={(product.inventory || product.stock) <= 0}
        >
          <Ionicons name="cart" size={20} color={(product.inventory || product.stock) <= 0 ? "#9ca3af" : "#ffffff"} />
          <Text style={[styles.addToCartButtonText, (product.inventory || product.stock) <= 0 && { color: "#9ca3af" }]}>Add to Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.buyNowButton, (product.inventory || product.stock) <= 0 && { backgroundColor: '#9ca3af' }]}
          onPress={handleBuyNow}
          disabled={(product.inventory || product.stock) <= 0}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  writeReviewText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 14,
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
  // Reviews Styles
  reviewsSection: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    marginTop: 24,
  },
  emptyReviews: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyReviewsText: {
    color: '#9ca3af',
    marginTop: 8,
    fontSize: 14,
  },
  reviewCard: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  reviewStars: {
    flexDirection: 'row',
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  reviewComment: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  // Similar Items Styles
  similarSection: {
    marginTop: 24,
    paddingBottom: 32,
  },
  similarScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  similarCard: {
    width: 160,
    marginRight: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    overflow: 'hidden',
  },
  similarImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f9fafb',
  },
  similarInfo: {
    padding: 10,
  },
  similarTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  similarReason: {
    fontSize: 11,
    color: '#3b82f6',
    fontStyle: 'italic',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  ratingSelector: {
    marginBottom: 24,
  },
  starsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  // Bottom Bar Styles
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
