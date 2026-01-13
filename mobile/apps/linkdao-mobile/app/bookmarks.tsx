/**
 * Bookmarks Screen
 * Display user's bookmarked posts, communities, and users
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { OptimizedFlatList } from '../../src/components';

export default function BookmarksScreen() {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'posts' | 'communities' | 'users'>('posts');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookmarks, setBookmarks] = useState<{
    posts: any[];
    communities: any[];
    users: any[];
  }>({
    posts: [],
    communities: [],
    users: [],
  });

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    setLoading(true);
    try {
      // In production, fetch from API
      const mockPosts = [
        {
          id: '1',
          content: 'Exploring the future of decentralized finance and its impact on traditional banking systems',
          author: { id: '1', name: 'Alice', avatar: '#3b82f6' },
          likes: 156,
          comments: 42,
          timestamp: '2 hours ago',
          bookmarkedAt: '2024-01-10T10:30:00Z',
        },
        {
          id: '2',
          content: 'Latest NFT trends and market analysis for Q4 2024',
          author: { id: '2', name: 'Charlie', avatar: '#f59e0b' },
          likes: 89,
          comments: 15,
          timestamp: '5 hours ago',
          bookmarkedAt: '2024-01-09T14:20:00Z',
        },
        {
          id: '3',
          content: 'A deep dive into smart contract security best practices',
          author: { id: '3', name: 'David', avatar: '#10b981' },
          likes: 234,
          comments: 67,
          timestamp: '1 day ago',
          bookmarkedAt: '2024-01-08T09:15:00Z',
        },
      ];

      const mockCommunities = [
        {
          id: '1',
          name: 'Web3 Developers',
          handle: 'web3dev',
          description: 'A community for Web3 developers to share knowledge',
          members: 1234,
          image: '#3b82f6',
          bookmarkedAt: '2024-01-10T10:30:00Z',
        },
        {
          id: '2',
          name: 'DeFi Explorers',
          handle: 'defiexplorers',
          description: 'Discover and discuss DeFi protocols',
          members: 5678,
          image: '#8b5cf6',
          bookmarkedAt: '2024-01-09T14:20:00Z',
        },
      ];

      const mockUsers = [
        {
          id: '1',
          name: 'Alice Johnson',
          handle: 'alicej',
          bio: 'Blockchain researcher and developer',
          avatar: '#3b82f6',
          bookmarkedAt: '2024-01-10T10:30:00Z',
        },
        {
          id: '2',
          name: 'Bob Smith',
          handle: 'bobsmith',
          bio: 'DeFi enthusiast',
          avatar: '#10b981',
          bookmarkedAt: '2024-01-09T14:20:00Z',
        },
      ];

      setBookmarks({
        posts: mockPosts,
        communities: mockCommunities,
        users: mockUsers,
      });
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
      Alert.alert('Error', 'Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookmarks();
    setRefreshing(false);
  };

  const removeBookmark = async (type: string, id: string) => {
    Alert.alert(
      'Remove Bookmark',
      'Are you sure you want to remove this bookmark?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // In production, call API to remove bookmark
              const updatedBookmarks = { ...bookmarks };
              updatedBookmarks[type as keyof typeof bookmarks] = updatedBookmarks[
                type as keyof typeof bookmarks
              ].filter((item: any) => item.id !== id);
              setBookmarks(updatedBookmarks);
            } catch (error) {
              console.error('Failed to remove bookmark:', error);
              Alert.alert('Error', 'Failed to remove bookmark');
            }
          },
        },
      ]
    );
  };

  const renderPost = ({ item }: any) => (
    <TouchableOpacity
      style={styles.bookmarkCard}
      onPress={() => router.push(`/post/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: item.author.avatar }]} />
        <View style={styles.headerInfo}>
          <Text style={styles.authorName}>{item.author.name}</Text>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
        <TouchableOpacity
          style={styles.bookmarkButton}
          onPress={() => removeBookmark('posts', item.id)}
        >
          <Ionicons name="bookmark" size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>
      <Text style={styles.content} numberOfLines={3}>
        {item.content}
      </Text>
      <View style={styles.cardFooter}>
        <View style={styles.stat}>
          <Ionicons name="heart-outline" size={16} color="#6b7280" />
          <Text style={styles.statText}>{item.likes}</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="chatbubble-outline" size={16} color="#6b7280" />
          <Text style={styles.statText}>{item.comments}</Text>
        </View>
        <Text style={styles.bookmarkDate}>
          Bookmarked {new Date(item.bookmarkedAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderCommunity = ({ item }: any) => (
    <TouchableOpacity
      style={styles.bookmarkCard}
      onPress={() => router.push(`/communities/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: item.image }]} />
        <View style={styles.headerInfo}>
          <Text style={styles.communityName}>{item.name}</Text>
          <Text style={styles.communityHandle}>@{item.handle}</Text>
        </View>
        <TouchableOpacity
          style={styles.bookmarkButton}
          onPress={() => removeBookmark('communities', item.id)}
        >
          <Ionicons name="bookmark" size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>
      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.cardFooter}>
        <View style={styles.stat}>
          <Ionicons name="people" size={16} color="#6b7280" />
          <Text style={styles.statText}>{item.members.toLocaleString()} members</Text>
        </View>
        <Text style={styles.bookmarkDate}>
          Bookmarked {new Date(item.bookmarkedAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderUser = ({ item }: any) => (
    <TouchableOpacity
      style={styles.bookmarkCard}
      onPress={() => router.push(`/profile/${item.handle}`)}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: item.avatar }]} />
        <View style={styles.headerInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userHandle}>@{item.handle}</Text>
        </View>
        <TouchableOpacity
          style={styles.bookmarkButton}
          onPress={() => removeBookmark('users', item.id)}
        >
          <Ionicons name="bookmark" size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>
      <Text style={styles.description} numberOfLines={2}>
        {item.bio}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.bookmarkDate}>
          Bookmarked {new Date(item.bookmarkedAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const getCurrentData = () => {
    switch (activeTab) {
      case 'posts':
        return bookmarks.posts;
      case 'communities':
        return bookmarks.communities;
      case 'users':
        return bookmarks.users;
      default:
        return [];
    }
  };

  const getCurrentRenderItem = () => {
    switch (activeTab) {
      case 'posts':
        return renderPost;
      case 'communities':
        return renderCommunity;
      case 'users':
        return renderUser;
      default:
        return renderPost;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bookmarks</Text>
        <TouchableOpacity style={styles.searchButton} onPress={() => router.push('/search')}>
          <Ionicons name="search" size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
          onPress={() => setActiveTab('posts')}
        >
          <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>
            Posts
          </Text>
          {bookmarks.posts.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{bookmarks.posts.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'communities' && styles.tabActive]}
          onPress={() => setActiveTab('communities')}
        >
          <Text style={[styles.tabText, activeTab === 'communities' && styles.tabTextActive]}>
            Communities
          </Text>
          {bookmarks.communities.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{bookmarks.communities.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.tabActive]}
          onPress={() => setActiveTab('users')}
        >
          <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>
            Users
          </Text>
          {bookmarks.users.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{bookmarks.users.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <OptimizedFlatList
          data={getCurrentData()}
          renderItem={getCurrentRenderItem()}
          keyExtractor={(item) => item.id}
          estimatedItemSize={150}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="bookmark-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No bookmarks yet</Text>
              <Text style={styles.emptyDescription}>
                Save posts, communities, and users to find them later
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  searchButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  bookmarkCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 13,
    color: '#9ca3af',
  },
  communityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  communityHandle: {
    fontSize: 13,
    color: '#6b7280',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  userHandle: {
    fontSize: 13,
    color: '#6b7280',
  },
  bookmarkButton: {
    padding: 8,
  },
  content: {
    fontSize: 15,
    color: '#1f2937',
    lineHeight: 22,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#6b7280',
  },
  bookmarkDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 'auto',
  },
  emptyState: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});