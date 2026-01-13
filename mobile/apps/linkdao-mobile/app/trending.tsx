/**
 * Trending Screen
 * Display trending posts, communities, and topics
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { OptimizedFlatList } from '../../src/components';

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
      // In production, fetch from API
      const mockPosts = [
        {
          id: '1',
          content: 'Breaking: Major DeFi protocol announces new liquidity mining program with $10M rewards',
          author: { id: '1', name: 'CryptoNews', avatar: '#ef4444', verified: true },
          likes: 1234,
          comments: 234,
          shares: 56,
          timestamp: '1 hour ago',
          trendingScore: 98,
        },
        {
          id: '2',
          content: 'The future of DAO governance is here: New on-chain voting mechanism with quadratic funding',
          author: { id: '2', name: 'DAOExpert', avatar: '#3b82f6', verified: true },
          likes: 987,
          comments: 156,
          shares: 45,
          timestamp: '2 hours ago',
          trendingScore: 95,
        },
        {
          id: '3',
          content: 'NFT market analysis: Why blue-chip collections are seeing renewed interest',
          author: { id: '3', name: 'NFTAnalyst', avatar: '#8b5cf6', verified: false },
          likes: 756,
          comments: 89,
          shares: 34,
          timestamp: '3 hours ago',
          trendingScore: 92,
        },
        {
          id: '4',
          content: 'Layer 2 scaling solutions comparison: Optimism vs Arbitrum vs zkSync',
          author: { id: '4', name: 'TechDeepDive', avatar: '#10b981', verified: true },
          likes: 654,
          comments: 112,
          shares: 67,
          timestamp: '4 hours ago',
          trendingScore: 89,
        },
        {
          id: '5',
          content: 'Web3 social media revolution: How decentralized platforms are changing content creation',
          author: { id: '5', name: 'SocialWeb3', avatar: '#f59e0b', verified: false },
          likes: 543,
          comments: 78,
          shares: 23,
          timestamp: '5 hours ago',
          trendingScore: 86,
        },
      ];

      const mockCommunities = [
        {
          id: '1',
          name: 'DeFi Degens',
          handle: 'defidegens',
          description: 'High-yield DeFi strategies and discussions',
          members: 45678,
          posts: 123456,
          image: '#ef4444',
          trendingScore: 99,
          growth: '+23%',
        },
        {
          id: '2',
          name: 'NFT Artists',
          handle: 'nftartists',
          description: 'Showcase and discover NFT art',
          members: 34567,
          posts: 98765,
          image: '#8b5cf6',
          trendingScore: 97,
          growth: '+18%',
        },
        {
          id: '3',
          name: 'Smart Contract Devs',
          handle: 'scdevs',
          description: 'Solidity and smart contract development',
          members: 23456,
          posts: 87654,
          image: '#3b82f6',
          trendingScore: 94,
          growth: '+15%',
        },
        {
          id: '4',
          name: 'DAO Governance',
          handle: 'daogov',
          description: 'Discuss DAO governance and proposals',
          members: 18765,
          posts: 65432,
          image: '#10b981',
          trendingScore: 91,
          growth: '+12%',
        },
      ];

      const mockTopics = [
        {
          id: '1',
          name: 'DeFi',
          posts: 123456,
          growth: '+25%',
          image: '#ef4444',
          trendingScore: 100,
        },
        {
          id: '2',
          name: 'NFTs',
          posts: 98765,
          growth: '+20%',
          image: '#8b5cf6',
          trendingScore: 98,
        },
        {
          id: '3',
          name: 'Layer 2',
          posts: 87654,
          growth: '+18%',
          image: '#3b82f6',
          trendingScore: 96,
        },
        {
          id: '4',
          name: 'DAO',
          posts: 76543,
          growth: '+15%',
          image: '#10b981',
          trendingScore: 94,
        },
        {
          id: '5',
          name: 'Web3',
          posts: 65432,
          growth: '+12%',
          image: '#f59e0b',
          trendingScore: 92,
        },
        {
          id: '6',
          name: 'Smart Contracts',
          posts: 54321,
          growth: '+10%',
          image: '#ec4899',
          trendingScore: 90,
        },
      ];

      setTrending({
        posts: mockPosts,
        communities: mockCommunities,
        topics: mockTopics,
      });
    } catch (error) {
      console.error('Failed to load trending:', error);
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