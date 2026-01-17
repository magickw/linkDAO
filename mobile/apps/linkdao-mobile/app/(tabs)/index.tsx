/**
 * Feed Screen (Home)
 * Main feed showing posts from communities and users
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, TextInput as RNTextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePostsStore, useAuthStore } from '../../src/store';
import { postsService } from '../../src/services';
import { InteractivePostCard } from '../../src/components/InteractivePostCard';
import { PostComposer } from '../../src/components/PostComposer';
import { FeedSkeleton } from '../../src/components/FeedSkeleton';
import { useWebSocket } from '../../src/hooks/useWebSocket';
import { THEME } from '../../src/constants/theme';

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
  const user = useAuthStore((state) => state.user);

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // Removed feed type selection - only showing statuses from following
  const [sortBy, setSortBy] = useState<'recent' | 'likes'>('recent');
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // WebSocket for real-time updates
  const webSocket = useWebSocket();
  const wsSubscribedRef = useRef(false);

  // Load saved preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  // Save preferences when they change
  useEffect(() => {
    savePreferences();
  }, [sortBy]);

  const loadPreferences = async () => {
    try {
      const savedSort = await AsyncStorage.getItem('feed_sort');

      if (savedSort && (savedSort === 'recent' || savedSort === 'likes')) {
        setSortBy(savedSort as any);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const savePreferences = async () => {
    try {
      await AsyncStorage.setItem('feed_sort', sortBy);
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  // Load posts on mount and when sort or search changes
  useEffect(() => {
    loadPosts(1, sortBy, false, searchQuery);
  }, [sortBy, searchQuery]);

  // Load statuses from API with retry logic
  const loadPosts = async (page: number = 1, sort = sortBy, isRetry = false, query = searchQuery) => {
    try {
      setLoading(true);

      const response = await postsService.getFeed(page, 20);

      if (response.posts) {
        // Filter to show ONLY statuses
        let statusOnly = response.posts.filter(post => post.isStatus === true);

        // Filter by search query if provided
        if (query) {
          const lowerQuery = query.toLowerCase();
          statusOnly = statusOnly.filter(post =>
            post.content?.toLowerCase().includes(lowerQuery) ||
            post.authorName?.toLowerCase().includes(lowerQuery) ||
            post.authorHandle?.toLowerCase().includes(lowerQuery)
          );
        }

        setPosts(statusOnly);
        setRetryCount(0); // Reset retry count on success
      } else {
        throw new Error('No posts in response');
      }
    } catch (error) {
      console.error('Error loading statuses:', error);

      // Exponential backoff retry
      if (retryCount < 3 && !isRetry) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.log(`Retrying in ${delay}ms... (attempt ${retryCount + 1}/3)`);

        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadPosts(page, sort, true, query);
        }, delay);
      } else {
        setError('Failed to load statuses. Please try again.');
        setRetryCount(0);
      }
    } finally {
      setLoading(false);
    }
  };

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setHasNewPosts(false); // Clear new posts banner
    await loadPosts(1);
    setRefreshing(false);
  }, []);

  // Subscribe to WebSocket feed updates
  useEffect(() => {
    if (!webSocket.isConnected || wsSubscribedRef.current) {
      return;
    }

    // Subscribe to feed updates
    webSocket.joinRoom('feed');
    wsSubscribedRef.current = true;

    // Listen for new posts
    const handleNewPost = (data: any) => {
      console.log('New post received:', data);
      // Only show banner if it's not the current user's post
      if (data.author !== user?.address) {
        setHasNewPosts(true);
      }
    };

    webSocket.on('new_post', handleNewPost);
    webSocket.on('feed_update', handleNewPost);

    return () => {
      webSocket.off('new_post', handleNewPost);
      webSocket.off('feed_update', handleNewPost);
      webSocket.leaveRoom('feed');
      wsSubscribedRef.current = false;
    };
  }, [webSocket.isConnected, user?.address]);

  // Handle refresh from new posts banner
  const handleRefreshFeed = useCallback(() => {
    setHasNewPosts(false);
    loadPosts(1);
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

  // Handle post creation
  const handleCreatePost = async (postData: any) => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please log in to create a post');
      return;
    }

    try {
      // Convert attachments format if needed
      const apiData: any = {
        content: postData.content,
        tags: postData.tags,
        location: postData.location,
        shareToSocialMedia: postData.shareToSocialMedia,
      };

      // Convert image attachments to the API format
      if (postData.attachments && postData.attachments.length > 0) {
        apiData.attachments = postData.attachments.map((att: any) => ({
          type: att.type,
          url: att.url,
        }));
      }

      const newPost = await postsService.createPost(apiData);

      if (newPost) {
        // Add new post to the top of the feed
        setPosts([newPost, ...(posts || [])]);
        Alert.alert('Success', 'Status posted successfully!');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      throw error; // Re-throw to let PostComposer handle the error
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

  // Load more posts for pagination
  const loadMorePosts = async () => {
    if (loadingMore || !hasMore || loading) return;

    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const response = await postsService.getFeed(nextPage, 20);

      if (response.posts && response.posts.length > 0) {
        // Append new posts to existing ones
        setPosts([...(posts || []), ...response.posts]);
        usePostsStore.setState({
          currentPage: nextPage,
          hasMore: response.hasMore !== false
        });
      } else {
        usePostsStore.setState({ hasMore: false });
      }
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Handle scroll to show/hide back to top button
  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowBackToTop(offsetY > 400);
  };

  // Scroll to top
  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  // Render footer for FlatList
  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color="#3b82f6" />
        <Text style={styles.loadingMoreText}>Loading more posts...</Text>
      </View>
    );
  };

  // Render empty component with status-specific message
  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="people-outline" size={64} color="#9ca3af" />
        </View>
        <Text style={styles.emptyTitle}>No statuses yet</Text>
        <Text style={styles.emptySubtitle}>
          Follow users to see their statuses in your feed
        </Text>
      </View>
    );
  };

  // Render post item
  const renderPost = useCallback(({ item }: { item: any }) => (
    <InteractivePostCard
      post={item}
      onLike={handleLike}
      onComment={(id) => router.push(`/post/${id}`)}
      onShare={(id) => Alert.alert('Share', 'Share functionality coming soon')}
    />
  ), [handleLike]);

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: any) => item.id, []);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* New Posts Available Banner */}
      {hasNewPosts && (
        <View style={styles.newPostsBanner}>
          <TouchableOpacity
            style={styles.newPostsButton}
            onPress={handleRefreshFeed}
          >
            <Ionicons name="arrow-up" size={16} color="#ffffff" />
            <Text style={styles.newPostsText}>New posts available</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={posts || []}
        renderItem={renderPost}
        keyExtractor={keyExtractor}
        ListHeaderComponent={() => (
          <>
            {/* Post Composer */}
            <View style={styles.composerContainer}>
              <PostComposer
                onSubmit={handleCreatePost}
                userName={user?.displayName || `${user?.address?.slice(0, 6)}...${user?.address?.slice(-4)}`}
                placeholder="What's on your mind?"
              />
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
              <RNTextInput
                style={styles.searchInput}
                placeholder="Search posts..."
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>

            {/* Sort Button */}
            <View style={styles.sortContainer}>
              <TouchableOpacity
                style={styles.sortButton}
                onPress={() => {
                  // Toggle between recent and most liked
                  setSortBy(sortBy === 'recent' ? 'likes' : 'recent');
                }}
              >
                <Ionicons name="funnel-outline" size={16} color="#6b7280" />
                <Text style={styles.sortButtonText}>
                  {sortBy === 'recent' ? 'Recent' : 'Most Liked'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Loading State */}
            {showLoading && <FeedSkeleton />}

            {/* Section Title */}
            {hasPosts && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Feed</Text>
              </View>
            )}
          </>
        )}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.5}
        onScroll={handleScroll}
        scrollEventThrottle={400}
        contentContainerStyle={hasPosts ? undefined : styles.emptyListContent}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={5}
      />

      {/* Back to Top Button */}
      {showBackToTop && (
        <TouchableOpacity
          style={styles.backToTopButton}
          onPress={scrollToTop}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-up" size={24} color="#ffffff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  newPostsBanner: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: 'center',
  },
  newPostsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  newPostsText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: THEME.spacing.md,
    backgroundColor: THEME.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.colors.text,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: '#f3f4f6',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: THEME.spacing.md,
    paddingBottom: THEME.spacing.md,
    gap: 12,
  },
  feedTabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  feedTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  feedTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  feedTabActive: {
    backgroundColor: '#3b82f6',
  },
  feedTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  feedTabTextActive: {
    color: '#ffffff',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  composerContainer: {
    backgroundColor: '#ffffff',
    paddingTop: 0,
    marginTop: 0,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: THEME.borderRadius.lg,
    gap: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  section: {
    paddingHorizontal: THEME.spacing.md,
  },
  sortContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  sectionHeader: {
    paddingHorizontal: THEME.spacing.md,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: THEME.colors.gray,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: THEME.colors.gray,
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: THEME.colors.gray,
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyActionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  endOfFeedContainer: {
    alignItems: 'center',
    padding: 24,
    marginTop: 16,
  },
  endOfFeedText: {
    fontSize: 14,
    color: THEME.colors.gray,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
    color: THEME.colors.gray,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    marginHorizontal: THEME.spacing.md,
    marginTop: 0,
    marginBottom: THEME.spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: THEME.colors.text,
  },
  backToTopButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});