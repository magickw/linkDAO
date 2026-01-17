/**
 * Checkout Screen
 * Complete the purchase with payment flow
 */

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { cartStore } from '../../src/store';
import { useAuthStore } from '../../src/store';
import { checkoutService } from '../../src/services/checkoutService';

export default function CheckoutScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const items = cartStore((state) => state.items);
  const clearCart = cartStore((state) => state.clearCart);
  const syncWithBackend = cartStore((state) => state.syncWithBackend);
  const getTotalPrice = cartStore((state) => state.getTotalPrice);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'crypto' | 'fiat'>('crypto');
  const [processing, setProcessing] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    fullName: user?.displayName || '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
  });

  const subtotal = getTotalPrice();
  const tax = subtotal * 0.08;
  const shipping = 0;
  const total = subtotal + tax + shipping;

  const handlePlaceOrder = async () => {
    // Validate shipping address
    if (!shippingAddress.fullName || !shippingAddress.address ||
      !shippingAddress.city || !shippingAddress.state || !shippingAddress.zipCode) {
      Alert.alert('Incomplete Address', 'Please fill in all shipping address fields.');
      return;
    }

    setProcessing(true);

    try {
      // 1. Sync cart with backend
      const synced = await syncWithBackend();
      if (!synced) {
        throw new Error('Failed to sync cart with server');
      }

      // 2. Create checkout session
      const checkoutSession = await checkoutService.createSession({
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        shippingAddress
      });

      // 3. Process checkout
      const result = await checkoutService.processCheckout({
        sessionId: checkoutSession.sessionId,
        paymentMethod: selectedPaymentMethod,
        paymentDetails: {
          walletAddress: user?.address, // Assuming user.address exists on AuthUser
          // Add token details if needed for crypto
        },
        shippingAddress
      });

      // Clear cart
      clearCart();

      // Show success message
      Alert.alert(
        'Order Placed Successfully!',
        'Your order has been placed and will be processed soon.',
        [
          {
            text: 'View Orders',
            onPress: () => router.replace('/marketplace/orders'),
          },
          {
            text: 'Continue Shopping',
            onPress: () => router.replace('/(tabs)/marketplace'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Payment Failed',
        error.message || 'There was an error processing your payment. Please try again.'
      );
    } finally {
      setProcessing(false);
    }
  };

  const paymentMethods = [
    {
      id: 'crypto',
      name: 'Crypto Wallet',
      icon: 'wallet-outline',
      description: 'Pay with your connected wallet',
    },
    {
      id: 'fiat',
      name: 'Credit Card',
      icon: 'card-outline',
      description: 'Pay with credit or debit card',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {/* Shipping Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Address</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="John Doe"
              value={shippingAddress.fullName}
              onChangeText={(text) => setShippingAddress({ ...shippingAddress, fullName: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Street Address</Text>
            <TextInput
              style={styles.input}
              placeholder="123 Main St"
              value={shippingAddress.address}
              onChangeText={(text) => setShippingAddress({ ...shippingAddress, address: text })}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.inputLabel}>City</Text>
              <TextInput
                style={styles.input}
                placeholder="New York"
                value={shippingAddress.city}
                onChangeText={(text) => setShippingAddress({ ...shippingAddress, city: text })}
              />
            </View>

            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.inputLabel}>State</Text>
              <TextInput
                style={styles.input}
                placeholder="NY"
                value={shippingAddress.state}
                onChangeText={(text) => setShippingAddress({ ...shippingAddress, state: text })}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>ZIP Code</Text>
            <TextInput
              style={styles.input}
              placeholder="10001"
              value={shippingAddress.zipCode}
              onChangeText={(text) => setShippingAddress({ ...shippingAddress, zipCode: text })}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Country</Text>
            <TextInput
              style={styles.input}
              placeholder="United States"
              value={shippingAddress.country}
              onChangeText={(text) => setShippingAddress({ ...shippingAddress, country: text })}
            />
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>

          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentMethod,
                selectedPaymentMethod === method.id && styles.paymentMethodSelected,
              ]}
              onPress={() => setSelectedPaymentMethod(method.id as any)}
            >
              <View style={styles.paymentMethodLeft}>
                <Ionicons
                  name={method.icon as any}
                  size={24}
                  color={selectedPaymentMethod === method.id ? '#3b82f6' : '#6b7280'}
                />
                <View style={styles.paymentMethodInfo}>
                  <Text style={[
                    styles.paymentMethodName,
                    selectedPaymentMethod === method.id && styles.paymentMethodNameSelected,
                  ]}>
                    {method.name}
                  </Text>
                  <Text style={styles.paymentMethodDescription}>
                    {method.description}
                  </Text>
                </View>
              </View>
              <View style={[
                styles.radioButton,
                selectedPaymentMethod === method.id && styles.radioButtonSelected,
              ]}>
                {selectedPaymentMethod === method.id && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </TouchableOpacity>
          ))}

          {/* Crypto Wallet Info */}
          {selectedPaymentMethod === 'crypto' && (
            <View style={styles.walletInfo}>
              <Ionicons name="information-circle" size={16} color="#3b82f6" />
              <Text style={styles.walletInfoText}>
                You will be prompted to sign a transaction with your wallet to complete the purchase.
              </Text>
            </View>
          )}
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>

          {items.map((item) => (
            <View key={item.id} style={styles.orderItem}>
              <View style={[styles.orderItemImage, { backgroundColor: item.image }]} />
              <View style={styles.orderItemInfo}>
                <Text style={styles.orderItemName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.orderItemQuantity}>Qty: {item.quantity}</Text>
              </View>
              <Text style={styles.orderItemPrice}>
                ${(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={styles.summaryValue}>
              {shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax (8%)</Text>
            <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalText}>Total</Text>
          <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.placeOrderButton, processing && styles.placeOrderButtonDisabled]}
          onPress={handlePlaceOrder}
          disabled={processing}
        >
          {processing ? (
            <Text style={styles.placeOrderButtonText}>Processing...</Text>
          ) : (
            <Text style={styles.placeOrderButtonText}>Place Order</Text>
          )}
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
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 8,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1f2937',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    flex: 1,
    marginRight: 8,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  paymentMethodSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodInfo: {
    marginLeft: 12,
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  paymentMethodNameSelected: {
    color: '#3b82f6',
  },
  paymentMethodDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#3b82f6',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  walletInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    marginLeft: 8,
    lineHeight: 18,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderItemImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 12,
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  orderItemQuantity: {
    fontSize: 13,
    color: '#6b7280',
  },
  orderItemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
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
    fontWeight: '500',
    color: '#1f2937',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  bottomSpacer: {
    height: 100,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  totalContainer: {
    flex: 1,
  },
  totalText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  placeOrderButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    minWidth: 150,
    alignItems: 'center',
  },
  placeOrderButtonDisabled: {
    opacity: 0.6,
  },
  placeOrderButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});