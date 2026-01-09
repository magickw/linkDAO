/**
 * Full Chat Page
 * Discord/Slack style messaging interface with all chat functionalities
 * Migrated from FloatingChatWidget for better user experience
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, X, Send, Plus, Search, MoreVertical,
  User, Hash, Users, ChevronDown, ChevronRight,
  Settings, ArrowLeft, Loader2, AlertCircle, Wifi, WifiOff,
  Wallet, Lock, Globe
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { useChatHistory } from '@/hooks/useChatHistory';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import useENSIntegration from '@/hooks/useENSIntegration';
import { Conversation, Message } from '@/types/messaging';
import { Contact } from '@/types/contacts';
import notificationService from '@/services/notificationService';
import { useContacts } from '@/contexts/ContactContext';
import ContactList from '@/components/Messaging/Contacts/ContactList';
import AddContactModal from '@/components/Messaging/Contacts/AddContactModal';
import EditContactModal from '@/components/Messaging/Contacts/EditContactModal';
import DiscordStyleMessagingInterface from '@/components/Messaging/DiscordStyleMessagingInterface';
import { OnlineStatus } from '@/components/Messaging/MessageStatusComponents';
import { useAuth } from '@/context/AuthContext';

// Channel categories for organization (matching screenshot design)
interface ChannelCategory {
  id: string;
  name: string;
  isCollapsed: boolean;
}

export default function ChatPage() {
  const router = useRouter();
  const { walletInfo } = useWalletAuth();
  const { address, isConnected } = useAccount();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isMobile } = useMobileOptimization();
  const { resolveName } = useENSIntegration();

  // UI State
  const [activeView, setActiveView] = useState<'list' | 'chat'>('list');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [newRecipientAddress, setNewRecipientAddress] = useState('');
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [pendingContact, setPendingContact] = useState<Contact | null>(null);
  const [showRightSidebar, setShowRightSidebar] = useState(true);

  // Channel categories state (matching screenshot design)
  const [channelCategories, setChannelCategories] = useState<ChannelCategory[]>([
    { id: 'direct', name: 'Direct Messages', isCollapsed: false },
    { id: 'public', name: 'Public Channels', isCollapsed: false },
    { id: 'private', name: 'Private Channels', isCollapsed: false },
    { id: 'gated', name: 'Gated Channels', isCollapsed: false }
  ]);

  // Chat history hook
  const {
    conversations: hookConversations,
    loading: conversationsLoading,
    error: conversationsError,
    loadConversations,
    sendMessage: sendChatMessage,
    markAsRead
  } = useChatHistory();

  // Online status and typing indicators
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Map<string, string[]>>(new Map());
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  // WebSocket integration
  const {
    connectionState,
    isConnected: isWebSocketConnected,
    joinConversation,
    leaveConversation,
    on,
    off
  } = useWebSocket({
    walletAddress: address || '',
    autoConnect: true
  });

  // Calculate unread messages
  useEffect(() => {
    if (!hookConversations || !address) {
      setUnreadCount(0);
      return;
    }

    const total = hookConversations.reduce((sum, conv) => {
      return sum + (conv.unreadCounts?.[address] || 0);
    }, 0);

    setUnreadCount(total);
  }, [hookConversations, address]);

  // Load conversations on mount
  useEffect(() => {
    if (address && isAuthenticated) {
      loadConversations();
    }
  }, [address, isAuthenticated, loadConversations]);

  // WebSocket message handling
  useEffect(() => {
    if (!isWebSocketConnected || !address) return;

    const handleNewMessage = (message: Message) => {
      setHasNewMessage(true);
      loadConversations();

      // Show browser notification
      if (document.hidden) {
        const conversation = hookConversations?.find(conv => conv.id === message.conversationId);
        const toAddress = conversation
          ? conversation.participants.find(p => p !== message.fromAddress) || ''
          : '';

        notificationService.showMessageNotification({
          id: message.id,
          fromAddress: message.fromAddress,
          toAddress: toAddress,
          content: message.content,
          messageType: message.contentType,
          timestamp: message.timestamp,
          conversationId: message.conversationId
        });
      }

      setTimeout(() => setHasNewMessage(false), 3000);
    };

    const handleConversationUpdate = () => {
      loadConversations();
    };

    const handleUserOnline = (data: { userAddress: string }) => {
      setOnlineUsers(prev => new Set(prev).add(data.userAddress));
    };

    const handleUserOffline = (data: { userAddress: string }) => {
      setOnlineUsers(prev => {
        const updated = new Set(prev);
        updated.delete(data.userAddress);
        return updated;
      });
    };

    const handleUserTyping = (data: { userAddress: string; conversationId: string }) => {
      setTypingUsers(prev => {
        const updated = new Map(prev);
        const conversationTyping = updated.get(data.conversationId) || [];
        if (!conversationTyping.includes(data.userAddress)) {
          updated.set(data.conversationId, [...conversationTyping, data.userAddress]);
        }
        return updated;
      });

      setTimeout(() => {
        setTypingUsers(prev => {
          const updated = new Map(prev);
          const conversationTyping = (updated.get(data.conversationId) || [])
            .filter(addr => addr !== data.userAddress);
          if (conversationTyping.length > 0) {
            updated.set(data.conversationId, conversationTyping);
          } else {
            updated.delete(data.conversationId);
          }
          return updated;
        });
      }, 3000);
    };

    const handleUserStoppedTyping = (data: { userAddress: string; conversationId: string }) => {
      setTypingUsers(prev => {
        const updated = new Map(prev);
        const conversationTyping = (updated.get(data.conversationId) || [])
          .filter(addr => addr !== data.userAddress);
        if (conversationTyping.length > 0) {
          updated.set(data.conversationId, conversationTyping);
        } else {
          updated.delete(data.conversationId);
        }
        return updated;
      });
    };

    on('new_message', handleNewMessage);
    on('conversation_updated', handleConversationUpdate);
    on('user_online', handleUserOnline);
    on('user_offline', handleUserOffline);
    on('user_typing', handleUserTyping);
    on('user_stopped_typing', handleUserStoppedTyping);

    return () => {
      off('new_message', handleNewMessage);
      off('conversation_updated', handleConversationUpdate);
      off('user_online', handleUserOnline);
      off('user_offline', handleUserOffline);
      off('user_typing', handleUserTyping);
      off('user_stopped_typing', handleUserStoppedTyping);
    };
  }, [isWebSocketConnected, hookConversations, address, loadConversations, on, off]);

  // Contact context integration
  const { setOnStartChat } = useContacts();

  useEffect(() => {
    const handleStartChat = (contact: Contact) => {
      if (contact && contact.walletAddress) {
        setPendingContact(contact);
      }
    };

    setOnStartChat(handleStartChat);
    return () => setOnStartChat(null);
  }, [setOnStartChat]);

  // Handle pending contact
  useEffect(() => {
    if (pendingContact && address && hookConversations) {
      const normalizedContactAddress = pendingContact.walletAddress.toLowerCase();
      const existingConversation = hookConversations.find(conv =>
        conv.participants.some(participant => participant.toLowerCase() === normalizedContactAddress)
      );

      if (existingConversation) {
        handleConversationSelect(existingConversation);
      } else {
        setNewRecipientAddress(pendingContact.walletAddress);
        startNewConversation(pendingContact.walletAddress);
      }

      setPendingContact(null);
    }
  }, [pendingContact, address, hookConversations]);

  const handleConversationSelect = async (conversation: Conversation) => {
    if (isWebSocketConnected && selectedConversation?.id && selectedConversation.id !== conversation.id) {
      leaveConversation(selectedConversation.id);
    }

    setSelectedConversation(conversation);
    setActiveView('chat');

    if (isWebSocketConnected && conversation.id) {
      joinConversation(conversation.id);
    }

    if (address && conversation.unreadCounts?.[address] > 0) {
      try {
        await markAsRead(conversation.id, []);
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }
  };

  const handleBackToList = () => {
    if (isWebSocketConnected && selectedConversation?.id) {
      leaveConversation(selectedConversation.id);
    }
    setSelectedConversation(null);
    setActiveView('list');
  };

  const startNewConversation = async (recipientAddress?: string) => {
    const recipient = (recipientAddress ?? newRecipientAddress ?? '').trim();

    if (!recipient || !address) {
      alert('Please enter a valid wallet address');
      return;
    }

    if (!recipient.startsWith('0x') || recipient.length !== 42) {
      if (!recipient.endsWith('.eth')) {
        alert('Please enter a valid Ethereum address (0x...) or ENS name (.eth)');
        return;
      }
    }

    setIsCreatingConversation(true);
    try {
      const token = localStorage.getItem('linkdao_access_token') ||
        localStorage.getItem('authToken') ||
        localStorage.getItem('token');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/messaging/conversations', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          participantAddress: recipient,
          initialMessage: "Hello! Let's start chatting.",
          conversationType: 'direct'
        }),
      });

      if (response.ok) {
        const newConversation = await response.json();
        setSelectedConversation(newConversation);
        setActiveView('chat');
        setShowNewConversationModal(false);
        setNewRecipientAddress('');
        loadConversations();
      } else {
        if (response.status === 401) {
          alert('Please connect your wallet to start a conversation');
        } else if (response.status === 400) {
          alert('Invalid address or conversation already exists');
        } else {
          alert('Failed to start conversation. Please try again.');
        }
      }
    } catch (error) {
      console.error('Failed to start new conversation:', error);
      alert('Network error. Please check your connection and try again.');
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const getOtherParticipant = (conversation: Conversation) => {
    if (!address) return 'Unknown';
    return conversation.participants.find(p => p !== address) || 'Unknown';
  };

  const truncateAddress = (addr: string) => {
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const toggleCategory = (categoryId: string) => {
    setChannelCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId ? { ...cat, isCollapsed: !cat.isCollapsed } : cat
      )
    );
  };

  // Sort conversations by last activity
  const sortedConversations = React.useMemo(() => {
    if (!hookConversations) return [] as Conversation[];
    const toTime = (v: any) => {
      if (!v) return 0;
      const t = typeof v === 'string' || typeof v === 'number' ? new Date(v).getTime() : (v as Date).getTime?.() || 0;
      return isNaN(t) ? 0 : t;
    };
    return [...hookConversations].sort((a, b) => toTime(b.lastActivity) - toTime(a.lastActivity));
  }, [hookConversations]);

  // Show loading state
  if (authLoading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <Head>
          <title>Chat | LinkDAO</title>
        </Head>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-gray-400">Loading chat...</p>
        </div>
      </div>
    );
  }

  // Show connect wallet prompt
  if (!isConnected || !address) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <Head>
          <title>Chat | LinkDAO</title>
        </Head>
        <div className="max-w-md w-full mx-4 bg-gray-800 rounded-2xl shadow-xl p-8 text-center border border-gray-700">
          <div className="w-16 h-16 bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Wallet className="h-8 w-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Connect Your Wallet</h1>
          <p className="text-gray-400 mb-6">
            Connect your wallet to access LinkDAO Chat and start messaging with the community.
          </p>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
          >
            <Wallet className="h-5 w-5" />
            Go to Home to Connect
          </button>
        </div>
      </div>
    );
  }

  // Show auth prompt
  if (!isAuthenticated) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <Head>
          <title>Chat | LinkDAO</title>
        </Head>
        <div className="max-w-md w-full mx-4 bg-gray-800 rounded-2xl shadow-xl p-8 text-center border border-gray-700">
          <div className="w-16 h-16 bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageCircle className="h-8 w-8 text-yellow-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Authentication Required</h1>
          <p className="text-gray-400 mb-6">
            Please authenticate your wallet to access the chat.
          </p>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
          >
            Go to Home to Authenticate
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Chat | LinkDAO</title>
        <meta name="description" content="LinkDAO Chat - Connect and message with the community" />
      </Head>

      <div className="h-screen bg-gray-900 flex">
        {/* Left Sidebar - Channels/Conversations */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-400" />
                LinkDAO Chat
              </h1>
              <div className="flex items-center gap-1">
                {connectionState.status === 'connected' ? (
                  <Wifi size={14} className="text-green-400" title="Connected" />
                ) : connectionState.status === 'connecting' || connectionState.status === 'reconnecting' ? (
                  <Loader2 size={14} className="text-yellow-400 animate-spin" title="Connecting..." />
                ) : (
                  <WifiOff size={14} className="text-red-400" title="Disconnected" />
                )}
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-700 text-white rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* Channel Categories */}
          <div className="flex-1 overflow-y-auto">
            {channelCategories.map((category) => (
              <div key={category.id} className="py-2">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-300"
                >
                  <div className="flex items-center gap-1">
                    {category.isCollapsed ? (
                      <ChevronRight className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                    {category.name}
                  </div>
                  <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 hover:text-white cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowNewConversationModal(true);
                        }} />
                </button>

                {/* Category Items */}
                {!category.isCollapsed && (
                  <div className="mt-1">
                    {category.id === 'direct' && (
                      <>
                        {conversationsLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          </div>
                        ) : conversationsError ? (
                          <div className="px-3 py-2 text-xs text-red-400">
                            {conversationsError}
                            <button onClick={loadConversations} className="ml-2 text-blue-400 hover:underline">
                              Retry
                            </button>
                          </div>
                        ) : sortedConversations.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-gray-500">
                            No conversations yet
                          </div>
                        ) : (
                          sortedConversations.map((conversation) => {
                            const otherParticipant = getOtherParticipant(conversation);
                            const isUserOnline = onlineUsers.has(otherParticipant);
                            const conversationTyping = typingUsers.get(conversation.id) || [];
                            const isTyping = conversationTyping.length > 0;
                            const isSelected = selectedConversation?.id === conversation.id;

                            return (
                              <button
                                key={conversation.id}
                                onClick={() => handleConversationSelect(conversation)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md mx-1 transition-colors ${
                                  isSelected
                                    ? 'bg-gray-700 text-white'
                                    : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                                }`}
                              >
                                <div className="relative flex-shrink-0">
                                  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-gray-400" />
                                  </div>
                                  <div className="absolute -bottom-0.5 -right-0.5">
                                    <OnlineStatus isOnline={isUserOnline} size={10} />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <div className="truncate font-medium">
                                    {truncateAddress(otherParticipant)}
                                  </div>
                                  {isTyping ? (
                                    <div className="text-xs text-blue-400">typing...</div>
                                  ) : conversation.lastMessage?.content ? (
                                    <div className="text-xs text-gray-500 truncate">
                                      {conversation.lastMessage.content}
                                    </div>
                                  ) : null}
                                </div>
                                {(conversation.unreadCounts?.[address || ''] || 0) > 0 && (
                                  <div className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    {conversation.unreadCounts?.[address || ''] > 9 ? '9+' : conversation.unreadCounts?.[address || '']}
                                  </div>
                                )}
                              </button>
                            );
                          })
                        )}
                      </>
                    )}
                    {category.id === 'public' && (
                      <div className="px-3 py-2 text-xs text-gray-500">
                        No public channels yet
                      </div>
                    )}
                    {category.id === 'private' && (
                      <div className="px-3 py-2 text-xs text-gray-500">
                        No private channels yet
                      </div>
                    )}
                    {category.id === 'gated' && (
                      <div className="px-3 py-2 text-xs text-gray-500">
                        No gated channels yet
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* User Profile / Settings */}
          <div className="p-3 border-t border-gray-700 bg-gray-800/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">
                  {truncateAddress(address)}
                </div>
                <div className="text-xs text-green-400">Online</div>
              </div>
              <button className="p-1.5 hover:bg-gray-700 rounded">
                <Settings className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-900">
          {selectedConversation ? (
            <DiscordStyleMessagingInterface
              className="h-full"
              onClose={handleBackToList}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-400 mb-2">
                  Welcome to LinkDAO Chat
                </h2>
                <p className="text-gray-500 mb-6 max-w-md">
                  Select a conversation from the sidebar or start a new one to begin messaging.
                </p>
                <button
                  onClick={() => setShowNewConversationModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Start New Conversation
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Members/Info (optional, toggle with state) */}
        {showRightSidebar && selectedConversation && (
          <div className="w-60 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Members</h3>
                <Settings className="w-4 h-4 text-gray-400 cursor-pointer hover:text-white" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-2">
                {selectedConversation.participants.map((participant) => (
                  <div key={participant} className="flex items-center gap-2 p-2 rounded hover:bg-gray-700/50">
                    <div className="relative">
                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-400" />
                      </div>
                      <OnlineStatus
                        isOnline={onlineUsers.has(participant) || participant === address}
                        size={10}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">
                        {truncateAddress(participant)}
                        {participant === address && <span className="text-xs text-gray-500 ml-1">(you)</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional sections */}
            <div className="border-t border-gray-700">
              <button className="w-full p-3 text-left text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 flex items-center justify-between">
                <span>Pinned Messages</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button className="w-full p-3 text-left text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 flex items-center justify-between">
                <span>Files</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button className="w-full p-3 text-left text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 flex items-center justify-between">
                <span>Active Polls</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      <AnimatePresence>
        {showNewConversationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setShowNewConversationModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 border border-gray-700 shadow-2xl"
            >
              <h3 className="text-xl font-semibold text-white mb-4">
                Start New Conversation
              </h3>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Recipient Wallet Address or ENS
                </label>
                <input
                  type="text"
                  value={newRecipientAddress}
                  onChange={(e) => setNewRecipientAddress(e.target.value)}
                  placeholder="0x... or name.eth"
                  className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewConversationModal(false)}
                  className="flex-1 px-4 py-3 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => startNewConversation()}
                  disabled={!newRecipientAddress.trim() || isCreatingConversation}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isCreatingConversation ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Start Chat'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
