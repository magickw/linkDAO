import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import OfflineService from '../../services/offlineService';
import { Post } from '../../types';

interface OfflineContentProps {
  onRefresh: () => void;
}

export default function OfflineContent({ onRefresh }: OfflineContentProps) {
  const [cachedPosts, setCachedPosts] = useState<Post[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [storageUsage, setStorageUsage] = useState({
    totalActions: 0,
    syncedActions: 0,
    pendingActions: 0,
    cachedPosts: 0
  });

  useEffect(() => {
    loadCachedContent();
    loadStorageUsage();
  }, []);

  const loadCachedContent = async () => {
    try {
      const posts = await OfflineService.getAllCachedPosts();
      setCachedPosts(posts);
    } catch (error) {
      console.error('Error loading cached content:', error);
      Alert.alert('Error', 'Failed to load offline content');
    }
  };

  const loadStorageUsage = async () => {
    try {
      const usage = await OfflineService.getStorageUsage();
      setStorageUsage(usage);
    } catch (error) {
      console.error('Error loading storage usage:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadCachedContent();
    await loadStorageUsage();
    setIsRefreshing(false);
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      <Text style={styles.postTitle}>{item.title}</Text>
      <Text style={styles.postContent} numberOfLines={3}>
        {item.content}
      </Text>
      <Text style={styles.postMeta}>
        {new Date(item.createdAt).toLocaleDateString()} • {item.likes} likes
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Offline Content</Text>
        <Text style={styles.subtitle}>
          {cachedPosts.length} posts available offline
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{storageUsage.cachedPosts}</Text>
          <Text style={styles.statLabel}>Cached Posts</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{storageUsage.pendingActions}</Text>
          <Text style={styles.statLabel}>Pending Actions</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {storageUsage.totalActions > 0 
              ? Math.round((storageUsage.syncedActions / storageUsage.totalActions) * 100) 
              : 0}%
          </Text>
          <Text style={styles.statLabel}>Synced</Text>
        </View>
      </View>

      <FlatList
        data={cachedPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.contentContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No offline content available</Text>
            <Text style={styles.emptySubtext}>
              Browse communities while online to cache content for offline reading
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  contentContainer: {
    padding: 10,
  },
  postCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  postContent: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 10,
  },
  postMeta: {
    fontSize: 14,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});