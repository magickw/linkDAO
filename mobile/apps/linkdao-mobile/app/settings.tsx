/**
 * Settings Screen
 * User preferences and app settings with tabbed interface matching web app
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore, useSettingsStore } from '../src/store';
import { authService } from '@linkdao/shared';
import { isBiometricAvailable, getBiometricConfig, enableBiometrics, disableBiometrics, getBiometryTypeName } from '../src/services';
import { offlineManager } from '../src/services';

type TabType = 'profile' | 'wallet' | 'preferences' | 'social' | 'security';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const {
    notificationsEnabled,
    darkMode,
    autoPlayVideos,
    saveDataUsage,
    privacySettings,
    securitySettings,
    emailPreferences,
    profileStats,
    setNotificationsEnabled,
    setDarkMode,
    setAutoPlayVideos,
    setSaveDataUsage,
    setPrivacySettings,
    setSecuritySettings,
    setEmailPreferences,
    setBiometricEnabled,
    setProfileStats,
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [localBiometricEnabled, setLocalBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [cacheSize, setCacheSize] = useState<string>('0 KB');
  const [email, setEmail] = useState('');

  useEffect(() => {
    loadBiometricStatus();
    loadCacheSize();
    setEmail(user?.email || '');
  }, [user]);

  const loadBiometricStatus = async () => {
    try {
      const config = await getBiometricConfig();
      if (config?.enableBiometrics) {
        setLocalBiometricEnabled(true);
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
          setLocalBiometricEnabled(true);
          setBiometricType(getBiometryTypeName(result.biometryType));
          setBiometricEnabled(true);
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
          setLocalBiometricEnabled(false);
          setBiometricType(null);
          setBiometricEnabled(false);
          Alert.alert('Success', 'Biometric authentication has been disabled');
        }
      } catch (error) {
        console.error('Error disabling biometrics:', error);
        Alert.alert('Error', 'Failed to disable biometric authentication');
      }
    }
  };

  const tabs = [
    { id: 'profile' as TabType, name: 'Profile', icon: 'person-outline' },
    { id: 'wallet' as TabType, name: 'Wallet', icon: 'wallet-outline' },
    { id: 'preferences' as TabType, name: 'Preferences', icon: 'options-outline' },
    { id: 'social' as TabType, name: 'Social', icon: 'people-outline' },
    { id: 'security' as TabType, name: 'Security', icon: 'shield-checkmark-outline' },
  ];

  const renderProfileTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color="#3b82f6" />
        <Text style={styles.infoText}>
          Your profile is linked to your wallet address
        </Text>
      </View>

      <TouchableOpacity
        style={styles.actionCard}
        onPress={() => router.push('/profile')}
      >
        <Ionicons name="list-outline" size={24} color="#3b82f6" />
        <View style={styles.actionCardInfo}>
          <Text style={styles.actionCardTitle}>View Profile</Text>
          <Text style={styles.actionCardDescription}>See your public profile</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </TouchableOpacity>

      <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/profile/edit')}
              >
                <Ionicons name="create-outline" size={24} color="#3b82f6" />
                <View style={styles.actionCardInfo}>
                  <Text style={styles.actionCardTitle}>Edit Profile</Text>
                  <Text style={styles.actionCardDescription}>Update handle, name, bio, social links</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Profile Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profileStats.posts}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profileStats.comments}</Text>
            <Text style={styles.statLabel}>Comments</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profileStats.following}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profileStats.followers}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderWalletTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.successBox}>
        <Ionicons name="checkmark-circle" size={20} color="#10b981" />
        <Text style={styles.successText}>Wallet Connected</Text>
      </View>

      <TouchableOpacity
        style={styles.actionCard}
        onPress={() => router.push('/wallet')}
      >
        <Ionicons name="wallet-outline" size={24} color="#3b82f6" />
        <View style={styles.actionCardInfo}>
          <Text style={styles.actionCardTitle}>View Wallet</Text>
          <Text style={styles.actionCardDescription}>Check your balance and transactions</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </TouchableOpacity>

      <View style={styles.actionCard}>
        <Ionicons name="bar-chart-outline" size={24} color="#3b82f6" />
        <View style={styles.actionCardInfo}>
          <Text style={styles.actionCardTitle}>Portfolio</Text>
          <Text style={styles.actionCardDescription}>Track your assets and NFTs</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </View>

      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickActionCard}>
            <Ionicons name="refresh" size={24} color="#3b82f6" />
            <Text style={styles.quickActionTitle}>Refresh Balance</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard}>
            <Ionicons name="copy" size={24} color="#3b82f6" />
            <Text style={styles.quickActionTitle}>Copy Address</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard}>
            <Ionicons name="link" size={24} color="#3b82f6" />
            <Text style={styles.quickActionTitle}>View on Explorer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderPreferencesTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Communication</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email Address</Text>
          <Text style={styles.helperText}>
            Provide your email so the platform can communicate with you about important updates, notifications, and announcements.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="your.email@example.com"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Dark Mode</Text>
            <Text style={styles.settingDescription}>Use dark theme</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
            thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
          />
        </View>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Auto-play Videos</Text>
            <Text style={styles.settingDescription}>Automatically play videos in feed</Text>
          </View>
          <Switch
            value={autoPlayVideos}
            onValueChange={setAutoPlayVideos}
            trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
            thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Push Notifications</Text>
            <Text style={styles.settingDescription}>Receive notifications for activity</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
            thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
          />
        </View>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => router.push('/settings/email-preferences')}
        >
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Email Preferences</Text>
            <Text style={styles.settingDescription}>Manage your email notification settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy</Text>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Public Profile</Text>
            <Text style={styles.settingDescription}>Make your profile visible to others</Text>
          </View>
          <Switch
            value={privacySettings.publicProfile}
            onValueChange={(value) => setPrivacySettings({ publicProfile: value })}
            trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
            thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
          />
        </View>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Show Wallet Balance</Text>
            <Text style={styles.settingDescription}>Display your wallet balance on profile</Text>
          </View>
          <Switch
            value={privacySettings.showWalletBalance}
            onValueChange={(value) => setPrivacySettings({ showWalletBalance: value })}
            trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
            thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
          />
        </View>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Hide Transaction History</Text>
            <Text style={styles.settingDescription}>Make your transaction history private</Text>
          </View>
          <Switch
            value={privacySettings.hideTransactionHistory}
            onValueChange={(value) => setPrivacySettings({ hideTransactionHistory: value })}
            trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
            thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
          />
        </View>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Anonymous Mode</Text>
            <Text style={styles.settingDescription}>Hide your wallet address from public view</Text>
          </View>
          <Switch
            value={privacySettings.anonymousMode}
            onValueChange={(value) => setPrivacySettings({ anonymousMode: value })}
            trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
            thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
          />
        </View>
      </View>
    </View>
  );

  const renderSocialTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color="#3b82f6" />
        <Text style={styles.infoText}>
          Connect your social media accounts to share content and grow your audience
        </Text>
      </View>

      <TouchableOpacity style={styles.actionCard}>
        <Ionicons name="logo-twitter" size={24} color="#1da1f2" />
        <View style={styles.actionCardInfo}>
          <Text style={styles.actionCardTitle}>Twitter</Text>
          <Text style={styles.actionCardDescription}>Connect your Twitter account</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionCard}>
        <Ionicons name="logo-linkedin" size={24} color="#0077b5" />
        <View style={styles.actionCardInfo}>
          <Text style={styles.actionCardTitle}>LinkedIn</Text>
          <Text style={styles.actionCardDescription}>Connect your LinkedIn account</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionCard}>
        <Ionicons name="logo-github" size={24} color="#333333" />
        <View style={styles.actionCardInfo}>
          <Text style={styles.actionCardTitle}>GitHub</Text>
          <Text style={styles.actionCardDescription}>Connect your GitHub account</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </TouchableOpacity>
    </View>
  );

  const renderSecurityTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.successBox}>
        <Ionicons name="checkmark-circle" size={20} color="#10b981" />
        <Text style={styles.successText}>Security Status: Good</Text>
      </View>

      <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/settings/security')}
        >
          <Ionicons name="shield-checkmark-outline" size={24} color="#3b82f6" />
          <View style={styles.actionCardInfo}>
            <Text style={styles.actionCardTitle}>Advanced Security</Text>
            <Text style={styles.actionCardDescription}>2FA, sessions, activity log, alerts</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.activeTab]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons
                name={tab.icon as any}
                size={20}
                color={activeTab === tab.id ? '#3b82f6' : '#6b7280'}
              />
              <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
                {tab.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'profile' && renderProfileTab()}
        {activeTab === 'wallet' && renderWalletTab()}
        {activeTab === 'preferences' && renderPreferencesTab()}
        {activeTab === 'social' && renderSocialTab()}
        {activeTab === 'security' && renderSecurityTab()}

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity
            style={[styles.settingItem, styles.settingItemDestructive]}
            onPress={handleLogout}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, styles.settingTitleDestructive]}>Logout</Text>
              <Text style={styles.settingDescription}>Sign out of your account</Text>
            </View>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>App Version</Text>
              <Text style={styles.settingDescription}>1.0.1</Text>
            </View>
          </View>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabsScroll: {
    paddingHorizontal: 16,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#eff6ff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#3b82f6',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    marginLeft: 8,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    color: '#065f46',
    marginLeft: 8,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  actionCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  actionCardDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  statsContainer: {
    marginTop: 8,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3b82f6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  quickActionsContainer: {
    marginTop: 8,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  quickActionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1f2937',
    marginTop: 8,
    textAlign: 'center',
  },
  section: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
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
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonDestructive: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  buttonSecondary: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonSecondaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  bottomSpacer: {
    height: 100,
  },
});