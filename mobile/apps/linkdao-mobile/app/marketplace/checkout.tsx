/**
 * Checkout Screen
 * Complete the purchase with payment flow
 * Updated to use Reducer pattern and new backend services
 */

import { useEffect, useReducer, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { cartStore } from '../../src/store';
import { useAuthStore } from '../../src/store';
import { checkoutService } from '../../src/services/checkoutService';
import { taxService } from '../../src/services/taxService';
import { checkoutReducer, initialCheckoutState } from '../../src/reducers/checkoutReducer';
import { PaymentMethodType } from '../../src/types/checkout';

export default function CheckoutScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const items = cartStore((state) => state.items);
  const clearCart = cartStore((state) => state.clearCart);
  const syncWithBackend = cartStore((state) => state.syncWithBackend);
  const getTotalPrice = cartStore((state) => state.getTotalPrice);

  const [state, dispatch] = useReducer(checkoutReducer, initialCheckoutState);
  
  // Local state for inputs to avoid too many dispatches on typing
  const [discountInput, setDiscountInput] = useState('');
  const [escrowEnabled, setEscrowEnabled] = useState(true);

  const subtotal = getTotalPrice();
  const shipping = 0 as number; // In a real app, this would come from shipping service
  
  // Load initial data
  useEffect(() => {
    loadSavedAddresses();
  }, []);

  const loadSavedAddresses = async () => {
    try {
      dispatch({ type: 'SET_LOADING_SAVED_DATA', payload: true });
      const addresses = await checkoutService.getSavedAddresses();
      dispatch({ type: 'SET_SAVED_ADDRESSES', payload: addresses });
    } catch (error) {
      console.error('Error loading saved addresses:', error);
    } finally {
      dispatch({ type: 'SET_LOADING_SAVED_DATA', payload: false });
    }
  };

  const handleSelectSavedAddress = (addr: any) => {
    const formattedAddress = {
      firstName: addr.firstName,
      lastName: addr.lastName,
      email: user?.email || '', // Assuming email is available or user enters it
      address1: addr.addressLine1,
      address2: addr.addressLine2,
      city: addr.city,
      state: addr.state,
      zipCode: addr.postalCode,
      country: addr.country === 'US' ? 'United States' : addr.country, // Normalize if needed
      phone: addr.phoneNumber
    };

    dispatch({ type: 'SET_SHIPPING_ADDRESS', payload: formattedAddress });
    dispatch({ type: 'SELECT_SAVED_ADDRESS', payload: addr.id });
    
    // Validate address with new service
    validateAddress(formattedAddress);
  };

  const validateAddress = async (address: any) => {
    const result = await checkoutService.validateAddress(address);
    if (!result.isValid) {
      // Show warning but don't block if user insists? 
      // For now, just setting errors
      const errors: Record<string, string> = {};
      result.errors.forEach((err, idx) => {
        errors[`address_error_${idx}`] = err;
      });
      dispatch({ type: 'SET_SHIPPING_ERRORS', payload: errors });
    } else {
       dispatch({ type: 'CLEAR_ERRORS' });
       if (result.normalizedAddress) {
         // Could offer to update to normalized address
         // dispatch({ type: 'SET_SHIPPING_ADDRESS', payload: result.normalizedAddress });
       }
    }
  };

  // Calculate tax when address or items change
  useEffect(() => {
    if (state.shippingAddress.country && items.length > 0) {
      calculateTax();
    }
  }, [state.shippingAddress.country, state.shippingAddress.state, state.shippingAddress.zipCode, items]);

  const calculateTax = async () => {
    try {
      const taxableItems = items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }));

      const result = await taxService.calculateTax(
        taxableItems,
        {
          country: state.shippingAddress.country === 'United States' ? 'US' : state.shippingAddress.country,
          state: state.shippingAddress.state,
          city: state.shippingAddress.city,
          postalCode: state.shippingAddress.zipCode,
          line1: state.shippingAddress.address1
        },
        shipping
      );
      dispatch({ type: 'SET_TAX_CALCULATION', payload: result });
    } catch (error) {
      console.error('Tax calculation error:', error);
    }
  };

  const handleApplyDiscount = async () => {
    if (!discountInput.trim()) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = await checkoutService.applyDiscount(
        discountInput, 
        subtotal, 
        items.map(item => ({ id: item.id, price: item.price, quantity: item.quantity }))
      );

      if (result.isValid) {
        dispatch({ 
          type: 'APPLY_DISCOUNT', 
          payload: { amount: result.discountAmount, code: result.code } 
        });
        Alert.alert('Success', `Discount code applied! Saved $${result.discountAmount.toFixed(2)}`);
      } else {
        dispatch({ type: 'SET_DISCOUNT_ERROR', payload: result.error || 'Invalid code' });
        Alert.alert('Invalid Code', result.error || 'This discount code cannot be used.');
      }
    } catch (error) {
      dispatch({ type: 'SET_DISCOUNT_ERROR', payload: 'Failed to apply discount' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const tax = state.taxCalculation?.taxAmount || 0;
  const total = subtotal + tax + shipping - state.discountAmount;

  const handlePlaceOrder = async () => {
    // Basic validation
    if (!state.shippingAddress.firstName || !state.shippingAddress.address1 ||
      !state.shippingAddress.city || !state.shippingAddress.state || !state.shippingAddress.zipCode) {
      Alert.alert('Incomplete Address', 'Please fill in all shipping address fields.');
      return;
    }

    if (!state.selectedPaymentMethod) {
       Alert.alert('Payment Method', 'Please select a payment method.');
       return;
    }

    dispatch({ type: 'SET_PROCESSING', payload: true });

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
        shippingAddress: state.shippingAddress
      });

      dispatch({ type: 'SET_SESSION_ID', payload: checkoutSession.sessionId });

      // 3. Process checkout
      await checkoutService.processCheckout({
        sessionId: checkoutSession.sessionId,
        paymentMethod: state.selectedPaymentMethod.method.type,
        paymentDetails: {
          walletAddress: user?.address, // Assuming user.address exists on AuthUser
          // Add token details if needed for crypto
        },
        shippingAddress: state.shippingAddress,
        discountCode: state.discountCode
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
      const errorMessage = error.message || 'There was an error processing your payment. Please try again.';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      Alert.alert('Payment Failed', errorMessage);
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: false });
    }
  };

  // Simplified payment methods for UI (map to full types in reducer)
  const paymentMethods = [
    {
      id: PaymentMethodType.X402,
      name: 'X402 Protocol',
      icon: 'flash',
      description: 'Gas-optimized crypto payment',
    },
    {
      id: PaymentMethodType.STABLECOIN_USDC,
      name: 'USDC (Crypto)',
      icon: 'logo-usd',
      description: 'Pay with USDC',
    },
    {
      id: PaymentMethodType.FIAT_STRIPE,
      name: 'Credit Card',
      icon: 'card-outline',
      description: 'Pay with credit or debit card',
    },
  ];

  const selectPaymentMethod = (id: PaymentMethodType) => {
      // Create a dummy PrioritizedPaymentMethod object for now to satisfy types
      // In a real implementation, we would call getPaymentRecommendation to get this
      const method = {
          method: {
              id: id,
              type: id,
              name: id === PaymentMethodType.STABLECOIN_USDC ? 'USDC' : 'Credit Card',
              description: '',
              enabled: true,
              supportedNetworks: [1]
          },
          priority: 1,
          costEstimate: { totalCost: 0, baseCost: 0, gasFee: 0, estimatedTime: 0, confidence: 1, currency: 'USD' },
          availabilityStatus: 'available' as any,
          userPreferenceScore: 1,
          recommendationReason: 'User selection',
          totalScore: 1
      };
      
      dispatch({ type: 'SET_PAYMENT_METHOD', payload: method });
  };

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
        {/* Saved Addresses */}
        {state.savedAddresses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Use Saved Address</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.savedAddressesScroll}>
              {state.savedAddresses.map((addr) => (
                <TouchableOpacity 
                  key={addr.id} 
                  style={[
                      styles.savedAddressCard, 
                      state.selectedSavedAddress === addr.id && styles.savedAddressCardSelected
                  ]}
                  onPress={() => handleSelectSavedAddress(addr)}
                >
                  <Text style={styles.savedAddressName}>{addr.firstName} {addr.lastName}</Text>
                  <Text style={styles.savedAddressText} numberOfLines={1}>{addr.addressLine1}</Text>
                  <Text style={styles.savedAddressText}>{addr.city}, {addr.state}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Shipping Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Address</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>First Name</Text>
            <TextInput
              style={styles.input}
              placeholder="John"
              value={state.shippingAddress.firstName}
              onChangeText={(text) => dispatch({ type: 'SET_SHIPPING_ADDRESS', payload: { firstName: text } })}
            />
          </View>

           <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Last Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Doe"
              value={state.shippingAddress.lastName}
              onChangeText={(text) => dispatch({ type: 'SET_SHIPPING_ADDRESS', payload: { lastName: text } })}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Street Address</Text>
            <TextInput
              style={styles.input}
              placeholder="123 Main St"
              value={state.shippingAddress.address1}
              onChangeText={(text) => dispatch({ type: 'SET_SHIPPING_ADDRESS', payload: { address1: text } })}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.inputLabel}>City</Text>
              <TextInput
                style={styles.input}
                placeholder="New York"
                value={state.shippingAddress.city}
                onChangeText={(text) => dispatch({ type: 'SET_SHIPPING_ADDRESS', payload: { city: text } })}
              />
            </View>

            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.inputLabel}>State</Text>
              <TextInput
                style={styles.input}
                placeholder="NY"
                value={state.shippingAddress.state}
                onChangeText={(text) => dispatch({ type: 'SET_SHIPPING_ADDRESS', payload: { state: text } })}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>ZIP Code</Text>
            <TextInput
              style={styles.input}
              placeholder="10001"
              value={state.shippingAddress.zipCode}
              onChangeText={(text) => dispatch({ type: 'SET_SHIPPING_ADDRESS', payload: { zipCode: text } })}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Country</Text>
            <TextInput
              style={styles.input}
              placeholder="United States"
              value={state.shippingAddress.country}
              onChangeText={(text) => dispatch({ type: 'SET_SHIPPING_ADDRESS', payload: { country: text } })}
            />
          </View>
          
          {Object.keys(state.shippingErrors).length > 0 && (
              <View style={styles.errorContainer}>
                  {Object.values(state.shippingErrors).map((err, i) => (
                      <Text key={i} style={styles.errorText}>{err}</Text>
                  ))}
              </View>
          )}
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>

          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentMethod,
                state.selectedPaymentMethod?.method.type === method.id && styles.paymentMethodSelected,
              ]}
              onPress={() => selectPaymentMethod(method.id)}
            >
              <View style={styles.paymentMethodLeft}>
                <Ionicons
                  name={method.icon as any}
                  size={24}
                  color={state.selectedPaymentMethod?.method.type === method.id ? '#3b82f6' : '#6b7280'}
                />
                <View style={styles.paymentMethodInfo}>
                  <Text style={[
                    styles.paymentMethodName,
                    state.selectedPaymentMethod?.method.type === method.id && styles.paymentMethodNameSelected,
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
                state.selectedPaymentMethod?.method.type === method.id && styles.radioButtonSelected,
              ]}>
                {state.selectedPaymentMethod?.method.type === method.id && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </TouchableOpacity>
          ))}

          {/* Crypto Wallet Info & Escrow */}
          {state.selectedPaymentMethod?.method.type !== PaymentMethodType.FIAT_STRIPE && state.selectedPaymentMethod && (
            <View>
              <View style={styles.walletInfo}>
                <Ionicons name="information-circle" size={16} color="#3b82f6" />
                <Text style={styles.walletInfoText}>
                  {state.selectedPaymentMethod.method.type === PaymentMethodType.X402 
                    ? 'X402 Protocol optimizes gas fees by bundling your transaction.'
                    : 'You will be prompted to sign a transaction with your wallet.'}
                </Text>
              </View>
              
              <TouchableOpacity 
                style={styles.escrowToggle}
                onPress={() => setEscrowEnabled(!escrowEnabled)}
              >
                <View style={styles.escrowInfo}>
                  <Text style={styles.escrowTitle}>Escrow Protection</Text>
                  <Text style={styles.escrowDesc}>
                    {escrowEnabled 
                      ? 'Funds are held securely until order delivery' 
                      : 'Direct payment to seller (Higher risk)'}
                  </Text>
                </View>
                <View style={[styles.toggleTrack, escrowEnabled && styles.toggleTrackActive]}>
                  <View style={[styles.toggleThumb, escrowEnabled && styles.toggleThumbActive]} />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Discount Code */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Discount Code</Text>
            <View style={styles.discountContainer}>
                <TextInput
                    style={styles.discountInput}
                    placeholder="Enter code"
                    value={discountInput}
                    onChangeText={setDiscountInput}
                    autoCapitalize="characters"
                />
                <TouchableOpacity style={styles.applyButton} onPress={handleApplyDiscount}>
                    <Text style={styles.applyButtonText}>Apply</Text>
                </TouchableOpacity>
            </View>
            {state.discountAmount > 0 && (
                <Text style={styles.discountSuccess}>
                    Code {state.discountCode} applied: -${state.discountAmount.toFixed(2)}
                </Text>
            )}
             {state.discountError && (
                <Text style={styles.errorText}>
                    {state.discountError}
                </Text>
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
            <Text style={styles.summaryLabel}>
              Tax {state.taxCalculation ? `(${(state.taxCalculation.taxRate * 100).toFixed(1)}%)` : '(est.)'}
            </Text>
            <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
          </View>

          {/* Fee Breakdown */}
          {state.selectedPaymentMethod?.costEstimate?.platformFee > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Platform Fee</Text>
              <Text style={styles.summaryValue}>${state.selectedPaymentMethod.costEstimate.platformFee.toFixed(2)}</Text>
            </View>
          )}
          
          {state.selectedPaymentMethod?.costEstimate?.gasFee > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Network Fee (Est.)</Text>
              <Text style={styles.summaryValue}>${state.selectedPaymentMethod.costEstimate.gasFee.toFixed(2)}</Text>
            </View>
          )}
          
          {state.discountAmount > 0 && (
            <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: '#10b981' }]}>Discount</Text>
                <Text style={[styles.summaryValue, { color: '#10b981' }]}>-${state.discountAmount.toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              ${(total + (state.selectedPaymentMethod?.costEstimate?.gasFee || 0) + (state.selectedPaymentMethod?.costEstimate?.platformFee || 0)).toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalText}>Total</Text>
          <Text style={styles.totalAmount}>${Math.max(0, total).toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.placeOrderButton, state.processing && styles.placeOrderButtonDisabled]}
          onPress={handlePlaceOrder}
          disabled={state.processing}
        >
          {state.processing ? (
            <ActivityIndicator color="#fff" />
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
  savedAddressesScroll: {
    paddingBottom: 4,
  },
  savedAddressCard: {
    width: 200,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
  },
  savedAddressCardSelected: {
      borderColor: '#3b82f6',
      backgroundColor: '#eff6ff',
  },
  savedAddressName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  savedAddressText: {
    fontSize: 13,
    color: '#6b7280',
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
  errorContainer: {
      marginTop: 8,
      padding: 8,
      backgroundColor: '#fee2e2',
      borderRadius: 8,
  },
  errorText: {
      fontSize: 12,
      color: '#dc2626',
  },
  discountContainer: {
      flexDirection: 'row',
      marginBottom: 8,
  },
  discountInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#d1d5db',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 15,
      color: '#1f2937',
      marginRight: 8,
  },
  applyButton: {
      backgroundColor: '#374151',
      paddingHorizontal: 16,
      borderRadius: 8,
      justifyContent: 'center',
  },
  applyButtonText: {
      color: '#ffffff',
      fontWeight: '600',
      fontSize: 14,
  },
  discountSuccess: {
      color: '#10b981',
      fontSize: 14,
      marginTop: 4,
  },
  escrowToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  escrowInfo: {
    flex: 1,
    marginRight: 12,
  },
  escrowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  escrowDesc: {
    fontSize: 12,
    color: '#6b7280',
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#d1d5db',
    padding: 2,
  },
  toggleTrackActive: {
    backgroundColor: '#10b981',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  }
});
