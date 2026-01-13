/**
 * Feed Screen (Home)
 * Main feed showing posts from communities and users
 */

import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { usePostsStore } from '../../src/store';
import { postsService } from '../../src/services';

export default function FeedScreen() {
  const posts = usePostsStore((state) => state.posts);
  const loading = usePostsStore((state) => state.loading);
  const hasMore = usePostsStore((state) => state.hasMore);
  const setPosts = usePostsStore((state) => state.setPosts);
  const setLoading = usePostsStore((state) => state.setLoading);
  const setError = usePostsStore((state) => state.setError);
  const updatePost = usePostsStore((state) => state.updatePost);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const response = await postsService.getFeed(1, 20);
      setPosts(response.posts);
    } catch (error) {
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const handleLike = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    // Optimistic update
    updatePost(postId, {
      isLiked: !post.isLiked,
      likes: post.isLiked ? post.likes - 1 : post.likes + 1,
    });

    try {
      if (post.isLiked) {
        await postsService.unlikePost(postId);
      } else {
        await postsService.likePost(postId);
      }
    } catch (error) {
      // Revert on error
      updatePost(postId, {
        isLiked: post.isLiked,
        likes: post.likes,
      });
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>LinkDAO</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="search" size={24} color="#1f2937" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={24} color="#1f2937" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
      >
        {/* Create Post Button */}
        <TouchableOpacity
          style={styles.createPostButton}
          onPress={() => router.push('/modal/create-post')}
        >
          <Ionicons name="pencil" size={20} color="#6b7280" />
          <Text style={styles.createPostText}>What's on your mind?</Text>
        </TouchableOpacity>

        {/* Loading State */}
        {loading && posts.length === 0 && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading posts...</Text>
          </View>
        )}

        {/* Feed Posts */}
        {posts.length > 0 && (
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
                  <TouchableOpacity>
                    <Ionicons name="ellipsis-horizontal" size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.postContent}>{post.content}</Text>
                <View style={styles.postActions}>
                  <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(post.id)}>
                    <Ionicons
                      name={post.isLiked ? 'heart' : 'heart-outline'}
                      size={20}
                      color={post.isLiked ? '#ef4444' : '#6b7280'}
                    />
                    <Text style={[styles.actionText, post.isLiked && styles.actionTextActive]}>
                      {post.likes}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="chatbubble-outline" size={20} color="#6b7280" />
                    <Text style={styles.actionText}>{post.comments}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="share-outline" size={20} color="#6b7280" />
                    <Text style={styles.actionText}>{post.shares}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {!loading && posts.length === 0 && (
          <View style={styles.centerContainer}>
            <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>Be the first to share something!</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  createPostText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  section: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  postCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 5,
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
    fontSize: 14,
    color: '#6b7280',
  },
  postContent: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    color: '#6b7280',
  },
  actionTextActive: {
    color: '#ef4444',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#9ca3af',
  },
});