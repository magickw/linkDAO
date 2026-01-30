/**
 * Wallet Connect Screen
 * Handle wallet connection via WalletConnect V2
 * Supports all wallets: MetaMask, Trust, Coinbase, Rainbow, etc.
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { walletConnectV2Service } from '../../src/services/walletConnectV2Service';
import { useWalletConnectionProgress } from '../../src/hooks/useWalletConnectionProgress';
import WalletConnectionProgressIndicator from '../../src/components/WalletConnectionProgressIndicator';

export default function WalletConnectScreen() {
  const [connecting, setConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Use wallet connection progress hook
  const { 
    currentProgress, 
    providers, 
    loadingProviders,
    refreshProviders 
  } = useWalletConnectionProgress();

  const { mode = 'login' } = useLocalSearchParams<{ mode?: 'login' | 'register' }>();

  useEffect(() => {
    // Initialize WalletConnect V2 with your Project ID
    initializeWalletConnect();
  }, []);

  const initializeWalletConnect = async () => {
    try {
      const projectId = 'd051afaee33392cccc42e141b9f7697b';

      await walletConnectV2Service.initialize({
        projectId,
        appName: 'LinkDAO',
        appDescription: 'Decentralized marketplace for expertise and services',
        appUrl: 'https://linkdao.io',
      });

      // Check if wallet is already connected
      const account = walletConnectV2Service.getAccount();
      if (account) {
        setWalletAddress(account);
      }

      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize WalletConnect:', error);
      Alert.alert('Error', 'Failed to initialize wallet connection');
    }
  };

  const handleConnect = async () => {
    setConnecting(true);

    try {
      // Connect to wallet via WalletConnect
      const account = await walletConnectV2Service.connect();

      if (account) {
        setWalletAddress(account);

        Alert.alert(
          'Wallet Connected',
          `Successfully connected: ${account.slice(0, 6)}...${account.slice(-4)}`,
          [
            {
              text: 'Continue',
              onPress: () => {
                // Navigate back to auth screen with wallet address
                router.replace({
                  pathname: '/auth',
                  params: {
                    walletAddress: account,
                    connector: 'walletconnect'
                  }
                });
              },
            },
          ]
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      console.log('ℹ️ Wallet connection attempt:', errorMessage);
      Alert.alert('Connection Failed', errorMessage);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await walletConnectV2Service.disconnect();
      setWalletAddress(null);
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  const handleContinue = () => {
    if (!walletAddress) {
      Alert.alert('Error', 'Please connect your wallet first');
      return;
    }

    router.replace({
      pathname: '/auth',
      params: {
        walletAddress: walletAddress,
        connector: 'walletconnect'
      }
    });
  };

  if (!isInitialized) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Initializing Wallet Connection...</Text>
        </View>
      </SafeAreaView>
    );
  }

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

        {/* Wallet Status or Connect Button */}
        {walletAddress ? (
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
          <View style={styles.connectContainer}>
            {/* Progress indicator */}
            {currentProgress && (
              <WalletConnectionProgressIndicator 
                progress={currentProgress} 
                style={styles.progressIndicator}
              />
            )}
            
            <TouchableOpacity
              style={[styles.connectButton, connecting && styles.connectButtonDisabled]}
              onPress={handleConnect}
              disabled={connecting}
            >
              {connecting ? (
                <>
                  <ActivityIndicator color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.connectButtonText}>Connecting...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="link" size={20} color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.connectButtonText}>Connect with WalletConnect</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.walletListTitle}>Supported Wallets</Text>
            <View style={styles.walletList}>
              {loadingProviders ? (
                <View style={styles.loadingProviders}>
                  <ActivityIndicator size="small" color="#6b7280" />
                  <Text style={styles.loadingText}>Loading wallets...</Text>
                </View>
              ) : (
                providers.map((provider) => (
                  <View key={provider.id} style={styles.walletItemContainer}>
                    <Text style={styles.walletItem}>
                      {provider.icon} {provider.name}
                      {provider.installed && (
                        <Ionicons name="checkmark" size={14} color="#10b981" style={{ marginLeft: 4 }} />
                      )}
                    </Text>
                    {!provider.installed && provider.canInstall && (
                      <TouchableOpacity 
                        onPress={() => provider.installUrl && Linking.openURL(provider.installUrl)}
                        style={styles.installButton}
                      >
                        <Text style={styles.installButtonText}>Install</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* Info */}
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
          <Text style={styles.infoText}>
            Your wallet will be used to sign messages and authenticate your identity.
            We never have access to your private keys or funds.
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
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
    marginBottom: 24,
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
  connectContainer: {
    marginBottom: 24,
  },
  connectButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  connectButtonDisabled: {
    opacity: 0.6,
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  walletListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  walletList: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  walletItem: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
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
  progressIndicator: {
    marginBottom: 16,
  },
  loadingProviders: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  walletItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  installButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  installButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
});
