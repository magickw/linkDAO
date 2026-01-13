/**
 * Tab Navigation Layout
 * Main navigation with bottom tabs for Feed, Communities, Marketplace, Messages, and Profile
 */

import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWebSocket } from '../../src/hooks/useWebSocket';
import { usePostsStore } from '../../src/store';
import { AuthGuard } from '../../src/components/AuthGuard';

function TabLayoutContent() {
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
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerShown: false,
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
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <AuthGuard>
      <TabLayoutContent />
    </AuthGuard>
  );
}