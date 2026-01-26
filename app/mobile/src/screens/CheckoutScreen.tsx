import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

// Types
type CheckoutRouteParams = {
  Checkout: {
    items: Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
      image?: string;
    }>;
    total: number;
    sellerId: string;
  };
};

type RootStackParamList = {
  Checkout: CheckoutRouteParams;
  Home: undefined;
  Wallet: undefined;
};

export default function CheckoutScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'Checkout'>>();
  const { items, total, sellerId } = route.params;

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'crypto' | 'fiat'>('crypto');
  const [shippingAddress, setShippingAddress] = useState({
    fullName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
  });
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvc: '',
  });
  const [walletAddress, setWalletAddress] = useState('');

  // Mock function to process crypto payment via wallet
  const processCryptoPayment = async () => {
    if (!walletAddress) {
      Alert.alert('Error', 'Please connect your wallet');
      return;
    }

    setLoading(true);
    try {
      // TODO: Integrate with actual Web3 wallet (MetaMask, WalletConnect, etc.)
      // This would involve:
      // 1. Connecting to wallet provider
      // 2. Creating transaction with smart contract
      // 3. Getting user signature
      // 4. Broadcasting transaction
      
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Payment Successful',
        'Your order has been placed successfully!',
        [{ text: 'OK', onPress: () => navigation.navigate('Home' as never) }]
      );
    } catch (error) {
      Alert.alert('Payment Failed', 'There was an error processing your payment');
    } finally {
      setLoading(false);
    }
  };

  // Mock function to process fiat payment via Stripe
  const processStripePayment = async () => {
    // Validate shipping address
    if (!shippingAddress.fullName || !shippingAddress.addressLine1 || 
        !shippingAddress.city || !shippingAddress.postalCode) {
      Alert.alert('Error', 'Please complete all shipping address fields');
      return;
    }

    // Validate card details
    if (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvc) {
      Alert.alert('Error', 'Please complete all card details');
      return;
    }

    setLoading(true);
    try {
      // TODO: Integrate with @stripe/stripe-react-native for native Payment Sheet
      // This would involve:
      // 1. Creating PaymentIntent on backend
      // 2. Initializing Stripe with publishable key
      // 3. Presenting Payment Sheet to user
      // 4. Handling payment result
      
      // Mock implementation - simulating Stripe Payment Sheet flow
      const response = await fetch('https://api.yourdomain.com/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: total,
          currency: 'usd',
          items: items,
          shippingAddress,
          sellerId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create payment intent');
      }

      // In production, you would use Stripe's PaymentSheet here:
      // const { error } = await initPaymentSheet({
      //   paymentIntentClientSecret: data.clientSecret,
      //   merchantDisplayName: 'LinkDAO Marketplace',
      // });
      //
      // if (error) {
      //   throw new Error(error.message);
      // }
      //
      // const { error: paymentError } = await presentPaymentSheet();
      //
      // if (paymentError) {
      //   throw new Error(paymentError.message);
      // }

      // Mock success
      await new Promise(resolve => setTimeout(resolve, 2000));

      Alert.alert(
        'Payment Successful',
        'Your order has been placed successfully!',
        [{ text: 'OK', onPress: () => navigation.navigate('Home' as never) }]
      );
    } catch (error) {
      Alert.alert(
        'Payment Failed',
        error instanceof Error ? error.message : 'There was an error processing your payment'
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = () => {
    if (paymentMethod === 'crypto') {
      processCryptoPayment();
    } else {
      processStripePayment();
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Checkout</Text>

      {/* Order Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        {items.map((item, index) => (
          <View key={index} style={styles.orderItem}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
            </View>
            <Text style={styles.itemPrice}>
              ${(item.price * item.quantity).toFixed(2)}
            </Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
        </View>
      </View>

      {/* Payment Method Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.paymentMethodSelector}>
          <TouchableOpacity
            style={[
              styles.paymentMethodButton,
              paymentMethod === 'crypto' && styles.selectedPaymentMethod,
            ]}
            onPress={() => setPaymentMethod('crypto')}
          >
            <Text
              style={[
                styles.paymentMethodText,
                paymentMethod === 'crypto' && styles.selectedPaymentMethodText,
              ]}
            >
              Crypto (USDC/ETH)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.paymentMethodButton,
              paymentMethod === 'fiat' && styles.selectedPaymentMethod,
            ]}
            onPress={() => setPaymentMethod('fiat')}
          >
            <Text
              style={[
                styles.paymentMethodText,
                paymentMethod === 'fiat' && styles.selectedPaymentMethodText,
              ]}
            >
              Credit/Debit Card
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Crypto Payment Section */}
      {paymentMethod === 'crypto' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallet Connection</Text>
          <TextInput
            style={styles.input}
            value={walletAddress}
            onChangeText={setWalletAddress}
            placeholder="Connect your wallet address"
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.connectButton}>
            <Text style={styles.connectButtonText}>Connect Wallet</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Fiat Payment Section */}
      {paymentMethod === 'fiat' && (
        <>
          {/* Shipping Address */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
            <TextInput
              style={styles.input}
              value={shippingAddress.fullName}
              onChangeText={(text) => setShippingAddress({ ...shippingAddress, fullName: text })}
              placeholder="Full Name"
            />
            <TextInput
              style={styles.input}
              value={shippingAddress.addressLine1}
              onChangeText={(text) => setShippingAddress({ ...shippingAddress, addressLine1: text })}
              placeholder="Address Line 1"
            />
            <TextInput
              style={styles.input}
              value={shippingAddress.addressLine2}
              onChangeText={(text) => setShippingAddress({ ...shippingAddress, addressLine2: text })}
              placeholder="Address Line 2 (Optional)"
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                value={shippingAddress.city}
                onChangeText={(text) => setShippingAddress({ ...shippingAddress, city: text })}
                placeholder="City"
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                value={shippingAddress.state}
                onChangeText={(text) => setShippingAddress({ ...shippingAddress, state: text })}
                placeholder="State"
              />
            </View>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                value={shippingAddress.postalCode}
                onChangeText={(text) => setShippingAddress({ ...shippingAddress, postalCode: text })}
                placeholder="Postal Code"
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                value={shippingAddress.country}
                onChangeText={(text) => setShippingAddress({ ...shippingAddress, country: text })}
                placeholder="Country"
              />
            </View>
          </View>

          {/* Card Details - NOTE: This is a placeholder for Stripe Payment Sheet */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Card Details</Text>
            <Text style={styles.infoText}>
              In production, this will use Stripe's native Payment Sheet for secure card entry.
            </Text>
            <TextInput
              style={styles.input}
              value={cardDetails.number}
              onChangeText={(text) => setCardDetails({ ...cardDetails, number: text })}
              placeholder="Card Number"
              keyboardType="number-pad"
              maxLength={19}
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                value={cardDetails.expiry}
                onChangeText={(text) => setCardDetails({ ...cardDetails, expiry: text })}
                placeholder="MM/YY"
                maxLength={5}
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                value={cardDetails.cvc}
                onChangeText={(text) => setCardDetails({ ...cardDetails, cvc: text })}
                placeholder="CVC"
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
          </View>
        </>
      )}

      {/* Place Order Button */}
      <TouchableOpacity
        style={[styles.placeOrderButton, loading && styles.disabledButton]}
        onPress={handlePlaceOrder}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.placeOrderButtonText}>
            Place Order - ${total.toFixed(2)}
          </Text>
        )}
      </TouchableOpacity>

      {/* Security Info */}
      <View style={styles.securityInfo}>
        <Text style={styles.securityText}>🔒 Secure Payment</Text>
        <Text style={styles.securitySubtext}>
          {paymentMethod === 'crypto'
            ? 'Your payment is protected by smart contract escrow'
            : 'Your card details are secured by Stripe'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#3b82f6',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  paymentMethodSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  paymentMethodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  selectedPaymentMethod: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  selectedPaymentMethodText: {
    color: 'white',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  connectButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  connectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  placeOrderButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  placeOrderButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  securityInfo: {
    backgroundColor: '#e0f2fe',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  securityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 4,
  },
  securitySubtext: {
    fontSize: 14,
    color: '#0284c7',
    textAlign: 'center',
  },
});