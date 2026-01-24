/**
 * Trending Screen
 * Display trending posts, communities, and topics
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { OptimizedFlatList } from '../src/components/OptimizedFlatList';

export default function TrendingScreen() {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'posts' | 'communities' | 'topics'>('posts');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trending, setTrending] = useState<{
    posts: any[];
    communities: any[];
    topics: any[];
  }>({
    posts: [],
    communities: [],
    topics: [],
  });

  useEffect(() => {
    loadTrending();
  }, []);

  const loadTrending = async () => {
    setLoading(true);
    try {
      // Fetch trending data from backend
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/feed/trending`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setTrending({
          posts: result.data.posts || [],
          communities: result.data.communities || [],
          topics: result.data.topics || [],
        });
      } else {
        setTrending({ posts: [], communities: [], topics: [] });
      }
    } catch (error) {
      console.error('Failed to load trending:', error);
      setTrending({ posts: [], communities: [], topics: [] });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTrending();
    setRefreshing(false);
  };

  const renderPost = ({ item, index }: any) => (
    <TouchableOpacity
      style={styles.trendingCard}
      onPress={() => router.push(`/post/${item.id}`)}
    >
      <View style={styles.rankContainer}>
        <Text style={styles.rankText}>#{index + 1}</Text>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.authorInfo}>
            <View style={[styles.avatar, { backgroundColor: item.author.avatar }]} />
            <View>
              <View style={styles.authorNameRow}>
                <Text style={styles.authorName}>{item.author.name}</Text>
                {item.author.verified && (
                  <Ionicons name="checkmark-circle" size={14} color="#3b82f6" />
                )}
              </View>
              <Text style={styles.timestamp}>{item.timestamp}</Text>
            </View>
          </View>
          <View style={styles.trendingScore}>
            <Ionicons name="trending-up" size={16} color="#10b981" />
            <Text style={styles.trendingScoreText}>{item.trendingScore}</Text>
          </View>
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
          <View style={styles.stat}>
            <Ionicons name="share-outline" size={16} color="#6b7280" />
            <Text style={styles.statText}>{item.shares}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCommunity = ({ item, index }: any) => (
    <TouchableOpacity
      style={styles.trendingCard}
      onPress={() => router.push(`/communities/${item.id}`)}
    >
      <View style={styles.rankContainer}>
        <Text style={styles.rankText}>#{index + 1}</Text>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={[styles.communityAvatar, { backgroundColor: item.image }]}>
            <Ionicons name="people" size={24} color="#ffffff" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.communityName}>{item.name}</Text>
            <Text style={styles.communityHandle}>@{item.handle}</Text>
          </View>
          <View style={styles.growthBadge}>
            <Ionicons name="arrow-up" size={12} color="#10b981" />
            <Text style={styles.growthText}>{item.growth}</Text>
          </View>
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.cardFooter}>
          <View style={styles.stat}>
            <Ionicons name="people" size={16} color="#6b7280" />
            <Text style={styles.statText}>{item.members.toLocaleString()} members</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="document-text" size={16} color="#6b7280" />
            <Text style={styles.statText}>{item.posts.toLocaleString()} posts</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderTopic = ({ item, index }: any) => (
    <TouchableOpacity
      style={styles.topicCard}
      onPress={() => router.push(`/search?q=${encodeURIComponent(item.name)}`)}
    >
      <View style={[styles.topicIcon, { backgroundColor: item.image }]}>
        <Text style={styles.topicIconText}>{item.name.charAt(0)}</Text>
      </View>
      <View style={styles.topicInfo}>
        <Text style={styles.topicName}>{item.name}</Text>
        <View style={styles.topicStats}>
          <Text style={styles.topicPosts}>{item.posts.toLocaleString()} posts</Text>
          <View style={styles.topicGrowth}>
            <Ionicons name="arrow-up" size={12} color="#10b981" />
            <Text style={styles.topicGrowthText}>{item.growth}</Text>
          </View>
        </View>
      </View>
      <View style={styles.topicRank}>
        <Text style={styles.topicRankText}>#{index + 1}</Text>
      </View>
    </TouchableOpacity>
  );

  const getCurrentData = () => {
    switch (activeTab) {
      case 'posts':
        return trending.posts;
      case 'communities':
        return trending.communities;
      case 'topics':
        return trending.topics;
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
      case 'topics':
        return renderTopic;
      default:
        return renderPost;
    }
  };

  const isGridTab = activeTab === 'topics';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trending</Text>
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
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'communities' && styles.tabActive]}
          onPress={() => setActiveTab('communities')}
        >
          <Text style={[styles.tabText, activeTab === 'communities' && styles.tabTextActive]}>
            Communities
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'topics' && styles.tabActive]}
          onPress={() => setActiveTab('topics')}
        >
          <Text style={[styles.tabText, activeTab === 'topics' && styles.tabTextActive]}>
            Topics
          </Text>
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
          contentContainerStyle={isGridTab ? styles.gridContent : styles.listContent}
          numColumns={isGridTab ? 2 : 1}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
    paddingVertical: 14,
    alignItems: 'center',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  gridContent: {
    padding: 12,
  },
  trendingCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    marginBottom: 12,
  },
  rankContainer: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#9ca3af',
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  timestamp: {
    fontSize: 12,
    color: '#9ca3af',
  },
  trendingScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendingScoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  communityAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  communityName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  communityHandle: {
    fontSize: 13,
    color: '#6b7280',
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  growthText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  content: {
    fontSize: 15,
    color: '#1f2937',
    lineHeight: 22,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
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
  topicCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    marginBottom: 8,
    marginHorizontal: 4,
    flex: 1,
  },
  topicIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  topicIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  topicInfo: {
    marginBottom: 8,
  },
  topicName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  topicStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topicPosts: {
    fontSize: 13,
    color: '#6b7280',
  },
  topicGrowth: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  topicGrowthText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  topicRank: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  topicRankText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e5e7eb',
  },
});