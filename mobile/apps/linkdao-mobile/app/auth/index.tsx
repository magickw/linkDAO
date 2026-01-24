/**
 * Login Screen
 * User authentication with wallet signature
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../src/store';
import { authService } from '@linkdao/shared';

export default function LoginScreen() {
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connector, setConnector] = useState<any>(null);

  const { walletAddress: paramWalletAddress, connector: paramConnector } = useLocalSearchParams();

  const setUser = useAuthStore((state) => state.setUser);
  const setToken = useAuthStore((state) => state.setToken);
  const setLoadingStore = useAuthStore((state) => state.setLoading);
  const clearStorage = useAuthStore((state) => state.clearStorage);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Handle wallet connection from wallet-connect screen
  useEffect(() => {
    if (paramWalletAddress) {
      setWalletAddress(paramWalletAddress as string);
      setIsConnected(true);
      setConnector(paramConnector as string);
      // Signature will be generated during authentication
    }
  }, [paramWalletAddress, paramConnector]);

  // Auto-authenticate if wallet is connected but user is not authenticated
  useEffect(() => {
    if (isConnected && walletAddress && !isAuthenticated && !loading) {
      handleAutoLogin();
    }
  }, [isConnected, walletAddress, isAuthenticated, loading]);

  const handleAutoLogin = async () => {
    setLoading(true);
    setLoadingStore(true);

    try {
      const response = await authService.authenticateWallet(
        walletAddress,
        connector,
        'connected'
      );

      if (response.success && response.token && response.user) {
        setToken(response.token);
        setUser(response.user);
        router.replace('/(tabs)');
      } else if (response.requires2FA) {
        // Handle 2FA if required
        Alert.alert('2FA Required', 'Please complete 2FA verification');
      } else {
        Alert.alert('Authentication Failed', response.error || 'Failed to authenticate wallet');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to authenticate. Please try again.');
    } finally {
      setLoading(false);
      setLoadingStore(false);
    }
  };

  const handleWalletConnect = () => {
    router.push('/auth/wallet-connect');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Ionicons name="wallet" size={48} color="#3b82f6" />
            </View>
            <Text style={styles.appName}>LinkDAO</Text>
            <Text style={styles.tagline}>Decentralized Social Platform</Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Welcome Back</Text>
            <Text style={styles.formSubtitle}>Sign in with your wallet to continue</Text>

            {/* Wallet Address */}
            <View style={styles.inputContainer}>
              <Ionicons name="wallet-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <Text style={styles.input}>
                {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not connected'}
              </Text>
              <TouchableOpacity onPress={handleWalletConnect}>
                <Ionicons name="link" size={20} color="#3b82f6" />
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                (!isConnected || loading) && styles.loginButtonDisabled
              ]}
              onPress={isConnected ? handleAutoLogin : handleWalletConnect}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'Authenticating...' : isConnected ? 'Authenticate' : 'Sign In with Wallet'}
              </Text>
            </TouchableOpacity>

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/auth/register')}>
                <Text style={styles.registerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#6b7280',
  },
  formContainer: {
    width: '100%',
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  loginButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  registerLink: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
});