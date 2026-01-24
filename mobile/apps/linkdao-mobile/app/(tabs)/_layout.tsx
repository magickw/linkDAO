/**
 * Tab Navigation Layout
 * Main navigation with bottom tabs for Feed, Communities, Marketplace, Messages, and Governance
 */

import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWebSocket } from '../../src/hooks/useWebSocket';
import { usePostsStore } from '../../src/store';

function SettingsButton() {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={{ marginRight: 16 }}
      onPress={() => router.push('/settings')}
    >
      <Ionicons name="settings" size={24} color="#6b7280" />
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const { isConnected, on, off } = useWebSocket();
  const addPost = usePostsStore((state) => state.addPost);
  const updatePost = usePostsStore((state) => state.updatePost);
  const deletePost = usePostsStore((state) => state.deletePost);

  useEffect(() => {
    // Subscribe to real-time post updates
    const unsubscribeNewPost = on('new_post', (data) => {
      addPost(data);
    });

    const unsubscribePostUpdated = on('post_updated', (data) => {
      updatePost(data.id, data);
    });

    const unsubscribePostDeleted = on('post_deleted', (data) => {
      deletePost(data.id);
    });

    // Cleanup
    return () => {
      unsubscribeNewPost();
      unsubscribePostUpdated();
      unsubscribePostDeleted();
    };
  }, [on, addPost, updatePost, deletePost]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          height: 80,
          paddingBottom: 12,
          paddingTop: 12,
        },
        headerShown: true,
        headerStyle: {
          backgroundColor: '#ffffff',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
          color: '#1f2937',
        },
        headerRight: () => <SettingsButton />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="communities"
        options={{
          title: 'Communities',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="earn"
        options={{
          title: 'Earn',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ribbon" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'Marketplace',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="storefront" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="governance"
        options={{
          title: 'Governance',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}