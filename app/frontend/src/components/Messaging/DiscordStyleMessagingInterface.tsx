/**
 * Discord/Slack Style Messaging Interface
 * Enhanced messaging with channels, threads, and reactions
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, Search, Send, User, Plus, Hash, Lock, 
  ThumbsUp, Heart, Zap, Rocket, Globe, Users, X, ChevronDown, ChevronRight,
  Image, Link as LinkIcon, Wallet, Vote, Calendar, Tag, Settings, ArrowLeftRight
} from 'lucide-react';
import { useAccount } from 'wagmi';
import CrossChainBridge from './CrossChainBridge';

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

interface ChannelMessage {
  id: string;
  fromAddress: string;
  content: string;
  timestamp: Date;
  reactions?: {
    emoji: string;
    count: number;
    users: string[];
  }[];
  threadReplies?: ChannelMessage[];
  isThread?: boolean;
  parentId?: string;
  attachments?: {
    type: 'nft' | 'transaction' | 'proposal' | 'image' | 'file';
    url: string;
    name: string;
    preview?: string;
  }[];
  mentions?: string[];
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

// Channel categories for organization
interface ChannelCategory {
  id: string;
  name: string;
  isCollapsed: boolean;
}

const DiscordStyleMessagingInterface: React.FC<{ className?: string; onClose?: () => void }> = ({ 
  className = '', 
  onClose 
}) => {
  const { address, isConnected } = useAccount();
  const [channelCategories, setChannelCategories] = useState<ChannelCategory[]>([
    { id: 'direct', name: 'Direct Messages', isCollapsed: false },
    { id: 'public', name: 'Public Channels', isCollapsed: false },
    { id: 'private', name: 'Private Channels', isCollapsed: false },
    { id: 'gated', name: 'Gated Channels', isCollapsed: false }
  ]);

  const [channels, setChannels] = useState<ChatChannel[]>([
    {
      id: 'general',
      name: 'general',
      isPrivate: false,
      memberCount: 1242,
      unreadCount: 3,
      isPinned: true,
      topic: 'Welcome to LinkDAO! Discuss anything Web3 related here.',
      category: 'public',
      icon: '🌍'
    },
    {
      id: 'trading',
      name: 'trading',
      isPrivate: false,
      memberCount: 856,
      unreadCount: 0,
      topic: 'Share your trading insights and strategies',
      category: 'public',
      icon: '📈'
    },
    {
      id: 'nfts',
      name: 'nfts',
      isPrivate: false,
      memberCount: 2103,
      unreadCount: 12,
      topic: 'Discuss the latest NFT projects and drops',
      category: 'public',
      icon: '🎨'
    },
    {
      id: 'governance',
      name: 'governance',
      isPrivate: false,
      memberCount: 432,
      unreadCount: 5,
      topic: 'DAO proposals and voting discussions',
      category: 'public',
      icon: '🏛️'
    },
    {
      id: 'private-trading',
      name: 'private-trading',
      isPrivate: true,
      memberCount: 12,
      unreadCount: 0,
      topic: 'Private trading discussions',
      category: 'private'
    },
    {
      id: 'nft-holders',
      name: 'nft-holders',
      isPrivate: false,
      isGated: true,
      gateType: 'nft',
      gateRequirement: 'LinkDAO Genesis NFT',
      memberCount: 892,
      unreadCount: 2,
      topic: 'Exclusive discussions for NFT holders',
      category: 'gated',
      icon: '🏆'
    }
  ]);
  
  const [selectedChannel, setSelectedChannel] = useState<string>('general');
  const [messages, setMessages] = useState<ChannelMessage[]>([
    {
      id: '1',
      fromAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1',
      content: 'Welcome to the #general channel! This is where we discuss all things Web3.',
      timestamp: new Date(Date.now() - 3600000)
    },
    {
      id: '2',
      fromAddress: '0x8ba1f109551bD432803012645Hac136c30C6d8b1',
      content: 'Has anyone checked out the new NFT collection that dropped today? 🚀',
      timestamp: new Date(Date.now() - 1800000),
      reactions: [
        { emoji: '👍', count: 5, users: [] },
        { emoji: '🔥', count: 3, users: [] }
      ],
      attachments: [
        { type: 'nft', url: '#', name: 'LinkDAO Genesis #1234' }
      ]
    },
    {
      id: '3',
      fromAddress: address || '',
      content: 'Yes, the artwork looks amazing! I might pick up a few pieces.',
      timestamp: new Date(Date.now() - 1200000)
    }
  ]);
  
  const [newMessage, setNewMessage] = useState('');
  const [conversations, setConversations] = useState([
    { id: 'conv1', name: '0x742...d8b1', unreadCount: 1 }
  ]);
  const [channelMembers] = useState<ChannelMember[]>([
    { 
      address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1', 
      name: 'vitalik.eth', 
      status: 'online',
      role: 'admin',
      ensName: 'vitalik.eth',
      balance: { eth: 124.5, ld: 50000 }
    },
    { 
      address: '0x8ba1f109551bD432803012645Hac136c30C6d8b1', 
      name: 'alice.eth', 
      status: 'idle',
      role: 'moderator',
      ensName: 'alice.eth',
      balance: { eth: 42.1, ld: 12500 }
    },
    { 
      address: address || '', 
      name: 'you', 
      status: 'online',
      role: 'holder',
      balance: { eth: 5.2, ld: 2500 }
    }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !address) return;

    const message: ChannelMessage = {
      id: `msg_${Date.now()}`,
      fromAddress: address,
      content: newMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const addReaction = (messageId: string, emoji: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const reactions = msg.reactions || [];
        const existingReaction = reactions.find(r => r.emoji === emoji);
        
        if (existingReaction) {
          // Check if user already reacted with this emoji
          if (existingReaction.users.includes(address || '')) {
            return { 
              ...msg, 
              reactions: reactions.map(r => 
                r.emoji === emoji 
                  ? { 
                      ...r, 
                      count: r.count - 1,
                      users: r.users.filter(u => u !== address)
                    } 
                  : r
              ).filter(r => r.count > 0)
            };
          } else {
            return { 
              ...msg, 
              reactions: reactions.map(r => 
                r.emoji === emoji 
                  ? { 
                      ...r, 
                      count: r.count + 1,
                      users: [...r.users, address || '']
                    } 
                  : r
              ) 
            };
          }
        } else {
          return { 
            ...msg, 
            reactions: [...reactions, { emoji, count: 1, users: [address || ''] }] 
          };
        }
      }
      return msg;
    }));
  };

  const openThread = (messageId: string) => {
    const message = messages.find(msg => msg.id === messageId);
    if (message) {
      setThreadMessages([
        message,
        ...(message.threadReplies || [])
      ]);
      setShowThread({ messageId, show: true });
    }
  };

  const closeThread = () => {
    setShowThread({ messageId: '', show: false });
  };

  const replyToMessage = (messageId: string, username: string) => {
    setReplyingTo({ messageId, username });
  };

  const sendThreadReply = (content: string) => {
    if (!content.trim() || !address) return;

    const reply: ChannelMessage = {
      id: `reply_${Date.now()}`,
      fromAddress: address,
      content: content.trim(),
      timestamp: new Date(),
      isThread: true,
      parentId: showThread.messageId
    };

    // Add to thread messages
    setThreadMessages(prev => [...prev, reply]);

    // Update main messages with thread reply
    setMessages(prev => prev.map(msg => {
      if (msg.id === showThread.messageId) {
        return {
          ...msg,
          threadReplies: [...(msg.threadReplies || []), reply]
        };
      }
      return msg;
    }));
  };

  const toggleCategory = (categoryId: string) => {
    setChannelCategories(prev => 
      prev.map(cat => 
        cat.id === categoryId 
          ? { ...cat, isCollapsed: !cat.isCollapsed } 
          : cat
      )
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500';
      case 'moderator': return 'bg-blue-500';
      case 'holder': return 'bg-purple-500';
      case 'builder': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'moderator': return 'Mod';
      case 'holder': return 'Holder';
      case 'builder': return 'Builder';
      default: return 'Member';
    }
  };

  const reactionEmojis = ['👍', '❤️', '😂', '😮', '🔥', '🚀'];

  const [showReactionPicker, setShowReactionPicker] = useState<{ messageId: string; show: boolean }>({ 
    messageId: '', 
    show: false 
  });
  const [showThread, setShowThread] = useState<{ messageId: string; show: boolean }>({ 
    messageId: '', 
    show: false 
  });
  const [threadMessages, setThreadMessages] = useState<ChannelMessage[]>([]);
  const [replyingTo, setReplyingTo] = useState<{ messageId: string; username: string } | null>(null);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [showCrossChainBridge, setShowCrossChainBridge] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    general: true,
    mentions: true,
    reactions: false
  });

  const toggleReactionPicker = (messageId: string) => {
    setShowReactionPicker(prev => ({
      messageId: prev.messageId === messageId && prev.show ? '' : messageId,
      show: !(prev.messageId === messageId && prev.show)
    }));
  };

  return (
    <div className={`flex h-full bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* Channels Sidebar */}
      <div className="w-60 border-r border-gray-700 flex flex-col bg-gray-800">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <MessageCircle size={20} className="mr-2" />
              LinkDAO Chat
            </h2>
            <button 
              className="text-gray-400 hover:text-white"
              onClick={onClose}
            >
              <X size={16} />
            </button>
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
            <button className="text-gray-400 hover:text-white">
              <Plus size={14} />
            </button>
          </div>
          
          {!channelCategories.find(c => c.id === 'direct')?.isCollapsed && (
            <>
              {conversations.map(conv => (
                <div 
                  key={conv.id}
                  className="flex items-center px-2 py-1.5 rounded cursor-pointer hover:bg-gray-700 mb-1 ml-4"
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                      <User size={16} className="text-white" />
                    </div>
                    {conv.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-xs">
                        {conv.unreadCount}
                      </div>
                    )}
                  </div>
                  <div className="ml-2 flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {conv.name}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Channels Section */}
        <div className="px-2 py-3 flex-1 overflow-y-auto">
          {channelCategories.filter(cat => cat.id !== 'direct').map(category => (
            <div key={category.id} className="mb-3">
              <div 
                className="flex items-center justify-between px-2 py-1 cursor-pointer hover:bg-gray-700 rounded"
                onClick={() => toggleCategory(category.id)}
              >
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center">
                  {category.isCollapsed ? 
                    <ChevronRight size={14} className="mr-1" /> : 
                    <ChevronDown size={14} className="mr-1" />}
                  {category.name}
                </h3>
                <button className="text-gray-400 hover:text-white">
                  <Plus size={14} />
                </button>
              </div>
              
              {!category.isCollapsed && (
                <div className="ml-4 mt-1">
                  {channels
                    .filter(channel => channel.category === category.id)
                    .map(channel => (
                      <div 
                        key={channel.id}
                        className={`flex items-center px-2 py-1.5 rounded cursor-pointer mb-1 ${
                          selectedChannel === channel.id ? 'bg-gray-700' : 'hover:bg-gray-700'
                        }`}
                        onClick={() => setSelectedChannel(channel.id)}
                      >
                        <div className="flex items-center">
                          {channel.isGated ? (
                            <Tag size={16} className="text-yellow-400 mr-1" />
                          ) : channel.isPrivate ? (
                            <Lock size={16} className="text-gray-400 mr-1" />
                          ) : (
                            <Hash size={16} className="text-gray-400 mr-1" />
                          )}
                          <span className="text-sm text-white truncate">
                            {channel.icon && <span className="mr-1">{channel.icon}</span>}
                            #{channel.name}
                          </span>
                        </div>
                        {channel.unreadCount > 0 && (
                          <div className="ml-auto w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs">
                            {channel.unreadCount}
                          </div>
                        )}
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Cross-Chain Bridge Panel */}
      {showCrossChainBridge && (
        <div className="w-80 border-r border-gray-700 bg-gray-800">
          <CrossChainBridge 
            className="h-full"
            onBridgeMessage={(message) => {
              console.log('Bridge message:', message);
            }}
            onChannelSync={(channelId, chains) => {
              console.log('Channel sync:', channelId, chains);
            }}
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Channel Header */}
        {selectedChannel && (
          <div className="border-b border-gray-700 p-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center">
                {channels.find(c => c.id === selectedChannel)?.icon && 
                  <span className="mr-2">{channels.find(c => c.id === selectedChannel)?.icon}</span>}
                <Hash size={24} className="mr-2 text-gray-400" />
                {channels.find(c => c.id === selectedChannel)?.name}
              </h2>
              <p className="text-sm text-gray-400">
                {channels.find(c => c.id === selectedChannel)?.topic}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center text-sm text-gray-400">
                <Users size={16} className="mr-1" />
                {channels.find(c => c.id === selectedChannel)?.memberCount}
              </div>
              
              {/* Cross-Chain Bridge Toggle */}
              <button
                onClick={() => setShowCrossChainBridge(!showCrossChainBridge)}
                className={`flex items-center px-3 py-1 rounded text-sm ${
                  showCrossChainBridge 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                <ArrowLeftRight size={14} className="mr-1" />
                Bridge
              </button>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-800">
          {/* Reply banner */}
          {replyingTo && (
            <div className="bg-blue-900/30 border-l-4 border-blue-500 p-2 mb-2 rounded flex items-center justify-between">
              <div className="text-sm">
                Replying to <span className="font-semibold">{replyingTo.username}</span>
              </div>
              <button 
                onClick={() => setReplyingTo(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          )}
          
          <div className="space-y-4">
            {messages.map(message => (
              <div 
                key={message.id} 
                className="hover:bg-gray-750 p-2 rounded"
                id={`message-${message.id}`}
              >
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
                    </div>
                    <p className="text-gray-200">{message.content}</p>
                    
                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {message.attachments.map((attachment, idx) => (
                          <div key={idx} className="bg-gray-700 rounded p-2 flex items-center">
                            {attachment.type === 'nft' && <Image size={16} className="mr-1" />}
                            {attachment.type === 'transaction' && <Wallet size={16} className="mr-1" />}
                            {attachment.type === 'proposal' && <Vote size={16} className="mr-1" />}
                            {attachment.type === 'image' && <Image size={16} className="mr-1" />}
                            {attachment.type === 'file' && <LinkIcon size={16} className="mr-1" />}
                            <span className="text-xs text-gray-300">{attachment.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Reactions */}
                    {message.reactions && message.reactions.length > 0 && (
                      <div className="flex mt-2 space-x-1 relative">
                        {message.reactions.map((reaction, idx) => (
                          <button
                            key={idx}
                            className={`flex items-center rounded px-2 py-1 text-sm ${
                              reaction.users.includes(address || '') 
                                ? 'bg-blue-500/30 text-white' 
                                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                            }`}
                            onClick={() => addReaction(message.id, reaction.emoji)}
                            onMouseEnter={() => {
                              // Show who reacted on hover
                            }}
                          >
                            <span className="mr-1">{reaction.emoji}</span>
                            <span className="text-gray-300">{reaction.count}</span>
                          </button>
                        ))}
                        
                        {/* Reaction picker button */}
                        <button
                          className="w-8 h-8 rounded hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white"
                          onClick={() => toggleReactionPicker(message.id)}
                        >
                          <span>+</span>
                        </button>
                        
                        {/* Reaction picker popup */}
                        {showReactionPicker.messageId === message.id && showReactionPicker.show && (
                          <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg p-2 shadow-lg z-10">
                            <div className="flex space-x-1">
                              {['👍', '❤️', '😂', '😮', '🔥', '🚀', '👏', '🎉'].map(emoji => (
                                <button
                                  key={emoji}
                                  className="w-8 h-8 rounded hover:bg-gray-700 flex items-center justify-center text-lg"
                                  onClick={() => {
                                    addReaction(message.id, emoji);
                                    setShowReactionPicker({ messageId: '', show: false });
                                  }}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Message actions */}
                    <div className="flex mt-1 space-x-3 text-xs text-gray-400">
                      <button 
                        className="hover:text-white"
                        onClick={() => replyToMessage(message.id, message.fromAddress === address ? 'You' : message.fromAddress.slice(0, 6) + '...' + message.fromAddress.slice(-4))}
                      >
                        Reply
                      </button>
                      {message.threadReplies && message.threadReplies.length > 0 && (
                        <button 
                          className="hover:text-white flex items-center"
                          onClick={() => openThread(message.id)}
                        >
                          <span>Thread</span>
                          <span className="ml-1 bg-gray-700 rounded-full px-1.5 py-0.5">
                            {message.threadReplies.length}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Thread View Overlay */}
        {showThread.show && (
          <div className="absolute inset-0 bg-black/70 z-20 flex">
            <div className="ml-auto w-2/3 h-full bg-gray-800 border-l border-gray-700 flex flex-col">
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-white">Thread</h3>
                <button 
                  onClick={closeThread}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                {threadMessages.map((message, index) => (
                  <div 
                    key={message.id} 
                    className={`p-2 rounded ${index === 0 ? 'bg-gray-750 mb-4' : 'hover:bg-gray-750'}`}
                  >
                    <div className="flex">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mr-2 flex-shrink-0">
                        <User size={16} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline">
                          <span className="font-semibold text-white text-sm mr-2">
                            {message.fromAddress === address ? 'You' : message.fromAddress.slice(0, 6) + '...' + message.fromAddress.slice(-4)}
                          </span>
                          <span className="text-xs text-gray-400">
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-gray-200 text-sm">{message.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="p-4 border-t border-gray-700">
                <div className="flex items-end">
                  <textarea
                    placeholder="Reply to thread..."
                    className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none text-sm"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendThreadReply(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <button className="ml-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-2">
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message Input */}
        <div className="border-t border-gray-700 p-4">
          <div className="flex items-end">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message #${channels.find(c => c.id === selectedChannel)?.name} (${channelMembers.length} members)`}
              className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              rows={1}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="ml-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg p-3"
            >
              <Send size={20} />
            </button>
          </div>
          <div className="flex items-center mt-2 text-xs text-gray-400">
            <span className="mr-4">⌘ Enter to send</span>
            <span className="mr-4">/ for commands</span>
            <span className="flex items-center">
              <Image size={14} className="mr-1" />
              Attach
            </span>
          </div>
        </div>
      </div>

      {/* Members Sidebar */}
      <div className="w-60 border-l border-gray-700 bg-gray-800 hidden md:block">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-white">Members</h3>
          <button 
            className="text-gray-400 hover:text-white"
            onClick={() => setShowChannelSettings(!showChannelSettings)}
          >
            <Settings size={16} />
          </button>
        </div>
        
        {/* Channel Settings Panel */}
        {showChannelSettings && (
          <div className="p-4 border-b border-gray-700 bg-gray-850">
            <h4 className="font-semibold text-white mb-2">Channel Settings</h4>
            
            <div className="mb-3">
              <h5 className="text-xs text-gray-400 uppercase mb-1">Notifications</h5>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    className="rounded bg-gray-700 border-gray-600"
                    checked={notificationSettings.general}
                    onChange={(e) => setNotificationSettings(prev => ({ ...prev, general: e.target.checked }))}
                  />
                  <span className="ml-2 text-sm text-gray-300">General messages</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    className="rounded bg-gray-700 border-gray-600"
                    checked={notificationSettings.mentions}
                    onChange={(e) => setNotificationSettings(prev => ({ ...prev, mentions: e.target.checked }))}
                  />
                  <span className="ml-2 text-sm text-gray-300">Mentions</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    className="rounded bg-gray-700 border-gray-600"
                    checked={notificationSettings.reactions}
                    onChange={(e) => setNotificationSettings(prev => ({ ...prev, reactions: e.target.checked }))}
                  />
                  <span className="ml-2 text-sm text-gray-300">Reactions</span>
                </label>
              </div>
            </div>
            
            <div className="mb-3">
              <h5 className="text-xs text-gray-400 uppercase mb-1">Channel Actions</h5>
              <button className="w-full bg-gray-700 hover:bg-gray-600 text-white text-sm py-1.5 rounded mb-1">
                Invite Members
              </button>
              <button className="w-full bg-gray-700 hover:bg-gray-600 text-white text-sm py-1.5 rounded">
                Channel Permissions
              </button>
            </div>
          </div>
        )}
        
        <div className="p-4">
          <div className="space-y-3">
            {channelMembers.map(member => (
              <div 
                key={member.address} 
                className="flex items-center group relative"
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                    <User size={16} className="text-white" />
                  </div>
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${getStatusColor(member.status)}`}></div>
                </div>
                <div className="ml-2">
                  <div className="text-sm font-medium text-white flex items-center">
                    {member.name}
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${getRoleColor(member.role)} text-white`}>
                      {getRoleLabel(member.role)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 capitalize">{member.status}</div>
                </div>
                
                {/* Hover card with additional info */}
                <div className="absolute left-full ml-2 top-0 hidden group-hover:block bg-gray-900 border border-gray-700 rounded-lg p-3 w-64 z-10">
                  <div className="flex items-center mb-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mr-2">
                      <User size={20} className="text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-white">{member.name}</div>
                      <div className="text-xs text-gray-400">{member.ensName || member.address.slice(0, 6) + '...' + member.address.slice(-4)}</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">ETH:</span>
                    <span className="text-white">{member.balance?.eth.toFixed(4) || '0.0000'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">LDAO:</span>
                    <span className="text-white">{member.balance?.ld?.toLocaleString() || '0'}</span>
                  </div>
                  
                  <div className="mt-2 flex space-x-2">
                    <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 rounded">
                      Tip
                    </button>
                    <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs py-1 rounded">
                      Profile
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Pinned Messages Section */}
          <div className="mt-6 pt-4 border-t border-gray-700">
            <h4 className="text-sm font-semibold text-white mb-2">Pinned Messages</h4>
            <div className="text-xs text-gray-400">
              No pinned messages yet
            </div>
          </div>
          
          {/* Files Section */}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <h4 className="text-sm font-semibold text-white mb-2">Files</h4>
            <div className="text-xs text-gray-400">
              No files shared yet
            </div>
          </div>
          
          {/* Polls Section */}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <h4 className="text-sm font-semibold text-white mb-2">Active Polls</h4>
            <div className="text-xs text-gray-400">
              No active polls
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscordStyleMessagingInterface;