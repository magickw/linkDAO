/**
 * Support Ticket Detail Page
 * Shows ticket details and message history
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supportService, SupportTicket, TicketMessage } from '../../src/services/supportService';
import { THEME } from '../src/constants/theme';

export default function TicketDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  // Load ticket data
  const loadTicketData = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const [ticketData, messagesData] = await Promise.all([
        supportService.getTicket(id),
        supportService.getTicketMessages(id),
      ]);

      setTicket(ticketData);
      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading ticket:', error);
      Alert.alert('Error', 'Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTicketData();
  }, [loadTicketData]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setSending(true);
      const result = await supportService.addMessage(id, newMessage.trim());

      if (result) {
        setNewMessage('');
        await loadTicketData();
      } else {
        Alert.alert('Error', 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!ticket) return;

    Alert.alert(
      'Close Ticket',
      'Are you sure you want to close this ticket? You can reopen it later if needed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await supportService.closeTicket(ticket.id);
              if (result.success) {
                Alert.alert('Success', 'Ticket closed successfully');
                await loadTicketData();
              } else {
                Alert.alert('Error', result.error || 'Failed to close ticket');
              }
            } catch (error) {
              console.error('Error closing ticket:', error);
              Alert.alert('Error', 'Failed to close ticket');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return THEME.colors.info;
      case 'in-progress':
        return THEME.colors.warning;
      case 'resolved':
        return THEME.colors.success;
      case 'closed':
        return THEME.colors.gray;
      default:
        return THEME.colors.gray;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return THEME.colors.error;
      case 'high':
        return THEME.colors.warning;
      case 'medium':
        return THEME.colors.info;
      case 'low':
        return THEME.colors.gray;
      default:
        return THEME.colors.gray;
    }
  };

  const renderMessage = (message: TicketMessage) => {
    const isUser = message.sender === 'user';

    return (
      <View
        key={message.id}
        style={[styles.messageContainer, isUser ? styles.userMessage : styles.supportMessage]}
      >
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.supportBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.supportMessageText]}>
            {message.message}
          </Text>
          <Text style={styles.messageTime}>
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Loading ticket...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!ticket) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={THEME.colors.error} />
          <Text style={styles.errorText}>Ticket not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={THEME.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>{ticket.subject}</Text>
          <Text style={styles.headerSubtitle}>#{ticket.id}</Text>
        </View>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleCloseTicket}
          disabled={ticket.status === 'closed'}
        >
          <Ionicons
            name="close-circle"
            size={24}
            color={ticket.status === 'closed' ? THEME.colors.gray : THEME.colors.error}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.ticketInfo}>
        <View style={styles.infoRow}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(ticket.status) }]}>
              {ticket.status.replace('-', ' ').toUpperCase()}
            </Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(ticket.priority) }]}>
            <Text style={styles.priorityText}>{ticket.priority.toUpperCase()}</Text>
          </View>
          <Text style={styles.categoryText}>{ticket.category.toUpperCase()}</Text>
        </View>
        <Text style={styles.ticketDescription}>{ticket.description}</Text>
      </View>

      <ScrollView style={styles.messagesContainer}>
        {messages.length === 0 ? (
          <View style={styles.emptyMessagesContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color={THEME.colors.gray} />
            <Text style={styles.emptyMessagesText}>No messages yet</Text>
          </View>
        ) : (
          messages.map(renderMessage)
        )}
      </ScrollView>

      {ticket.status !== 'closed' && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.messageInput}
            placeholder="Type a message..."
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, !newMessage.trim() && styles.disabledButton]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={THEME.colors.white} />
            ) : (
              <Ionicons name="send" size={20} color={THEME.colors.white} />
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: THEME.colors.gray,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: THEME.colors.error,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: THEME.colors.white,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: THEME.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: THEME.colors.gray,
  },
  ticketInfo: {
    backgroundColor: THEME.colors.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.white,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.gray,
  },
  ticketDescription: {
    fontSize: 14,
    color: THEME.colors.text,
    lineHeight: 20,
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  emptyMessagesContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyMessagesText: {
    marginTop: 12,
    fontSize: 16,
    color: THEME.colors.gray,
  },
  messageContainer: {
    marginBottom: 12,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  supportMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: THEME.colors.primary,
    borderBottomRightRadius: 4,
  },
  supportBubble: {
    backgroundColor: THEME.colors.gray + '20',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  userMessageText: {
    color: THEME.colors.white,
  },
  supportMessageText: {
    color: THEME.colors.text,
  },
  messageTime: {
    fontSize: 11,
    color: THEME.colors.white + '80',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: THEME.colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  messageInput: {
    flex: 1,
    backgroundColor: THEME.colors.gray + '10',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
    color: THEME.colors.text,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
});