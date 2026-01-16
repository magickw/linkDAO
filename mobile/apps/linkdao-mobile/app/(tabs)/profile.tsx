/**
 * Profile Screen
 * User profile and settings
 */

import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store';
import { authService } from '@linkdao/shared';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  // Redirect to settings page since profile is now integrated into settings
  useEffect(() => {
    router.replace('/profile/settings');
  }, []);

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="settings-outline" size={48} color="#9ca3af" />
        <Text style={styles.redirectText}>Redirecting to Settings...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  redirectText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
});