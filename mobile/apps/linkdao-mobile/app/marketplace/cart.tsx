/**
 * Shopping Cart Screen
 * Display cart items with quantity controls, gift options, and saved for later
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { cartStore } from '../../src/store/cartStore';

export default function CartScreen() {
  const router = useRouter();
  const items = cartStore((state) => state.items);
  const savedItems = cartStore((state) => state.savedItems);
  const giftOptions = cartStore((state) => state.giftOptions);
  const updateQuantity = cartStore((state) => state.updateQuantity);
  const removeItem = cartStore((state) => state.removeItem);
  const clearCart = cartStore((state) => state.clearCart);
  const getTotalPrice = cartStore((state) => state.getTotalPrice);
  const getTotalItems = cartStore((state) => state.getTotalItems);
  const updateGiftOptions = cartStore((state) => state.updateGiftOptions);
  
  const fetchSavedItems = cartStore((state) => state.fetchSavedItems);
  const moveToSaved = cartStore((state) => state.moveToSaved);
  const restoreFromSaved = cartStore((state) => state.restoreFromSaved);
  const removeSavedItem = cartStore((state) => state.removeSavedItem);

  const [showGiftDetails, setShowGiftDetails] = useState(giftOptions.isGift);
  const [giftMessage, setGiftMessage] = useState(giftOptions.giftMessage || '');

  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  const [loadingRecommended, setLoadingRecommended] = useState(false);

  useEffect(() => {
    fetchSavedItems();
    fetchRecommendedProducts();
  }, []);

  const fetchRecommendedProducts = async () => {
    try {
      setLoadingRecommended(true);
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:10000'}/api/products?limit=4&sort=popular`);
      if (response.ok) {
        const data = await response.json();
        setRecommendedProducts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoadingRecommended(false);
    }
  };

  const handleQuickAdd = (product: any) => {
    cartStore.getState().addItem({
      id: product.id,
      name: product.title,
      price: parseFloat(product.priceAmount),
      image: product.images?.[0] || '',
      quantity: 1,
      seller: product.sellerId || 'Unknown'
    });
    Alert.alert('Added to Cart', `${product.title} has been added to your cart.`);
  };

  const totalPrice = getTotalPrice();
  const totalItems = getTotalItems();
  const giftWrapPrice = giftOptions.isGift ? (giftOptions.giftWrapOption === 'standard' ? 2.99 : giftOptions.giftWrapOption === 'premium' ? 5.99 : 0) : 0;
  const tax = (totalPrice + giftWrapPrice) * 0.08;
  const grandTotal = totalPrice + giftWrapPrice + tax;

  const handleIncreaseQuantity = (id: string, currentQuantity: number) => {
    updateQuantity(id, currentQuantity + 1);
  };

  const handleDecreaseQuantity = (id: string, currentQuantity: number) => {
    if (currentQuantity > 1) {
      updateQuantity(id, currentQuantity - 1);
    } else {
      handleRemoveItem(id);
    }
  };

  const handleRemoveItem = (id: string) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeItem(id) },
      ]
    );
  };

  const handleClearCart = () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to clear all items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => clearCart() },
      ]
    );
  };

  const handleMoveToSaved = (id: string) => {
    moveToSaved(id);
  };

  const handleRestoreFromSaved = (id: string) => {
    restoreFromSaved(id);
  };

  const handleRemoveSaved = (id: string) => {
    removeSavedItem(id);
  };

  const handleGiftToggle = () => {
    const newVal = !showGiftDetails;
    setShowGiftDetails(newVal);
    updateGiftOptions({
      ...giftOptions,
      isGift: newVal,
      giftMessage: newVal ? giftMessage : ''
    });
  };

  const handleGiftWrapChange = (option: 'none' | 'standard' | 'premium') => {
    updateGiftOptions({
      ...giftOptions,
      giftWrapOption: option
    });
  };

  const handleGiftMessageChange = (text: string) => {
    setGiftMessage(text);
    updateGiftOptions({
      ...giftOptions,
      giftMessage: text
    });
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      Alert.alert('Cart Empty', 'Your cart is empty. Add some items before checkout.');
      return;
    }
    router.push('/marketplace/checkout');
  };

  const handleContinueShopping = () => {
    router.replace('/(tabs)/marketplace');
  };

  if (items.length === 0 && savedItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shopping Cart</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color="#d1d5db" />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>
            Looks like you haven't added any items to your cart yet.
          </Text>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinueShopping}
          >
            <Text style={styles.continueButtonText}>Continue Shopping</Text>
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
        <Text style={styles.headerTitle}>Shopping Cart ({totalItems})</Text>
        {items.length > 0 && (
          <TouchableOpacity onPress={handleClearCart} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {/* Cart Items */}
        {items.length > 0 ? (
          <View style={styles.itemsContainer}>
            {items.map((item) => (
              <View key={item.id} style={styles.cartItem}>
                <View style={[styles.itemImage, { backgroundColor: item.image }]} />
                
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.itemSeller}>by {item.seller}</Text>
                  <Text style={styles.itemPrice}>${item.price}</Text>
                  
                  <TouchableOpacity 
                    style={styles.saveForLaterButton}
                    onPress={() => handleMoveToSaved(item.id)}
                  >
                    <Text style={styles.saveForLaterText}>Save for later</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={styles.removeIconButton}
                    onPress={() => handleRemoveItem(item.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>

                  <View style={styles.quantityControl}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => handleDecreaseQuantity(item.id, item.quantity)}
                    >
                      <Ionicons name="remove" size={16} color="#1f2937" />
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => handleIncreaseQuantity(item.id, item.quantity)}
                    >
                      <Ionicons name="add" size={16} color="#1f2937" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.itemTotal}>
                    ${(item.price * item.quantity).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCartSmall}>
            <Text style={styles.emptyCartSmallText}>Your cart is empty</Text>
          </View>
        )}

        {/* Order Summary (Only if items in cart) */}
        {items.length > 0 && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Order Summary</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${totalPrice.toFixed(2)}</Text>
            </View>

            {giftOptions.isGift && giftWrapPrice > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Gift Wrap ({giftOptions.giftWrapOption})</Text>
                <Text style={styles.summaryValue}>${giftWrapPrice.toFixed(2)}</Text>
              </View>
            )}

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={styles.summaryValue}>Free</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax (8%)</Text>
              <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${grandTotal.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Gift Options */}
        {items.length > 0 && (
          <View style={styles.giftSection}>
            <TouchableOpacity 
              style={styles.giftCheckboxContainer}
              onPress={handleGiftToggle}
            >
              <Ionicons 
                name={showGiftDetails ? "checkbox" : "square-outline"} 
                size={24} 
                color={showGiftDetails ? "#3b82f6" : "#9ca3af"} 
              />
              <Text style={styles.giftCheckboxText}>This is a gift</Text>
            </TouchableOpacity>

            {showGiftDetails && (
              <View style={styles.giftDetailsContainer}>
                <Text style={styles.giftSectionLabel}>Gift Wrap</Text>
                <View style={styles.wrapOptions}>
                  {(['none', 'standard', 'premium'] as const).map((option) => (
                    <TouchableOpacity 
                      key={option}
                      style={[styles.wrapOption, giftOptions.giftWrapOption === option && styles.wrapOptionSelected]}
                      onPress={() => handleGiftWrapChange(option)}
                    >
                      <Text style={[styles.wrapOptionText, giftOptions.giftWrapOption === option && styles.wrapOptionTextSelected]}>
                        {option === 'none' ? 'None' : 
                         option === 'standard' ? 'Standard ($2.99)' : 'Premium ($5.99)'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.giftSectionLabel, { marginTop: 16 }]}>Gift Message (Optional)</Text>
                <TextInput
                  style={styles.giftMessageInput}
                  placeholder="Add a personal message..."
                  placeholderTextColor="#9ca3af"
                  value={giftMessage}
                  onChangeText={handleGiftMessageChange}
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                />
                <Text style={styles.charCount}>{giftMessage.length}/200</Text>
              </View>
            )}
          </View>
        )}

        {/* Promo Code (Only if items in cart) */}
        {items.length > 0 && (
          <View style={styles.promoContainer}>
            <View style={styles.promoInput}>
              <Ionicons name="pricetag" size={20} color="#9ca3af" style={styles.promoIcon} />
              <Text style={styles.promoPlaceholder}>Enter promo code</Text>
            </View>
            <TouchableOpacity style={styles.promoButton}>
              <Text style={styles.promoButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Saved For Later Section */}
        {savedItems.length > 0 && (
          <View style={styles.savedSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Saved for later ({savedItems.length})</Text>
            </View>
            <View style={styles.savedItemsContainer}>
              {savedItems.map((item) => (
                <View key={item.id} style={styles.savedItem}>
                  <View style={[styles.savedItemImage, { backgroundColor: item.image }]} />
                  <View style={styles.savedItemInfo}>
                    <Text style={styles.savedItemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.savedItemPrice}>${item.price}</Text>
                    <View style={styles.savedItemActions}>
                      <TouchableOpacity 
                        style={styles.moveToCartButton}
                        onPress={() => handleRestoreFromSaved(item.id)}
                      >
                        <Text style={styles.moveToCartText}>Move to Cart</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => handleRemoveSaved(item.id)}
                        style={styles.removeSavedButton}
                      >
                        <Text style={styles.removeSavedText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recommended Products */}
        {recommendedProducts.length > 0 && (
          <View style={styles.recommendedSection}>
            <Text style={styles.sectionTitle}>Recommended for you</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendedScroll}>
              {recommendedProducts.map((product) => (
                <TouchableOpacity 
                  key={product.id} 
                  style={styles.recommendedCard}
                  onPress={() => router.push(`/marketplace/product/${product.id}`)}
                >
                  <View style={[styles.recommendedImage, { backgroundColor: '#f3f4f6' }]}>
                    {/* Placeholder for product image */}
                    <View style={{ width: '100%', height: '100%', backgroundColor: '#e5e7eb', borderRadius: 8 }} />
                  </View>
                  <Text style={styles.recommendedName} numberOfLines={1}>{product.title}</Text>
                  <Text style={styles.recommendedPrice}>${product.priceAmount}</Text>
                  <TouchableOpacity 
                    style={styles.quickAddButton}
                    onPress={() => handleQuickAdd(product)}
                  >
                    <Text style={styles.quickAddText}>Add</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        {items.length > 0 ? (
          <>
            <TouchableOpacity
              style={styles.continueShoppingButton}
              onPress={handleContinueShopping}
            >
              <Text style={styles.continueShoppingButtonText}>Continue Shopping</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={handleCheckout}
            >
              <Text style={styles.checkoutButtonText}>
                Checkout ${grandTotal.toFixed(2)}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.continueShoppingButton, { flex: 1, marginRight: 0 }]}
            onPress={handleContinueShopping}
          >
            <Text style={styles.continueShoppingButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
        )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 50,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  continueButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  itemsContainer: {
    padding: 16,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  itemSeller: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3b82f6',
  },
  saveForLaterButton: {
    marginTop: 8,
  },
  saveForLaterText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '500',
  },
  itemActions: {
    alignItems: 'flex-end',
  },
  removeIconButton: {
    padding: 4,
    marginBottom: 8,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    marginBottom: 4,
  },
  quantityButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    paddingHorizontal: 8,
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
  },
  summaryContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  giftSection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  giftCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  giftCheckboxText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginLeft: 8,
  },
  giftDetailsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  giftSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  wrapOptions: {
    flexDirection: 'column',
    gap: 8,
  },
  wrapOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  wrapOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  wrapOptionText: {
    fontSize: 14,
    color: '#1f2937',
  },
  wrapOptionTextSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  giftMessageInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 4,
  },
  promoContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  promoInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginRight: 8,
  },
  promoIcon: {
    marginRight: 8,
  },
  promoPlaceholder: {
    fontSize: 15,
    color: '#9ca3af',
  },
  promoButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  promoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  emptyCartSmall: {
    padding: 32,
    alignItems: 'center',
  },
  emptyCartSmallText: {
    fontSize: 16,
    color: '#6b7280',
  },
  savedSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  recommendedSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  recommendedScroll: {
    marginTop: 12,
  },
  recommendedCard: {
    width: 140,
    marginRight: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 8,
  },
  recommendedImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
  },
  recommendedName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  recommendedPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 8,
  },
  quickAddButton: {
    backgroundColor: '#eff6ff',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  quickAddText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  savedItemsContainer: {
    marginTop: 12,
  },
  savedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  savedItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  savedItemInfo: {
    flex: 1,
  },
  savedItemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  savedItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 8,
  },
  savedItemActions: {
    flexDirection: 'row',
  },
  moveToCartButton: {
    marginRight: 16,
  },
  moveToCartText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '600',
  },
  removeSavedButton: {},
  removeSavedText: {
    fontSize: 13,
    color: '#ef4444',
  },
  bottomSpacer: {
    height: 100,
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  continueShoppingButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  continueShoppingButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  checkoutButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
