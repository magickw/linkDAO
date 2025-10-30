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
  Phone, Video, Shield, ArrowLeft
} from 'lucide-react';
import { ChatBubbleLeftIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useAccount } from 'wagmi';
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

interface FloatingChatWidgetProps {
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

const FloatingChatWidget: React.FC<FloatingChatWidgetProps> = ({
  className = '',
  position = 'bottom-right'
}) => {
  const { address, isConnected } = useAccount();
  const { walletInfo } = useWalletAuth();
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

  const { 
    conversations: hookConversations, 
    loadConversations,
    sendMessage: sendChatMessage
  } = useChatHistory();

  const { socket, isConnected: isWebSocketConnected, joinConversation, leaveConversation } = useWebSocket({
    walletAddress: walletInfo.address || '',
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

  // WebSocket message handling
  useEffect(() => {
    if (socket && isWebSocketConnected) {
      const handleNewMessage = (message: Message) => {
        setHasNewMessage(true);
        // Show browser notification if widget is closed or minimized
        if (!isOpen || isMinimized) {
          // Find the conversation for this message to determine the recipient
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
        // Update conversation list with new message
        // This would be handled by the useChatHistory hook
      };

      socket.on('new_message', handleNewMessage);
      socket.on('conversation_updated', handleConversationUpdate);
      
      return () => {
        socket.off('new_message', handleNewMessage);
        socket.off('conversation_updated', handleConversationUpdate);
      };
    }
  }, [socket, isWebSocketConnected, isOpen, isMinimized, hookConversations, address]);

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-right': return 'bottom-6 right-6';
      case 'bottom-left': return 'bottom-6 left-6';
      case 'top-right': return 'top-6 right-6';
      case 'top-left': return 'top-6 left-6';
      default: return 'bottom-6 right-6';
    }
  };

  const toggleChat = () => {
    if (!isOpen) {
      setIsOpen(true);
      setIsMinimized(false);
    } else {
      setIsMinimized(!isMinimized);
    }
  };

  const closeChat = () => {
    setIsOpen(false);
    setIsMinimized(false);
    setSelectedConversation(null);
    setActiveTab('messages');
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setActiveTab('chat');
    
    // Join conversation room
    if (isWebSocketConnected && conversation.id) {
      joinConversation(conversation.id);
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
            className={`fixed z-50 ${getPositionClasses()} ${className}`}
          >
            <motion.button
              onClick={toggleChat}
              className={`
                relative w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 
                rounded-full shadow-lg hover:shadow-xl transition-all duration-200
                flex items-center justify-center
                ${hasNewMessage ? 'animate-pulse' : ''}
              `}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Open chat"
            >
              <MessageCircle size={24} className="text-white" />
              
              {/* Unread Badge */}
              {unreadCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </motion.div>
              )}

              {hasNewMessage && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"
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
            className={`fixed z-50 ${getPositionClasses()}`}
            style={{ 
              width: '380px',
              height: isMinimized ? '60px' : '600px',
              maxWidth: '95vw',
              maxHeight: '85vh'
            }}
          >
            <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col h-full">
              {/* Chat Header */}
              <div className="bg-gray-800 border-b border-gray-700 p-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <MessageCircle size={16} className="text-white" />
                  </div>
                  <h3 className="font-semibold text-white">Messages</h3>
                </div>
                
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                    aria-label={isMinimized ? "Maximize chat" : "Minimize chat"}
                  >
                    {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                  </button>
                  <button
                    onClick={closeChat}
                    className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                    aria-label="Close chat"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Chat Content */}
              {!isMinimized && (
                <div className="flex-1 flex flex-col">
                  {/* Tabs */}
                  <div className="flex border-b border-gray-700">
                    <button
                      onClick={() => setActiveTab('messages')}
                      className={`flex items-center gap-1 px-3 py-3 text-xs font-medium transition-colors flex-1 justify-center ${
                        activeTab === 'messages'
                          ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <ChatBubbleLeftIcon className="w-4 h-4" />
                      <span className="hidden xs:inline">Messages</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('contacts')}
                      className={`flex items-center gap-1 px-3 py-3 text-xs font-medium transition-colors flex-1 justify-center ${
                        activeTab === 'contacts'
                          ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <UserGroupIcon className="w-4 h-4" />
                      <span className="hidden xs:inline">Contacts</span>
                    </button>
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 overflow-hidden">
                    {activeTab === 'messages' ? (
                      <DiscordStyleMessagingInterface className="h-full" />
                    ) : activeTab === 'contacts' ? (
                      <ContactsTabContent />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
                        <MessageCircle size={48} className="mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No conversation selected</p>
                        <p className="text-sm text-center">Select a conversation to start chatting</p>
                        <button
                          onClick={handleBackToList}
                          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Back to Conversations
                        </button>
                      </div>
                    )}
                  </div>
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
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
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
      <div className="w-64 flex flex-col border-r border-gray-700 bg-gray-900">
        {/* Search */}
        <div className="p-3 border-b border-gray-700">
          <ContactSearch />
        </div>

        {/* Contact List */}
        <ContactList className="flex-1" />
      </div>

      {/* Right Panel - Contact Detail or Empty State */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <ContactDetail contact={selectedContact} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-xs"
            >
              {/* Icon */}
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                <span className="text-2xl">📱</span>
              </div>

              {/* Title */}
              <h2 className="text-lg font-semibold text-white mb-2">
                Manage Your Contacts
              </h2>

              {/* Description */}
              <p className="text-gray-400 text-sm leading-relaxed">
                Organize your Web3 connections with custom nicknames, groups, 
                and tags. Click on any contact to start a conversation or edit their 
                details.
              </p>
            </motion.div>
          </div>
        )}
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
