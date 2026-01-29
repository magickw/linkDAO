/**
 * New Conversation Modal
 * Modal for creating direct messages and group chats
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { messagingService } from '../services/messagingService';
import { useMessagesStore } from '../store/messagesStore';

interface NewConversationModalProps {
  visible: boolean;
  onClose: () => void;
  onConversationCreated: (conversationId: string) => void;
}

interface UserSearchResult {
  address: string;
  name?: string;
  avatar?: string;
  ens?: string;
}

type TabType = 'direct' | 'group' | 'join';

export default function NewConversationModal({
  visible,
  onClose,
  onConversationCreated,
}: NewConversationModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('direct');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  
  // Direct message state
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [initialMessage, setInitialMessage] = useState('');
  
  // Group chat state
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<UserSearchResult[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  
  // Join group state
  const [inviteCode, setInviteCode] = useState('');
  
  const [creating, setCreating] = useState(false);
  
  const addContact = useMessagesStore((state) => state.addContact);

  // Search users when query changes
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length < 3) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const results = await messagingService.searchUsers(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleUserSelect = (user: UserSearchResult) => {
    if (activeTab === 'direct') {
      setSelectedUser(user);
    } else if (activeTab === 'group') {
      if (!selectedMembers.find(m => m.address === user.address)) {
        setSelectedMembers([...selectedMembers, user]);
      }
    }
  };

  const handleRemoveMember = (address: string) => {
    setSelectedMembers(selectedMembers.filter(m => m.address !== address));
  };

  const handleCreateDirectMessage = async () => {
    if (!selectedUser) {
      Alert.alert('Error', 'Please select a user');
      return;
    }

    setCreating(true);
    try {
      const conversation = await messagingService.createDirectMessage({
        recipientAddress: selectedUser.address,
        initialMessage: initialMessage || undefined,
      });

      if (conversation) {
        // Add to contacts
        if (selectedUser.name) {
          addContact({
            address: selectedUser.address,
            name: selectedUser.name,
            avatar: selectedUser.avatar,
            ens: selectedUser.ens,
            addedAt: new Date().toISOString(),
          });
        }

        onConversationCreated(conversation.id);
        handleClose();
      } else {
        Alert.alert('Error', 'Failed to create conversation');
      }
    } catch (error) {
      console.error('Failed to create direct message:', error);
      Alert.alert('Error', 'Failed to create conversation');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateGroupChat = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (selectedMembers.length === 0) {
      Alert.alert('Error', 'Please add at least one member');
      return;
    }

    setCreating(true);
    try {
      const group = await messagingService.createGroupChat({
        name: groupName.trim(),
        description: groupDescription.trim() || undefined,
        participantAddresses: selectedMembers.map(m => m.address),
        isPublic,
      });

      if (group) {
        onConversationCreated(group.id);
        handleClose();
      } else {
        Alert.alert('Error', 'Failed to create group');
      }
    } catch (error) {
      console.error('Failed to create group:', error);
      Alert.alert('Error', 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    setCreating(true);
    try {
      const group = await messagingService.joinGroupChat({
        conversationId: inviteCode.trim(),
      });

      if (group) {
        onConversationCreated(group.id);
        handleClose();
      } else {
        Alert.alert('Error', 'Invalid invite code or group not found');
      }
    } catch (error) {
      console.error('Failed to join group:', error);
      Alert.alert('Error', 'Failed to join group');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setActiveTab('direct');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUser(null);
    setInitialMessage('');
    setGroupName('');
    setGroupDescription('');
    setSelectedMembers([]);
    setIsPublic(false);
    setInviteCode('');
    onClose();
  };

  const renderDirectTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by address or name..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
      </View>

      {searching && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}

      {!searching && searchResults.length > 0 && (
        <ScrollView style={styles.resultsContainer}>
          {searchResults.map((user) => (
            <TouchableOpacity
              key={user.address}
              style={[
                styles.userItem,
                selectedUser?.address === user.address && styles.selectedUserItem,
              ]}
              onPress={() => handleUserSelect(user)}
            >
              <View style={[styles.avatar, { backgroundColor: user.avatar || '#3b82f6' }]} />
              <View style={styles.userInfo}>
                <Text style={styles.handle}>
                  {user.name || user.ens || `${user.address.slice(0, 6)}...${user.address.slice(-4)}`}
                </Text>
                <Text style={styles.userAddress}>{user.address}</Text>
              </View>
              {selectedUser?.address === user.address && (
                <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {selectedUser && (
        <View style={styles.initialMessageContainer}>
          <TextInput
            style={styles.initialMessageInput}
            placeholder="Write a message (optional)..."
            placeholderTextColor="#9ca3af"
            value={initialMessage}
            onChangeText={setInitialMessage}
            multiline
          />
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.createButton,
          (!selectedUser || creating) && styles.disabledButton,
        ]}
        onPress={handleCreateDirectMessage}
        disabled={!selectedUser || creating}
      >
        {creating ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.createButtonText}>Start Chat</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderGroupTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Group Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter group name"
          placeholderTextColor="#9ca3af"
          value={groupName}
          onChangeText={setGroupName}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="What's this group about?"
          placeholderTextColor="#9ca3af"
          value={groupDescription}
          onChangeText={setGroupDescription}
          multiline
        />
      </View>

      <View style={styles.formGroup}>
        <View style={styles.toggleContainer}>
          <Text style={styles.label}>Public Group</Text>
          <TouchableOpacity
            style={[styles.toggle, isPublic && styles.toggleActive]}
            onPress={() => setIsPublic(!isPublic)}
          >
            <View style={[styles.toggleKnob, isPublic && styles.toggleKnobActive]} />
          </TouchableOpacity>
        </View>
        <Text style={styles.helperText}>
          {isPublic ? 'Anyone can find and join this group' : 'Only invited members can join'}
        </Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Add Members *</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
        </View>
      </View>

      {selectedMembers.length > 0 && (
        <View style={styles.selectedMembersContainer}>
          <Text style={styles.membersLabel}>Selected Members ({selectedMembers.length})</Text>
          <ScrollView horizontal style={styles.membersList}>
            {selectedMembers.map((member) => (
              <TouchableOpacity
                key={member.address}
                style={styles.memberChip}
                onPress={() => handleRemoveMember(member.address)}
              >
                <Text style={styles.memberName}>
                  {member.name || member.ens || `${member.address.slice(0, 6)}...`}
                </Text>
                <Ionicons name="close-circle" size={20} color="#ef4444" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {!searching && searchResults.length > 0 && (
        <ScrollView style={styles.resultsContainer}>
          {searchResults
            .filter(user => !selectedMembers.find(m => m.address === user.address))
            .map((user) => (
              <TouchableOpacity
                key={user.address}
                style={styles.userItem}
                onPress={() => handleUserSelect(user)}
              >
                <View style={[styles.avatar, { backgroundColor: user.avatar || '#3b82f6' }]} />
                <View style={styles.userInfo}>
                  <Text style={styles.handle}>
                    {user.name || user.ens || `${user.address.slice(0, 6)}...${user.address.slice(-4)}`}
                  </Text>
                  <Text style={styles.userAddress}>{user.address}</Text>
                </View>
                <Ionicons name="add-circle" size={24} color="#3b82f6" />
              </TouchableOpacity>
            ))}
        </ScrollView>
      )}

      <TouchableOpacity
        style={[
          styles.createButton,
          (!groupName.trim() || selectedMembers.length === 0 || creating) && styles.disabledButton,
        ]}
        onPress={handleCreateGroupChat}
        disabled={!groupName.trim() || selectedMembers.length === 0 || creating}
      >
        {creating ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.createButtonText}>Create Group</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderJoinTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Invite Code *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter invite code"
          placeholderTextColor="#9ca3af"
          value={inviteCode}
          onChangeText={setInviteCode}
          autoCapitalize="characters"
        />
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color="#3b82f6" />
        <Text style={styles.infoText}>
          Enter the invite code shared by the group admin to join the group.
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.createButton,
          (!inviteCode.trim() || creating) && styles.disabledButton,
        ]}
        onPress={handleJoinGroup}
        disabled={!inviteCode.trim() || creating}
      >
        {creating ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.createButtonText}>Join Group</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>New Conversation</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#1f2937" />
            </TouchableOpacity>
          </View>

          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'direct' && styles.activeTab]}
              onPress={() => setActiveTab('direct')}
            >
              <Ionicons
                name="person"
                size={20}
                color={activeTab === 'direct' ? '#3b82f6' : '#6b7280'}
              />
              <Text style={[styles.tabText, activeTab === 'direct' && styles.activeTabText]}>
                Direct
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'group' && styles.activeTab]}
              onPress={() => setActiveTab('group')}
            >
              <Ionicons
                name="people"
                size={20}
                color={activeTab === 'group' ? '#3b82f6' : '#6b7280'}
              />
              <Text style={[styles.tabText, activeTab === 'group' && styles.activeTabText]}>
                Group
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'join' && styles.activeTab]}
              onPress={() => setActiveTab('join')}
            >
              <Ionicons
                name="log-in"
                size={20}
                color={activeTab === 'join' ? '#3b82f6' : '#6b7280'}
              />
              <Text style={[styles.tabText, activeTab === 'join' && styles.activeTabText]}>
                Join
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {activeTab === 'direct' && renderDirectTab()}
            {activeTab === 'group' && renderGroupTab()}
            {activeTab === 'join' && renderJoinTab()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#3b82f6',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  centerContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  resultsContainer: {
    maxHeight: 200,
    marginBottom: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 8,
  },
  selectedUserItem: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  handle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  userAddress: {
    fontSize: 12,
    color: '#6b7280',
  },
  initialMessageContainer: {
    marginBottom: 16,
  },
  initialMessageInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1f2937',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggle: {
    width: 48,
    height: 28,
    backgroundColor: '#e5e7eb',
    borderRadius: 14,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#3b82f6',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  selectedMembersContainer: {
    marginBottom: 16,
  },
  membersLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  membersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  memberName: {
    fontSize: 13,
    color: '#1f2937',
    marginRight: 4,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    marginLeft: 8,
  },
  createButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});