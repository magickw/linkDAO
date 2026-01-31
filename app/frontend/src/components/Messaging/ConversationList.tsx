import React, { useState, useMemo } from 'react';
import { Conversation } from '../../types/messaging';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Package, ShoppingBag, Bot } from 'lucide-react';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onConversationSelect: (conversation: Conversation) => void;
  onStartNewConversation: (recipientAddress: string) => void;
  currentUserAddress: string;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedConversation,
  onConversationSelect,
  onStartNewConversation,
  currentUserAddress,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [newRecipientAddress, setNewRecipientAddress] = useState('');

  // Filter conversations based on search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    return conversations.filter(conversation => {
      const otherParticipant = conversation.participants.find(p => p !== currentUserAddress);
      const lastMessageContent = conversation.lastMessage?.content || '';
      
      return (
        otherParticipant?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lastMessageContent.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [conversations, searchQuery, currentUserAddress]);

  const handleStartNewConversation = () => {
    if (newRecipientAddress.trim()) {
      onStartNewConversation(newRecipientAddress.trim());
      setNewRecipientAddress('');
      setShowNewConversationModal(false);
    }
  };

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find(p => p !== currentUserAddress) || 'Unknown';
  };

  const getUnreadCount = (conversation: Conversation) => {
    return conversation.unreadCounts?.[currentUserAddress] || 0;
  };

  const formatLastMessageTime = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getConversationTypeInfo = (conversation: Conversation) => {
    const type = conversation.metadata?.type || 'general';
    switch (type) {
      case 'order':
        return { icon: Package, label: 'Order', color: 'text-green-500' };
      case 'product':
        return { icon: ShoppingBag, label: 'Product Inquiry', color: 'text-purple-500' };
      case 'automated':
        return { icon: Bot, label: 'Automated', color: 'text-orange-500' };
      default:
        return { icon: MessageCircle, label: 'General', color: 'text-blue-500' };
    }
  };

  return (
    <div className="conversation-list h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Messages</h2>
          <button
            onClick={() => setShowNewConversationModal(true)}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Start new conversation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg 
            className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            {searchQuery ? 'No conversations found' : 'No conversations yet'}
          </div>
        ) : (
          filteredConversations.map((conversation) => {
            const otherParticipant = getOtherParticipant(conversation);
            const unreadCount = getUnreadCount(conversation);
            const isSelected = selectedConversation?.id === conversation.id;

            return (
              <div
                key={conversation.id}
                onClick={() => onConversationSelect(conversation)}
                className={`
                  p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer
                  hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
                  ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-r-blue-500' : ''}
                `}
              >
                <div className="flex items-start space-x-3">
                  {/* Avatar with Type Badge */}
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                      {otherParticipant.slice(2, 4).toUpperCase()}
                    </div>
                    {/* Conversation Type Badge */}
                    {conversation.metadata?.type && conversation.metadata.type !== 'general' && (
                      <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm`}>
                        {(() => {
                          const typeInfo = getConversationTypeInfo(conversation);
                          const TypeIcon = typeInfo.icon;
                          return <TypeIcon size={12} className={typeInfo.color} />;
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Conversation Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {truncateAddress(otherParticipant)}
                      </h3>
                      {conversation.lastActivity && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatLastMessageTime(conversation.lastActivity)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        {conversation.lastMessage?.content || 'No messages yet'}
                      </p>
                      {unreadCount > 0 && (
                        <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Status Indicators */}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {/* Conversation Type Label */}
                      {conversation.metadata?.type && conversation.metadata.type !== 'general' && (
                        <div className="flex items-center">
                          {(() => {
                            const typeInfo = getConversationTypeInfo(conversation);
                            const TypeIcon = typeInfo.icon;
                            return (
                              <span className={`inline-flex items-center text-xs ${typeInfo.color}`}>
                                <TypeIcon size={10} className="mr-1" />
                                {typeInfo.label}
                              </span>
                            );
                          })()}
                        </div>
                      )}
                      {/* Encryption Indicator */}
                      {conversation.isEncrypted && (
                        <div className="flex items-center">
                          <svg className="w-3 h-3 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs text-green-600 dark:text-green-400">Encrypted</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Conversation Modal */}
      {showNewConversationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Start New Conversation
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recipient Wallet Address or ENS
              </label>
              <input
                type="text"
                value={newRecipientAddress}
                onChange={(e) => setNewRecipientAddress(e.target.value)}
                placeholder="0x... or name.eth"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowNewConversationModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 
                         rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartNewConversation}
                disabled={!newRecipientAddress.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Start Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};