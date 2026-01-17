/**
 * Security Settings Screen
 * Comprehensive security management with 2FA, sessions, and activity log
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../../src/store';
import { isBiometricAvailable, getBiometricConfig, enableBiometrics, disableBiometrics, getBiometryTypeName } from '../../src/services';

interface Session {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  current: boolean;
  lastActive: string;
}

interface ActivityLogEntry {
  id: string;
  type: 'login' | 'logout' | 'profile_update' | 'security_change' | 'password_change' | '2fa_enabled' | '2fa_disabled';
  description: string;
  timestamp: string;
  ip: string;
  device: string;
}

export default function SecuritySettingsScreen() {
  const router = useRouter();

  const {
    securitySettings,
    setSecuritySettings,
    setBiometricEnabled,
  } = useSettingsStore();

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying2FA, setVerifying2FA] = useState(false);
  const [terminatingSession, setTerminatingSession] = useState<string | null>(null);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      // Load biometric status
      const config = await getBiometricConfig();
      if (config?.enableBiometrics) {
        setBiometricEnabledState(true);
        setBiometricType(getBiometryTypeName(config.biometryType));
      }

      // Load sessions (mock data for now)
      setSessions([
        {
          id: '1',
          device: 'iPhone 14 Pro',
          browser: 'Safari',
          os: 'iOS 17.0',
          ip: '192.168.1.1',
          location: 'San Francisco, CA',
          current: true,
          lastActive: new Date().toISOString(),
        },
        {
          id: '2',
          device: 'MacBook Pro',
          browser: 'Chrome',
          os: 'macOS 14.0',
          ip: '192.168.1.2',
          location: 'San Francisco, CA',
          current: false,
          lastActive: new Date(Date.now() - 3600000).toISOString(),
        },
      ]);

      // Load activity log (mock data for now)
      setActivityLog([
        {
          id: '1',
          type: 'login',
          description: 'Successful login from iPhone 14 Pro',
          timestamp: new Date().toISOString(),
          ip: '192.168.1.1',
          device: 'iPhone 14 Pro',
        },
        {
          id: '2',
          type: 'profile_update',
          description: 'Profile updated: Display name changed',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          ip: '192.168.1.1',
          device: 'iPhone 14 Pro',
        },
        {
          id: '3',
          type: 'security_change',
          description: 'Security settings updated',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          ip: '192.168.1.2',
          device: 'MacBook Pro',
        },
      ]);
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
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
          setBiometricEnabledState(true);
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
          setBiometricEnabledState(false);
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

  const handleEnable2FA = () => {
    Alert.alert(
      'Enable Two-Factor Authentication',
      'Two-factor authentication requires setup on the web app. Please visit the web version to enable it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Visit Web App',
          onPress: () => {
            // In production, open web app URL
            Alert.alert('Info', 'Please visit linkdao.io on your browser to enable 2FA');
          },
        },
      ]
    );
  };

  const handleDisable2FA = () => {
    Alert.alert(
      'Disable Two-Factor Authentication',
      'Are you sure you want to disable two-factor authentication? This will make your account less secure.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: () => {
            setSecuritySettings({ twoFactorEnabled: false, twoFactorMethod: 'none' });
            Alert.alert('Success', '2FA disabled successfully');
          },
        },
      ]
    );
  };

  const handleTerminateSession = (sessionId: string) => {
    Alert.alert(
      'Terminate Session',
      'Are you sure you want to terminate this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Terminate',
          style: 'destructive',
          onPress: async () => {
            setTerminatingSession(sessionId);
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            setSessions(sessions.filter(s => s.id !== sessionId));
            setTerminatingSession(null);
            Alert.alert('Success', 'Session terminated successfully');
          },
        },
      ]
    );
  };

  const handleTerminateAllSessions = () => {
    Alert.alert(
      'Terminate All Other Sessions',
      'This will log you out of all other devices. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Terminate All',
          style: 'destructive',
          onPress: async () => {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            setSessions(sessions.filter(s => s.current));
            Alert.alert('Success', 'All other sessions terminated successfully!');
          },
        },
      ]
    );
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login':
        return 'log-in-outline';
      case 'logout':
        return 'log-out-outline';
      case 'profile_update':
        return 'person-outline';
      case 'security_change':
        return 'shield-checkmark-outline';
      case 'password_change':
        return 'key-outline';
      case '2fa_enabled':
        return 'shield-checkmark';
      case '2fa_disabled':
        return 'shield-off';
      default:
        return 'information-circle-outline';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading security settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {/* Security Status */}
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={20} color="#10b981" />
          <View style={styles.successText}>
            <Text style={styles.successTitle}>Security Status: Good</Text>
            <Text style={styles.successDescription}>
              Your account is protected with wallet-based authentication. Consider enabling additional security features below.
            </Text>
          </View>
        </View>

        {/* Two-Factor Authentication */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Two-Factor Authentication</Text>
          <View style={styles.card}>
            <View style={styles.cardItem}>
              <View style={styles.cardItemInfo}>
                <Ionicons name="shield-checkmark" size={24} color="#3b82f6" />
                <View style={styles.cardItemText}>
                  <Text style={styles.cardItemTitle}>Authenticator App (TOTP)</Text>
                  <Text style={styles.cardItemDescription}>
                    Use an authenticator app for additional security
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.cardButton, securitySettings.twoFactorEnabled && styles.cardButtonDestructive]}
                onPress={securitySettings.twoFactorEnabled ? handleDisable2FA : handleEnable2FA}
              >
                <Text style={[styles.cardButtonText, securitySettings.twoFactorEnabled && styles.cardButtonTextDestructive]}>
                  {securitySettings.twoFactorEnabled ? 'Disable' : 'Enable'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.cardItem}>
              <View style={styles.cardItemInfo}>
                <Ionicons name="mail" size={24} color="#3b82f6" />
                <View style={styles.cardItemText}>
                  <Text style={styles.cardItemTitle}>Email Verification</Text>
                  <Text style={styles.cardItemDescription}>
                    Receive verification codes via email
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.cardButtonSecondary}
                onPress={handleEnable2FA}
              >
                <Text style={styles.cardButtonSecondaryText}>Enable</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Biometric Authentication */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Biometric Authentication</Text>
          <View style={styles.card}>
            <View style={styles.cardItem}>
              <View style={styles.cardItemInfo}>
                <Ionicons name="finger-print" size={24} color="#3b82f6" />
                <View style={styles.cardItemText}>
                  <Text style={styles.cardItemTitle}>
                    {biometricType || 'Biometric Authentication'}
                  </Text>
                  <Text style={styles.cardItemDescription}>
                    {biometricEnabled ? `Enabled (${biometricType})` : 'Use Face ID, Touch ID, or Fingerprint'}
                  </Text>
                </View>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
              />
            </View>
          </View>
        </View>

        {/* Active Sessions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Sessions</Text>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={handleTerminateAllSessions}
            >
              <Text style={styles.viewAllButtonText}>Terminate All Others</Text>
            </TouchableOpacity>
          </View>

          {sessions.map((session) => (
            <View key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionInfo}>
                <View style={styles.sessionIcon}>
                  <Ionicons name="laptop" size={24} color="#6b7280" />
                </View>
                <View style={styles.sessionDetails}>
                  <Text style={styles.sessionDevice}>{session.device}</Text>
                  <Text style={styles.sessionLocation}>
                    {session.browser} • {session.os}
                  </Text>
                  <Text style={styles.sessionTime}>
                    {session.current ? 'Active now' : `Last active: ${formatTime(session.lastActive)}`}
                  </Text>
                </View>
              </View>
              {session.current ? (
                <View style={styles.sessionBadge}>
                  <Text style={styles.sessionBadgeText}>Current</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.terminateButton}
                  onPress={() => handleTerminateSession(session.id)}
                  disabled={terminatingSession === session.id}
                >
                  {terminatingSession === session.id ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : (
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                  )}
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllButtonText}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            {activityLog.map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  <Ionicons name={getActivityIcon(activity.type) as any} size={20} color="#6b7280" />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityDescription}>{activity.description}</Text>
                  <Text style={styles.activityTime}>{formatTime(activity.timestamp)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Security Alerts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Alerts</Text>
          <View style={styles.card}>
            {[
              { key: 'newDeviceAlerts', label: 'New Device Login', description: 'Get notified when your account is accessed from a new device' },
              { key: 'suspiciousActivityAlerts', label: 'Suspicious Activity', description: 'Alert for unusual account activity' },
              { key: 'largeTransactionAlerts', label: 'Large Transactions', description: 'Alert for transactions above threshold' },
              { key: 'securityChangeAlerts', label: 'Security Changes', description: 'Alert when security settings are modified' },
            ].map((alert) => (
              <View key={alert.key} style={styles.alertItem}>
                <View style={styles.alertInfo}>
                  <Text style={styles.alertTitle}>{alert.label}</Text>
                  <Text style={styles.alertDescription}>{alert.description}</Text>
                </View>
                <Switch
                  value={securitySettings[alert.key as keyof typeof securitySettings] as boolean}
                  onValueChange={(value) => setSecuritySettings({ [alert.key]: value })}
                  trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                />
              </View>
            ))}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
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
  successBox: {
    flexDirection: 'row',
    backgroundColor: '#d1fae5',
    borderRadius: 12,
    padding: 12,
    margin: 16,
  },
  successText: {
    flex: 1,
    marginLeft: 8,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065f46',
    marginBottom: 2,
  },
  successDescription: {
    fontSize: 13,
    color: '#047857',
  },
  section: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
    marginTop: 16,
    marginLeft: 16,
    textTransform: 'uppercase',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  viewAllButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3b82f6',
  },
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  cardItemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardItemText: {
    flex: 1,
    marginLeft: 12,
  },
  cardItemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  cardItemDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  cardButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cardButtonDestructive: {
    backgroundColor: '#ef4444',
  },
  cardButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  cardButtonTextDestructive: {
    color: '#ffffff',
  },
  cardButtonSecondary: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cardButtonSecondaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sessionInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sessionDetails: {
    flex: 1,
  },
  sessionDevice: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  sessionLocation: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  sessionTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  sessionBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sessionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065f46',
  },
  terminateButton: {
    padding: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  alertInfo: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  alertDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  bottomSpacer: {
    height: 100,
  },
});