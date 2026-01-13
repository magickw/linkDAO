/**
 * Shopping Cart Screen
 * Display cart items with quantity controls and checkout option
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { cartStore } from '../../src/store';

export default function CartScreen() {
  const router = useRouter();
  const items = cartStore((state) => state.items);
  const updateQuantity = cartStore((state) => state.updateQuantity);
  const removeItem = cartStore((state) => state.removeItem);
  const clearCart = cartStore((state) => state.clearCart);
  const getTotalPrice = cartStore((state) => state.getTotalPrice);
  const getTotalItems = cartStore((state) => state.getTotalItems);

  const totalPrice = getTotalPrice();
  const totalItems = getTotalItems();

  const handleIncreaseQuantity = (id: string, currentQuantity: number) => {
    updateQuantity(id, currentQuantity + 1);
  };

  const handleDecreaseQuantity = (id: string, currentQuantity: number) => {
    if (currentQuantity > 1) {
      updateQuantity(id, currentQuantity - 1);
    } else {
      // Show confirmation before removing
      Alert.alert(
        'Remove Item',
        'Are you sure you want to remove this item from your cart?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => removeItem(id),
          },
        ]
      );
    }
  };

  const handleRemoveItem = (id: string) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeItem(id),
        },
      ]
    );
  };

  const handleClearCart = () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to clear all items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => clearCart(),
        },
      ]
    );
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

  if (items.length === 0) {
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
        <TouchableOpacity onPress={handleClearCart} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Cart Items */}
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

        {/* Order Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Order Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${totalPrice.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={styles.summaryValue}>Free</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>${(totalPrice * 0.08).toFixed(2)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${(totalPrice * 1.08).toFixed(2)}</Text>
          </View>
        </View>

        {/* Promo Code */}
        <View style={styles.promoContainer}>
          <View style={styles.promoInput}>
            <Ionicons name="pricetag" size={20} color="#9ca3af" style={styles.promoIcon} />
            <Text style={styles.promoPlaceholder}>Enter promo code</Text>
          </View>
          <TouchableOpacity style={styles.promoButton}>
            <Text style={styles.promoButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
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
            Checkout ${(totalPrice * 1.08).toFixed(2)}
          </Text>
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
    flex: 1,
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