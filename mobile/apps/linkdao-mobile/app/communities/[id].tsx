/**
 * Community Detail Screen
 * Display community information, posts, and members
 */

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { OptimizedFlatList } from '../../src/components/OptimizedFlatList';
import { Skeleton } from '../../src/components/Skeleton';
import { communitiesService } from '../../src/services';
import { useCommunitiesStore } from '../../src/store';

export default function CommunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [community, setCommunity] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'members' | 'about'>('posts');

  const joinCommunity = useCommunitiesStore((state) => state.joinCommunity);
  const leaveCommunity = useCommunitiesStore((state) => state.leaveCommunity);

  useEffect(() => {
    loadCommunity();
  }, [id]);

  const loadCommunity = async () => {
    setLoading(true);
    try {
      // In production, fetch from API
      const mockCommunity = {
        id: id || '1',
        name: 'Web3 Developers',
        handle: 'web3dev',
        description: 'A community for Web3 developers to share knowledge, collaborate on projects, and discuss the latest trends in blockchain technology.',
        image: '#3b82f6',
        coverImage: '#8b5cf6',
        members: 1234,
        posts: 5678,
        isJoined: false,
        isPublic: true,
        createdAt: '2024-01-01',
        tags: ['Web3', 'Blockchain', 'Development', 'DeFi'],
        moderators: ['0x1234...5678', '0xabcd...efgh'],
        rules: [
          'Be respectful to all members',
          'No spam or self-promotion',
          'Stay on topic',
          'Follow community guidelines',
        ],
      };

      const mockPosts = [
        {
          id: '1',
          content: 'Just deployed my first smart contract on Ethereum mainnet! 🎉',
          author: {
            id: '1',
            name: 'Alice',
            avatar: '#3b82f6',
          },
          likes: 42,
          comments: 8,
          timestamp: '2 hours ago',
        },
        {
          id: '2',
          content: 'Looking for collaborators on a new DeFi protocol. DM me if interested!',
          author: {
            id: '2',
            name: 'Bob',
            avatar: '#10b981',
          },
          likes: 28,
          comments: 15,
          timestamp: '5 hours ago',
        },
        {
          id: '3',
          content: 'Great discussion in the latest governance proposal. Everyone should participate!',
          author: {
            id: '3',
            name: 'Charlie',
            avatar: '#f59e0b',
          },
          likes: 67,
          comments: 23,
          timestamp: '1 day ago',
        },
      ];

      setCommunity(mockCommunity);
      setPosts(mockPosts);
    } catch (error) {
      console.error('Failed to load community:', error);
      Alert.alert('Error', 'Failed to load community details');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCommunity();
    setRefreshing(false);
  };

  const handleJoinToggle = async () => {
    if (!community) return;

    try {
      if (community.isJoined) {
        await communitiesService.leaveCommunity(community.id);
        leaveCommunity(community.id);
        setCommunity({ ...community, isJoined: false });
      } else {
        await communitiesService.joinCommunity(community.id);
        joinCommunity(community.id);
        setCommunity({ ...community, isJoined: true });
      }
    } catch (error) {
      console.error('Failed to toggle join:', error);
      Alert.alert('Error', 'Failed to update membership');
    }
  };

  const renderPost = ({ item }: any) => (
    <TouchableOpacity style={styles.postCard} onPress={() => router.push(`/post/${item.id}`)}>
      <View style={styles.postHeader}>
        <View style={[styles.authorAvatar, { backgroundColor: item.author.avatar }]} />
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{item.author.name}</Text>
          <Text style={styles.postTime}>{item.timestamp}</Text>
        </View>
      </View>
      <Text style={styles.postContent}>{item.content}</Text>
      <View style={styles.postActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="heart-outline" size={20} color="#6b7280" />
          <Text style={styles.actionText}>{item.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={20} color="#6b7280" />
          <Text style={styles.actionText}>{item.comments}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderMember = ({ item }: any) => (
    <View style={styles.memberCard}>
      <View style={[styles.memberAvatar, { backgroundColor: item.avatar }]} />
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.name}</Text>
        <Text style={styles.memberHandle}>@{item.handle}</Text>
      </View>
      {item.isModerator && (
        <View style={styles.moderatorBadge}>
          <Text style={styles.moderatorText}>Mod</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </SafeAreaView>
    );
  }

  if (!community) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Community not found</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Cover Image */}
      <View style={[styles.coverImage, { backgroundColor: community.coverImage }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Community Header */}
        <View style={styles.header}>
          <View style={[styles.communityAvatar, { backgroundColor: community.image }]} />
          <View style={styles.headerInfo}>
            <Text style={styles.communityName}>{community.name}</Text>
            <Text style={styles.communityHandle}>@{community.handle}</Text>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Ionicons name="people" size={16} color="#6b7280" />
                <Text style={styles.statText}>{community.members.toLocaleString()} members</Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="document-text" size={16} color="#6b7280" />
                <Text style={styles.statText}>{community.posts.toLocaleString()} posts</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.joinButton,
              community.isJoined && styles.joinButtonJoined,
            ]}
            onPress={handleJoinToggle}
          >
            <Ionicons
              name={community.isJoined ? 'checkmark' : 'add'}
              size={16}
              color={community.isJoined ? '#ffffff' : '#3b82f6'}
            />
            <Text
              style={[
                styles.joinButtonText,
                community.isJoined && styles.joinButtonTextJoined,
              ]}
            >
              {community.isJoined ? 'Joined' : 'Join'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{community.description}</Text>
          <View style={styles.tags}>
            {community.tags.map((tag: string, index: number) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
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
            style={[styles.tab, activeTab === 'members' && styles.tabActive]}
            onPress={() => setActiveTab('members')}
          >
            <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
              Members
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'about' && styles.tabActive]}
            onPress={() => setActiveTab('about')}
          >
            <Text style={[styles.tabText, activeTab === 'about' && styles.tabTextActive]}>
              About
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'posts' && (
          <View style={styles.tabContent}>
            <OptimizedFlatList
              data={posts}
              renderItem={renderPost}
              keyExtractor={(item) => item.id}
              estimatedItemSize={150}
            />
          </View>
        )}

        {activeTab === 'members' && (
          <View style={styles.tabContent}>
            <OptimizedFlatList
              data={[
                { id: '1', name: 'Alice', handle: 'alice', avatar: '#3b82f6', isModerator: true },
                { id: '2', name: 'Bob', handle: 'bob', avatar: '#10b981', isModerator: false },
                { id: '3', name: 'Charlie', handle: 'charlie', avatar: '#f59e0b', isModerator: false },
              ]}
              renderItem={renderMember}
              keyExtractor={(item) => item.id}
              estimatedItemSize={80}
            />
          </View>
        )}

        {activeTab === 'about' && (
          <View style={styles.tabContent}>
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>Community Rules</Text>
              {community.rules.map((rule: string, index: number) => (
                <View key={index} style={styles.ruleItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                  <Text style={styles.ruleText}>{rule}</Text>
                </View>
              ))}
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>Created</Text>
              <Text style={styles.infoText}>{community.createdAt}</Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>Moderators</Text>
              {community.moderators.map((mod: string, index: number) => (
                <View key={index} style={styles.modItem}>
                  <Ionicons name="shield-checkmark" size={16} color="#3b82f6" />
                  <Text style={styles.modText}>{mod}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Create Post FAB */}
      {community.isJoined && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/modal/create-post')}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  coverImage: {
    height: 200,
    justifyContent: 'flex-end',
    padding: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  communityAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
    borderWidth: 4,
    borderColor: '#ffffff',
    marginTop: -40,
  },
  headerInfo: {
    flex: 1,
  },
  communityName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  communityHandle: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 8,
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  joinButtonJoined: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginLeft: 6,
  },
  joinButtonTextJoined: {
    color: '#ffffff',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 16,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '500',
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
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
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
  tabContent: {
    minHeight: 400,
  },
  postCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  postHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  postTime: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  postContent: {
    fontSize: 15,
    color: '#1f2937',
    lineHeight: 22,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    gap: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    color: '#6b7280',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  memberHandle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  moderatorBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  moderatorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400e',
  },
  infoSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    color: '#4b5563',
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ruleText: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 8,
  },
  modItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modText: {
    fontSize: 14,
    color: '#4b5563',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});