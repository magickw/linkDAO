/**
 * Communities Screen
 * Browse and manage communities
 */

import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCommunitiesStore } from '../../src/store';
import { communitiesService } from '../../src/services';

export default function CommunitiesScreen() {
  const communities = useCommunitiesStore((state) => state.communities);
  const featuredCommunities = useCommunitiesStore((state) => state.featuredCommunities);
  const loading = useCommunitiesStore((state) => state.loading);
  const setCommunities = useCommunitiesStore((state) => state.setCommunities);
  const setFeaturedCommunities = useCommunitiesStore((state) => state.setFeaturedCommunities);
  const setLoading = useCommunitiesStore((state) => state.setLoading);
  const joinCommunity = useCommunitiesStore((state) => state.joinCommunity);
  const leaveCommunity = useCommunitiesStore((state) => state.leaveCommunity);

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    setLoading(true);
    try {
      const [allCommunities, featured] = await Promise.all([
        communitiesService.getCommunities(),
        communitiesService.getFeaturedCommunities(),
      ]);
      setCommunities(allCommunities);
      setFeaturedCommunities(featured);
    } catch (error) {
      console.error('Failed to load communities:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCommunities();
    setRefreshing(false);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length > 2) {
      try {
        const results = await communitiesService.searchCommunities(query);
        setCommunities(results);
      } catch (error) {
        console.error('Search failed:', error);
      }
    } else if (query.length === 0) {
      await loadCommunities();
    }
  };

  const handleJoinToggle = async (communityId: string, isJoined: boolean) => {
    try {
      if (isJoined) {
        await communitiesService.leaveCommunity(communityId);
        leaveCommunity(communityId);
      } else {
        await communitiesService.joinCommunity(communityId);
        joinCommunity(communityId);
      }
    } catch (error) {
      console.error('Failed to toggle join:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Communities</Text>
        <TouchableOpacity style={styles.createButton}>
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search communities..."
          placeholderTextColor="#9ca3af"
        />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
      >
        {/* Loading State */}
        {loading && communities.length === 0 && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading communities...</Text>
          </View>
        )}

        {/* Featured Communities */}
        {!loading && featuredCommunities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Featured</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredScroll}>
              {featuredCommunities.map((community) => (
                <TouchableOpacity
                  key={community.id}
                  style={styles.featuredCard}
                  onPress={() => router.push(`/community/${community.id}`)}
                >
                  <View style={[styles.featuredAvatar, community.avatar && { backgroundColor: community.avatar }]} />
                  <Text style={styles.featuredName}>{community.name}</Text>
                  <Text style={styles.featuredMembers}>{community.members.toLocaleString()} members</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* All Communities */}
        {!loading && communities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All Communities</Text>
            {communities.map((community) => (
              <TouchableOpacity
                key={community.id}
                style={styles.communityCard}
                onPress={() => router.push(`/community/${community.id}`)}
              >
                <View style={[styles.avatar, community.avatar && { backgroundColor: community.avatar }]} />
                <View style={styles.communityInfo}>
                  <Text style={styles.communityName}>{community.name}</Text>
                  <Text style={styles.communityStats}>
                    {community.members.toLocaleString()} members • {community.posts} posts
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.joinButton, community.isJoined && styles.joinButtonJoined]}
                  onPress={() => handleJoinToggle(community.id, community.isJoined)}
                >
                  <Text style={[styles.joinButtonText, community.isJoined && styles.joinButtonTextJoined]}>
                    {community.isJoined ? 'Joined' : 'Join'}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty State */}
        {!loading && communities.length === 0 && (
          <View style={styles.centerContainer}>
            <Ionicons name="people-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No communities found</Text>
            <Text style={styles.emptySubtext}>Try a different search term</Text>
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
    color: '#1f2937',
  },
  createButton: {
    backgroundColor: '#3b82f6',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  featuredScroll: {
    paddingHorizontal: 16,
  },
  featuredCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 5,
  },
  featuredAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 12,
  },
  featuredName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  featuredMembers: {
    fontSize: 14,
    color: '#6b7280',
  },
  communityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 5,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  communityInfo: {
    flex: 1,
  },
  communityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  communityStats: {
    fontSize: 14,
    color: '#6b7280',
  },
  joinButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinButtonJoined: {
    backgroundColor: '#e5e7eb',
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  joinButtonTextJoined: {
    color: '#6b7280',
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