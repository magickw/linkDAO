/**
 * Chat Interface Screen
 * Real-time messaging interface for conversations
 */

import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store';
import { messagingService } from '../../src/services';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: string;
  read: boolean;
  replyToId?: string;
  replyTo?: {
    senderName?: string;
    content?: string;
    fromAddress?: string;
  };
  quotedMessageId?: string;
  metadata?: {
    quotedMessageId?: string;
    [key: string]: any;
  };
  attachments?: Array<{
    type: 'image' | 'file' | 'nft' | 'transaction';
    url: string;
    name?: string;
    preview?: string;
    metadata?: any;
  }>;
  reactions?: Array<{
    emoji: string;
    count: number;
    users: string[];
  }>;
}

export default function ChatInterfaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

  // Mock conversation data
  const conversation = {
    id: id || '1',
    name: 'Alice Johnson',
    avatar: '#3b82f6',
    online: true,
    lastSeen: 'Online',
  };

  useEffect(() => {
    loadMessages();
  }, [id]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      // In production, fetch from API
      const loadedMessages = await messagingService.getMessages(conversation.id);
      setMessages(loadedMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      // Optimistic update
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId: conversation.id,
        senderId: user?.id || 'me',
        content: messageContent,
        timestamp: new Date().toISOString(),
        read: false,
      };

      setMessages([...messages, tempMessage]);

      // Send message
      await messagingService.sendMessage(conversation.id, messageContent);

      // Reload messages to get the real message
      await loadMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const isMyMessage = (message: Message) => {
    return message.senderId === user?.id;
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await messagingService.addReaction(messageId, emoji);
      await loadMessages();
      setShowReactionPicker(null);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const handleEditMessage = (message: Message) => {
    setEditingMessageId(message.id);
    setEditText(message.content);
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editText.trim()) return;

    try {
      await messagingService.editMessage(editingMessageId, editText.trim());
      await loadMessages();
      setEditingMessageId(null);
      setEditText('');
    } catch (error) {
      console.error('Failed to edit message:', error);
      Alert.alert('Error', 'Failed to edit message');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const handleDeleteMessage = async (messageId: string) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await messagingService.deleteMessage(messageId);
              await loadMessages();
            } catch (error) {
              console.error('Failed to delete message:', error);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={[styles.avatar, { backgroundColor: conversation.avatar }]} />
            <View style={styles.headerInfo}>
              <Text style={styles.headerName}>{conversation.name}</Text>
              <Text style={styles.headerStatus}>{conversation.lastSeen}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="ellipsis-vertical" size={24} color="#1f2937" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: conversation.avatar }]} />
            {conversation.online && <View style={styles.onlineIndicator} />}
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{conversation.name}</Text>
            <Text style={styles.headerStatus}>{conversation.lastSeen}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="ellipsis-vertical" size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyText}>
              Start the conversation by sending a message
            </Text>
          </View>
        ) : (
          messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageWrapper,
                isMyMessage(message) ? styles.messageWrapperMe : styles.messageWrapperOther,
              ]}
            >
              <TouchableOpacity
                onLongPress={() => {
                  if (isMyMessage(message)) {
                    Alert.alert(
                      'Message Options',
                      'What would you like to do?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Edit', onPress: () => handleEditMessage(message) },
                        { text: 'Delete', style: 'destructive', onPress: () => handleDeleteMessage(message.id) }
                      ]
                    );
                  } else {
                    setShowReactionPicker(message.id);
                  }
                }}
                activeOpacity={1}
              >
                <View
                  style={[
                    styles.messageBubble,
                    isMyMessage(message) ? styles.messageBubbleMe : styles.messageBubbleOther,
                  ]}
                >
                  {/* Reply Reference */}
                  {message.replyToId && (
                    <View style={[
                      styles.replyContainer,
                      isMyMessage(message) ? styles.replyContainerMe : styles.replyContainerOther
                    ]}>
                      <View style={styles.replyBar} />
                      <View style={styles.replyContent}>
                        <Text style={[styles.replyAuthor, isMyMessage(message) && styles.replyTextMe]}>
                          Replying to {message.replyTo?.senderName || 'Original message'}
                        </Text>
                        <Text style={[styles.replyBody, isMyMessage(message) && styles.replyTextMe]} numberOfLines={1}>
                          {message.replyTo?.content || 'Original message...'}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Quote Reference */}
                  {(message.quotedMessageId || message.metadata?.quotedMessageId) && (
                    <View style={[
                      styles.quoteContainer,
                      isMyMessage(message) ? styles.quoteContainerMe : styles.quoteContainerOther
                    ]}>
                      <Text style={[styles.quoteText, isMyMessage(message) && styles.replyTextMe]}>
                        "{message.content.split('\n')[0]}..."
                      </Text>
                    </View>
                  )}

                  {/* Image Attachments */}
                  {message.attachments && message.attachments.filter(a => a.type === 'image').map((attachment, idx) => (
                    <View key={idx} style={styles.imageAttachmentContainer}>
                      <View style={styles.imagePlaceholder}>
                        <Ionicons name="image-outline" size={24} color="#9ca3af" />
                      </View>
                    </View>
                  ))}

                  {/* Edit Mode */}
                  {editingMessageId === message.id ? (
                    <TextInput
                      style={[
                        styles.editInput,
                        isMyMessage(message) ? styles.editInputMe : styles.editInputOther
                      ]}
                      value={editText}
                      onChangeText={setEditText}
                      multiline
                      autoFocus
                    />
                  ) : (
                    <Text
                      style={[
                        styles.messageText,
                        isMyMessage(message) ? styles.messageTextMe : styles.messageTextOther,
                      ]}
                    >
                      {message.content}
                    </Text>
                  )}

                  <Text
                    style={[
                      styles.messageTime,
                      isMyMessage(message) ? styles.messageTimeMe : styles.messageTimeOther,
                    ]}
                  >
                    {formatTime(message.timestamp)}
                  </Text>

                  {/* Edit Actions */}
                  {editingMessageId === message.id && (
                    <View style={styles.editActions}>
                      <TouchableOpacity
                        style={styles.editCancelButton}
                        onPress={handleCancelEdit}
                      >
                        <Text style={styles.editCancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.editSaveButton}
                        onPress={handleSaveEdit}
                      >
                        <Text style={styles.editSaveButtonText}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {/* Reactions */}
              {message.reactions && message.reactions.length > 0 && (
                <View style={[
                  styles.reactionsContainer,
                  isMyMessage(message) ? styles.reactionsContainerMe : styles.reactionsContainerOther
                ]}>
                  {message.reactions.map((reaction, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.reactionChip}
                      onPress={() => handleReaction(message.id, reaction.emoji)}
                    >
                      <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                      <Text style={styles.reactionCount}>{reaction.count}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="add-circle-outline" size={28} color="#6b7280" />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#9ca3af"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={1000}
          />

          {newMessage.trim() ? (
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendMessage}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="send" size={20} color="#ffffff" />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.emojiButton}>
              <Ionicons name="happy-outline" size={24} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Reaction Picker Modal */}
      <Modal
        visible={showReactionPicker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReactionPicker(null)}
      >
        <TouchableOpacity
          style={styles.reactionModalOverlay}
          activeOpacity={1}
          onPress={() => setShowReactionPicker(null)}
        >
          <View style={styles.reactionPickerContainer}>
            <View style={styles.reactionPickerHeader}>
              <Text style={styles.reactionPickerTitle}>React</Text>
            </View>
            <View style={styles.reactionPickerGrid}>
              {REACTIONS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.reactionButton}
                  onPress={() => showReactionPicker && handleReaction(showReactionPicker, emoji)}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 10,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  headerStatus: {
    fontSize: 13,
    color: '#6b7280',
  },
  headerButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
  },
  messageWrapper: {
    marginBottom: 12,
  },
  messageWrapperMe: {
    alignItems: 'flex-end',
  },
  messageWrapperOther: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  messageBubbleMe: {
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: '#f3f4f6',
    borderBottomLeftRadius: 4,
  },
  replyContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  replyContainerMe: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  replyContainerOther: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  replyBar: {
    width: 4,
    backgroundColor: '#3b82f6',
  },
  replyContent: {
    padding: 8,
    flex: 1,
  },
  replyAuthor: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 2,
  },
  replyBody: {
    fontSize: 12,
    color: '#4b5563',
    fontStyle: 'italic',
  },
  replyTextMe: {
    color: '#ffffff',
  },
  quoteContainer: {
    borderLeftWidth: 3,
    borderLeftColor: '#d1d5db',
    paddingLeft: 8,
    marginBottom: 8,
  },
  quoteContainerMe: {
    borderLeftColor: 'rgba(255, 255, 255, 0.5)',
  },
  quoteText: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  imageAttachmentContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#e5e7eb',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  messageTextMe: {
    color: '#ffffff',
  },
  messageTextOther: {
    color: '#1f2937',
  },
  messageTime: {
    fontSize: 11,
  },
  messageTimeMe: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'right',
  },
  messageTimeOther: {
    color: '#9ca3af',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1f2937',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  emojiButton: {
    padding: 8,
    marginLeft: 8,
  },
  reactionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionPickerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    width: 280,
  },
  reactionPickerHeader: {
    marginBottom: 12,
  },
  reactionPickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  reactionPickerGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  reactionButton: {
    padding: 12,
  },
  reactionEmoji: {
    fontSize: 32,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  reactionsContainerMe: {
    alignSelf: 'flex-end',
  },
  reactionsContainerOther: {
    alignSelf: 'flex-start',
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  editInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    minHeight: 40,
  },
  editInputMe: {
    color: '#ffffff',
  },
  editInputOther: {
    color: '#1f2937',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  editCancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  editSaveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
  },
  editSaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});