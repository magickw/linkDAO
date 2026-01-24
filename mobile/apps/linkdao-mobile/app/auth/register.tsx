/**
 * Register Screen
 * User registration with wallet signature
 */

import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store';
import { authService, AuthUser } from '@linkdao/shared';

export default function RegisterScreen() {
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [signature, setSignature] = useState('');
  const [loading, setLoading] = useState(false);

  const setUser = useAuthStore((state) => state.setUser);
  const setToken = useAuthStore((state) => state.setToken);
  const setLoadingStore = useAuthStore((state) => state.setLoading);

  const handleRegister = async () => {
    if (!walletAddress || !signature) {
      Alert.alert('Error', 'Please connect your wallet and sign the message');
      return;
    }

    if (!handle) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    setLoading(true);
    setLoadingStore(true);

    try {
      const response = await authService.register({
        address: walletAddress,
        signature,
        handle,
        displayName: displayName || handle,
        email,
      });

      if (response.success && response.data) {
        setToken(response.data.token);
        setUser(response.data.user);
        router.replace('/(tabs)');
      } else {
        Alert.alert('Registration Failed', response.error || 'Unable to create account');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to register. Please try again.');
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
              <Ionicons name="person-add" size={48} color="#3b82f6" />
            </View>
            <Text style={styles.appName}>Create Account</Text>
            <Text style={styles.tagline}>Join the LinkDAO community</Text>
          </View>

          {/* Register Form */}
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Sign Up</Text>
            <Text style={styles.formSubtitle}>Create your account to get started</Text>

            {/* Wallet Address */}
            <View style={styles.inputContainer}>
              <Ionicons name="wallet-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Wallet Address"
                placeholderTextColor="#9ca3af"
                value={walletAddress}
                onChangeText={setWalletAddress}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={handleWalletConnect}>
                <Ionicons name="link" size={20} color="#3b82f6" />
              </TouchableOpacity>
            </View>

            {/* Username/Handle */}
            <View style={styles.inputContainer}>
              <Ionicons name="at" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#9ca3af"
                value={handle}
                onChangeText={setHandle}
                autoCapitalize="none"
              />
            </View>

            {/* Display Name */}
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Display Name (optional)"
                placeholderTextColor="#9ca3af"
                value={displayName}
                onChangeText={setDisplayName}
              />
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email (optional)"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Signature */}
            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Signature"
                placeholderTextColor="#9ca3af"
                value={signature}
                onChangeText={setSignature}
                autoCapitalize="none"
              />
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.registerButton, loading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.registerButtonText}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/auth')}>
                <Text style={styles.loginLink}>Sign In</Text>
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
  registerButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loginLink: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
});