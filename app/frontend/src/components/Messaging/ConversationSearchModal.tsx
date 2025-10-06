import React, { useState, useEffect, useMemo } from 'react';
import { Conversation, ConversationFilter, MessageSearchResult } from '../../types/messaging';
import { ConversationManagementService } from '../../services/conversationManagementService';
import { formatDistanceToNow } from 'date-fns';

interface ConversationSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationSelect: (conversation: Conversation) => void;
  currentUserAddress: string;
}

export const ConversationSearchModal: React.FC<ConversationSearchModalProps> = ({
  isOpen,
  onClose,
  onConversationSelect,
  currentUserAddress,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'conversations' | 'messages'>('conversations');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messageResults, setMessageResults] = useState<MessageSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<ConversationFilter>({});

  const conversationService = ConversationManagementService.getInstance();

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch();
      } else {
        setConversations([]);
        setMessageResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchType, filters]);

  const performSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      if (searchType === 'conversations') {
        const results = await conversationService.searchConversations(
          searchQuery,
          filters,
          currentUserAddress
        );
        setConversations(results);
      } else {
        const results = await conversationService.searchMessages(
          {
            query: searchQuery,
            limit: 50,
          },
          currentUserAddress
        );
        setMessageResults(results);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConversationClick = (conversation: Conversation) => {
    onConversationSelect(conversation);
    onClose();
  };

  const handleMessageResultClick = (result: MessageSearchResult) => {
    onConversationSelect(result.conversation);
    onClose();
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find(p => p !== currentUserAddress) || 'Unknown';
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Search Conversations
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search conversations or messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
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

          {/* Search Type Toggle */}
          <div className="flex space-x-1 mb-4">
            <button
              onClick={() => setSearchType('conversations')}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                searchType === 'conversations'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Conversations
            </button>
            <button
              onClick={() => setSearchType('messages')}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                searchType === 'messages'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Messages
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filters.type || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any || undefined }))}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Types</option>
              <option value="direct">Direct</option>
              <option value="group">Group</option>
              <option value="announcement">Announcements</option>
            </select>

            <button
              onClick={() => setFilters(prev => ({ ...prev, hasUnread: prev.hasUnread ? undefined : true }))}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                filters.hasUnread
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Unread Only
            </button>

            <button
              onClick={() => setFilters(prev => ({ ...prev, isPinned: prev.isPinned ? undefined : true }))}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                filters.isPinned
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Pinned Only
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : searchQuery.trim() === '' ? (
            <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p>Start typing to search</p>
              </div>
            </div>
          ) : searchType === 'conversations' ? (
            conversations.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
                <p>No conversations found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {conversations.map((conversation) => {
                  const otherParticipant = getOtherParticipant(conversation);
                  const unreadCount = conversation.unreadCounts?.[currentUserAddress] || 0;

                  return (
                    <div
                      key={conversation.id}
                      onClick={() => handleConversationClick(conversation)}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                          {otherParticipant.slice(2, 4).toUpperCase()}
                        </div>

                        {/* Conversation Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {highlightText(truncateAddress(otherParticipant), searchQuery)}
                            </h3>
                            {conversation.lastActivity && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDistanceToNow(new Date(conversation.lastActivity), { addSuffix: true })}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                              {conversation.lastMessage?.content 
                                ? highlightText(conversation.lastMessage.content, searchQuery)
                                : 'No messages yet'
                              }
                            </p>
                            {unreadCount > 0 && (
                              <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </span>
                            )}
                          </div>

                          {/* Conversation Type & Encryption */}
                          <div className="flex items-center mt-1 space-x-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              conversation.metadata.type === 'group' 
                                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                                : conversation.metadata.type === 'announcement'
                                ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}>
                              {conversation.metadata.type}
                            </span>
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
                })}
              </div>
            )
          ) : (
            messageResults.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
                <p>No messages found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {messageResults.map((result) => {
                  const otherParticipant = getOtherParticipant(result.conversation);

                  return (
                    <div
                      key={result.message.id}
                      onClick={() => handleMessageResultClick(result)}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        {/* Avatar */}
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-xs">
                          {result.message.fromAddress.slice(2, 4).toUpperCase()}
                        </div>

                        {/* Message Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {truncateAddress(result.message.fromAddress)}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">in</span>
                              <span className="text-xs text-gray-600 dark:text-gray-300">
                                {truncateAddress(otherParticipant)}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDistanceToNow(new Date(result.message.timestamp), { addSuffix: true })}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {highlightText(result.message.content, searchQuery)}
                          </p>

                          {/* Context Messages */}
                          {result.context && result.context.length > 0 && (
                            <div className="mt-2 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Context: {result.context.length} surrounding messages
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>
              {searchType === 'conversations' 
                ? `${conversations.length} conversations found`
                : `${messageResults.length} messages found`
              }
            </span>
            <span>Press ESC to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};