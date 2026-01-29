/**
 * Messages Screen
 * Chat conversations and messaging
 */

import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMessagesStore } from '../../src/store';
import { messagingService } from '../../src/services';
import NewConversationModal from '../../src/components/NewConversationModal';
import MessageSearchModal from '../../src/components/MessageSearchModal';

export default function MessagesScreen() {
  const conversations = useMessagesStore((state) => state.conversations);
  const loading = useMessagesStore((state) => state.loading);
  const setConversations = useMessagesStore((state) => state.setConversations);
  const setLoading = useMessagesStore((state) => state.setLoading);
  const markAsRead = useMessagesStore((state) => state.markAsRead);
  const addConversation = useMessagesStore((state) => state.addConversation);

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const convos = await messagingService.getConversations();
      setConversations(convos);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length > 2) {
      try {
        const results = await messagingService.searchConversations(query);
        setConversations(results);
      } catch (error) {
        console.error('Search failed:', error);
      }
    } else if (query.length === 0) {
      await loadConversations();
    }
  };

  const handleAdvancedSearch = (filters: any) => {
    setShowSearchModal(false);
    // Implement advanced search logic
    console.log('Advanced search with filters:', filters);
    // Would call messagingService.searchMessages(filters) if available
  };

  const handleConversationPress = async (conversationId: string) => {
    await markAsRead(conversationId);
    router.push(`/messages/${conversationId}`);
  };

  const handleNewConversation = () => {
    setShowNewConversationModal(true);
  };

  const handleConversationCreated = (conversationId: string) => {
    loadConversations();
    router.push(`/messages/${conversationId}`);
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.newChatButton} onPress={handleNewConversation}>
          <Ionicons name="create-outline" size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TouchableOpacity onPress={() => setShowSearchModal(true)} style={styles.searchTrigger}>
            <Ionicons name="search" size={20} color="#9ca3af" />
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            placeholder="Search messages..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={handleSearch}
            onFocus={() => setShowSearchModal(true)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); loadConversations(); }} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Loading State */}
        {loading && conversations.length === 0 && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        )}

        {/* Conversations */}
        {conversations.length > 0 &&
          conversations.map((conversation) => (
            <TouchableOpacity
              key={conversation.id}
              style={styles.conversationCard}
              onPress={() => handleConversationPress(conversation.id)}
            >
              <View style={styles.avatarContainer}>
                <View style={[styles.avatar, conversation.avatar && { backgroundColor: conversation.avatar }]} />
                {conversation.isOnline && <View style={styles.onlineIndicator} />}
                {conversation.isGroup && (
                  <View style={styles.groupIcon}>
                    <Ionicons name="people" size={16} color="#ffffff" />
                  </View>
                )}
              </View>
              <View style={styles.conversationInfo}>
                <View style={styles.conversationHeader}>
                  <Text style={styles.conversationName}>{conversation.name}</Text>
                  <Text style={styles.conversationTime}>{formatTime(conversation.lastMessageTime)}</Text>
                </View>
                <View style={styles.conversationDetails}>
                  <Text
                    style={[
                      styles.lastMessage,
                      conversation.unreadCount > 0 && styles.lastMessageUnread,
                    ]}
                    numberOfLines={1}
                  >
                    {conversation.lastMessage || 'No messages yet'}
                  </Text>
                  {conversation.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{conversation.unreadCount}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}

        {/* Empty State */}
        {!loading && conversations.length === 0 && (
          <View style={styles.centerContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No conversations yet</Text>
            <TouchableOpacity style={styles.startChatButton} onPress={handleNewConversation}>
              <Text style={styles.startChatButtonText}>Start a conversation</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <NewConversationModal
        visible={showNewConversationModal}
        onClose={() => setShowNewConversationModal(false)}
        onConversationCreated={handleConversationCreated}
      />
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
  newChatButton: {
    padding: 4,
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
  conversationCard: {
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
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  groupIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  conversationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  conversationDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  lastMessageUnread: {
    fontWeight: '600',
    color: '#1f2937',
  },
  unreadBadge: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
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
  startChatButton: {
    marginTop: 16,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  startChatButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  searchTrigger: {
    marginRight: 8,
  },
  clearButton: {
    padding: 4,
  },
});