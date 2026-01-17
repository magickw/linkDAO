/**
 * Email Preferences Screen
 * Manage email notification settings matching web app functionality
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../../src/store';

type EmailFrequency = 'immediate' | 'hourly' | 'daily' | 'weekly' | 'off';

const FREQUENCY_OPTIONS = [
  { value: 'immediate' as EmailFrequency, label: 'Immediate', description: 'Receive emails as events occur' },
  { value: 'hourly' as EmailFrequency, label: 'Hourly Digest', description: 'Batched summary every hour' },
  { value: 'daily' as EmailFrequency, label: 'Daily Digest', description: 'One email per day at specified time' },
  { value: 'weekly' as EmailFrequency, label: 'Weekly Digest', description: 'One email per week' },
  { value: 'off' as EmailFrequency, label: 'Off', description: 'No emails (except critical security alerts)' },
];

const ALERT_TYPES = [
  { key: 'newDeviceAlerts', label: 'New Device Login', description: 'Alert when logging in from a new device', critical: true },
  { key: 'suspiciousActivityAlerts', label: 'Suspicious Activity', description: 'Alert for unusual account activity', critical: true },
  { key: 'securityChangeAlerts', label: 'Security Changes', description: 'Alert when security settings are modified', critical: false },
  { key: 'largeTransactionAlerts', label: 'Large Transactions', description: 'Alert for transactions above threshold', critical: false },
];

export default function EmailPreferencesScreen() {
  const router = useRouter();

  const {
    emailPreferences,
    setEmailPreferences,
  } = useSettingsStore();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      // In production, fetch from API
      // For now, use store values
    } catch (error) {
      console.error('Error loading preferences:', error);
      setMessage({ type: 'error', text: 'Failed to load email preferences' });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // In production, save to API
      // For now, just update store
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setMessage({ type: 'success', text: 'Email preferences saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setMessage({ type: 'error', text: 'Failed to save preferences. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    Alert.alert(
      'Reset Preferences',
      'Are you sure you want to reset all email preferences to default?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setEmailPreferences({
              emailNotificationsEnabled: true,
              emailFrequency: 'immediate',
              digestTime: '09:00',
              newDeviceAlerts: true,
              suspiciousActivityAlerts: true,
              largeTransactionAlerts: false,
              securityChangeAlerts: true,
            });
            Alert.alert('Success', 'Preferences reset to default');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading preferences...</Text>
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
        <Text style={styles.headerTitle}>Email Preferences</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#3b82f6" />
          <Text style={styles.infoText}>
            Control how and when you receive security email notifications
          </Text>
        </View>

        {/* Success/Error Message */}
        {message && (
          <View style={[styles.messageBox, message.type === 'success' ? styles.successBox : styles.errorBox]}>
            <Ionicons
              name={message.type === 'success' ? 'checkmark-circle' : 'alert-circle' as any}
              size={20}
              color={message.type === 'success' ? '#10b981' : '#ef4444'}
            />
            <Text style={[styles.messageText, message.type === 'success' ? styles.successText : styles.errorText]}>
              {message.text}
            </Text>
            <TouchableOpacity onPress={() => setMessage(null)}>
              <Ionicons name="close" size={20} color={message.type === 'success' ? '#10b981' : '#ef4444'} />
            </TouchableOpacity>
          </View>
        )}

        {/* Master Toggle */}
        <View style={styles.section}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications" size={24} color="#6b7280" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Email Notifications</Text>
                <Text style={styles.settingDescription}>
                  Enable or disable all email notifications
                </Text>
              </View>
            </View>
            <Switch
              value={emailPreferences.emailNotificationsEnabled}
              onValueChange={(value) => setEmailPreferences({ emailNotificationsEnabled: value })}
              trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
            />
          </View>
        </View>

        {/* Email Frequency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email Frequency</Text>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={20} color="#6b7280" />
            <Text style={styles.sectionHeaderTitle}>Choose how often you want to receive emails</Text>
          </View>

          {FREQUENCY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.frequencyOption,
                emailPreferences.emailFrequency === option.value && styles.frequencyOptionActive,
              ]}
              onPress={() => setEmailPreferences({ emailFrequency: option.value })}
            >
              <View style={styles.frequencyRadio}>
                <View style={[
                  styles.frequencyRadioDot,
                  emailPreferences.emailFrequency === option.value && styles.frequencyRadioDotActive,
                ]} />
              </View>
              <View style={styles.frequencyInfo}>
                <Text style={styles.frequencyLabel}>{option.label}</Text>
                <Text style={styles.frequencyDescription}>{option.description}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Digest Time Picker */}
          {(emailPreferences.emailFrequency === 'daily' || emailPreferences.emailFrequency === 'weekly') && (
            <View style={styles.digestTimeContainer}>
              <Text style={styles.label}>Digest Time</Text>
              <View style={styles.timeInputContainer}>
                <TextInput
                  style={styles.timeInput}
                  value={emailPreferences.digestTime.substring(0, 5)}
                  onChangeText={(value) => setEmailPreferences({ digestTime: value + ':00' })}
                  placeholder="09:00"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>
          )}
        </View>

        {/* Alert Types */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark" size={20} color="#6b7280" />
            <Text style={styles.sectionHeaderTitle}>Choose which types of alerts you want to receive</Text>
          </View>

          {ALERT_TYPES.map((alert) => (
            <View key={alert.key} style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={styles.settingText}>
                  <View style={styles.settingTitleRow}>
                    <Text style={styles.settingTitle}>{alert.label}</Text>
                    {alert.critical && (
                      <View style={styles.criticalBadge}>
                        <Text style={styles.criticalBadgeText}>Critical</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.settingDescription}>{alert.description}</Text>
                </View>
              </View>
              <Switch
                value={emailPreferences[alert.key as keyof typeof emailPreferences] as boolean}
                onValueChange={(value) => setEmailPreferences({ [alert.key]: value })}
                trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                disabled={alert.critical}
              />
            </View>
          ))}
        </View>

        {/* Transaction Threshold */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cash" size={20} color="#6b7280" />
            <Text style={styles.sectionHeaderTitle}>Set the amount that triggers a large transaction alert</Text>
          </View>

          <View style={styles.thresholdContainer}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.thresholdInput}
              value={emailPreferences.transactionThreshold}
              onChangeText={(value) => setEmailPreferences({ transactionThreshold: value })}
              keyboardType="number-pad"
              placeholder="1000"
              placeholderTextColor="#9ca3af"
            />
            <Text style={styles.currencyLabel}>USD</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleReset}
            disabled={saving}
          >
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={savePreferences}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Preferences</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#3b82f6" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoText}>Important Notes:</Text>
            <Text style={styles.infoSubtext}>
              • Critical security alerts (new device, suspicious activity) will always be sent unless you completely unsubscribe
            </Text>
            <Text style={styles.infoSubtext}>
              • Digest emails are currently in development and will be available soon
            </Text>
            <Text style={styles.infoSubtext}>
              • You can unsubscribe from all non-critical emails at any time
            </Text>
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    margin: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    marginLeft: 8,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  infoSubtext: {
    fontSize: 13,
    color: '#1e40af',
    marginTop: 4,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    margin: 16,
  },
  successBox: {
    backgroundColor: '#d1fae5',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
  },
  successText: {
    color: '#065f46',
  },
  errorText: {
    color: '#991b1b',
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
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionHeaderTitle: {
    flex: 1,
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingInfo: {
    flex: 1,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  settingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  criticalBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  criticalBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#991b1b',
  },
  frequencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  frequencyOptionActive: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  frequencyRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  frequencyRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'transparent',
  },
  frequencyRadioDotActive: {
    backgroundColor: '#3b82f6',
  },
  frequencyInfo: {
    flex: 1,
  },
  frequencyLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  frequencyDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  digestTimeContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  timeInputContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  timeInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1f2937',
  },
  thresholdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  currencySymbol: {
    fontSize: 15,
    color: '#6b7280',
    marginRight: 8,
  },
  thresholdInput: {
    flex: 1,
    fontSize: 15,
    color: '#1f2937',
  },
  currencyLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 8,
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  bottomSpacer: {
    height: 100,
  },
});