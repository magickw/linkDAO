/**
 * Wallet-to-Wallet Messaging Components
 * Main messaging interface with conversation list and chat view
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Search,
  Settings,
  Phone,
  Video,
  MoreVertical,
  Send,
  Paperclip,
  Smile,
  ShieldCheck as Block,
  Archive,
  Pin,
  X,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Users,
  Star,
  Coins,
  Image as ImageIcon,
  File,
  Volume2,
  VolumeX,
  Bell,
  BellOff
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { GlassPanel, Button } from '../../design-system';
import messagingService, { 
  ChatMessage, 
  ChatConversation, 
  UserPresence 
} from '../../services/messagingService';
import nftNegotiationBot from '../../services/nftNegotiationBot';
import multichainResolver, { ResolvedAddress } from '../../services/multichainResolver';
import notificationService from '../../services/notificationService';
import AddressSearch from './AddressSearch';

interface MessagingInterfaceProps {
  className?: string;
  onClose?: () => void;
  initialConversationId?: string;
}

interface TypingUser {
  address: string;
  conversationId: string;
}

const MessagingInterface: React.FC<MessagingInterfaceProps> = ({
  className = '',
  onClose,
  initialConversationId
}) => {
  const { address, isConnected } = useAccount();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    initialConversationId || null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [userPresence, setUserPresence] = useState<Map<string, UserPresence>>(new Map());
  const [showConversationInfo, setShowConversationInfo] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [showNFTBot, setShowNFTBot] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize messaging service
  useEffect(() => {
    if (typeof window === 'undefined' || !isConnected || !address) return;
    
    initializeMessaging();
  }, [isConnected, address]);

  // Load initial conversation
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    }
  }, [selectedConversation]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeMessaging = async () => {
    try {
      setIsLoading(true);
      
      // Initialize the messaging service with current wallet
      // Note: In a real implementation, you'd pass the actual wallet/signer
      // await messagingService.initialize(wallet);
      
      // Initialize notification service
      await notificationService.initializeService();
      
      // Load conversations
      const convs = messagingService.getConversations();
      setConversations(convs);

      // Load blocked users
      const blocked = messagingService.getBlockedUsers();
      setBlockedUsers(new Set(blocked));

      // Set up event listeners
      setupEventListeners();

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to initialize messaging:', error);
      setIsLoading(false);
    }
  };

  const setupEventListeners = () => {
    // Message events
    messagingService.on('message_received', handleMessageReceived);
    messagingService.on('message_sent', handleMessageSent);
    messagingService.on('message_delivered', handleMessageDelivered);
    messagingService.on('message_read', handleMessageRead);

    // Conversation events
    messagingService.on('conversation_updated', handleConversationUpdated);

    // Typing events
    messagingService.on('user_typing', handleUserTyping);
    messagingService.on('user_stopped_typing', handleUserStoppedTyping);

    // Presence events
    messagingService.on('user_presence', handleUserPresence);

    // Block events
    messagingService.on('user_blocked', handleUserBlocked);
    messagingService.on('user_unblocked', handleUserUnblocked);
  };

  const handleMessageReceived = (message: ChatMessage) => {
    // Show notification
    notificationService.showMessageNotification({
      id: message.id,
      fromAddress: message.fromAddress,
      toAddress: message.toAddress,
      content: message.content,
      messageType: message.messageType,
      timestamp: message.timestamp,
      conversationId: getConversationId(message.fromAddress, message.toAddress)
    });

    // Update conversations list
    const convs = messagingService.getConversations();
    setConversations(convs);

    // Update messages if this conversation is selected
    const conversationId = getConversationId(message.fromAddress, message.toAddress);
    if (selectedConversation === conversationId) {
      const msgs = messagingService.getMessages(conversationId);
      setMessages(msgs);

      // Mark as read if conversation is active
      messagingService.markMessagesAsRead(conversationId);
    }
  };

  const handleMessageSent = (message: ChatMessage) => {
    const conversationId = getConversationId(message.fromAddress, message.toAddress);
    if (selectedConversation === conversationId) {
      const msgs = messagingService.getMessages(conversationId);
      setMessages(msgs);
    }
    
    // Update conversations list
    const convs = messagingService.getConversations();
    setConversations(convs);
  };

  const handleMessageDelivered = (message: ChatMessage) => {
    // Update message status in UI
    setMessages(prev => prev.map(msg => 
      msg.id === message.id ? { ...msg, isDelivered: true } : msg
    ));
  };

  const handleMessageRead = (message: ChatMessage) => {
    // Update message status in UI
    setMessages(prev => prev.map(msg => 
      msg.id === message.id ? { ...msg, isRead: true } : msg
    ));
  };

  const handleConversationUpdated = (conversationId: string) => {
    const convs = messagingService.getConversations();
    setConversations(convs);
  };

  const handleUserTyping = ({ conversationId, userAddress }: { conversationId: string; userAddress: string }) => {
    if (selectedConversation === conversationId) {
      setTypingUsers(prev => new Set([...prev, userAddress]));
    }
  };

  const handleUserStoppedTyping = ({ conversationId, userAddress }: { conversationId: string; userAddress: string }) => {
    if (selectedConversation === conversationId) {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userAddress);
        return newSet;
      });
    }
  };

  const handleUserPresence = (presence: UserPresence) => {
    setUserPresence(prev => new Map(prev.set(presence.address, presence)));
  };

  const handleUserBlocked = (blockedAddress: string) => {
    setBlockedUsers(prev => new Set([...prev, blockedAddress]));
  };

  const handleUserUnblocked = (unblockedAddress: string) => {
    setBlockedUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(unblockedAddress);
      return newSet;
    });
  };

  const loadMessages = (conversationId: string) => {
    const msgs = messagingService.getMessages(conversationId);
    setMessages(msgs);

    // Mark messages as read
    messagingService.markMessagesAsRead(conversationId);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !address) return;

    try {
      const otherParticipant = getOtherParticipant(selectedConversation);
      if (!otherParticipant) return;

      await messagingService.sendMessage(otherParticipant, newMessage.trim());
      setNewMessage('');
      
      // Stop typing indicator
      messagingService.stopTyping(selectedConversation);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Show error toast
    }
  };

  const handleTyping = () => {
    if (!selectedConversation) return;

    // Start typing indicator
    messagingService.startTyping(selectedConversation);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      messagingService.stopTyping(selectedConversation);
    }, 3000);
  };

  const blockUser = async (userAddress: string) => {
    try {
      await messagingService.blockUser(userAddress, 'Blocked by user');
      setShowConversationInfo(false);
    } catch (error) {
      console.error('Failed to block user:', error);
    }
  };

  const unblockUser = async (userAddress: string) => {
    try {
      await messagingService.unblockUser(userAddress);
    } catch (error) {
      console.error('Failed to unblock user:', error);
    }
  };

  const getConversationId = (addr1: string, addr2: string): string => {
    const [a1, a2] = [addr1.toLowerCase(), addr2.toLowerCase()].sort();
    return `${a1}_${a2}`;
  };

  const getOtherParticipant = (conversationId: string): string | null => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation || !address) return null;

    return conversation.participants.find((p: string) => p.toLowerCase() !== address.toLowerCase()) || null;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatAddress = (addr: string): string => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  const getMessageStatus = (message: ChatMessage) => {
    if (message.fromAddress !== address?.toLowerCase()) return null;
    
    if (message.isRead) return <CheckCircle2 size={14} className="text-blue-400" />;
    if (message.isDelivered) return <CheckCircle2 size={14} className="text-gray-400" />;
    return <Clock size={14} className="text-gray-400" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`flex h-[600px] bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* Conversations Sidebar */}
      <div className="w-80 border-r border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <MessageCircle size={20} className="mr-2" />
              Messages
            </h2>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="small" 
                className="p-2"
                onClick={() => setShowAddressSearch(true)}
                title="New Conversation"
              >
                <User size={16} />
              </Button>
              <Button 
                variant="outline" 
                size="small" 
                className="p-2"
                onClick={() => setShowNFTBot(true)}
                title="NFT Negotiation Bot"
              >
                <Coins size={16} />
              </Button>
              <Button variant="outline" size="small" className="p-2">
                <Settings size={16} />
              </Button>
              {onClose && (
                <Button variant="outline" size="small" onClick={onClose} className="p-2">
                  <X size={16} />
                </Button>
              )}
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <MessageCircle size={48} className="mb-2 opacity-50" />
              <p>No conversations yet</p>
              <p className="text-sm">Send a message to start chatting</p>
            </div>
          ) : (
            conversations
              .filter(conv => {
                if (!searchQuery) return true;
                const otherParticipant = conv.participants.find(p => 
                  p.toLowerCase() !== address?.toLowerCase()
                );
                return otherParticipant?.toLowerCase().includes(searchQuery.toLowerCase());
              })
              .map(conversation => {
                const otherParticipant = conversation.participants.find(p => 
                  p.toLowerCase() !== address?.toLowerCase()
                );
                const isOnline = userPresence.get(otherParticipant || '')?.isOnline;
                const isBlocked = blockedUsers.has(otherParticipant || '');

                return (
                  <motion.div
                    key={conversation.id}
                    className={`p-4 border-b border-gray-700 cursor-pointer transition-colors ${
                      selectedConversation === conversation.id ? 'bg-blue-600/20' : 'hover:bg-gray-800'
                    } ${isBlocked ? 'opacity-50' : ''}`}
                    onClick={() => setSelectedConversation(conversation.id)}
                    whileHover={{ backgroundColor: 'rgba(75, 85, 99, 0.5)' }}
                  >
                    <div className="flex items-center space-x-3">
                      {/* Avatar */}
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <User size={20} className="text-white" />
                        </div>
                        {isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-gray-900 rounded-full"></div>
                        )}
                      </div>

                      {/* Conversation Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-white text-sm">
                              {formatAddress(otherParticipant || '')}
                            </p>
                            {conversation.isPinned && (
                              <Pin size={12} className="text-yellow-500" />
                            )}
                            {isBlocked && (
                              <Block size={12} className="text-red-500" />
                            )}
                          </div>
                          <span className="text-xs text-gray-400">
                            {conversation.lastMessage && formatTime(conversation.lastMessage.timestamp)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-sm text-gray-400 truncate">
                            {conversation.lastMessage?.content || 'No messages yet'}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-700 bg-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <User size={16} className="text-white" />
                    </div>
                    {userPresence.get(getOtherParticipant(selectedConversation) || '')?.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border border-gray-800 rounded-full"></div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-white">
                      {formatAddress(getOtherParticipant(selectedConversation) || '')}
                    </h3>
                    {typingUsers.size > 0 && (
                      <p className="text-xs text-blue-400">Typing...</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="small" className="p-2">
                    <Phone size={16} />
                  </Button>
                  <Button variant="outline" size="small" className="p-2">
                    <Video size={16} />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="small" 
                    className="p-2"
                    onClick={() => setShowConversationInfo(!showConversationInfo)}
                  >
                    <MoreVertical size={16} />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => {
                const isOwn = message.fromAddress === address?.toLowerCase();
                const showAvatar = index === 0 || 
                  messages[index - 1].fromAddress !== message.fromAddress ||
                  (message.timestamp.getTime() - messages[index - 1].timestamp.getTime()) > 300000; // 5 minutes

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
                      {/* Avatar */}
                      {!isOwn && showAvatar && (
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <User size={12} className="text-white" />
                        </div>
                      )}
                      {!isOwn && !showAvatar && <div className="w-6" />}

                      {/* Message */}
                      <div className="relative">
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            isOwn
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-white'
                          }`}
                        >
                          {/* NFT Offer Messages */}
                          {message.messageType === 'nft_offer' && message.metadata && (
                            <div className="mb-2 p-3 bg-black/20 rounded-lg">
                              <div className="flex items-center space-x-2 mb-2">
                                <Coins size={16} className="text-yellow-500" />
                                <span className="text-sm font-medium">NFT Offer</span>
                              </div>
                              <p className="text-sm">
                                Token #{message.metadata.nftTokenId}
                              </p>
                              <p className="text-lg font-bold">
                                {message.metadata.offerAmount} ETH
                              </p>
                              {!isOwn && (
                                <div className="flex space-x-2 mt-2">
                                  <Button 
                                    variant="primary" 
                                    size="small"
                                    onClick={() => {
                                      // Accept offer
                                      const otherParticipant = getOtherParticipant(selectedConversation);
                                      if (otherParticipant) {
                                        messagingService.sendMessage(
                                          otherParticipant,
                                          'Offer accepted! 🎉',
                                          'text'
                                        );
                                      }
                                    }}
                                  >
                                    Accept
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="small"
                                    onClick={() => {
                                      // Counter offer
                                      const counterAmount = prompt('Enter counter offer (ETH):');
                                      const otherParticipant = getOtherParticipant(selectedConversation);
                                      if (counterAmount && otherParticipant) {
                                        messagingService.sendNFTCounter(
                                          otherParticipant,
                                          message.id,
                                          counterAmount,
                                          `Counter offer: ${counterAmount} ETH`
                                        );
                                      }
                                    }}
                                  >
                                    Counter
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* NFT Counter Offer Messages */}
                          {message.messageType === 'nft_counter' && message.metadata && (
                            <div className="mb-2 p-3 bg-purple-500/20 rounded-lg">
                              <div className="flex items-center space-x-2 mb-2">
                                <Star size={16} className="text-purple-400" />
                                <span className="text-sm font-medium">Counter Offer</span>
                              </div>
                              <p className="text-lg font-bold">
                                {message.metadata.offerAmount} ETH
                              </p>
                            </div>
                          )}

                          {/* System Messages */}
                          {message.messageType === 'system' && message.metadata?.rewardAmount && (
                            <div className="mb-2 p-3 bg-green-500/20 rounded-lg">
                              <div className="flex items-center space-x-2 mb-2">
                                <Coins size={16} className="text-green-400" />
                                <span className="text-sm font-medium">Reward Received</span>
                              </div>
                              <p className="text-sm">
                                {message.metadata.rewardAmount} ETH testnet reward
                              </p>
                              {message.metadata.transactionHash && (
                                <Button
                                  variant="outline"
                                  size="small"
                                  className="mt-2"
                                  onClick={() => {
                                    window.open(`https://etherscan.io/tx/${message.metadata?.transactionHash}`, '_blank');
                                  }}
                                >
                                  View Transaction
                                </Button>
                              )}
                            </div>
                          )}

                          <p className="text-sm">{message.content}</p>
                        </div>

                        {/* Message Status */}
                        <div className={`flex items-center space-x-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-xs text-gray-400">
                            {formatTime(message.timestamp)}
                          </span>
                          {getMessageStatus(message)}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              
              {/* Typing Indicator */}
              {typingUsers.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <User size={12} className="text-white" />
                    </div>
                    <div className="bg-gray-700 px-4 py-2 rounded-2xl">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-700 bg-gray-800">
              <div className="flex items-center space-x-3">
                <Button variant="outline" size="small" className="p-2">
                  <Paperclip size={16} />
                </Button>
                
                <div className="flex-1 relative">
                  <textarea
                    ref={messageInputRef}
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none max-h-20"
                    rows={1}
                  />
                </div>

                <Button variant="outline" size="small" className="p-2">
                  <Smile size={16} />
                </Button>

                <Button 
                  variant="outline" 
                  size="small" 
                  className="p-2"
                  onClick={() => {
                    const otherParticipant = getOtherParticipant(selectedConversation);
                    if (otherParticipant) {
                      const tokenId = prompt('Enter NFT Token ID:');
                      const offerAmount = prompt('Enter offer amount (ETH):');
                      if (tokenId && offerAmount) {
                        messagingService.sendNFTOffer(
                          otherParticipant,
                          '0x123...', // Mock contract address
                          tokenId,
                          offerAmount,
                          `I'd like to offer ${offerAmount} ETH for token #${tokenId}`
                        );
                      }
                    }
                  }}
                  title="Send NFT Offer"
                >
                  <Coins size={16} />
                </Button>

                <Button 
                  variant="primary" 
                  size="small" 
                  className="p-2"
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                >
                  <Send size={16} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* No Conversation Selected */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <MessageCircle size={64} className="mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p>Choose a conversation from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Conversation Info Sidebar */}
      <AnimatePresence>
        {showConversationInfo && selectedConversation && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="w-80 border-l border-gray-700 bg-gray-800 p-4"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Conversation Info</h3>
              <Button 
                variant="outline" 
                size="small" 
                onClick={() => setShowConversationInfo(false)}
                className="p-2"
              >
                <X size={16} />
              </Button>
            </div>

            {/* User Info */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <User size={24} className="text-white" />
              </div>
              <h4 className="font-medium text-white">
                {formatAddress(getOtherParticipant(selectedConversation) || '')}
              </h4>
              <p className="text-sm text-gray-400">
                {userPresence.get(getOtherParticipant(selectedConversation) || '')?.isOnline 
                  ? 'Online' 
                  : 'Offline'
                }
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Shield size={16} className="mr-2" />
                View Profile
              </Button>
              
              <Button variant="outline" className="w-full justify-start">
                <Pin size={16} className="mr-2" />
                Pin Conversation
              </Button>
              
              <Button variant="outline" className="w-full justify-start">
                <Archive size={16} className="mr-2" />
                Archive
              </Button>
              
              <Button variant="outline" className="w-full justify-start">
                <Bell size={16} className="mr-2" />
                Mute Notifications
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start text-red-400 border-red-400 hover:bg-red-500/10"
                onClick={() => {
                  const otherParticipant = getOtherParticipant(selectedConversation);
                  if (otherParticipant) {
                    blockUser(otherParticipant);
                  }
                }}
              >
                <Block size={16} className="mr-2" />
                Block User
              </Button>
            </div>

            {/* Security Notice */}
            <div className="mt-6 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center space-x-2 text-green-400 mb-2">
                <Shield size={16} />
                <span className="text-sm font-medium">End-to-End Encrypted</span>
              </div>
              <p className="text-xs text-gray-400">
                Messages are encrypted and can only be read by you and the recipient.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Address Search Modal */}
      <AnimatePresence>
        {showAddressSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowAddressSearch(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <AddressSearch
                onAddressSelect={async (address: ResolvedAddress) => {
                  // Start a new conversation with the selected address
                  const conversationId = getConversationId(address.normalizedAddress, address.normalizedAddress);
                  setSelectedConversation(conversationId);
                  
                  // Create conversation if it doesn't exist
                  const existing = conversations.find(c => c.id === conversationId);
                  if (!existing) {
                    // Send initial message to create conversation
                    await messagingService.sendMessage(
                      address.normalizedAddress,
                      'Hello! 👋',
                      'text'
                    );
                  }
                }}
                onClose={() => setShowAddressSearch(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NFT Bot Modal */}
      <AnimatePresence>
        {showNFTBot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowNFTBot(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <Coins size={20} className="mr-2 text-yellow-500" />
                  NFT Negotiation Bot
                </h3>
                <Button variant="outline" size="small" onClick={() => setShowNFTBot(false)} className="p-2">
                  <X size={16} />
                </Button>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-300 text-sm">
                  Chat with our AI bot to negotiate NFT deals and earn testnet ETH rewards!
                </p>
                
                <div className="bg-gray-800 p-3 rounded-lg">
                  <p className="text-white font-medium mb-2">Bot Address:</p>
                  <p className="text-blue-400 text-sm font-mono">game.etherscan.eth</p>
                </div>

                <div className="space-y-2">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={async () => {
                      const botAddress = 'game.etherscan.eth';
                      const conversationId = getConversationId(address?.toLowerCase() || '', botAddress.toLowerCase());
                      setSelectedConversation(conversationId);
                      setShowNFTBot(false);
                      
                      // Start conversation with bot
                      await nftNegotiationBot.startNegotiation(address?.toLowerCase() || '', '0x1');
                    }}
                  >
                    Start Negotiation
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      // Show available NFTs
                      const nfts = nftNegotiationBot.getAvailableNFTs();
                      alert(`Available NFTs:\n${nfts.map(nft => `${nft.data.name}: ${nft.data.currentPrice} ETH`).join('\n')}`);
                    }}
                  >
                    View Available NFTs
                  </Button>
                </div>

                <div className="text-xs text-gray-400 text-center">
                  💰 Earn testnet ETH for successful negotiations!
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessagingInterface;