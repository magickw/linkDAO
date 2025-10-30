/**
 * Enhanced DiscordStyleMessagingInterface - Phase 1 Fixes
 * - Consolidated auth to useWalletAuth
 * - Added WebSocket integration for real-time updates
 * - Integrated type adapters for proper Message handling
 * - Added connection status indicator
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle, Search, Send, User, Plus, Hash, Lock,
  ThumbsUp, Heart, Zap, Rocket, Globe, Users, X, ChevronDown, ChevronRight,
  Image, Link as LinkIcon, Wallet, Vote, Calendar, Tag, Settings, ArrowLeftRight,
  Phone, Video, Shield, ArrowLeft, Wifi, WifiOff, Loader2, AlertCircle
} from 'lucide-react';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import CrossChainBridge from './CrossChainBridge';
import useENSIntegration from '../../hooks/useENSIntegration';
import { useChatHistory } from '@/hooks/useChatHistory';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import Web3SwipeGestureHandler from '@/components/Mobile/Web3SwipeGestureHandler';
import { motion, PanInfo } from 'framer-motion';
import { messageToChannelMessage, channelMessageToMessage, ChannelMessage } from '@/types/messaging-adapters';

interface ChatChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  memberCount: number;
  unreadCount: number;
  isPinned?: boolean;
  topic?: string;
  category?: string;
  icon?: string;
  isGated?: boolean;
  gateType?: 'nft' | 'token' | 'role';
  gateRequirement?: string;
}

interface DirectMessageConversation {
  id: string;
  participant: string;
  participantEnsName?: string;
  isOnline: boolean;
  isTyping?: boolean;
  lastSeen?: Date;
  unreadCount: number;
  lastMessage?: ChannelMessage;
  isPinned?: boolean;
}

interface ChannelMember {
  address: string;
  name: string;
  status: 'online' | 'idle' | 'busy' | 'offline';
  role: 'admin' | 'moderator' | 'holder' | 'builder' | 'member';
  ensName?: string;
  avatar?: string;
  balance?: {
    eth: number;
    ld: number;
  };
}

interface ChannelCategory {
  id: string;
  name: string;
  isCollapsed: boolean;
}

const DiscordStyleMessagingInterface: React.FC<{ className?: string; onClose?: () => void }> = ({
  className = '',
  onClose
}) => {
  // ✅ PHASE 1 FIX: Consolidated auth
  const { walletInfo } = useWalletAuth();
  const address = walletInfo?.address;

  const { isMobile, triggerHapticFeedback, touchTargetClasses } = useMobileOptimization();
  const { resolveName, resolvedNames, isLoading } = useENSIntegration();

  // Add typing timeout ref for channel messages
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ PHASE 1 FIX: Use useChatHistory with all state properties
  const {
    conversations: hookConversations,
    messages: hookMessages,
    loading,
    error,
    loadMessages,
    sendMessage,
    addReaction,
    removeReaction
  } = useChatHistory();

  // ✅ PHASE 1 FIX: Enhanced WebSocket integration
  const {
    connectionState,
    isConnected: isWsConnected,
    on,
    off,
    startTyping,
    stopTyping
  } = useWebSocket({
    walletAddress: address || '',
    autoConnect: true
  });

  const [dmConversations, setDmConversations] = useState<DirectMessageConversation[]>([]);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [isViewingDM, setIsViewingDM] = useState(false);
  const [selectedDM, setSelectedDM] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [channelCategories, setChannelCategories] = useState<ChannelCategory[]>([
    { id: 'direct', name: 'Direct Messages', isCollapsed: false },
    { id: 'public', name: 'Public Channels', isCollapsed: false },
    { id: 'private', name: 'Private Channels', isCollapsed: false },
    { id: 'gated', name: 'Gated Channels', isCollapsed: false }
  ]);
  const [channelMembers] = useState<ChannelMember[]>([]);
  const [showThread, setShowThread] = useState<{ messageId: string; show: boolean }>({
    messageId: '',
    show: false
  });
  const [threadMessages, setThreadMessages] = useState<ChannelMessage[]>([]);
  const [notificationSettings, setNotificationSettings] = useState({
    general: true,
    mentions: true,
    reactions: false
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Sync hook conversations into DM list
  useEffect(() => {
    if (!hookConversations) return;
    const mapped: DirectMessageConversation[] = hookConversations.map(c => ({
      id: c.id,
      participant: Array.isArray(c.participants) ? c.participants[0] : (c.participants as any),
      participantEnsName: undefined,
      isOnline: false,
      isTyping: false,
      lastSeen: undefined,
      unreadCount: c.unreadCounts?.[address || ''] || 0,
      lastMessage: c.lastMessage ? messageToChannelMessage(c.lastMessage) : undefined,
      isPinned: (c as any).isPinned || false
    }));

    setDmConversations(mapped);
  }, [hookConversations, address]);

  // When viewing a DM, load messages via hook
  useEffect(() => {
    const load = async () => {
      if (isViewingDM && selectedDM) {
        await loadMessages({ conversationId: selectedDM, limit: 100 });
      }
    };
    load();
  }, [isViewingDM, selectedDM, loadMessages]);

  // ✅ PHASE 1 FIX: Use type adapters to convert messages
  useEffect(() => {
    if (isViewingDM) {
      setMessages(hookMessages.map(m => messageToChannelMessage(m)));
    }
  }, [isViewingDM, hookMessages]);

  // ✅ PHASE 1 FIX: WebSocket real-time message updates
  useEffect(() => {
    if (!isWsConnected || !selectedDM) return;

    const handleNewMessage = (msg: any) => {
      if (isViewingDM && msg.conversationId === selectedDM) {
        setMessages(prev => [...prev, messageToChannelMessage(msg)]);
      }
    };

    const handleUserTyping = (data: { userAddress: string; conversationId: string }) => {
      if (data.conversationId === selectedDM) {
        setDmConversations(prev => prev.map(dm =>
          dm.participant === data.userAddress
            ? { ...dm, isTyping: true }
            : dm
        ));

        // Clear typing after 3 seconds
        setTimeout(() => {
          setDmConversations(prev => prev.map(dm =>
            dm.participant === data.userAddress
              ? { ...dm, isTyping: false }
              : dm
          ));
        }, 3000);
      }
    };

    on('new_message', handleNewMessage);
    on('user_typing', handleUserTyping);

    return () => {
      off('new_message', handleNewMessage);
      off('user_typing', handleUserTyping);
    };
  }, [isWsConnected, isViewingDM, selectedDM, on, off]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendChannelMessage = async () => {
    if (!newMessage.trim() || !address) return;

    // If viewing a DM, use hook sendMessage to persist
    if (isViewingDM && selectedDM) {
      try {
        await sendMessage({
          conversationId: selectedDM,
          fromAddress: address,
          content: newMessage.trim(),
          contentType: 'text',
          deliveryStatus: 'sent'
        });
        setNewMessage('');

        // Stop typing indicator
        if (isWsConnected) {
          stopTyping(selectedDM);
        }
      } catch (err) {
        console.warn('Failed to send DM via hook', err);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChannelMessage();
    }
  };

  // ✅ PHASE 1 FIX: Use hook's addReaction/removeReaction
  const handleAddReaction = async (messageId: string, emoji: string) => {
    try {
      await addReaction(messageId, emoji);
    } catch (err) {
      console.error('Failed to add reaction:', err);
    }
  };

  const handleMessageChange = (value: string) => {
    setNewMessage(value);

    // Send typing indicator
    if (isViewingDM && selectedDM && isWsConnected) {
      startTyping(selectedDM);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setChannelCategories((prev: ChannelCategory[]) =>
      prev.map((cat: ChannelCategory) =>
        cat.id === categoryId
          ? { ...cat, isCollapsed: !cat.isCollapsed }
          : cat
      )
    );
  };

  const parseMentions = (content: string): JSX.Element => {
    const mentionRegex = /(@[\w\d]+\.eth|@0x[a-fA-F0-9]{40}|@\w+)/g;
    const parts = content.split(mentionRegex);

    return (
      <>
        {parts.map((part, index) => {
          if (part.match(mentionRegex)) {
            const isCurrentUser = part === `@${address?.slice(0, 6)}...${address?.slice(-4)}` ||
              part === '@you' ||
              (address && part.toLowerCase() === `@${address.toLowerCase()}`);

            return (
              <span
                key={index}
                className={`font-semibold ${isCurrentUser ? 'bg-blue-500/20 text-blue-400 px-1 rounded' : 'text-blue-400'
                  }`}
              >
                {part}
              </span>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </>
    );
  };

  return (
    <div className={`flex h-full bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* Channels Sidebar */}
      <div className={`w-60 border-r border-gray-700 flex flex-col bg-gray-800 ${isMobile ? 'hidden md:block' : ''}`}>
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <MessageCircle size={20} className="mr-2" />
              LinkDAO Chat
              {/* ✅ PHASE 1 FIX: Connection Status */}
              {connectionState.status === 'connected' ? (
                <div title="Connected">
                  <Wifi size={14} className="ml-2 text-green-400" />
                </div>
              ) : connectionState.status === 'connecting' || connectionState.status === 'reconnecting' ? (
                <div title="Connecting...">
                  <Loader2 size={14} className="ml-2 text-yellow-400 animate-spin" />
                </div>
              ) : (
                <div title="Disconnected">
                  <WifiOff size={14} className="ml-2 text-red-400" />
                </div>
              )}
            </h2>
            {onClose && (
              <button
                className="text-gray-400 hover:text-white"
                onClick={onClose}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-2 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search channels..."
              className="w-full bg-gray-700 text-white rounded px-8 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* DMs Section */}
        <div className="px-2 py-3">
          <div
            className="flex items-center justify-between px-2 py-1 cursor-pointer hover:bg-gray-700 rounded"
            onClick={() => toggleCategory('direct')}
          >
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center">
              {channelCategories.find(c => c.id === 'direct')?.isCollapsed ?
                <ChevronRight size={14} className="mr-1" /> :
                <ChevronDown size={14} className="mr-1" />}
              Direct Messages
            </h3>
          </div>

          {!channelCategories.find(c => c.id === 'direct')?.isCollapsed && (
            <>
              {dmConversations
                .sort((a, b) => {
                  if (a.isPinned && !b.isPinned) return -1;
                  if (!a.isPinned && b.isPinned) return 1;
                  if (a.isOnline && !b.isOnline) return -1;
                  if (!a.isOnline && b.isOnline) return 1;
                  const aTime = a.lastMessage?.timestamp.getTime() || 0;
                  const bTime = b.lastMessage?.timestamp.getTime() || 0;
                  return bTime - aTime;
                })
                .map(dm => (
                  <div
                    key={dm.id}
                    className={`flex items-center px-2 py-1.5 rounded cursor-pointer mb-1 ml-4 ${isViewingDM && selectedDM === dm.id ? 'bg-gray-700' : 'hover:bg-gray-700'
                      }`}
                    onClick={() => {
                      setIsViewingDM(true);
                      setSelectedDM(dm.id);
                      setSelectedChannel(null);
                    }}
                  >
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                        <User size={16} className="text-white" />
                      </div>
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${dm.isOnline ? 'bg-green-500' : 'bg-gray-500'
                        }`}></div>
                      {dm.isTyping && (
                        <div className="absolute -top-1 -right-1 flex space-x-1">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      )}
                      {dm.unreadCount > 0 && !dm.isTyping && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-xs">
                          {dm.unreadCount}
                        </div>
                      )}
                    </div>
                    <div className="ml-2 flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {dm.participantEnsName || `${dm.participant.slice(0, 6)}...${dm.participant.slice(-4)}`}
                      </div>
                      {dm.lastMessage && (
                        <div className="text-xs text-gray-400 truncate">
                          {dm.lastMessage.content}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* DM Header */}
        {isViewingDM && selectedDM && (
          <div className="border-b border-gray-700 p-4 flex items-center justify-between">
            <div className="flex items-center">
              {isMobile && onClose && (
                <button
                  onClick={onClose}
                  className={`md:hidden mr-2 ${touchTargetClasses} text-gray-400 hover:text-white`}
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                  <User size={20} className="text-white" />
                </div>
                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${dmConversations.find(dm => dm.id === selectedDM)?.isOnline ? 'bg-green-500' : 'bg-gray-500'
                  }`}></div>
              </div>
              <div className="ml-3">
                <h2 className="text-xl font-bold text-white">
                  {dmConversations.find(dm => dm.id === selectedDM)?.participantEnsName ||
                    `${dmConversations.find(dm => dm.id === selectedDM)?.participant.slice(0, 6)}...${dmConversations.find(dm => dm.id === selectedDM)?.participant.slice(-4)}`}
                </h2>
                <p className="text-sm text-gray-400 hidden sm:block">
                  {dmConversations.find(dm => dm.id === selectedDM)?.isOnline
                    ? 'Online'
                    : `Last seen ${dmConversations.find(dm => dm.id === selectedDM)?.lastSeen?.toLocaleTimeString()}`}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-xs text-green-400">
                <Shield size={14} />
                <span className="hidden sm:inline">Encrypted</span>
              </div>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-800">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={32} className="text-blue-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-red-400">
              <AlertCircle size={32} className="mb-2" />
              <p>{error}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map(message => (
                <div key={message.id} className="hover:bg-gray-750 p-2 rounded">
                  <div className="flex">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mr-3 flex-shrink-0">
                      <User size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline">
                        <span className="font-semibold text-white mr-2">
                          {message.fromAddress === address ? 'You' : message.fromAddress.slice(0, 6) + '...' + message.fromAddress.slice(-4)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isViewingDM && message.isEncrypted && (
                          <Lock size={12} className="ml-1 text-green-400" />
                        )}
                      </div>
                      <p className="text-gray-200">{parseMentions(message.content)}</p>

                      {/* Reactions */}
                      {message.reactions && message.reactions.length > 0 && (
                        <div className="flex mt-2 space-x-1">
                          {message.reactions.map((reaction, idx) => (
                            <button
                              key={idx}
                              className={`flex items-center rounded px-2 py-1 text-sm ${reaction.users.includes(address || '')
                                ? 'bg-blue-500/30 text-white'
                                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                }`}
                              onClick={() => handleAddReaction(message.id, reaction.emoji)}
                            >
                              <span className="mr-1">{reaction.emoji}</span>
                              <span className="text-gray-300">{reaction.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="border-t border-gray-700 p-4">
          <div className="flex items-end">
            <textarea
              value={newMessage}
              onChange={(e) => handleMessageChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              rows={1}
            />
            <button
              onClick={sendChannelMessage}
              disabled={!newMessage.trim()}
              className={`ml-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg p-3 ${touchTargetClasses}`}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscordStyleMessagingInterface;
