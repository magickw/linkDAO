/**
 * Full Chat Page with Route-Based URLs
 * Discord/Slack style messaging interface with all chat functionalities
 *
 * Routes:
 * - /chat - Main chat page (no conversation selected)
 * - /chat/dm/[conversationId] - Direct message conversation
 * - /chat/channel/[channelId] - Channel chat (future)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '@/components/Layout';
import {
  MessageCircle, X, Send, Plus, Search, MoreVertical,
  User, Hash, Users, ChevronDown, ChevronRight,
  Settings, ArrowLeft, Loader2, AlertCircle, Wifi, WifiOff,
  Wallet, Lock, Globe, UserPlus, BookUser
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
import MessagingInterface from '@/components/Messaging/MessagingInterface';
import { OnlineStatus } from '@/components/Messaging/MessageStatusComponents';
import { useAuth } from '@/context/AuthContext';
import { useProfiles } from '@/hooks/useProfiles';
import { useProfile } from '@/hooks/useProfile';
import { UserProfile } from '@/models/UserProfile';

// Channel categories for organization (matching screenshot design)
interface ChannelCategory {
  id: string;
  name: string;
  isCollapsed: boolean;
}

// Route types
type ChatRouteType = 'none' | 'dm' | 'channel';

interface ParsedRoute {
  type: ChatRouteType;
  id: string | null;
}

// Parse the URL slug to determine chat type and ID
function parseRoute(slug: string[] | undefined): ParsedRoute {
  if (!slug || slug.length === 0) {
    return { type: 'none', id: null };
  }

  const [routeType, id] = slug;

  if (routeType === 'dm' && id) {
    return { type: 'dm', id };
  }

  if (routeType === 'channel' && id) {
    return { type: 'channel', id };
  }

  return { type: 'none', id: null };
}

export default function ChatPage() {
  const router = useRouter();
  const { slug } = router.query;
  const parsedRoute = parseRoute(slug as string[] | undefined);

  const { walletInfo } = useWalletAuth();
  const { address, isConnected } = useAccount();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isMobile } = useMobileOptimization();
  const { resolveName } = useENSIntegration();

  // UI State
  const [activeView, setActiveView] = useState<'list' | 'chat'>('list');
  const [sidebarTab, setSidebarTab] = useState<'messages' | 'contacts'>('messages');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [newRecipientAddress, setNewRecipientAddress] = useState('');
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [pendingContact, setPendingContact] = useState<Contact | null>(null);
  // Right sidebar state removed - MessagingInterface handles its own sidebar
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Contact modals state
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showEditContactModal, setShowEditContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Channel creation modal state
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [newChannelType, setNewChannelType] = useState<'public' | 'private' | 'gated'>('public');
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);

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

  // Collect unique participant addresses from conversations for profile fetching
  const participantAddresses = React.useMemo(() => {
    if (!hookConversations || !address) return [];
    const addresses = new Set<string>();
    hookConversations.forEach(conv => {
      conv.participants.forEach(p => {
        if (p !== address) {
          addresses.add(p);
        }
      });
    });
    return Array.from(addresses);
  }, [hookConversations, address]);

  // Fetch profiles for all conversation participants
  const { data: participantProfiles, isLoading: profilesLoading } = useProfiles(participantAddresses);

  // Fetch current user's profile
  const { profile: currentUserProfile } = useProfile(address);

  // Helper function to get profile for a specific address
  const getParticipantProfile = useCallback((participantAddress: string): UserProfile | undefined => {
    return participantProfiles?.find(
      p => p.walletAddress.toLowerCase() === participantAddress.toLowerCase()
    );
  }, [participantProfiles]);

  // Helper function to get display name for a participant
  const getDisplayName = useCallback((participantAddress: string): string => {
    const profile = getParticipantProfile(participantAddress);
    if (profile?.displayName) return profile.displayName;
    if (profile?.handle) return profile.handle;
    if (profile?.ens) return profile.ens;
    return truncateAddress(participantAddress);
  }, [getParticipantProfile]);

  // Helper function to get avatar URL for a participant
  const getAvatarUrl = useCallback((participantAddress: string): string | null => {
    const profile = getParticipantProfile(participantAddress);
    const cid = profile?.avatarCid || profile?.profileCid;
    if (cid) {
      // Use IPFS gateway to resolve the CID
      return `https://ipfs.io/ipfs/${cid}`;
    }
    return null;
  }, [getParticipantProfile]);

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
    disconnect: disconnectWebSocket,
    on,
    off
  } = useWebSocket({
    walletAddress: address || '',
    autoConnect: true
  });

  // Cleanup WebSocket connection when leaving the chat page
  useEffect(() => {
    return () => {
      // Leave any active conversation when unmounting
      if (selectedConversation?.id) {
        leaveConversation(selectedConversation.id);
      }
    };
  }, [selectedConversation, leaveConversation]);

  // Handle URL-based conversation selection
  useEffect(() => {
    if (!router.isReady || !hookConversations || conversationsLoading) return;

    // On initial load or route change, select conversation from URL
    if (parsedRoute.type === 'dm' && parsedRoute.id) {
      const conversation = hookConversations.find(c => c.id === parsedRoute.id);
      if (conversation && conversation.id !== selectedConversation?.id) {
        // Don't use handleConversationSelect to avoid URL update loop
        if (isWebSocketConnected && selectedConversation?.id && selectedConversation.id !== conversation.id) {
          leaveConversation(selectedConversation.id);
        }
        setSelectedConversation(conversation);
        setActiveView('chat');
        if (isWebSocketConnected && conversation.id) {
          joinConversation(conversation.id);
        }
        // Mark as read
        if (address && conversation.unreadCounts?.[address] > 0) {
          markAsRead(conversation.id, []).catch(console.error);
        }
      }
    } else if (parsedRoute.type === 'none' && selectedConversation && !isInitialLoad) {
      // URL changed to /chat without conversation, deselect
      if (isWebSocketConnected && selectedConversation.id) {
        leaveConversation(selectedConversation.id);
      }
      setSelectedConversation(null);
      setActiveView('list');
    }

    setIsInitialLoad(false);
  }, [router.isReady, parsedRoute.type, parsedRoute.id, hookConversations, conversationsLoading]);

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

      // Show browser notification only when:
      // 1. Document is hidden (user is not on the page)
      // 2. The message is not in the currently selected conversation
      const isInCurrentConversation = selectedConversation?.id === message.conversationId;
      if (document.hidden && !isInCurrentConversation) {
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
  }, [isWebSocketConnected, hookConversations, address, loadConversations, on, off, selectedConversation]);

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

  // Handle conversation selection with URL update
  const handleConversationSelect = async (conversation: Conversation) => {
    if (isWebSocketConnected && selectedConversation?.id && selectedConversation.id !== conversation.id) {
      leaveConversation(selectedConversation.id);
    }

    setSelectedConversation(conversation);
    setActiveView('chat');

    // Update URL using shallow routing (no page reload)
    router.push(`/chat/dm/${conversation.id}`, undefined, { shallow: true });

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

  // Handle back to list with URL update
  const handleBackToList = () => {
    if (isWebSocketConnected && selectedConversation?.id) {
      leaveConversation(selectedConversation.id);
    }
    setSelectedConversation(null);
    setActiveView('list');

    // Update URL to /chat
    router.push('/chat', undefined, { shallow: true });
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

      // Use backend URL from environment variable or fallback to relative path
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const response = await fetch(`${apiUrl}/api/messaging/conversations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          participantAddress: recipient,
          initialMessage: "Hello! Let's start chatting.",
          conversationType: 'direct'
        }),
      });

      const result = await response.json();

      if (response.ok && result.success !== false) {
        // Extract conversation data from API response wrapper
        const newConversation = result.data || result;
        setSelectedConversation(newConversation);
        setActiveView('chat');
        setShowNewConversationModal(false);
        setNewRecipientAddress('');

        // Update URL to new conversation
        router.push(`/chat/dm/${newConversation.id}`, undefined, { shallow: true });

        loadConversations();
      } else {
        // Handle error response
        const errorMessage = result.message || result.error || 'Unknown error';
        if (response.status === 401) {
          alert('Please connect your wallet to start a conversation');
        } else if (response.status === 400) {
          alert(errorMessage || 'Invalid address or conversation already exists');
        } else if (response.status === 503) {
          alert('Messaging service is temporarily unavailable. Please try again later.');
        } else {
          alert(`Failed to start conversation: ${errorMessage}`);
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

  // Contact handlers
  const handleContactMessage = (contact: Contact) => {
    // Find existing conversation with this contact or start a new one
    const existingConversation = hookConversations?.find(conv =>
      conv.participants.some(p => p.toLowerCase() === contact.walletAddress.toLowerCase())
    );

    if (existingConversation) {
      handleConversationSelect(existingConversation);
    } else {
      setNewRecipientAddress(contact.walletAddress);
      startNewConversation(contact.walletAddress);
    }
    setSidebarTab('messages');
  };

  const handleContactEdit = (contact: Contact) => {
    setEditingContact(contact);
    setShowEditContactModal(true);
  };

  const handleAddContactClose = () => {
    setShowAddContactModal(false);
  };

  const handleEditContactClose = () => {
    setShowEditContactModal(false);
    setEditingContact(null);
  };

  // Channel creation handlers
  const handleOpenCreateChannel = (channelType: 'public' | 'private' | 'gated') => {
    setNewChannelType(channelType);
    setNewChannelName('');
    setNewChannelDescription('');
    setShowCreateChannelModal(true);
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) {
      alert('Please enter a channel name');
      return;
    }

    setIsCreatingChannel(true);
    try {
      // TODO: Implement channel creation API call
      // For now, show a message that this feature is coming soon
      const token = localStorage.getItem('linkdao_access_token') ||
        localStorage.getItem('authToken') ||
        localStorage.getItem('token');

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '';

      const response = await fetch(`${apiUrl}/api/messaging/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: newChannelName.trim(),
          description: newChannelDescription.trim(),
          type: newChannelType,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setShowCreateChannelModal(false);
        setNewChannelName('');
        setNewChannelDescription('');
        // TODO: Navigate to the new channel or refresh channel list
        alert(`Channel "${newChannelName}" created successfully!`);
      } else if (response.status === 404 || response.status === 501) {
        // API not implemented yet
        alert('Channel creation is coming soon! This feature is under development.');
      } else {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        alert(`Failed to create channel: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create channel:', error);
      // If API doesn't exist yet, show coming soon message
      alert('Channel creation is coming soon! This feature is under development.');
    } finally {
      setIsCreatingChannel(false);
    }
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

  // Generate page title based on current conversation
  const pageTitle = selectedConversation
    ? `Chat with ${truncateAddress(getOtherParticipant(selectedConversation))} | LinkDAO`
    : 'Chat | LinkDAO';

  // Show loading state
  if (authLoading) {
    return (
      <Layout title="Chat - LinkDAO" fullWidth={true} hideFooter={true}>
        <div className="h-[calc(100vh-80px)] bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-gray-500 dark:text-gray-400">Loading chat...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Show connect wallet prompt
  if (!isConnected || !address) {
    return (
      <Layout title="Chat - LinkDAO" fullWidth={true} hideFooter={true}>
        <div className="h-[calc(100vh-80px)] bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="max-w-md w-full mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center border border-gray-200 dark:border-gray-700">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Wallet className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Connect Your Wallet</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
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
      </Layout>
    );
  }

  // Show auth prompt
  if (!isAuthenticated) {
    return (
      <Layout title="Chat - LinkDAO" fullWidth={true} hideFooter={true}>
        <div className="h-[calc(100vh-80px)] bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="max-w-md w-full mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center border border-gray-200 dark:border-gray-700">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Authentication Required</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
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
      </Layout>
    );
  }

  return (
    <Layout title={pageTitle} fullWidth={true} hideFooter={true}>
      <div className="h-[calc(100vh-80px)] bg-gray-50 dark:bg-gray-900 flex">
        {/* Left Sidebar - Channels/Conversations */}
        <div className="w-64 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                LinkDAO Chat
              </h1>
              <div className="flex items-center gap-1">
                {connectionState.status === 'connected' ? (
                  <Wifi size={14} className="text-green-500 dark:text-green-400" title="Connected" />
                ) : connectionState.status === 'connecting' || connectionState.status === 'reconnecting' ? (
                  <Loader2 size={14} className="text-yellow-500 dark:text-yellow-400 animate-spin" title="Connecting..." />
                ) : (
                  <WifiOff size={14} className="text-red-500 dark:text-red-400" title="Disconnected" />
                )}
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder={sidebarTab === 'messages' ? "Search conversations..." : "Search contacts..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300 dark:border-transparent"
              />
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-500 dark:text-gray-400" />
            </div>

            {/* Tab Switcher */}
            <div className="flex mt-3 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setSidebarTab('messages')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  sidebarTab === 'messages'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Messages
              </button>
              <button
                onClick={() => setSidebarTab('contacts')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  sidebarTab === 'contacts'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <BookUser className="w-3.5 h-3.5" />
                Contacts
              </button>
            </div>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto">
            {sidebarTab === 'messages' ? (
              /* Channel Categories / Messages */
              <>
                {channelCategories.map((category) => (
              <div key={category.id} className="py-2">
                {/* Category Header */}
                <div className="group w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="flex items-center gap-1"
                  >
                    {category.isCollapsed ? (
                      <ChevronRight className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                    {category.name}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (category.id === 'direct') {
                        setShowNewConversationModal(true);
                      } else {
                        handleOpenCreateChannel(category.id as 'public' | 'private' | 'gated');
                      }
                    }}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                    title={category.id === 'direct' ? 'New conversation' : `Create ${category.id} channel`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Category Items */}
                {!category.isCollapsed && (
                  <div className="mt-1">
                    {category.id === 'direct' && (
                      <>
                        {conversationsLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-4 h-4 animate-spin text-gray-500 dark:text-gray-400" />
                          </div>
                        ) : conversationsError ? (
                          <div className="px-3 py-2 text-xs text-red-500 dark:text-red-400">
                            {conversationsError}
                            <button onClick={loadConversations} className="ml-2 text-blue-500 dark:text-blue-400 hover:underline">
                              Retry
                            </button>
                          </div>
                        ) : sortedConversations.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-500">
                            No conversations yet
                          </div>
                        ) : (
                          sortedConversations.map((conversation) => {
                            const otherParticipant = getOtherParticipant(conversation);
                            const isUserOnline = onlineUsers.has(otherParticipant);
                            const conversationTyping = typingUsers.get(conversation.id) || [];
                            const isTyping = conversationTyping.length > 0;
                            const isSelected = selectedConversation?.id === conversation.id;
                            const avatarUrl = getAvatarUrl(otherParticipant);
                            const displayName = getDisplayName(otherParticipant);

                            return (
                              <button
                                key={conversation.id}
                                onClick={() => handleConversationSelect(conversation)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md mx-1 transition-colors ${
                                  isSelected
                                    ? 'bg-blue-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
                                }`}
                              >
                                <div className="relative flex-shrink-0">
                                  <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center overflow-hidden">
                                    {avatarUrl ? (
                                      <img
                                        src={avatarUrl}
                                        alt={displayName}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          // Fallback to User icon if image fails to load
                                          e.currentTarget.style.display = 'none';
                                          const parent = e.currentTarget.parentElement;
                                          if (parent) {
                                            parent.innerHTML = '<svg class="w-4 h-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
                                          }
                                        }}
                                      />
                                    ) : (
                                      <User className="w-4 h-4 text-gray-400" />
                                    )}
                                  </div>
                                  <div className="absolute -bottom-0.5 -right-0.5">
                                    <OnlineStatus isOnline={isUserOnline} size={10} />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <div className="truncate font-medium">
                                    {displayName}
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
                      <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-500">
                        No public channels yet
                      </div>
                    )}
                    {category.id === 'private' && (
                      <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-500">
                        No private channels yet
                      </div>
                    )}
                    {category.id === 'gated' && (
                      <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-500">
                        No gated channels yet
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
              </>
            ) : (
              /* Contacts View */
              <div className="p-2">
                <div className="flex items-center justify-between px-2 mb-3">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Your Contacts
                  </span>
                  <button
                    onClick={() => setShowAddContactModal(true)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    title="Add Contact"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>
                <ContactList
                  className="space-y-1"
                  flat={true}
                  onContactMessage={handleContactMessage}
                  onContactEdit={handleContactEdit}
                />
              </div>
            )}
          </div>

          {/* User Profile / Settings */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center overflow-hidden">
                {currentUserProfile?.avatarCid ? (
                  <img
                    src={`https://ipfs.io/ipfs/${currentUserProfile.avatarCid}`}
                    alt={currentUserProfile.displayName || currentUserProfile.handle || 'You'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.innerHTML = '<svg class="w-4 h-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
                      }
                    }}
                  />
                ) : (
                  <User className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {currentUserProfile?.displayName || currentUserProfile?.handle || truncateAddress(address)}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">Online</div>
              </div>
              <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
          {selectedConversation ? (
            <MessagingInterface
              className="h-full"
              onClose={handleBackToList}
              conversationId={selectedConversation.id}
              participantAddress={getOtherParticipant(selectedConversation)}
              participantName={getDisplayName(getOtherParticipant(selectedConversation))}
              hideSidebar={true}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  Welcome to LinkDAO Chat
                </h2>
                <p className="text-gray-500 dark:text-gray-500 mb-6 max-w-md">
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

        {/* Right Sidebar - Members/Info
            Note: This sidebar is intentionally NOT rendered when MessagingInterface is displayed,
            as MessagingInterface has its own built-in sidebar for channel views.
            This prevents the duplicate sidebar issue.
        */}
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
              className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 border border-gray-200 dark:border-gray-700 shadow-2xl"
            >
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Start New Conversation
              </h3>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Recipient Wallet Address or ENS
                </label>
                <input
                  type="text"
                  value={newRecipientAddress}
                  onChange={(e) => setNewRecipientAddress(e.target.value)}
                  placeholder="0x... or name.eth"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewConversationModal(false)}
                  className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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

      {/* Add Contact Modal */}
      {showAddContactModal && (
        <AddContactModal
          isOpen={showAddContactModal}
          onClose={handleAddContactClose}
        />
      )}

      {/* Edit Contact Modal */}
      {showEditContactModal && editingContact && (
        <EditContactModal
          isOpen={showEditContactModal}
          onClose={handleEditContactClose}
          contact={editingContact}
        />
      )}

      {/* Create Channel Modal */}
      <AnimatePresence>
        {showCreateChannelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setShowCreateChannelModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 border border-gray-200 dark:border-gray-700 shadow-2xl"
            >
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Create {newChannelType.charAt(0).toUpperCase() + newChannelType.slice(1)} Channel
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Channel Name
                  </label>
                  <input
                    type="text"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="e.g., general, announcements"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={newChannelDescription}
                    onChange={(e) => setNewChannelDescription(e.target.value)}
                    placeholder="What's this channel about?"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                {newChannelType === 'gated' && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg">
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      <Lock className="w-4 h-4 inline mr-1" />
                      Gated channels require token ownership or specific criteria to join.
                    </p>
                  </div>
                )}

                {newChannelType === 'private' && (
                  <div className="p-3 bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <Lock className="w-4 h-4 inline mr-1" />
                      Private channels are invite-only.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateChannelModal(false)}
                  className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateChannel}
                  disabled={!newChannelName.trim() || isCreatingChannel}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isCreatingChannel ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Channel'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
