import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, Fingerprint } from 'lucide-react-native';
import { BiometricService } from '../../utils/biometrics';

interface BiometricLockScreenProps {
  onUnlock: () => void;
  onCancel?: () => void;
}

export default function BiometricLockScreen({ onUnlock, onCancel }: BiometricLockScreenProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authType, setAuthType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      const supported = await BiometricService.isSupported();
      const enrolled = await BiometricService.isEnrolled();
      
      if (!supported) {
        setError('Biometric authentication is not supported on this device.');
        return;
      }
      
      if (!enrolled) {
        setError('Please set up Face ID or Touch ID in your device settings.');
        return;
      }

      // Get authentication type
      const types = await BiometricService.getAuthenticationTypes();
      if (types.length > 0) {
        setAuthType(BiometricService.getAuthenticationTypeName(types[0]));
      }

      // Auto-trigger authentication
      authenticate();
    } catch (err) {
      setError('Failed to initialize biometric authentication.');
    }
  };

  const authenticate = async () => {
    setIsAuthenticating(true);
    setError(null);

    try {
      const success = await BiometricService.authenticate('Unlock your wallet');
      
      if (success) {
        onUnlock();
      } else {
        setError('Authentication failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {isAuthenticating ? (
            <ActivityIndicator size="large" color="#3B82F6" />
          ) : (
            <Fingerprint size={80} color="#3B82F6" />
          )}
        </View>

        <Text style={styles.title}>Wallet Locked</Text>
        <Text style={styles.subtitle}>
          {authType ? `Use ${authType} to unlock your wallet` : 'Authenticate to unlock your wallet'}
        </Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, isAuthenticating && styles.buttonDisabled]}
          onPress={authenticate}
          disabled={isAuthenticating}
        >
          <Lock size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>
            {isAuthenticating ? 'Authenticating...' : 'Try Again'}
          </Text>
        </TouchableOpacity>

        {onCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={isAuthenticating}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    width: '100%',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    marginTop: 16,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
  },
});