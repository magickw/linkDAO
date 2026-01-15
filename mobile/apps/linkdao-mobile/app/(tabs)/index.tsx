/**
 * Feed Screen (Home)
 * Main feed showing posts from communities and users
 */

import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { usePostsStore, useAuthStore } from '../../src/store';
import { postsService } from '../../src/services';

export default function FeedScreen() {
  // Store state
  const posts = usePostsStore((state) => state.posts);
  const loading = usePostsStore((state) => state.loading);
  const hasMore = usePostsStore((state) => state.hasMore);
  const currentPage = usePostsStore((state) => state.currentPage);
  const setPosts = usePostsStore((state) => state.setPosts);
  const setLoading = usePostsStore((state) => state.setLoading);
  const setError = usePostsStore((state) => state.setError);
  const updatePost = usePostsStore((state) => state.updatePost);
  const clearStorage = useAuthStore((state) => state.clearStorage);

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Load posts on mount
  useEffect(() => {
    loadPosts();
  }, []);

  // Load posts from API
  const loadPosts = async (page: number = 1) => {
    try {
      setLoading(true);
      const response = await postsService.getPosts({ page, limit: 20 });

      if (response.success && response.data) {
        setPosts(response.data.posts || []);
      } else {
        setError('Failed to load posts');
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPosts(1);
    setRefreshing(false);
  }, []);

  // Handle like action
  const handleLike = async (postId: string) => {
    try {
      const post = posts?.find(p => p.id === postId);
      if (!post) return;

      // Optimistic update
      updatePost(postId, {
        isLiked: !post.isLiked,
        likes: post.isLiked ? post.likes - 1 : post.likes + 1,
      });

      // API call
      await postsService.likePost(postId);
    } catch (error) {
      console.error('Error liking post:', error);
      // Revert on error
      const post = posts?.find(p => p.id === postId);
      if (post) {
        updatePost(postId, {
          isLiked: !post.isLiked,
          likes: post.isLiked ? post.likes + 1 : post.likes - 1,
        });
      }
    }
  };

  // Clear storage (dev only)
  const handleClearStorage = () => {
    Alert.alert(
      'Clear Storage',
      'This will clear all local data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearStorage();
            Alert.alert('Success', 'Storage cleared');
          },
        },
      ]
    );
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Safe check for posts array
  const hasPosts = posts && posts.length > 0;
  const isEmpty = !loading && (!posts || posts.length === 0);
  const showLoading = loading && (!posts || posts.length === 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Feed</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/search')}
            >
              <Ionicons name="search" size={24} color="#1f2937" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleClearStorage}
            >
              <Ionicons name="trash-outline" size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/communities')}
          >
            <Ionicons name="people" size={20} color="#3b82f6" />
            <Text style={styles.actionText}>Communities</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/create-post')}
          >
            <Ionicons name="create" size={20} color="#3b82f6" />
            <Text style={styles.actionText}>Create Post</Text>
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {showLoading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading posts...</Text>
          </View>
        )}

        {/* Feed Posts */}
        {hasPosts && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Posts</Text>
            {posts.map((post) => (
              <View key={post.id} style={styles.postCard}>
                <View style={styles.postHeader}>
                  <View style={[styles.avatar, post.authorAvatar && { backgroundColor: 'transparent' }]} />
                  <View style={styles.postHeaderInfo}>
                    <Text style={styles.authorName}>{post.authorName}</Text>
                    <Text style={styles.postTime}>{formatTime(post.createdAt)}</Text>
                  </View>
                </View>

                <Text style={styles.postContent}>{post.content}</Text>

                <View style={styles.postActions}>
                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={() => handleLike(post.id)}
                  >
                    <Ionicons
                      name={post.isLiked ? 'heart' : 'heart-outline'}
                      size={20}
                      color={post.isLiked ? '#ef4444' : '#6b7280'}
                    />
                    <Text style={styles.actionCount}>{post.likes}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionItem}>
                    <Ionicons name="chatbubble-outline" size={20} color="#6b7280" />
                    <Text style={styles.actionCount}>{post.comments}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionItem}>
                    <Ionicons name="share-outline" size={20} color="#6b7280" />
                    <Text style={styles.actionCount}>{post.shares}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* End of Feed */}
        {!hasMore && hasPosts && (
          <View style={styles.endOfFeedContainer}>
            <Text style={styles.endOfFeedText}>You're all caught up!</Text>
          </View>
        )}

        {/* Empty State */}
        {isEmpty && (
          <View style={styles.centerContainer}>
            <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>Check back later for updates</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  quickActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    marginRight: 12,
  },
  postHeaderInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  postTime: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  postContent: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    gap: 24,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  endOfFeedContainer: {
    alignItems: 'center',
    padding: 24,
  },
  endOfFeedText: {
    fontSize: 14,
    color: '#9ca3af',
  },
});