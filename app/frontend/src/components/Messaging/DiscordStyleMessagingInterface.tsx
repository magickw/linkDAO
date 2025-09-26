/**
 * Discord/Slack Style Messaging Interface
 * Enhanced messaging with channels, threads, and reactions
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, Search, Send, User, Plus, Hash, Lock, 
  ThumbsUp, Heart, Zap, Rocket, Globe, Users, X 
} from 'lucide-react';
import { useAccount } from 'wagmi';

interface ChatChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  memberCount: number;
  unreadCount: number;
  isPinned?: boolean;
  topic?: string;
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
}

interface ChannelMember {
  address: string;
  name: string;
  status: 'online' | 'idle' | 'busy' | 'offline';
}

const DiscordStyleMessagingInterface: React.FC<{ className?: string; onClose?: () => void }> = ({ 
  className = '', 
  onClose 
}) => {
  const { address, isConnected } = useAccount();
  const [channels, setChannels] = useState<ChatChannel[]>([
    {
      id: 'general',
      name: 'general',
      isPrivate: false,
      memberCount: 1242,
      unreadCount: 3,
      isPinned: true,
      topic: 'Welcome to LinkDAO! Discuss anything Web3 related here.'
    },
    {
      id: 'trading',
      name: 'trading',
      isPrivate: false,
      memberCount: 856,
      unreadCount: 0,
      topic: 'Share your trading insights and strategies'
    },
    {
      id: 'nfts',
      name: 'nfts',
      isPrivate: false,
      memberCount: 2103,
      unreadCount: 12,
      topic: 'Discuss the latest NFT projects and drops'
    },
    {
      id: 'private-trading',
      name: 'private-trading',
      isPrivate: true,
      memberCount: 12,
      unreadCount: 0,
      topic: 'Private trading discussions'
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
      content: 'Has anyone checked out the new NFT collection that dropped today?',
      timestamp: new Date(Date.now() - 1800000),
      reactions: [
        { emoji: '👍', count: 5, users: [] },
        { emoji: '🔥', count: 3, users: [] }
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
    { address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1', name: 'vitalik.eth', status: 'online' },
    { address: '0x8ba1f109551bD432803012645Hac136c30C6d8b1', name: 'alice.eth', status: 'idle' },
    { address: address || '', name: 'you', status: 'online' }
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
          return { 
            ...msg, 
            reactions: reactions.map(r => 
              r.emoji === emoji ? { ...r, count: r.count + 1 } : r
            ) 
          };
        } else {
          return { 
            ...msg, 
            reactions: [...reactions, { emoji, count: 1, users: [] }] 
          };
        }
      }
      return msg;
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const reactionEmojis = ['👍', '❤️', '😂', '😮', '🔥', '🚀'];

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
          <div className="flex items-center justify-between px-2 py-1">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Direct Messages</h3>
            <button className="text-gray-400 hover:text-white">
              <Plus size={14} />
            </button>
          </div>
          
          {conversations.map(conv => (
            <div 
              key={conv.id}
              className="flex items-center px-2 py-1.5 rounded cursor-pointer hover:bg-gray-700 mb-1"
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
        </div>

        {/* Channels Section */}
        <div className="px-2 py-3 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-2 py-1">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Channels</h3>
            <button className="text-gray-400 hover:text-white">
              <Plus size={14} />
            </button>
          </div>
          
          {channels.map(channel => (
            <div 
              key={channel.id}
              className={`flex items-center px-2 py-1.5 rounded cursor-pointer mb-1 ${
                selectedChannel === channel.id ? 'bg-gray-700' : 'hover:bg-gray-700'
              }`}
              onClick={() => setSelectedChannel(channel.id)}
            >
              <div className="flex items-center">
                {channel.isPrivate ? (
                  <Lock size={16} className="text-gray-400 mr-1" />
                ) : (
                  <Hash size={16} className="text-gray-400 mr-1" />
                )}
                <span className="text-sm text-white truncate">#{channel.name}</span>
              </div>
              {channel.unreadCount > 0 && (
                <div className="ml-auto w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs">
                  {channel.unreadCount}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Channel Header */}
        {selectedChannel && (
          <div className="border-b border-gray-700 p-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center">
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
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-800">
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
                    </div>
                    <p className="text-gray-200">{message.content}</p>
                    
                    {/* Reactions */}
                    {message.reactions && message.reactions.length > 0 && (
                      <div className="flex mt-2 space-x-1">
                        {message.reactions.map((reaction, idx) => (
                          <button
                            key={idx}
                            className="flex items-center bg-gray-700 rounded px-2 py-1 text-sm hover:bg-gray-600"
                            onClick={() => addReaction(message.id, reaction.emoji)}
                          >
                            <span className="mr-1">{reaction.emoji}</span>
                            <span className="text-gray-300">{reaction.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Reaction picker */}
                    <div className="flex mt-2 space-x-1">
                      {reactionEmojis.map(emoji => (
                        <button
                          key={emoji}
                          className="w-8 h-8 rounded hover:bg-gray-700 flex items-center justify-center"
                          onClick={() => addReaction(message.id, emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <div className="border-t border-gray-700 p-4">
          <div className="flex items-end">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message #${channels.find(c => c.id === selectedChannel)?.name}`}
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
        </div>
      </div>

      {/* Members Sidebar */}
      <div className="w-60 border-l border-gray-700 bg-gray-800 hidden md:block">
        <div className="p-4 border-b border-gray-700">
          <h3 className="font-semibold text-white">Members</h3>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {channelMembers.map(member => (
              <div key={member.address} className="flex items-center">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                    <User size={16} className="text-white" />
                  </div>
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${getStatusColor(member.status)}`}></div>
                </div>
                <div className="ml-2">
                  <div className="text-sm font-medium text-white">{member.name}</div>
                  <div className="text-xs text-gray-400 capitalize">{member.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscordStyleMessagingInterface;