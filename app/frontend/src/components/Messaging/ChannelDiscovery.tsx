/**
 * Channel Discovery and Management Components
 * Provides UI for browsing, searching, and joining channels
 */

import React, { useState, useEffect } from 'react';
import { Search, Hash, Lock, Users, TrendingUp, Star, Plus, X, Check, Globe, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Channel {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  isGated: boolean;
  gateType?: 'nft' | 'token' | 'role';
  gateRequirement?: string;
  memberCount: number;
  category: string;
  icon?: string;
  topic?: string;
  isJoined: boolean;
  isPinned?: boolean;
  unreadCount?: number;
  lastActivity?: Date;
  owner?: string;
  moderators?: string[];
  tags?: string[];
}

interface ChannelDiscoveryProps {
  onJoinChannel: (channelId: string) => Promise<void>;
  onCreateChannel: () => void;
  userAddress?: string;
}

export const ChannelDiscovery: React.FC<ChannelDiscoveryProps> = ({
  onJoinChannel,
  onCreateChannel,
  userAddress
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningChannelId, setJoiningChannelId] = useState<string | null>(null);

  const categories = [
    { id: 'all', name: 'All Channels', icon: Globe },
    { id: 'general', name: 'General', icon: Hash },
    { id: 'dao', name: 'DAO Governance', icon: Users },
    { id: 'trading', name: 'Trading', icon: TrendingUp },
    { id: 'gated', name: 'Gated Access', icon: Lock }
  ];

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/channels/discover');
      if (response.ok) {
        const data = await response.json();
        setChannels(data.channels || []);
      }
    } catch (error) {
      console.error('Failed to load channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinChannel = async (channelId: string) => {
    setJoiningChannelId(channelId);
    try {
      await onJoinChannel(channelId);
      // Update local state
      setChannels(prev => prev.map(ch =>
        ch.id === channelId ? { ...ch, isJoined: true, memberCount: ch.memberCount + 1 } : ch
      ));
    } catch (error) {
      console.error('Failed to join channel:', error);
    } finally {
      setJoiningChannelId(null);
    }
  };

  const filteredChannels = channels.filter(channel => {
    const matchesSearch = channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      channel.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      channel.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || channel.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const sortedChannels = [...filteredChannels].sort((a, b) => {
    // Prioritize: joined > pinned > member count
    if (a.isJoined && !b.isJoined) return -1;
    if (!a.isJoined && b.isJoined) return 1;
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.memberCount - a.memberCount;
  });

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Discover Channels</h2>
          <button
            onClick={onCreateChannel}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
          >
            <Plus size={16} />
            <span>Create Channel</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search channels, tags, or topics..."
            className="w-full bg-gray-800 text-white rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex space-x-2 mt-4 overflow-x-auto">
          {categories.map(category => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <Icon size={14} />
                <span>{category.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : sortedChannels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Hash size={48} className="text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Channels Found</h3>
            <p className="text-gray-400 text-sm mb-4">
              {searchQuery ? 'Try a different search term' : 'Be the first to create a channel'}
            </p>
            {!searchQuery && (
              <button
                onClick={onCreateChannel}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
              >
                Create Channel
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedChannels.map(channel => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                onJoin={() => handleJoinChannel(channel.id)}
                isJoining={joiningChannelId === channel.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface ChannelCardProps {
  channel: Channel;
  onJoin: () => void;
  isJoining: boolean;
}

const ChannelCard: React.FC<ChannelCardProps> = ({ channel, onJoin, isJoining }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors border border-gray-700"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            {channel.isPrivate ? (
              <Lock size={16} className="text-gray-400" />
            ) : (
              <Hash size={16} className="text-gray-400" />
            )}
            <h3 className="text-white font-semibold">{channel.name}</h3>
            {channel.isGated && (
              <div className="flex items-center space-x-1 px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                <Shield size={12} />
                <span>Gated</span>
              </div>
            )}
            {channel.isPinned && (
              <Star size={14} className="text-yellow-400 fill-yellow-400" />
            )}
          </div>

          <p className="text-gray-400 text-sm mb-3 line-clamp-2">{channel.description}</p>

          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <Users size={12} />
              <span>{channel.memberCount.toLocaleString()} members</span>
            </div>
            {channel.topic && (
              <div className="flex items-center space-x-1">
                <Hash size={12} />
                <span>{channel.topic}</span>
              </div>
            )}
          </div>

          {channel.tags && channel.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {channel.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="ml-4">
          {channel.isJoined ? (
            <div className="flex items-center space-x-1 px-3 py-2 bg-green-500/20 text-green-400 rounded text-sm">
              <Check size={14} />
              <span>Joined</span>
            </div>
          ) : (
            <button
              onClick={onJoin}
              disabled={isJoining}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
            >
              {isJoining ? 'Joining...' : 'Join'}
            </button>
          )}
        </div>
      </div>

      {channel.isGated && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex items-center space-x-2 text-xs text-purple-400">
            <Shield size={12} />
            <span>
              Requires: {channel.gateType === 'nft' ? 'NFT Ownership' : channel.gateType === 'token' ? 'Token Holdings' : 'Special Role'}
            </span>
          </div>
          {channel.gateRequirement && (
            <p className="text-xs text-gray-500 mt-1">{channel.gateRequirement}</p>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default ChannelDiscovery;
