/**
 * Settings Screen
 * User preferences and app settings
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore, useSettingsStore } from '../../src/store';
import { authService } from '@linkdao/shared';
import { isBiometricAvailable, getBiometricConfig, enableBiometrics, disableBiometrics, getBiometryTypeName } from '../../src/services';
import { offlineManager } from '../../src/services';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  
  const settingsStore = useSettingsStore();
  const notificationsEnabled = settingsStore((state) => state.notificationsEnabled);
  const darkMode = settingsStore((state) => state.darkMode);
  const autoPlayVideos = settingsStore((state) => state.autoPlayVideos);
  const saveDataUsage = settingsStore((state) => state.saveDataUsage);
  const setNotificationsEnabled = settingsStore((state) => state.setNotificationsEnabled);
  const setDarkMode = settingsStore((state) => state.setDarkMode);
  const setAutoPlayVideos = settingsStore((state) => state.setAutoPlayVideos);
  const setSaveDataUsage = settingsStore((state) => state.setSaveDataUsage);

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [cacheSize, setCacheSize] = useState<string>('0 KB');

  useEffect(() => {
    loadBiometricStatus();
    loadCacheSize();
  }, []);

  const loadBiometricStatus = async () => {
    try {
      const config = await getBiometricConfig();
      if (config?.enableBiometrics) {
        setBiometricEnabled(true);
        setBiometricType(getBiometryTypeName(config.biometryType));
      }
    } catch (error) {
      console.error('Error loading biometric status:', error);
    }
  };

  const loadCacheSize = async () => {
    try {
      const size = await offlineManager.getCacheSize();
      setCacheSize(formatBytes(size));
    } catch (error) {
      console.error('Error loading cache size:', error);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await authService.logout();
            logout();
            router.replace('/auth');
          },
        },
      ]
    );
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      try {
        const { available, biometryType } = await isBiometricAvailable();

        if (!available) {
          Alert.alert(
            'Biometrics Not Available',
            'Your device does not support biometric authentication.'
          );
          return;
        }

        const result = await enableBiometrics();
        if (result.success) {
          setBiometricEnabled(true);
          setBiometricType(getBiometryTypeName(result.biometryType));
          Alert.alert('Success', `${getBiometryTypeName(result.biometryType)} has been enabled for authentication`);
        } else {
          Alert.alert('Failed', result.error || 'Failed to enable biometrics');
        }
      } catch (error) {
        console.error('Error enabling biometrics:', error);
        Alert.alert('Error', 'Failed to enable biometric authentication');
      }
    } else {
      try {
        const success = await disableBiometrics();
        if (success) {
          setBiometricEnabled(false);
          setBiometricType(null);
          Alert.alert('Success', 'Biometric authentication has been disabled');
        }
      } catch (error) {
        console.error('Error disabling biometrics:', error);
        Alert.alert('Error', 'Failed to disable biometric authentication');
      }
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await offlineManager.clearAllCache();
            loadCacheSize();
            Alert.alert('Success', 'Cache has been cleared');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. Are you sure you want to delete your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            // In production, call delete account API
            await authService.logout();
            logout();
            router.replace('/auth');
          },
        },
      ]
    );
  };

  const settingsSections = [
    {
      title: 'Notifications',
      icon: 'notifications-outline',
      items: [
        {
          id: 'push-notifications',
          title: 'Push Notifications',
          description: 'Receive notifications for activity',
          type: 'toggle',
          value: notificationsEnabled,
          onToggle: setNotificationsEnabled,
        },
      ],
    },
    {
      title: 'Appearance',
      icon: 'color-palette-outline',
      items: [
        {
          id: 'dark-mode',
          title: 'Dark Mode',
          description: 'Use dark theme',
          type: 'toggle',
          value: darkMode,
          onToggle: setDarkMode,
        },
        {
          id: 'auto-play-videos',
          title: 'Auto-play Videos',
          description: 'Automatically play videos in feed',
          type: 'toggle',
          value: autoPlayVideos,
          onToggle: setAutoPlayVideos,
        },
      ],
    },
    {
      title: 'Security',
      icon: 'shield-checkmark-outline',
      items: [
        {
          id: 'biometric',
          title: 'Biometric Authentication',
          description: biometricEnabled ? `Enabled (${biometricType})` : 'Use Face ID, Touch ID, or Fingerprint',
          type: 'toggle',
          value: biometricEnabled,
          onToggle: handleBiometricToggle,
        },
        {
          id: 'change-password',
          title: 'Change Password',
          description: 'Update your password',
          type: 'navigation',
          onPress: () => router.push('/profile/security'),
        },
        {
          id: 'two-factor',
          title: 'Two-Factor Authentication',
          description: 'Add an extra layer of security',
          type: 'navigation',
          onPress: () => router.push('/profile/2fa'),
        },
      ],
    },
    {
      title: 'Privacy',
      icon: 'lock-closed-outline',
      items: [
        {
          id: 'profile-visibility',
          title: 'Profile Visibility',
          description: 'Who can see your profile',
          type: 'navigation',
          onPress: () => router.push('/profile/privacy'),
        },
        {
          id: 'data-usage',
          title: 'Save Data Usage',
          description: 'Reduce data usage on mobile',
          type: 'toggle',
          value: saveDataUsage,
          onToggle: setSaveDataUsage,
        },
        {
          id: 'blocked-users',
          title: 'Blocked Users',
          description: 'Manage blocked users',
          type: 'navigation',
          onPress: () => router.push('/profile/blocked'),
        },
      ],
    },
    {
      title: 'Storage',
      icon: 'folder-outline',
      items: [
        {
          id: 'clear-cache',
          title: 'Clear Cache',
          description: `Current cache size: ${cacheSize}`,
          type: 'action',
          onPress: handleClearCache,
        },
        {
          id: 'download-data',
          title: 'Download My Data',
          description: 'Get a copy of your data',
          type: 'navigation',
          onPress: () => router.push('/profile/download-data'),
        },
      ],
    },
    {
      title: 'Support',
      icon: 'help-circle-outline',
      items: [
        {
          id: 'help',
          title: 'Help Center',
          description: 'Get help with common issues',
          type: 'navigation',
          onPress: () => router.push('/support'),
        },
        {
          id: 'contact',
          title: 'Contact Support',
          description: 'Reach out to our team',
          type: 'navigation',
          onPress: () => router.push('/support/contact'),
        },
        {
          id: 'terms',
          title: 'Terms of Service',
          description: 'Read our terms and conditions',
          type: 'navigation',
          onPress: () => router.push('/terms'),
        },
        {
          id: 'privacy',
          title: 'Privacy Policy',
          description: 'Learn about our privacy practices',
          type: 'navigation',
          onPress: () => router.push('/privacy'),
        },
      ],
    },
    {
      title: 'Account',
      icon: 'person-outline',
      items: [
        {
          id: 'logout',
          title: 'Logout',
          description: 'Sign out of your account',
          type: 'action',
          onPress: handleLogout,
          destructive: true,
        },
        {
          id: 'delete-account',
          title: 'Delete Account',
          description: 'Permanently delete your account',
          type: 'action',
          onPress: handleDeleteAccount,
          destructive: true,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {/* User Info */}
        <View style={styles.userInfo}>
          <View style={[styles.userAvatar, { backgroundColor: '#3b82f6' }]} />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{user?.displayName || user?.handle || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
          </View>
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => router.push('/profile/edit')}
          >
            <Ionicons name="pencil" size={16} color="#3b82f6" />
            <Text style={styles.editProfileText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Settings Sections */}
        {settingsSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name={section.icon as any}
                size={20}
                color="#6b7280"
              />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>

            {section.items.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.settingItem,
                  item.destructive && styles.settingItemDestructive,
                ]}
              >
                <View style={styles.settingInfo}>
                  <Text
                    style={[
                      styles.settingTitle,
                      item.destructive && styles.settingTitleDestructive,
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Text style={styles.settingDescription}>
                    {item.description}
                  </Text>
                </View>

                {item.type === 'toggle' && (
                  <Switch
                    value={item.value}
                    onValueChange={item.onToggle}
                    trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                    thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
                  />
                )}

                {item.type === 'navigation' && (
                  <TouchableOpacity
                    style={styles.chevronButton}
                    onPress={item.onPress}
                  >
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                )}

                {item.type === 'action' && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={item.onPress}
                  >
                    {item.destructive ? (
                      <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    ) : (
                      <Ionicons name="arrow-forward" size={20} color="#3b82f6" />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        ))}

        {/* App Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
            <Text style={styles.sectionTitle}>About</Text>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>App Version</Text>
              <Text style={styles.settingDescription}>1.0.1</Text>
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Build Number</Text>
              <Text style={styles.settingDescription}>12345</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/terms')}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Terms of Service</Text>
              <Text style={styles.settingDescription}>Read our terms and conditions</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/privacy')}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Privacy Policy</Text>
              <Text style={styles.settingDescription}>Learn about our privacy practices</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  settingsButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  userAddress: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
    marginLeft: 4,
  },
  section: {
    marginTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginLeft: 12,
    textTransform: 'uppercase',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingItemDestructive: {
    backgroundColor: '#fef2f2',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  settingTitleDestructive: {
    color: '#dc2626',
  },
  settingDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  chevronButton: {
    padding: 8,
  },
  actionButton: {
    padding: 8,
  },
  bottomSpacer: {
    height: 100,
  },
});