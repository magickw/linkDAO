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

  if (!isConnected) return null;

  return (
    <>
      {/* Floating Chat Toggle Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`fixed z-[60] ${getPositionClasses()} ${className}`} // Increased z-index to 60 to appear above MobileNavigation
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
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
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
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`fixed z-[60] ${getPositionClasses()}`} // Increased z-index to 60 to appear above MobileNavigation
            style={{ 
              width: '320px',
              height: isMinimized ? '50px' : '500px',
              maxWidth: '95vw',
              maxHeight: '80vh'
            }}
          >
            <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col h-full">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 h-12 bg-gradient-to-r from-gray-800 to-gray-800/80">
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
                      className="mr-1 opacity-70 hover:opacity-100"
                      aria-label="Start new conversation"
                    >
                      <Plus size={16} className="text-white" />
                    </button>
                  )}
                  {activeTab === 'chat' && (
                    <button
                      onClick={handleBackToList}
                      className="mr-1 opacity-70 hover:opacity-100"
                      aria-label="Back to messages"
                    >
                      <ArrowLeft size={16} className="text-white" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="mr-1 opacity-70 hover:opacity-100"
                    aria-label={isMinimized ? "Maximize chat" : "Minimize chat"}
                  >
                    {isMinimized ? <Maximize2 size={16} className="text-white" /> : <Minimize2 size={16} className="text-white" />}
                  </button>
                  <button
                    onClick={closeChat}
                    className="mr-1 opacity-70 hover:opacity-100"
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
                      className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors flex-1 justify-center ${
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
                      className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors flex-1 justify-center ${
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
                    <div className="flex">
                      {/* Compact Sidebar */}
                      <div className="w-52 flex flex-col border-r border-gray-700 bg-gray-800">
                        <div className="p-2 border-b border-gray-700 flex items-center justify-between">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              placeholder="Search chats..."
                              className="w-full px-2 py-1 text-xs bg-gray-700 text-white rounded placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <Search className="absolute right-1.5 top-1.5 w-3 h-3 text-gray-400" />
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

                        {/* ✅ PHASE 1 FIX: Loading, Error, and Empty States */}
                        <div className="flex-1 overflow-y-auto">
                          {conversationsLoading ? (
                            // Loading State
                            <div className="flex flex-col items-center justify-center p-4 text-center">
                              <Loader2 size={20} className="text-blue-400 animate-spin mb-2" />
                              <p className="text-xs text-gray-400">Loading conversations...</p>
                            </div>
                          ) : conversationsError ? (
                            // Error State
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
                            // Empty State
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
                            // Conversation List
                            hookConversations.map((conversation) => {
                              const otherParticipant = getOtherParticipant(conversation);
                              const isUserOnline = onlineUsers.has(otherParticipant);
                              const conversationTyping = typingUsers.get(conversation.id) || [];
                              const isTyping = conversationTyping.length > 0;

                              return (
                                <div
                                  key={conversation.id}
                                  className="flex items-center px-2 py-2 hover:bg-gray-700 rounded cursor-pointer text-xs transition-colors duration-150 group relative"
                                  onClick={() => handleConversationSelect(conversation)}
                                >
                                  {/* Avatar with Online Status */}
                                  <div className="relative mr-2 flex-shrink-0">
                                    <div className="w-6 h-6 bg-gray-600 rounded-full"></div>
                                    {/* ✅ PHASE 2: Online status indicator */}
                                    <div className="absolute bottom-0 right-0">
                                      <OnlineStatus isOnline={isUserOnline} size={8} />
                                    </div>
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-white truncate flex items-center">
                                      {otherParticipant}
                                      {/* ✅ PHASE 2: Typing indicator */}
                                      {isTyping && (
                                        <span className="ml-2 text-blue-400 text-xs">typing...</span>
                                      )}
                                    </div>
                                    <div className="text-gray-400 truncate">
                                      {conversation.lastMessage?.content || 'No messages yet'}
                                    </div>
                                  </div>

                                  {/* ✅ PHASE 2: Unread badge */}
                                  {conversation.unreadCounts?.[address || ''] && (
                                    <div className="bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">
                                      {conversation.unreadCounts?.[address || ''] > 9
                                        ? '9+'
                                        : conversation.unreadCounts?.[address || '']}
                                    </div>
                                  )}

                                  {/* Tooltip for long names */}
                                  <div className="absolute left-0 top-full mt-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                                    {otherParticipant}
                                    {isUserOnline && <span className="ml-2 text-green-400">● Online</span>}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                      
                      {/* Chat View */}
                      <div className="flex-1 flex flex-col relative">
                        {selectedConversation ? (
                          <div className="flex flex-col h-full">
                            <div className="px-3 py-2 border-b border-gray-700">
                              <div className="flex items-center">
                                <div className="w-6 h-6 bg-gray-600 rounded-full mr-2"></div>
                                <div className="font-medium text-white text-sm">
                                  {getOtherParticipant(selectedConversation)}
                                </div>
                              </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                              <DiscordStyleMessagingInterface className="h-full" onClose={handleBackToList} />
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
                            <MessageCircle size={32} className="mb-2 opacity-50" />
                            <p className="text-sm text-center">Select a conversation to start chatting</p>
                          </div>
                        )}
                        
                        {/* Floating "+" button for new conversation */}
                        <button
                          onClick={() => setShowNewConversationModal(true)}
                          className="absolute bottom-4 right-4 w-10 h-10 bg-blue-600 rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
                          aria-label="Start new conversation"
                        >
                          <Plus size={20} className="text-white" />
                        </button>
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
  const { selectedContact } = useContacts();

  return (
    <div className="flex h-full">
      {/* Left Panel - Contact List */}
      <div className="w-40 flex flex-col border-r border-gray-700 bg-gray-800">
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

        {/* Contact List */}
        <ContactList className="flex-1" />
      </div>

      {/* Right Panel - Contact Detail or Empty State */}
      <div className="flex-1 flex flex-col relative">
        {selectedContact ? (
          <ContactDetail contact={selectedContact} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-xs"
            >
              {/* Icon */}
              <div className="w-12 h-12 mx-auto mb-3 bg-gray-800 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-gray-400" />
              </div>

              {/* Title */}
              <h2 className="text-sm font-semibold text-white mb-1">
                Manage Your Contacts
              </h2>

              {/* Description */}
              <p className="text-gray-400 text-xs leading-relaxed">
                Organize your Web3 connections with custom nicknames and tags.
              </p>
            </motion.div>
          </div>
        )}
        
        {/* Floating "+" button for new contact */}
        <button
          onClick={() => alert('Add new contact functionality to be implemented')}
          className="absolute bottom-4 right-4 w-10 h-10 bg-blue-600 rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
          aria-label="Add new contact"
        >
          <Plus size={20} className="text-white" />
        </button>
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
