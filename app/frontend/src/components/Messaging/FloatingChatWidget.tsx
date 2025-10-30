/**
 * FloatingChatWidget Component - Facebook Messenger-style floating chat interface
 * Provides a lightweight, accessible messaging experience that doesn't take over the screen
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, X, Bell, Minimize2, Maximize2, Send, Plus, Search, MoreVertical,
  User, Hash, ThumbsUp, Heart, Zap, Rocket, Globe, Users, ChevronDown, ChevronRight,
  Image, Link as LinkIcon, Wallet, Vote, Calendar, Tag, Settings, ArrowLeftRight,
  Phone, Video, Shield, ArrowLeft, Loader2, AlertCircle, Wifi, WifiOff
} from 'lucide-react';
import { ChatBubbleLeftIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useChatHistory } from '@/hooks/useChatHistory';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import useENSIntegration from '@/hooks/useENSIntegration';
import { Conversation, Message } from '@/types/messaging';
import notificationService from '@/services/notificationService';
import { ContactProvider, useContacts } from '@/contexts/ContactContext';
import ContactSearch from './Contacts/ContactSearch';
import ContactList from './Contacts/ContactList';
import ContactDetail from './Contacts/ContactDetail';
import { GlassPanel } from '@/design-system';
import DiscordStyleMessagingInterface from './DiscordStyleMessagingInterface';
import { OnlineStatus } from './MessageStatusComponents';

interface FloatingChatWidgetProps {
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

const FloatingChatWidget: React.FC<FloatingChatWidgetProps> = ({
  className = '',
  position = 'bottom-right'
}) => {
  // ✅ PHASE 1 FIX: Consolidate to useWalletAuth only
  const { walletInfo } = useWalletAuth();
  const address = walletInfo?.address;
  const isConnected = walletInfo?.isConnected || false;

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [activeTab, setActiveTab] = useState<'messages' | 'contacts' | 'chat'>('messages');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [newRecipientAddress, setNewRecipientAddress] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  // ✅ PHASE 1 FIX: Get loading and error states from hook
  const {
    conversations: hookConversations,
    loading: conversationsLoading,
    error: conversationsError,
    loadConversations,
    sendMessage: sendChatMessage,
    markAsRead
  } = useChatHistory();

  // ✅ PHASE 2: Track online status and typing users
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Map<string, string[]>>(new Map());

  // ✅ PHASE 1 FIX: Enhanced WebSocket integration
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

  // Check if mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Load conversations on mount and when wallet connects
  useEffect(() => {
    if (address) {
      loadConversations();
    }
  }, [address, loadConversations]);

  // ✅ PHASE 1 FIX: Enhanced WebSocket message handling with UI updates
  // ✅ PHASE 2: Added online status and typing indicators
  useEffect(() => {
    if (!isWebSocketConnected || !address) return;

    const handleNewMessage = (message: Message) => {
      setHasNewMessage(true);

      // Reload conversations to update unread counts and last message
      loadConversations();

      // Show browser notification if widget is closed or minimized
      if (!isOpen || isMinimized) {
        const conversation = hookConversations.find(conv => conv.id === message.conversationId);
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

    const handleConversationUpdate = (updatedConversation: Conversation) => {
      // Reload conversations when conversation metadata changes
      loadConversations();
    };

    // ✅ PHASE 2: Handle user online/offline status
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

    // ✅ PHASE 2: Handle typing indicators
    const handleUserTyping = (data: { userAddress: string; conversationId: string }) => {
      setTypingUsers(prev => {
        const updated = new Map(prev);
        const conversationTyping = updated.get(data.conversationId) || [];
        if (!conversationTyping.includes(data.userAddress)) {
          updated.set(data.conversationId, [...conversationTyping, data.userAddress]);
        }
        return updated;
      });

      // Auto-remove after 3 seconds
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
  }, [isWebSocketConnected, isOpen, isMinimized, hookConversations, address, loadConversations, on, off]);

  const getPositionClasses = () => {
    const classes = {
      'bottom-right': 'bottom-6 right-6 md:bottom-6 md:right-6',
      'bottom-left': 'bottom-6 left-6 md:bottom-6 md:left-6',
      'top-right': 'top-6 right-6 md:top-6 md:right-6',
      'top-left': 'top-6 left-6 md:top-6 md:left-6'
    }[position] || 'bottom-6 right-6 md:bottom-6 md:right-6';
    
    console.log('FloatingChatWidget position classes:', classes, 'position:', position);
    return classes;
  };

  const toggleChat = () => {
    if (!isOpen) {
      setIsOpen(true);
      setIsMinimized(false);
    } else {
      // If already open, toggle between minimized and full view
      setIsMinimized(!isMinimized);
    }
  };

  const closeChat = () => {
    setIsOpen(false);
    setIsMinimized(false);
    setSelectedConversation(null);
    setActiveTab('messages');
  };

  const handleConversationSelect = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setActiveTab('chat');

    // Join conversation room
    if (isWebSocketConnected && conversation.id) {
      joinConversation(conversation.id);
    }

    // ✅ PHASE 2: Mark messages as read when conversation is opened
    if (address && conversation.unreadCounts?.[address] > 0) {
      // Get unread message IDs (this would come from loadMessages in a real implementation)
      // For now, we'll just mark the conversation as read
      try {
        await markAsRead(conversation.id, []);
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
    setActiveTab('messages');
    
    // Leave conversation room
    if (isWebSocketConnected && selectedConversation?.id) {
      leaveConversation(selectedConversation.id);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !selectedConversation || !address) return;
    
    try {
      await sendChatMessage({
        conversationId: selectedConversation.id,
        fromAddress: address,
        content,
        contentType: 'text',
        deliveryStatus: 'sent'
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const startNewConversation = async () => {
    if (!newRecipientAddress.trim() || !address) return;
    
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${address}`,
        },
        body: JSON.stringify({
          participants: [address, newRecipientAddress.trim()],
        }),
      });

      if (response.ok) {
        const newConversation = await response.json();
        setSelectedConversation(newConversation);
        setActiveTab('chat');
        setShowNewConversationModal(false);
        setNewRecipientAddress('');
        loadConversations(); // Refresh conversation list
      }
    } catch (error) {
      console.error('Failed to start new conversation:', error);
    }
  };

  const getOtherParticipant = (conversation: Conversation) => {
    if (!address) return 'Unknown';
    return conversation.participants.find(p => p !== address) || 'Unknown';
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Sort conversations by last activity (desc) for WhatsApp/Telegram feel
  const sortedConversations = React.useMemo(() => {
    if (!hookConversations) return [] as Conversation[];
    const toTime = (v: any) => {
      if (!v) return 0;
      const t = typeof v === 'string' || typeof v === 'number' ? new Date(v).getTime() : (v as Date).getTime?.() || 0;
      return isNaN(t) ? 0 : t;
    };
    return [...hookConversations].sort((a, b) => toTime(b.lastActivity) - toTime(a.lastActivity));
  }, [hookConversations]);

  if (!isConnected) return null;

  return (
    <>
      {/* Floating Chat Toggle Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 360, damping: 22, mass: 0.9 }}
            className={`fixed z-[60] ${getPositionClasses()} ${className} hidden md:block`} // Increased z-index to 60 to appear above MobileNavigation
            style={{ 
              bottom: position.includes('bottom') ? '1.5rem' : undefined,
              top: position.includes('top') ? '1.5rem' : undefined,
              right: position.includes('right') ? '1.5rem' : undefined,
              left: position.includes('left') ? '1.5rem' : undefined
            }}
          >
            <motion.button
              onClick={toggleChat}
              className={`
                relative w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 
                rounded-full shadow-lg hover:shadow-xl transition-all duration-200
                flex items-center justify-center
                ${hasNewMessage ? 'animate-pulse' : ''}
              `}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.96 }}
              aria-label="Open chat"
            >
              <MessageCircle size={20} className="text-white" />
              
              {/* Unread Badge */}
              {unreadCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </motion.div>
              )}

              {hasNewMessage && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"
                />
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", stiffness: 360, damping: 24, mass: 0.9 }}
            className={`fixed z-[60] ${getPositionClasses()} hidden md:block`} // Increased z-index to 60 to appear above MobileNavigation
            style={{ 
              width: '340px',
              height: isMinimized ? '50px' : '520px',
              maxWidth: '95vw',
              maxHeight: '80vh'
            }}
          >
            <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col h-full">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700 h-12 bg-gradient-to-r from-gray-800 to-gray-800/80">
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-2">
                    <MessageCircle size={14} className="text-white" />
                  </div>
                  <h2 className="text-sm font-semibold text-white">
                    {activeTab === 'messages' ? 'Chat' : activeTab === 'contacts' ? 'Contacts' : getOtherParticipant(selectedConversation as Conversation)}
                  </h2>
                </div>
                <div className="flex items-center">
                  {activeTab === 'messages' && (
                  <button
                      onClick={() => setShowNewConversationModal(true)}
                    className="mr-1 opacity-70 hover:opacity-100 active:scale-[0.98] transition-transform"
                      aria-label="Start new conversation"
                    >
                      <Plus size={16} className="text-white" />
                    </button>
                  )}
                  {activeTab === 'chat' && (
                  <button
                      onClick={handleBackToList}
                    className="mr-1 opacity-70 hover:opacity-100 active:scale-[0.98] transition-transform"
                      aria-label="Back to messages"
                    >
                      <ArrowLeft size={16} className="text-white" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="mr-1 opacity-70 hover:opacity-100 active:scale-[0.98] transition-transform"
                    aria-label={isMinimized ? "Maximize chat" : "Minimize chat"}
                  >
                    {isMinimized ? <Maximize2 size={16} className="text-white" /> : <Minimize2 size={16} className="text-white" />}
                  </button>
                  <button
                    onClick={closeChat}
                    className="mr-1 opacity-70 hover:opacity-100 active:scale-[0.98] transition-transform"
                    aria-label="Close chat"
                  >
                    <X size={16} className="text-white" />
                  </button>
                </div>
              </div>
              
              {/* Content area - hidden when minimized */}
              {!isMinimized && (
                <div className="flex-1 overflow-y-auto">
                  {/* Tab Selector - Compact */}
                  <div className="flex border-b border-gray-700 bg-gray-800">
                    <button
                      onClick={() => setActiveTab('messages')}
                      className={`flex items-center gap-1 px-4 py-2 text-xs font-medium transition-colors flex-1 justify-center ${
                        activeTab === 'messages'
                          ? 'text-blue-400 border-b-2 border-blue-400'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <MessageCircle className="w-3 h-3" />
                      <span>Chats</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('contacts')}
                      className={`flex items-center gap-1 px-4 py-2 text-xs font-medium transition-colors flex-1 justify-center ${
                        activeTab === 'contacts'
                          ? 'text-blue-400 border-b-2 border-blue-400'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Users className="w-3 h-3" />
                      <span>Contacts</span>
                    </button>
                  </div>
                  
                  {activeTab === 'messages' && (
                    <div className="flex flex-col h-full">
                      {/* Search and connection status */}
                      <div className="p-2.5 border-b border-gray-700 flex items-center justify-between bg-gray-800">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder="Search chats..."
                            className="w-full px-3 py-1.5 text-xs bg-gray-700 text-white rounded placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <Search className="absolute right-2 top-2 w-3 h-3 text-gray-400" />
                        </div>
                        {/* Connection Status Indicator */}
                        {connectionState.status === 'connected' ? (
                          <div title="Connected">
                            <Wifi size={12} className="ml-2 text-green-400" />
                          </div>
                        ) : connectionState.status === 'connecting' || connectionState.status === 'reconnecting' ? (
                          <div title="Connecting...">
                            <Loader2 size={12} className="ml-2 text-yellow-400 animate-spin" />
                          </div>
                        ) : (
                          <div title="Disconnected">
                            <WifiOff size={12} className="ml-2 text-red-400" />
                          </div>
                        )}
                      </div>

                      {/* Conversation List */}
                      <div className="flex-1 overflow-y-auto bg-gray-800">
                        {conversationsLoading ? (
                          <div className="flex flex-col items-center justify-center p-4 text-center">
                            <Loader2 size={20} className="text-blue-400 animate-spin mb-2" />
                            <p className="text-xs text-gray-400">Loading conversations...</p>
                          </div>
                        ) : conversationsError ? (
                          <div className="flex flex-col items-center justify-center p-4 text-center">
                            <AlertCircle size={20} className="text-red-400 mb-2" />
                            <p className="text-xs text-red-400 mb-2">{conversationsError}</p>
                            <button
                              onClick={() => loadConversations()}
                              className="text-xs text-blue-400 hover:underline"
                            >
                              Retry
                            </button>
                          </div>
                        ) : !hookConversations || hookConversations.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-4 text-center">
                            <MessageCircle size={20} className="text-gray-500 mb-2" />
                            <p className="text-xs text-gray-400 mb-2">No conversations yet</p>
                            <button
                              onClick={() => setShowNewConversationModal(true)}
                              className="text-xs text-blue-400 hover:underline"
                            >
                              Start your first chat
                            </button>
                          </div>
                        ) : (
                          <AnimatePresence initial={false}>
                            {sortedConversations.map((conversation) => {
                            const otherParticipant = getOtherParticipant(conversation);
                            const isUserOnline = onlineUsers.has(otherParticipant);
                            const conversationTyping = typingUsers.get(conversation.id) || [];
                            const isTyping = conversationTyping.length > 0;

                            return (
                              <motion.div
                                key={conversation.id}
                                layout
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                transition={{ duration: 0.16, ease: 'easeOut' }}
                                whileTap={{ scale: 0.99, backgroundColor: 'rgba(55,65,81,1)' }}
                                className="relative overflow-hidden flex items-center px-3 py-2.5 hover:bg-gray-700 rounded cursor-pointer text-xs transition-colors group"
                                onClick={() => handleConversationSelect(conversation)}
                              >
                                {/* Centered ripple */}
                                <motion.span
                                  aria-hidden
                                  className="pointer-events-none absolute inset-0"
                                  initial={false}
                                  animate={{ background: ['radial-gradient(circle at 50% 50%, rgba(255,255,255,0.08), transparent 40%)', 'transparent'] }}
                                  transition={{ duration: 0.35 }}
                                />
                                {/* Avatar with Online Status */}
                                <div className="relative mr-2 flex-shrink-0">
                                  <div className="w-7 h-7 bg-gray-600 rounded-full"></div>
                                  <div className="absolute bottom-0 right-0">
                                    <OnlineStatus isOnline={isUserOnline} size={8} />
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-white truncate flex items-center text-sm leading-5">
                                    {otherParticipant}
                                    {isTyping && (
                                      <span className="ml-2 text-blue-400 text-[11px] leading-4">typing...</span>
                                    )}
                                  </div>
                                  <div className="text-gray-400 truncate text-[11px] leading-4">
                                    {conversation.lastMessage?.content || 'No messages yet'}
                                  </div>
                                </div>

                                {conversation.unreadCounts?.[address || ''] && (
                                  <div className="bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">
                                    {conversation.unreadCounts?.[address || ''] > 9 ? '9+' : conversation.unreadCounts?.[address || '']}
                                  </div>
                                )}

                                <div className="absolute left-0 top-full mt-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                                  {otherParticipant}
                                  {isUserOnline && <span className="ml-2 text-green-400">● Online</span>}
                                </div>
                              </motion.div>
                            );
                            })}
                          </AnimatePresence>
                        )}
                      </div>
                    </div>
                  )}
                  {activeTab === 'contacts' && <ContactsTabContent />}
                  {activeTab === 'chat' && (
                    <div className="flex flex-col h-full">
                      <div className="flex-1 overflow-y-auto">
                        <DiscordStyleMessagingInterface className="h-full" onClose={handleBackToList} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Conversation Modal */}
      <AnimatePresence>
        {showNewConversationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 border border-gray-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">
                Start New Conversation
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Recipient Wallet Address or ENS
                </label>
                <input
                  type="text"
                  value={newRecipientAddress}
                  onChange={(e) => setNewRecipientAddress(e.target.value)}
                  placeholder="0x... or name.eth"
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg
                           bg-gray-700 text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowNewConversationModal(false)}
                  className="flex-1 px-4 py-2 text-gray-300 border border-gray-600 
                           rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={startNewConversation}
                  disabled={!newRecipientAddress.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Start Chat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Contacts Tab Content Component
const ContactsTabContent: React.FC = () => {
  return (
    <div className="flex h-full">
      {/* Single-column contact list without categories */}
      <div className="flex-1 flex flex-col bg-gray-800">
        {/* Search */}
        <div className="p-2 border-b border-gray-700">
          <div className="relative">
            <input
              type="text"
              placeholder="Search contacts..."
              className="w-full px-2 py-1 text-xs bg-gray-700 text-white rounded placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Search className="absolute right-1.5 top-1.5 w-3 h-3 text-gray-400" />
          </div>
        </div>

        {/* Flat Contact List */}
        <ContactList className="flex-1" flat />

        {/* Add Contact */}
        <div className="p-2 border-t border-gray-700">
          <button
            onClick={() => alert('Add new contact functionality to be implemented')}
            className="w-full py-2 bg-blue-600 rounded-lg text-white text-xs hover:bg-blue-700 transition-colors"
          >
            Add Contact
          </button>
        </div>
      </div>
    </div>
  );
};

const FloatingChatWidgetWithProvider: React.FC<FloatingChatWidgetProps> = (props) => {
  return (
    <ContactProvider>
      <FloatingChatWidget {...props} />
    </ContactProvider>
  );
};

export default FloatingChatWidgetWithProvider;
