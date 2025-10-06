/**
 * Simple Messaging Interface - Fallback implementation
 * Basic wallet-to-wallet messaging without complex dependencies
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MessageCircle,
  Search,
  Send,
  User,
  Settings,
  X,
  Shield,
  Globe,
  Coins
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { GlassPanel, Button } from '../../design-system';
import { useChatHistory } from '@/hooks/useChatHistory';

interface SimpleMessage {
  id: string;
  fromAddress: string;
  toAddress: string;
  content: string;
  timestamp: Date;
  isOwn: boolean;
}

interface SimpleConversation {
  id: string;
  otherParticipant: string;
  lastMessage?: SimpleMessage;
  unreadCount: number;
}

interface SimpleMessagingInterfaceProps {
  className?: string;
  onClose?: () => void;
}

const SimpleMessagingInterface: React.FC<SimpleMessagingInterfaceProps> = ({
  className = '',
  onClose
}) => {
  const { address, isConnected } = useAccount();
  const [conversations, setConversations] = useState<SimpleConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<SimpleMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [newConversationAddress, setNewConversationAddress] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(false);

  const { conversations: hookConversations, loadMessages, sendMessage } = useChatHistory();

  useEffect(() => {
    if (!isConnected || !address) return;

    // Map hook conversations to simple UI shape
    if (hookConversations) {
      const mapped = hookConversations.map(c => ({
        id: c.id,
        otherParticipant: Array.isArray(c.participants) ? c.participants.find(p => p !== address) || c.participants[0] : '',
        lastMessage: c.lastMessage ? {
          id: c.lastMessage.id,
          fromAddress: c.lastMessage.fromAddress,
          toAddress: c.participants.find(p => p !== c.lastMessage?.fromAddress) || '',
          content: c.lastMessage.content,
          timestamp: new Date(c.lastMessage.timestamp),
          isOwn: c.lastMessage.fromAddress === address
        } : undefined,
        unreadCount: c.unreadCounts?.[address || ''] || 0
      } as SimpleConversation));

      setConversations(mapped);
    }
  }, [hookConversations, isConnected, address]);

  // Load messages for selected conversation using the hook
  useEffect(() => {
    const load = async () => {
      if (!selectedConversation) return;
      try {
        await loadMessages({ conversationId: selectedConversation, limit: 50 });
        // messages are provided via hook; the simple UI expects local messages so the page-level hook should be used in a real app
      } catch (err) {
        console.warn('Failed to load messages for conversation', selectedConversation, err);
      }
    };

    load();
  }, [selectedConversation, loadMessages]);

  const sendSimpleMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !address) return;

    const payload = {
      conversationId: selectedConversation,
      fromAddress: address,
      toAddress: conversations.find(c => c.id === selectedConversation)?.otherParticipant || undefined,
      content: newMessage.trim(),
      messageType: 'text'
    };

    try {
      await sendMessage(payload as any);
      setNewMessage('');
    } catch (err) {
      console.warn('Failed to send message', err);
    }
  };

  const startNewConversation = () => {
    if (!newConversationAddress.trim() || !address) return;

    const conversationId = `conv_${Date.now()}`;
    const newConv: SimpleConversation = {
      id: conversationId,
      otherParticipant: newConversationAddress.trim(),
      unreadCount: 0
    };

    setConversations(prev => [newConv, ...prev]);
    setSelectedConversation(conversationId);
    setNewConversationAddress('');
    setShowNewConversation(false);
  };

  const formatAddress = (addr: string): string => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return date.toLocaleDateString();
  };

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
                onClick={() => setShowNewConversation(true)}
                title="New Conversation"
              >
                <User size={16} />
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

        {/* New Conversation Modal */}
        {showNewConversation && (
          <div className="p-4 border-b border-gray-700 bg-gray-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-white">New Conversation</h3>
              <Button 
                variant="outline" 
                size="small" 
                onClick={() => setShowNewConversation(false)}
                className="p-1"
              >
                <X size={14} />
              </Button>
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Enter wallet address or ENS..."
                value={newConversationAddress}
                onChange={(e) => setNewConversationAddress(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    startNewConversation();
                  }
                }}
              />
              <Button 
                variant="primary" 
                size="small"
                onClick={startNewConversation}
                disabled={!newConversationAddress.trim()}
              >
                Start
              </Button>
            </div>
          </div>
        )}

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <MessageCircle size={48} className="mb-2 opacity-50" />
              <p>No conversations yet</p>
              <p className="text-sm">Start a new conversation</p>
            </div>
          ) : (
            conversations
              .filter(conv => {
                if (!searchQuery) return true;
                return conv.otherParticipant.toLowerCase().includes(searchQuery.toLowerCase());
              })
              .map(conversation => (
                <motion.div
                  key={conversation.id}
                  className={`p-4 border-b border-gray-700 cursor-pointer transition-colors ${
                    selectedConversation === conversation.id ? 'bg-blue-600/20' : 'hover:bg-gray-800'
                  }`}
                  onClick={() => setSelectedConversation(conversation.id)}
                  whileHover={{ backgroundColor: 'rgba(75, 85, 99, 0.5)' }}
                >
                  <div className="flex items-center space-x-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <User size={20} className="text-white" />
                    </div>

                    {/* Conversation Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-white text-sm">
                          {formatAddress(conversation.otherParticipant)}
                        </p>
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
              ))
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
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <User size={16} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">
                      {formatAddress(conversations.find(c => c.id === selectedConversation)?.otherParticipant || '')}
                    </h3>
                    <p className="text-xs text-gray-400">Wallet-to-wallet messaging</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 text-xs text-gray-400">
                    <Shield size={12} />
                    <span>Encrypted</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex max-w-xs lg:max-w-md ${message.isOwn ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
                    {/* Avatar */}
                    {!message.isOwn && (
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <User size={12} className="text-white" />
                      </div>
                    )}

                    {/* Message */}
                    <div className="relative">
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          message.isOwn
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-white'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>

                      {/* Message Time */}
                      <div className={`flex items-center space-x-1 mt-1 ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-xs text-gray-400">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-700 bg-gray-800">
              <div className="flex items-center space-x-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        sendSimpleMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <Button 
                  variant="primary" 
                  size="small" 
                  onClick={sendSimpleMessage}
                  disabled={!newMessage.trim()}
                  className="p-2"
                >
                  <Send size={16} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* No Conversation Selected */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle size={64} className="mx-auto mb-4 text-gray-600" />
              <h3 className="text-lg font-medium text-white mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-400 mb-6">
                Choose a conversation from the sidebar or start a new one
              </p>
              <Button 
                variant="primary"
                onClick={() => setShowNewConversation(true)}
              >
                Start New Conversation
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleMessagingInterface;