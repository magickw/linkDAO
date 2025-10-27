import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FixedSizeList as List } from 'react-window';
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
  BellOff,
  Loader2
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { GlassPanel, Button } from '../../design-system';
import { useToast } from '@/context/ToastContext';
import { MessageItem } from './MessageItem';
import messagingService, {
  ChatMessage,
  ChatConversation,
  UserPresence
} from '../../services/messagingService';
import { useChatHistory } from '../../hooks/useChatHistory';
import nftNegotiationBot from '../../services/nftNegotiationBot';
import multichainResolver, { ResolvedAddress } from '../../services/multichainResolver';
import notificationService from '../../services/notificationService';
import AddressSearch from './AddressSearch';
import { VoiceMessageRecorder } from './VoiceMessageRecorder';
import { SwipeableMessage } from './SwipeableMessage';
import { GroupManagement } from './GroupManagement';

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
  // Local UI state (kept for selection and UI flags). Actual data comes from useChatHistory.
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    initialConversationId || null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageSearchQuery, setMessageSearchQuery] = useState(''); // Add this for message search
  const [isLoading, setIsLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [userPresence, setUserPresence] = useState<Map<string, UserPresence>>(new Map());
  const [showConversationInfo, setShowConversationInfo] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [showNFTBot, setShowNFTBot] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showGroupManagement, setShowGroupManagement] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const { addToast } = useToast();

  // Chat history hook (drives conversations/messages from backend)
  const chat = useChatHistory();
  const {
    messages: hookMessages,
    conversations: hookConversations,
    loading: chatLoading,
    conversationsLoading,
    hasMoreConversations,
    loadMessages: loadMessagesHook,
    sendMessage: sendMessageHook,
    markAsRead: markAsReadHook,
    loadMoreConversations
  } = chat;

  // Initialize messaging service (real-time) and sync initial data from hook
  useEffect(() => {
    if (typeof window === 'undefined' || !isConnected || !address) return;
    initializeMessaging();
  }, [isConnected, address]);

  // Keep UI conversations/messages in sync with the chatHistory hook
  // Transform hook (backend) conversation/message shapes into the UI's ChatConversation/ChatMessage
  useEffect(() => {
    if (!hookConversations) {
      setConversations([]);
      return;
    }

    const transformed = hookConversations.map(conv => ({
      id: conv.id,
      participants: conv.participants,
      lastMessage: conv.lastMessage as any,
      lastActivity: new Date(conv.lastActivity),
      unreadCount: conv.unreadCounts?.[address || ''] || 0,
      isBlocked: false,
      isPinned: false,
      metadata: (conv as any).metadata || {},
      isDirectMessage: conv.metadata?.type === 'direct',
      participantStatus: {}
    } as ChatConversation));

    setConversations(transformed);
  }, [hookConversations]);

  useEffect(() => {
    if (!hookMessages) {
      setMessages([]);
      return;
    }

    const transformedMsgs = hookMessages.map(m => ({
      id: m.id,
      fromAddress: m.fromAddress,
      toAddress: (m as any).toAddress || undefined,
      content: m.content,
      encryptedContent: (m as any).encryptedContent,
      timestamp: new Date(m.timestamp),
      messageType: (m as any).messageType || 'text',
      isEncrypted: !!(m as any).isEncrypted,
      isRead: (m as any).isRead || false,
      isDelivered: (m as any).isDelivered || false,
      metadata: (m as any).metadata || {}
    } as ChatMessage));

    setMessages(transformedMsgs);
  }, [hookMessages]);

  const handleAddReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      // In a real implementation, this would call the chat history service
      // For now, we'll just log it
      console.log(`Adding reaction ${emoji} to message ${messageId}`);
      
      // Update local state to show the reaction
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          // Add reaction to metadata
          const reactions = (msg.metadata as any)?.reactions || [];
          const existingReaction = reactions.find((r: any) => r.emoji === emoji);
          
          if (existingReaction) {
            // Increment count
            return {
              ...msg,
              metadata: {
                ...msg.metadata,
                reactions: reactions.map((r: any) => 
                  r.emoji === emoji ? { ...r, count: r.count + 1 } : r
                )
              }
            };
          } else {
            // Add new reaction
            return {
              ...msg,
              metadata: {
                ...msg.metadata,
                reactions: [...reactions, { emoji, count: 1 }]
              }
            };
          }
        }
        return msg;
      }));
      
      // In a real implementation, you would call:
      // await chat.addReaction(messageId, emoji);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  }, []);

  const handleEditMessage = useCallback(async (messageId: string, newContent: string) => {
    try {
      // In a real implementation, this would call the chat history service
      // For now, we'll just update local state
      console.log(`Editing message ${messageId} with content: ${newContent}`);
      
      // Update local state
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            content: newContent,
            // Add edited timestamp to metadata
            metadata: {
              ...msg.metadata,
              editedAt: new Date()
            }
          };
        }
        return msg;
      }));
      
      // In a real implementation, you would call:
      // await chat.editMessage(messageId, newContent);
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  }, []);

  const handleSendVoiceMessage = async (audioBlob: Blob) => {
    if (!selectedConversation) return;
    
    try {
      // In a real implementation, you would upload the audio file and send a message
      // For now, we'll just create a mock voice message
      console.log('Sending voice message');
      
      // Create a mock URL for the audio (in real implementation, this would be from your backend)
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create a mock message
      const mockVoiceMessage: ChatMessage = {
        id: `voice-${Date.now()}`,
        fromAddress: address?.toLowerCase() || '',
        toAddress: getOtherParticipant(selectedConversation) || '',
        content: 'Voice message',
        timestamp: new Date(),
        messageType: 'file',
        isEncrypted: false,
        isRead: false,
        isDelivered: false,
        metadata: {
          audioUrl,
          duration: 10 // Mock duration
        }
      };
      
      // Add to local messages
      setMessages(prev => [mockVoiceMessage, ...prev]);
      
      // In a real implementation, you would:
      // 1. Upload the audio file to your backend
      // 2. Get the URL of the uploaded file
      // 3. Send a message with the audio URL
      // await chat.sendMessage({
      //   conversationId: selectedConversation,
      //   fromAddress: address?.toLowerCase() || '',
      //   content: 'Voice message',
      //   contentType: 'voice',
      //   deliveryStatus: 'sent'
      // });
    } catch (error) {
      console.error('Failed to send voice message:', error);
    }
  };

  // Filter messages based on search query
  const filteredMessages = useMemo(() => {
    if (!messageSearchQuery) return messages;
    
    return messages.filter(message => 
      message.content.toLowerCase().includes(messageSearchQuery.toLowerCase())
    );
  }, [messages, messageSearchQuery]);

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
      // Service is initialized automatically
      
      // chatHistoryService will load conversations on mount via the hook
      // Load blocked users from real-time service (local store)
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
    // Load messages via hook-backed API
    loadMessagesHook({ conversationId, limit: 50 }).catch(console.error);
    // Mark as read through the hook service (non-blocking)
    markAsReadHook(conversationId, []).catch(() => {});
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !address) return;

    try {
      const otherParticipant = getOtherParticipant(selectedConversation);
      if (!otherParticipant) return;

      await sendMessageHook({
        conversationId: selectedConversation,
        fromAddress: address.toLowerCase(),
        content: newMessage.trim(),
        contentType: 'text',
        deliveryStatus: 'sent'
      });

      setNewMessage('');

      // Stop typing indicator via real-time service
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

  // Row component for react-window virtualization
  const Row: React.FC<{
    index: number;
    style: React.CSSProperties;
    data: {
      messages: ChatMessage[];
      address: string | undefined;
      formatTime: (date: Date) => string;
      getMessageStatus: (message: ChatMessage) => React.ReactNode;
      getOtherParticipant: (conversationId: string | null) => string | null;
      selectedConversation: string | null;
      onAddReaction: (messageId: string, emoji: string) => void;
      onEditMessage: (messageId: string, newContent: string) => void;
      onDeleteMessage: (messageId: string) => void;
      onReplyToMessage: (message: ChatMessage) => void;
    };
  }> = ({ index, style, data }) => {
    const message = data.messages[index];
    const isOwn = message.fromAddress === data.address?.toLowerCase();
    
    return (
      <div style={style} className="px-4">
        <SwipeableMessage
          message={message}
          isOwn={isOwn}
          onDelete={() => data.onDeleteMessage(message.id)}
          onReply={() => data.onReplyToMessage(message)}
        >
          <MessageItem
            message={message}
            isOwn={isOwn}
            showAvatar={true}
            timestamp={data.formatTime(message.timestamp)}
            status={data.getMessageStatus(message)}
          />
        </SwipeableMessage>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col md:flex-row h-screen md:h-[calc(100vh-4rem)] lg:h-[600px] bg-gray-900 md:rounded-lg overflow-hidden ${className}`}>
      {/* Conversations Sidebar */}
      <div className={`${showMobileSidebar || !selectedConversation ? 'flex' : 'hidden'} md:flex w-full md:w-80 border-r border-gray-700 flex-col`}>
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base sm:text-lg font-semibold text-white flex items-center">
              <MessageCircle size={18} className="mr-2 sm:w-5 sm:h-5" />
              Messages
            </h2>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Button
                variant="outline"
                size="small"
                className="p-1.5 sm:p-2"
                onClick={() => setShowAddressSearch(true)}
                title="New Conversation"
              >
                <User size={14} className="sm:w-4 sm:h-4" />
              </Button>
              <Button
                variant="outline"
                size="small"
                className="p-1.5 sm:p-2"
                onClick={() => setShowNFTBot(true)}
                title="NFT Negotiation Bot"
              >
                <Coins size={14} className="sm:w-4 sm:h-4" />
              </Button>
              <Button variant="outline" size="small" className="p-1.5 sm:p-2 hidden sm:flex">
                <Settings size={14} className="sm:w-4 sm:h-4" />
              </Button>
              {onClose && (
                <Button variant="outline" size="small" onClick={onClose} className="p-1.5 sm:p-2">
                  <X size={14} className="sm:w-4 sm:h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 text-sm bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Conversations List - Paginated */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <MessageCircle size={48} className="mb-2 opacity-50" />
              <p>No conversations yet</p>
              <p className="text-sm">Send a message to start chatting</p>
            </div>
          ) : (
            <>
              {conversations
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
                      className={`p-3 sm:p-4 border-b border-gray-700 cursor-pointer transition-colors ${
                        selectedConversation === conversation.id ? 'bg-blue-600/20' : 'hover:bg-gray-800'
                      } ${isBlocked ? 'opacity-50' : ''}`}
                      onClick={() => {
                        setSelectedConversation(conversation.id);
                        setShowMobileSidebar(false);
                      }}
                      whileHover={{ backgroundColor: 'rgba(75, 85, 99, 0.5)' }}
                    >
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <User size={16} className="text-white sm:w-5 sm:h-5" />
                          </div>
                          {isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 border-2 border-gray-900 rounded-full"></div>
                          )}
                        </div>

                        {/* Conversation Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1 sm:space-x-2">
                              <p className="font-medium text-white text-xs sm:text-sm truncate">
                                {formatAddress(otherParticipant || '')}
                              </p>
                              {conversation.isPinned && (
                                <Pin size={10} className="text-yellow-500 sm:w-3 sm:h-3 flex-shrink-0" />
                              )}
                              {isBlocked && (
                                <Block size={10} className="text-red-500 sm:w-3 sm:h-3 flex-shrink-0" />
                              )}
                            </div>
                            <span className="text-[10px] sm:text-xs text-gray-400 flex-shrink-0 ml-2">
                              {conversation.lastMessage && formatTime(conversation.lastMessage.timestamp)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between mt-0.5 sm:mt-1">
                            <p className="text-xs sm:text-sm text-gray-400 truncate">
                              {conversation.lastMessage?.content || 'No messages yet'}
                            </p>
                            {conversation.unreadCount > 0 && (
                              <span className="bg-blue-500 text-white text-[10px] sm:text-xs rounded-full px-1.5 sm:px-2 py-0.5 min-w-[18px] sm:min-w-[20px] text-center flex-shrink-0 ml-2">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

              {/* Load More Button */}
              {hasMoreConversations && (
                <div className="p-4 border-t border-gray-700">
                  <Button
                    variant="outline"
                    size="small"
                    className="w-full flex items-center justify-center gap-2"
                    onClick={loadMoreConversations}
                    disabled={conversationsLoading}
                  >
                    {conversationsLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More Conversations'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${!showMobileSidebar && selectedConversation ? 'flex' : 'hidden'} md:flex flex-1 flex-col w-full`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-3 sm:p-4 border-b border-gray-700 bg-gray-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  {/* Mobile Back Button */}
                  <Button
                    variant="outline"
                    size="small"
                    className="p-1.5 md:hidden"
                    onClick={() => setShowMobileSidebar(true)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </Button>

                  <div className="relative flex-shrink-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <User size={14} className="text-white sm:w-4 sm:h-4" />
                    </div>
                    {userPresence.get(getOtherParticipant(selectedConversation) || '')?.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-500 border border-gray-800 rounded-full"></div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-white text-sm sm:text-base truncate">
                      {formatAddress(getOtherParticipant(selectedConversation) || '')}
                    </h3>
                    {typingUsers.size > 0 && (
                      <p className="text-[10px] sm:text-xs text-blue-400">Typing...</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1 sm:space-x-2">
                  <Button variant="outline" size="small" className="p-1.5 sm:p-2 hidden sm:flex">
                    <Phone size={14} className="sm:w-4 sm:h-4" />
                  </Button>
                  <Button variant="outline" size="small" className="p-1.5 sm:p-2 hidden sm:flex">
                    <Video size={14} className="sm:w-4 sm:h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="small"
                    className="p-1.5 sm:p-2"
                    onClick={() => setShowConversationInfo(!showConversationInfo)}
                  >
                    <MoreVertical size={14} className="sm:w-4 sm:h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Message Search */}
              <div className="relative mt-2">
                <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={messageSearchQuery}
                  onChange={(e) => setMessageSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredMessages.length > 0 ? (
                <List
                  height={400}
                  itemCount={filteredMessages.length}
                  itemSize={80}
                  itemData={{
                    messages: filteredMessages,
                    address,
                    formatTime,
                    getMessageStatus,
                    getOtherParticipant,
                    selectedConversation,
                    onAddReaction: handleAddReaction,
                    onEditMessage: handleEditMessage,
                    onDeleteMessage: handleDeleteMessage,
                    onReplyToMessage: handleReplyToMessage
                  }}
                  width="100%"
                >
                  {Row}
                </List>
              ) : null}
              
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
            <div className="p-2 sm:p-4 border-t border-gray-700 bg-gray-800">
              <div className="flex items-center space-x-1 sm:space-x-3">
                <Button variant="outline" size="small" className="p-1.5 sm:p-2 hidden sm:flex">
                  <Paperclip size={14} className="sm:w-4 sm:h-4" />
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
                    className="w-full px-3 sm:px-4 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none max-h-20"
                    rows={1}
                  />
                </div>

                <Button variant="outline" size="small" className="p-1.5 sm:p-2 hidden sm:flex">
                  <Smile size={14} className="sm:w-4 sm:h-4" />
                </Button>

                <Button
                  variant="outline"
                  size="small"
                  className="p-1.5 sm:p-2"
                  onClick={() => setShowVoiceRecorder(true)}
                  title="Send Voice Message"
                >
                  <Volume2 size={14} className="sm:w-4 sm:h-4" />
                </Button>

                <Button
                  variant="outline"
                  size="small"
                  className="p-1.5 sm:p-2 hidden sm:flex"
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
                  <Coins size={14} className="sm:w-4 sm:h-4" />
                </Button>

                <Button
                  variant="primary"
                  size="small"
                  className="p-1.5 sm:p-2"
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                >
                  <Send size={14} className="sm:w-4 sm:h-4" />
                </Button>
              </div>
            </div>

            {/* Voice Message Recorder */}
            {showVoiceRecorder && (
              <div className="p-2 sm:p-4 border-t border-gray-700 bg-gray-800">
                <VoiceMessageRecorder
                  onSend={handleSendVoiceMessage}
                  onCancel={() => setShowVoiceRecorder(false)}
                />
              </div>
            )}
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
        {showConversationInfo && selectedConversation && !showGroupManagement && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="absolute md:relative right-0 top-0 h-full w-full sm:w-80 md:w-80 border-l border-gray-700 bg-gray-800 p-3 sm:p-4 z-10"
          >
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-white">Conversation Info</h3>
              <Button
                variant="outline"
                size="small"
                onClick={() => setShowConversationInfo(false)}
                className="p-1.5 sm:p-2"
              >
                <X size={14} className="sm:w-4 sm:h-4" />
              </Button>
            </div>

            {/* User Info */}
            <div className="text-center mb-4 sm:mb-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                <User size={20} className="text-white sm:w-6 sm:h-6" />
              </div>
              <h4 className="font-medium text-white text-sm sm:text-base">
                {formatAddress(getOtherParticipant(selectedConversation) || '')}
              </h4>
              <p className="text-xs sm:text-sm text-gray-400">
                {userPresence.get(getOtherParticipant(selectedConversation) || '')?.isOnline
                  ? 'Online'
                  : 'Offline'
                }
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-2 sm:space-y-3">
              <Button variant="outline" className="w-full justify-start text-sm">
                <Shield size={14} className="mr-2 sm:w-4 sm:h-4" />
                View Profile
              </Button>

              <Button 
                variant="outline" 
                className="w-full justify-start text-sm"
                onClick={() => setShowGroupManagement(true)}
              >
                <Settings size={14} className="mr-2 sm:w-4 sm:h-4" />
                Group Settings
              </Button>

              <Button variant="outline" className="w-full justify-start text-sm">
                <Pin size={14} className="mr-2 sm:w-4 sm:h-4" />
                Pin Conversation
              </Button>

              <Button variant="outline" className="w-full justify-start text-sm">
                <Archive size={14} className="mr-2 sm:w-4 sm:h-4" />
                Archive
              </Button>

              <Button variant="outline" className="w-full justify-start text-sm">
                <Bell size={14} className="mr-2 sm:w-4 sm:h-4" />
                Mute Notifications
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start text-red-400 border-red-400 hover:bg-red-500/10 text-sm"
                onClick={() => {
                  const otherParticipant = getOtherParticipant(selectedConversation);
                  if (otherParticipant) {
                    blockUser(otherParticipant);
                  }
                }}
              >
                <Block size={14} className="mr-2 sm:w-4 sm:h-4" />
                Block User
              </Button>
            </div>

            {/* Security Notice */}
            <div className="mt-4 sm:mt-6 p-2 sm:p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center space-x-2 text-green-400 mb-1 sm:mb-2">
                <Shield size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">End-to-End Encrypted</span>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-400">
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
                      addToast(`Available NFTs:\n${nfts.map(nft => `${nft.data.name}: ${nft.data.currentPrice} ETH`).join('\n')}`, 'info');
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

      {/* Group Management Modal */}
      <AnimatePresence>
        {showGroupManagement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowGroupManagement(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-lg mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <Users size={20} className="mr-2 text-blue-400" />
                  Group Management
                </h3>
                <Button variant="outline" size="small" onClick={() => setShowGroupManagement(false)} className="p-2">
                  <X size={16} />
                </Button>
              </div>
              
              <GroupManagement
                conversationId={selectedConversation}
                onAddMember={handleAddMember}
                onRemoveMember={handleRemoveMember}
                onUpdateRole={handleUpdateRole}
                onUpdateGroupName={handleUpdateGroupName}
                onLeaveGroup={handleLeaveGroup}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessagingInterface;

const Row: React.FC<{
  index: number;
  style: React.CSSProperties;
  data: {
    messages: ChatMessage[];
    address: string | undefined;
    formatTime: (date: Date) => string;
    getMessageStatus: (message: ChatMessage) => React.ReactNode;
    getOtherParticipant: (conversationId: string | null) => string | null;
    selectedConversation: string | null;
    onAddReaction: (messageId: string, emoji: string) => void;
    onEditMessage: (messageId: string, newContent: string) => void;
    onDeleteMessage: (messageId: string) => void;
    onReplyToMessage: (message: ChatMessage) => void;
  };
}> = ({ index, style, data }) => {
  const message = data.messages[index];
  const isOwn = message.fromAddress === data.address?.toLowerCase();
  const showAvatar = index === 0 || 
    data.messages[index - 1].fromAddress !== message.fromAddress ||
    (message.timestamp.getTime() - data.messages[index - 1].timestamp.getTime()) > 300000; // 5 minutes

  return (
    <div style={style}>
      <SwipeableMessage
        message={message}
        isOwn={isOwn}
        showAvatar={showAvatar}
        formatTime={data.formatTime}
        getMessageStatus={data.getMessageStatus}
        getOtherParticipant={data.getOtherParticipant}
        selectedConversation={data.selectedConversation}
        onAddReaction={data.onAddReaction}
        onEditMessage={data.onEditMessage}
        onDeleteMessage={data.onDeleteMessage}
        onReplyToMessage={data.onReplyToMessage}
      />
    </div>
  );
};

const handleDeleteMessage = useCallback(async (messageId: string) => {
  try {
    // In a real implementation, this would call the chat history service
    // For now, we'll just update local state
    console.log(`Deleting message ${messageId}`);
    
    // Update local state
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    
    // In a real implementation, you would call:
    // await chat.deleteMessage(messageId);
  } catch (error) {
    console.error('Failed to delete message:', error);
  }
}, []);

const handleReplyToMessage = useCallback((message: ChatMessage) => {
  // Set the message as a reply in the input
  setNewMessage(`> ${message.content}\n\n`);
  // Focus the input
  messageInputRef.current?.focus();
}, []);

  // Group management functions
  const handleAddMember = useCallback((address: string) => {
    // In a real implementation, this would call the backend
    console.log(`Adding member ${address} to group`);
    // Update local state
    // setConversations(prev => prev.map(conv => {
    //   if (conv.id === selectedConversation) {
    //     return {
    //       ...conv,
    //       participants: [...conv.participants, address]
    //     };
    //   }
    //   return conv;
    // }));
  }, [selectedConversation]);

  const handleRemoveMember = useCallback((address: string) => {
    // In a real implementation, this would call the backend
    console.log(`Removing member ${address} from group`);
    // Update local state
    // setConversations(prev => prev.map(conv => {
    //   if (conv.id === selectedConversation) {
    //     return {
    //       ...conv,
    //       participants: conv.participants.filter(p => p !== address)
    //     };
    //   }
    //   return conv;
    // }));
  }, [selectedConversation]);

  const handleUpdateRole = useCallback((address: string, role: 'admin' | 'member') => {
    // In a real implementation, this would call the backend
    console.log(`Updating role for ${address} to ${role}`);
  }, []);

  const handleUpdateGroupName = useCallback((name: string) => {
    // In a real implementation, this would call the backend
    console.log(`Updating group name to ${name}`);
    // Update local state
    // setConversations(prev => prev.map(conv => {
    //   if (conv.id === selectedConversation) {
    //     return {
    //       ...conv,
    //       metadata: {
    //         ...conv.metadata,
    //         title: name
    //       }
    //     };
    //   }
    //   return conv;
    // }));
  }, [selectedConversation]);

  const handleLeaveGroup = useCallback(() => {
    // In a real implementation, this would call the backend
    console.log('Leaving group');
    setShowGroupManagement(false);
  }, []);
