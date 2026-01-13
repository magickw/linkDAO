/**
 * Wallet Connect Screen
 * Handle wallet connection and signature generation
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

// Mock wallet providers - in production, integrate with WalletConnect SDK or native wallet
const WALLET_PROVIDERS = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: 'wallet-outline',
    color: '#f6851b',
    description: 'Connect with MetaMask wallet',
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    icon: 'qr-code-outline',
    color: '#3b99fc',
    description: 'Scan QR code with mobile wallet',
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: 'logo-bitcoin',
    color: '#0052ff',
    description: 'Connect with Coinbase Wallet',
  },
  {
    id: 'trust',
    name: 'Trust Wallet',
    icon: 'shield-checkmark-outline',
    color: '#3375bb',
    description: 'Connect with Trust Wallet',
  },
];

export default function WalletConnectScreen() {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const { mode = 'login' } = useLocalSearchParams<{ mode?: 'login' | 'register' }>();

  useEffect(() => {
    // Check if wallet is already connected
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    // In production, check if wallet is already connected via WalletConnect or native wallet
    // For now, mock the check
    const mockAddress = '0x1234567890abcdef1234567890abcdef12345678';
    setWalletAddress(mockAddress);
  };

  const handleConnect = async (providerId: string) => {
    setSelectedProvider(providerId);
    setConnecting(true);

    try {
      // Simulate wallet connection delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock wallet address
      const mockAddress = '0x' + Math.random().toString(16).substr(2, 40);
      setWalletAddress(mockAddress);

      // Generate signature
      const mockSignature = '0x' + Math.random().toString(16).substr(2, 130);
      setSignature(mockSignature);

      Alert.alert(
        'Wallet Connected',
        `Successfully connected to ${providerId}`,
        [
          {
            text: 'Continue',
            onPress: () => {
              // Pass wallet data back to previous screen
              router.back();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Connection Failed', 'Unable to connect to wallet. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setWalletAddress(null);
    setSignature(null);
    setSelectedProvider(null);
  };

  const handleContinue = () => {
    if (!walletAddress || !signature) {
      Alert.alert('Error', 'Please connect your wallet first');
      return;
    }

    // Navigate back with wallet data
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Connect Wallet</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="wallet" size={48} color="#3b82f6" />
          </View>
          <Text style={styles.title}>Connect Your Wallet</Text>
          <Text style={styles.description}>
            {mode === 'register'
              ? 'Connect your wallet to create your account and sign up'
              : 'Connect your wallet to sign in to your account'}
          </Text>
        </View>

        {/* Wallet Status */}
        {walletAddress && signature ? (
          <View style={styles.connectedContainer}>
            <View style={styles.connectedHeader}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text style={styles.connectedTitle}>Wallet Connected</Text>
            </View>

            <View style={styles.addressContainer}>
              <Text style={styles.addressLabel}>Wallet Address</Text>
              <Text style={styles.addressValue}>
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </Text>
            </View>

            <View style={styles.signatureContainer}>
              <Text style={styles.signatureLabel}>Signature</Text>
              <Text style={styles.signatureValue}>
                {signature.slice(0, 10)}...{signature.slice(-6)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.disconnectButton}
              onPress={handleDisconnect}
            >
              <Text style={styles.disconnectButtonText}>Disconnect Wallet</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Wallet Providers */
          <View style={styles.providersContainer}>
            <Text style={styles.providersTitle}>Choose a Wallet Provider</Text>

            {WALLET_PROVIDERS.map((provider) => (
              <TouchableOpacity
                key={provider.id}
                style={[
                  styles.providerCard,
                  selectedProvider === provider.id && styles.providerCardSelected,
                ]}
                onPress={() => handleConnect(provider.id)}
                disabled={connecting}
              >
                <View style={styles.providerIconContainer}>
                  <Ionicons
                    name={provider.icon as any}
                    size={32}
                    color={provider.color}
                  />
                  {connecting && selectedProvider === provider.id && (
                    <ActivityIndicator
                      style={styles.loadingIndicator}
                      size="small"
                      color="#3b82f6"
                    />
                  )}
                </View>
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>{provider.name}</Text>
                  <Text style={styles.providerDescription}>{provider.description}</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Info */}
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
          <Text style={styles.infoText}>
            Your wallet will be used to sign messages and authenticate your identity.
            We never have access to your private keys.
          </Text>
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
  scrollContent: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  descriptionContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  connectedContainer: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  connectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  connectedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#166534',
    marginLeft: 8,
  },
  addressContainer: {
    marginBottom: 16,
  },
  addressLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  addressValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    fontFamily: 'monospace',
  },
  signatureContainer: {
    marginBottom: 24,
  },
  signatureLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  signatureValue: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  disconnectButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  disconnectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  continueButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  providersContainer: {
    marginBottom: 24,
  },
  providersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  providerCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  providerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  loadingIndicator: {
    position: 'absolute',
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  providerDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 12,
    lineHeight: 20,
  },
});