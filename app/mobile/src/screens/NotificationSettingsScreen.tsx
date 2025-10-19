import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NotificationSettings from '../components/notifications/NotificationSettings';
import { NotificationPreferences } from '../types';

export default function NotificationSettingsScreen() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    posts: true,
    comments: true,
    governance: true,
    moderation: true,
    mentions: true,
    digestFrequency: 'daily',
  });

  useEffect(() => {
    // Load preferences from storage or API
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      // In a real app, this would load from AsyncStorage or API
      // const savedPreferences = await AsyncStorage.getItem('notificationPreferences');
      // if (savedPreferences) {
      //   setPreferences(JSON.parse(savedPreferences));
      // }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const handlePreferencesChange = async (newPreferences: NotificationPreferences) => {
    try {
      setPreferences(newPreferences);
      // Save preferences to storage or API
      // await AsyncStorage.setItem('notificationPreferences', JSON.stringify(newPreferences));
      
      // In a real app, you would also send this to your backend
      console.log('Preferences updated:', newPreferences);
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  return (
    <View style={styles.container}>
      <NotificationSettings
        userAddress="0x1234567890123456789012345678901234567890" // This would come from auth context
        preferences={preferences}
        onPreferencesChange={handlePreferencesChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});