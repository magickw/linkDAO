import React from 'react';
import Link from 'next/link';
import { Clock, MessageCircle, Share2, Award, ExternalLink, Pin, Lock, Zap } from 'lucide-react';
import PostFlair, { FlairConfig } from './PostFlair';

export interface PostAward {
  id: string;
  name: string;
  icon: string;
  count: number;
  description?: string;
}

export interface CrosspostInfo {
  originalCommunity: string;
  originalAuthor: string;
  originalPostId: string;
}

interface PostMetadataProps {
  author: string;
  createdAt: Date;
  community?: {
    name: string;
    displayName?: string;
  };
  flair?: FlairConfig | string;
  awards?: PostAward[];
  crosspost?: CrosspostInfo;
  commentCount?: number;
  shareCount?: number;
  isPinned?: boolean;
  isLocked?: boolean;
  isSponsored?: boolean;
  className?: string;
  showCommunity?: boolean;
  showFullTimestamp?: boolean;
  compact?: boolean;
  onFlairClick?: (flair: FlairConfig | string) => void;
  onAuthorClick?: (author: string) => void;
  onCommunityClick?: (community: string) => void;
}

export default function PostMetadata({
  author,
  createdAt,
  community,
  flair,
  awards = [],
  crosspost,
  commentCount,
  shareCount,
  isPinned = false,
  isLocked = false,
  isSponsored = false,
  className = '',
  showCommunity = true,
  showFullTimestamp = false,
  compact = false,
  onFlairClick,
  onAuthorClick,
  onCommunityClick
}: PostMetadataProps) {
  
  // Format relative time
  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    const months = Math.floor(diff / (86400000 * 30));
    const years = Math.floor(diff / (86400000 * 365));

    if (showFullTimestamp) {
      return new Date(date).toLocaleString();
    }

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 30) return `${days}d`;
    if (months < 12) return `${months}mo`;
    return `${years}y`;
  };

  // Format author display
  const formatAuthor = (authorAddress: string): string => {
    if (authorAddress.length <= 10) return authorAddress;
    return `u/${authorAddress.slice(0, 6)}...${authorAddress.slice(-4)}`;
  };

  // Handle clicks
  const handleAuthorClick = () => {
    if (onAuthorClick) {
      onAuthorClick(author);
    }
  };

  const handleCommunityClick = () => {
    if (onCommunityClick && community) {
      onCommunityClick(community.name);
    }
  };

  // Compact mode - show only essential info
  if (compact) {
    return (
      <div className={`flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 ${className}`}>
        {/* Community (if shown) */}
        {showCommunity && community && (
          <>
            <button
              onClick={handleCommunityClick}
              className="font-medium text-gray-700 dark:text-gray-300 hover:underline transition-colors"
            >
              r/{community.displayName || community.name}
            </button>
            <span>•</span>
          </>
        )}

        {/* Author */}
        <Link
          href={`/u/${author}`}
          className="hover:underline transition-colors text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
        >
          {formatAuthor(author)}
        </Link>

        <span>•</span>

        {/* Time */}
        <span title={new Date(createdAt).toLocaleString()}>
          {formatTimeAgo(createdAt)}
        </span>

        {/* Essential status indicators only */}
        {isPinned && (
          <>
            <span>•</span>
            <Pin className="w-3 h-3 text-green-600 dark:text-green-400" />
          </>
        )}

        {isLocked && (
          <>
            <span>•</span>
            <Lock className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
          </>
        )}

        {/* Flair (compact) */}
        {flair && (
          <>
            <span>•</span>
            <PostFlair
              flair={flair}
              size="xs"
              variant="subtle"
              clickable={!!onFlairClick}
              onClick={onFlairClick}
            />
          </>
        )}
      </div>
    );
  }

  // Full mode - show all metadata
  return (
    <div className={`flex items-center flex-wrap gap-2 text-sm text-gray-500 dark:text-gray-400 ${className}`}>
      {/* Community */}
      {showCommunity && community && (
        <>
          <button
            onClick={handleCommunityClick}
            className="font-medium text-gray-900 dark:text-white hover:underline transition-colors"
          >
            r/{community.displayName || community.name}
          </button>
          <span>•</span>
        </>
      )}

      {/* Author */}
      <Link
        href={`/u/${author}`}
        className="hover:underline transition-colors text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400"
      >
        {formatAuthor(author)}
      </Link>

      <span>•</span>

      {/* Time */}
      <div className="flex items-center space-x-1">
        <Clock className="w-3 h-3" />
        <span title={new Date(createdAt).toLocaleString()}>
          {formatTimeAgo(createdAt)}
        </span>
      </div>

      {/* Flair */}
      {flair && (
        <>
          <span>•</span>
          <PostFlair
            flair={flair}
            size="sm"
            variant="filled"
            clickable={!!onFlairClick}
            onClick={onFlairClick}
          />
        </>
      )}

      {/* Status Indicators */}
      {isPinned && (
        <>
          <span>•</span>
          <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
            <Pin className="w-3 h-3" />
            <span className="text-xs font-medium">Pinned</span>
          </div>
        </>
      )}

      {isLocked && (
        <>
          <span>•</span>
          <div className="flex items-center space-x-1 text-yellow-600 dark:text-yellow-400">
            <Lock className="w-3 h-3" />
            <span className="text-xs font-medium">Locked</span>
          </div>
        </>
      )}

      {isSponsored && (
        <>
          <span>•</span>
          <div className="flex items-center space-x-1 text-purple-600 dark:text-purple-400">
            <Zap className="w-3 h-3" />
            <span className="text-xs font-medium">Sponsored</span>
          </div>
        </>
      )}

      {/* Awards */}
      {awards.length > 0 && (
        <>
          <span>•</span>
          <div className="flex items-center space-x-1">
            <Award className="w-3 h-3 text-yellow-500" />
            <div className="flex items-center space-x-1">
              {awards.slice(0, 3).map((award) => (
                <div
                  key={award.id}
                  className="flex items-center space-x-0.5"
                  title={`${award.name}: ${award.description || ''}`}
                >
                  <span className="text-xs">{award.icon}</span>
                  {award.count > 1 && (
                    <span className="text-xs font-medium">{award.count}</span>
                  )}
                </div>
              ))}
              {awards.length > 3 && (
                <span className="text-xs text-gray-400">
                  +{awards.length - 3}
                </span>
              )}
            </div>
          </div>
        </>
      )}

      {/* Crosspost Info */}
      {crosspost && (
        <>
          <span>•</span>
          <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
            <ExternalLink className="w-3 h-3" />
            <span className="text-xs">
              crossposted from r/{crosspost.originalCommunity}
            </span>
          </div>
        </>
      )}

      {/* Engagement Stats */}
      <div className="flex items-center space-x-3 ml-auto">
        {commentCount !== undefined && (
          <div className="flex items-center space-x-1">
            <MessageCircle className="w-3 h-3" />
            <span className="text-xs">{commentCount}</span>
          </div>
        )}

        {shareCount !== undefined && shareCount > 0 && (
          <div className="flex items-center space-x-1">
            <Share2 className="w-3 h-3" />
            <span className="text-xs">{shareCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}