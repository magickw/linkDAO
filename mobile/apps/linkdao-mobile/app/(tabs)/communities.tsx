/**
 * Communities Screen
 * Browse and manage communities with enhanced social features
 */

import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCommunitiesStore, useNotificationStore } from '../../src/store';
import { communitiesService } from '../../src/services/communitiesService';
import { notificationService } from '../../src/services/notificationService';
import CreateCommunityModal from '../../src/components/CreateCommunityModal';
import { CrossChainBridge } from '../../src/components/CrossChainBridge';

interface Community {
  id: string;
  name: string;
  avatar?: string;
  members: number;
  posts: number;
  isJoined: boolean;
  isPublic: boolean;
  description?: string;
  lastActivity?: string;
  tags?: string[];
}

interface Activity {
  id: string;
  type: 'post' | 'join' | 'mention';
  communityName: string;
  message: string;
  time: string;
  unread: boolean;
}

export default function CommunitiesScreen() {
  const communities = useCommunitiesStore((state) => state.communities);
  const featuredCommunities = useCommunitiesStore((state) => state.featuredCommunities);
  const loading = useCommunitiesStore((state) => state.loading);
  const setCommunities = useCommunitiesStore((state) => state.setCommunities);
  const setFeaturedCommunities = useCommunitiesStore((state) => state.setFeaturedCommunities);
  const setLoading = useCommunitiesStore((state) => state.setLoading);
  const joinCommunity = useCommunitiesStore((state) => state.joinCommunity);
  const leaveCommunity = useCommunitiesStore((state) => state.leaveCommunity);

  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications);
  const markAllAsReadOnServer = useNotificationStore((state) => state.markAllAsReadOnServer);

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBridge, setShowBridge] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'discover' | 'my-communities'>('discover');

  useEffect(() => {
    loadCommunities();
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      await fetchNotifications();
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

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
    await Promise.all([loadCommunities(), loadNotifications()]);
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

  const myCommunities = communities.filter(c => c.isJoined);
  const discoverCommunities = communities.filter(c => !c.isJoined);

  const displayedCommunities = selectedTab === 'my-communities' ? myCommunities : discoverCommunities;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Communities</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={() => setShowBridge(true)}
          >
            <Ionicons name="git-network-outline" size={24} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => setShowNotifications(true)}
          >
            <Ionicons name="notifications-outline" size={24} color="#1f2937" />
            {unreadCount > 0 && <View style={styles.notificationBadge} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search communities..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'discover' && styles.tabActive]}
            onPress={() => setSelectedTab('discover')}
          >
            <Text style={[styles.tabText, selectedTab === 'discover' && styles.tabTextActive]}>
              Discover
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'my-communities' && styles.tabActive]}
            onPress={() => setSelectedTab('my-communities')}
          >
            <Text style={[styles.tabText, selectedTab === 'my-communities' && styles.tabTextActive]}>
              My Communities
            </Text>
            {myCommunities.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{myCommunities.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        {/* Loading State */}
        {loading && communities.length === 0 && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading communities...</Text>
          </View>
        )}

        {/* Featured Communities (only in Discover tab) */}
        {!loading && selectedTab === 'discover' && featuredCommunities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Featured</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredScroll}>
              {featuredCommunities.map((community: Community) => (
                <TouchableOpacity
                  key={community.id}
                  style={styles.featuredCard}
                  onPress={() => router.push(`/community/${community.id}`)}
                >
                  <View style={[styles.featuredAvatar, community.avatar ? { backgroundColor: community.avatar } : { backgroundColor: '#e5e7eb' }]} />
                  <Text style={styles.featuredName}>{community.name}</Text>
                  <Text style={styles.featuredMembers}>{community.members.toLocaleString()} members</Text>
                  {!community.isPublic && (
                    <View style={styles.privateBadge}>
                      <Ionicons name="lock-closed" size={12} color="#ffffff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Communities List */}
        {!loading && displayedCommunities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {selectedTab === 'my-communities' ? 'Your Communities' : 'All Communities'}
            </Text>
            {displayedCommunities.map((community: Community) => (
              <TouchableOpacity
                key={community.id}
                style={styles.communityCard}
                onPress={() => router.push(`/community/${community.id}`)}
              >
                <View style={[styles.avatar, community.avatar ? { backgroundColor: community.avatar } : { backgroundColor: '#e5e7eb' }]} />
                <View style={styles.communityInfo}>
                  <View style={styles.communityHeader}>
                    <Text style={styles.communityName}>{community.name}</Text>
                    {!community.isPublic && (
                      <Ionicons name="lock-closed" size={14} color="#6b7280" />
                    )}
                  </View>
                  {community.description && (
                    <Text style={styles.communityDescription} numberOfLines={1}>
                      {community.description}
                    </Text>
                  )}
                  <View style={styles.communityStats}>
                    <Text style={styles.statText}>{community.members.toLocaleString()} members</Text>
                    <Text style={styles.statSeparator}>•</Text>
                    <Text style={styles.statText}>{community.posts} posts</Text>
                    {community.lastActivity && (
                      <>
                        <Text style={styles.statSeparator}>•</Text>
                        <Text style={styles.statText}>{community.lastActivity}</Text>
                      </>
                    )}
                  </View>
                  {community.tags && community.tags.length > 0 && (
                    <View style={styles.tagsContainer}>
                      {community.tags.slice(0, 3).map((tag, index) => (
                        <View key={index} style={styles.tag}>
                          <Text style={styles.tagText}>#{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
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
        {!loading && displayedCommunities.length === 0 && (
          <View style={styles.centerContainer}>
            <Ionicons
              name={selectedTab === 'my-communities' ? 'people-outline' : 'search-outline'}
              size={64}
              color="#9ca3af"
            />
            <Text style={styles.emptyText}>
              {selectedTab === 'my-communities' ? 'No communities yet' : 'No communities found'}
            </Text>
            <Text style={styles.emptySubtext}>
              {selectedTab === 'my-communities'
                ? 'Join communities to see them here'
                : 'Try a different search term'}
            </Text>
            {selectedTab === 'my-communities' && (
              <TouchableOpacity
                style={styles.discoverButton}
                onPress={() => setSelectedTab('discover')}
              >
                <Text style={styles.discoverButtonText}>Discover Communities</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Create Community Modal */}
      <CreateCommunityModal
        visible={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          loadCommunities(); // Refresh communities list
        }}
      />

      {/* Cross-Chain Bridge Modal */}
      <Modal
        visible={showBridge}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBridge(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cross-Chain Bridge</Text>
              <TouchableOpacity onPress={() => setShowBridge(false)}>
                <Ionicons name="close" size={24} color="#1f2937" />
              </TouchableOpacity>
            </View>
            <CrossChainBridge />
          </View>
        </View>
      </Modal>

      {/* Notifications Modal */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)}>
                <Ionicons name="close" size={24} color="#1f2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.notificationsList}>
              {notifications.map((notification) => (
                <TouchableOpacity key={notification.id} style={styles.notificationItem}>
                  <View style={[styles.notificationIcon, !notification.read && styles.notificationIconUnread]}>
                    <Ionicons
                      name={
                        notification.type === 'mention' ? 'at-outline' :
                          notification.type === 'post' ? 'chatbubble-outline' :
                            'people-outline'
                      }
                      size={20}
                      color={!notification.read ? '#ffffff' : '#3b82f6'}
                    />
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationCommunity}>{notification.communityName || 'System'}</Text>
                    <Text style={styles.notificationMessage}>{notification.message}</Text>
                    <Text style={styles.notificationTime}>{new Date(notification.createdAt).toLocaleDateString()}</Text>
                  </View>
                  {!notification.read && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              ))}
              {notifications.length === 0 && (
                <View style={styles.centerContainer}>
                  <Text style={styles.emptyText}>No notifications</Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.markAllReadButton}
              onPress={async () => {
                try {
                  await markAllAsReadOnServer();
                } catch (e) {
                  console.error(e);
                }
              }}
            >
              <Text style={styles.markAllReadText}>Mark all as read</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActionButton: {
    padding: 4,
  },
  notificationButton: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    position: 'relative',
  },
  tabActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  tabBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
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
    position: 'relative',
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
  privateBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(107, 114, 128, 0.9)',
    borderRadius: 12,
    padding: 4,
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
  communityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  communityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  communityDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  communityStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statText: {
    fontSize: 14,
    color: '#6b7280',
  },
  statSeparator: {
    fontSize: 14,
    color: '#d1d5db',
    marginHorizontal: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#3b82f6',
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
    textAlign: 'center',
  },
  discoverButton: {
    marginTop: 16,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  discoverButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationIconUnread: {
    backgroundColor: '#3b82f6',
  },
  notificationContent: {
    flex: 1,
  },
  notificationCommunity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  markAllReadButton: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  markAllReadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    textAlign: 'center',
  },
});