import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, Alert } from 'react-native';
import PushNotificationService from '../../services/pushNotificationService';
import { NotificationPreferences } from '../../types';

interface NotificationSettingsProps {
  userAddress: string;
  preferences: NotificationPreferences;
  onPreferencesChange: (preferences: NotificationPreferences) => void;
}

export default function NotificationSettings({
  userAddress,
  preferences,
  onPreferencesChange
}: NotificationSettingsProps) {
  const [isEnabled, setIsEnabled] = useState(true);
  const [localPreferences, setLocalPreferences] = useState<NotificationPreferences>(preferences);

  useEffect(() => {
    setLocalPreferences(preferences);
  }, [preferences]);

  const updatePreference = (key: keyof NotificationPreferences, value: any) => {
    const updatedPreferences = {
      ...localPreferences,
      [key]: value
    };
    setLocalPreferences(updatedPreferences);
    onPreferencesChange(updatedPreferences);
  };

  const togglePushNotifications = async (value: boolean) => {
    setIsEnabled(value);
    
    if (value) {
      // Enable push notifications
      const token = await PushNotificationService.registerForPushNotifications();
      if (token) {
        const success = await PushNotificationService.registerTokenWithBackend(userAddress);
        if (!success) {
          Alert.alert('Error', 'Failed to enable push notifications');
          setIsEnabled(false);
        }
      } else {
        Alert.alert('Error', 'Failed to get push notification token');
        setIsEnabled(false);
      }
    } else {
      // Disable push notifications
      const success = await PushNotificationService.unregisterTokenFromBackend(userAddress);
      if (success) {
        await PushNotificationService.unregisterFromPushNotifications();
      } else {
        Alert.alert('Error', 'Failed to disable push notifications');
        setIsEnabled(true);
      }
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Push Notifications</Text>
          <Switch
            value={isEnabled}
            onValueChange={togglePushNotifications}
          />
        </View>
        <Text style={styles.settingDescription}>
          Enable or disable all push notifications
        </Text>
      </View>

      {isEnabled && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notification Types</Text>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Posts</Text>
              <Switch
                value={localPreferences.posts}
                onValueChange={(value) => updatePreference('posts', value)}
              />
            </View>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Comments</Text>
              <Switch
                value={localPreferences.comments}
                onValueChange={(value) => updatePreference('comments', value)}
              />
            </View>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Governance</Text>
              <Switch
                value={localPreferences.governance}
                onValueChange={(value) => updatePreference('governance', value)}
              />
            </View>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Moderation</Text>
              <Switch
                value={localPreferences.moderation}
                onValueChange={(value) => updatePreference('moderation', value)}
              />
            </View>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Mentions</Text>
              <Switch
                value={localPreferences.mentions}
                onValueChange={(value) => updatePreference('mentions', value)}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Digest Notifications</Text>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Daily Digest</Text>
              <Switch
                value={localPreferences.digestFrequency === 'daily'}
                onValueChange={(value) => updatePreference('digestFrequency', value ? 'daily' : 'never')}
              />
            </View>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Weekly Digest</Text>
              <Switch
                value={localPreferences.digestFrequency === 'weekly'}
                onValueChange={(value) => updatePreference('digestFrequency', value ? 'weekly' : 'never')}
              />
            </View>
            
            <Text style={styles.settingDescription}>
              Get a summary of activity when you're away
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: -10,
    marginBottom: 15,
  },
});