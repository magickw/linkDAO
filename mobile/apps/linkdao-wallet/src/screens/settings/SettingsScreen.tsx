import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, Fingerprint, Lock, Trash2 } from 'lucide-react-native';
import { SecureKeyStorage } from '@linkdao/shared/utils/secureKeyStorage';
import { BiometricService } from '../../utils/biometrics';

export default function SettingsScreen({ navigation }: any) {
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authType, setAuthType] = useState<string | null>(null);

  useEffect(() => {
    loadBiometricStatus();
  }, []);

  const loadBiometricStatus = async () => {
    try {
      setIsLoading(true);
      
      const [supported, enrolled, enabled, types] = await Promise.all([
        BiometricService.isSupported(),
        BiometricService.isEnrolled(),
        BiometricService.isEnabled(),
        BiometricService.getAuthenticationTypes(),
      ]);

      setBiometricSupported(supported);
      setBiometricEnrolled(enrolled);
      setBiometricEnabled(enabled);

      if (types.length > 0) {
        setAuthType(BiometricService.getAuthenticationTypeName(types[0]));
      }
    } catch (error) {
      console.error('Error loading biometric status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBiometric = async (value: boolean) => {
    if (value) {
      // Enable biometrics
      Alert.alert(
        'Enable Biometric Lock',
        `Use ${authType || 'biometrics'} to unlock your wallet?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: async () => {
              try {
                const success = await BiometricService.enable();
                if (success) {
                  setBiometricEnabled(true);
                  Alert.alert('Success', 'Biometric lock enabled successfully');
                } else {
                  Alert.alert('Failed', 'Could not enable biometric lock');
                }
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to enable biometric lock');
              }
            },
          },
        ]
      );
    } else {
      // Disable biometrics
      Alert.alert(
        'Disable Biometric Lock',
        'Are you sure you want to disable biometric authentication?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              try {
                await BiometricService.disable();
                setBiometricEnabled(false);
                Alert.alert('Success', 'Biometric lock disabled');
              } catch (error) {
                Alert.alert('Error', 'Failed to disable biometric lock');
              }
            },
          },
        ]
      );
    }
  };

  const handleClearWallet = () => {
    Alert.alert(
      'Delete Wallet',
      'Are you sure you want to delete ALL wallet data from this device? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await SecureKeyStorage.clearAll();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Auth' }],
            });
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>

          {/* Biometric Lock */}
          {isLoading ? (
            <View style={styles.settingRow}>
              <ActivityIndicator size="small" color="#3B82F6" />
              <Text style={styles.settingLabel}>Loading...</Text>
            </View>
          ) : biometricSupported && biometricEnrolled ? (
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Fingerprint size={24} color="#3B82F6" />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Biometric Lock</Text>
                  <Text style={styles.settingDescription}>
                    Use {authType || 'biometrics'} to unlock your wallet
                  </Text>
                </View>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleToggleBiometric}
                trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                thumbColor={biometricEnabled ? '#FFFFFF' : '#F3F4F6'}
              />
            </View>
          ) : biometricSupported ? (
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Fingerprint size={24} color="#9CA3AF" />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Biometric Lock</Text>
                  <Text style={styles.settingDescription}>
                    Set up Face ID or Touch ID in device settings
                  </Text>
                </View>
              </View>
            </View>
          ) : null}
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>

          <TouchableOpacity style={styles.dangerButton} onPress={handleClearWallet}>
            <Trash2 size={20} color="#DC2626" />
            <Text style={styles.dangerButtonText}>Delete Wallet Data</Text>
          </TouchableOpacity>
        </View>

        <Button
          title="Logout (Dev)"
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Auth' }] })}
        />
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
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    gap: 8,
  },
  dangerButtonText: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 16,
  },
});
