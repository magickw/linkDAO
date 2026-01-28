import React from 'react';
import { Search, MessageCircle, Wifi, WifiOff, X, ChevronRight, ChevronDown, Plus, User, Hash, Lock, Tag } from 'lucide-react';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';

interface ChatSidebarProps {
  hideSidebar: boolean;
  isMobile: boolean;
  isSocketConnected: boolean;
  onClose: () => void;
  channelCategories: any[];
  toggleCategory: (id: string) => void;
  dmConversations: any[];
  channels: any[];
  isViewingDM: boolean;
  selectedDM: string | null;
  selectedChannel: string | null;
  onSelectDM: (id: string) => void;
  onSelectChannel: (id: string) => void;
  getParticipantDisplayName: (address: string) => string;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  hideSidebar,
  isMobile,
  isSocketConnected,
  onClose,
  channelCategories,
  toggleCategory,
  dmConversations,
  channels,
  isViewingDM,
  selectedDM,
  selectedChannel,
  onSelectDM,
  onSelectChannel,
  getParticipantDisplayName
}) => {
  if (hideSidebar) return null;

  return (
    <div className={`w-60 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800 ${isMobile ? 'hidden md:block' : ''}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <MessageCircle size={20} className="mr-2" />
            LinkDAO Chat
            <div className="ml-2" title={isSocketConnected ? "Online" : "Offline"}>
              {isSocketConnected ? (
                <Wifi size={16} className="text-green-500" />
              ) : (
                <WifiOff size={16} className="text-red-500" />
              )}
            </div>
          </h2>
          <button
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-2 top-2.5 text-gray-500 dark:text-gray-400" />
          <input
            type="text"
            placeholder="Search channels..."
            className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded px-8 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* DMs Section */}
      <div className="px-2 py-3">
        <div
          className="flex items-center justify-between px-2 py-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          onClick={() => toggleCategory('direct')}
        >
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center">
            {channelCategories.find(c => c.id === 'direct')?.isCollapsed ?
              <ChevronRight size={14} className="mr-1" /> :
              <ChevronDown size={14} className="mr-1" />}
            Direct Messages
          </h3>
          <button className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <Plus size={14} />
          </button>
        </div>

        {!channelCategories.find(c => c.id === 'direct')?.isCollapsed && (
          <>
            {dmConversations
              .sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
                if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
                if (a.isOnline && !b.isOnline) return -1;
                if (!a.isOnline && b.isOnline) return 1;
                const aTime = a.lastMessage?.timestamp.getTime() || 0;
                const bTime = b.lastMessage?.timestamp.getTime() || 0;
                return bTime - aTime;
              })
              .map(dm => (
                <div
                  key={dm.id}
                  className={`flex items-center px-2 py-1.5 rounded cursor-pointer mb-1 ml-4 ${isViewingDM && selectedDM === dm.id ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  onClick={() => onSelectDM(dm.id)}
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                      <User size={16} className="text-white" />
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-100 dark:border-gray-800 ${dm.isOnline ? 'bg-green-500' : 'bg-gray-500'
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
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {getParticipantDisplayName(dm.participant)}
                    </div>
                    {dm.lastMessage && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {dm.lastMessage.content}
                      </div>
                    )}
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
              className="flex items-center justify-between px-2 py-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              onClick={() => toggleCategory(category.id)}
            >
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center">
                {category.isCollapsed ?
                  <ChevronRight size={14} className="mr-1" /> :
                  <ChevronDown size={14} className="mr-1" />}
                {category.name}
              </h3>
              <button className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
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
                      className={`flex items-center px-2 py-1.5 rounded cursor-pointer mb-1 ${!isViewingDM && selectedChannel === channel.id ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      onClick={() => onSelectChannel(channel.id)}
                    >
                      <div className="flex items-center">
                        {channel.isGated ? (
                          <Tag size={16} className="text-yellow-400 mr-1" />
                        ) : channel.isPrivate ? (
                          <Lock size={16} className="text-gray-500 dark:text-gray-400 mr-1" />
                        ) : (
                          <Hash size={16} className="text-gray-500 dark:text-gray-400 mr-1" />
                        )}
                        <span className="text-sm text-gray-900 dark:text-white truncate">
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
  );
};
