import React from 'react';
import Link from 'next/link';
import { processContent, formatTimestamp } from '@/utils/contentParser';
import {
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Heart,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Globe,
  Users,
  Lock
} from 'lucide-react';

interface Web3PostCardProps {
  post: any;
  profile: any;
  className?: string;
}



export default function Web3PostCard({ post, profile, className = '' }: Web3PostCardProps) {
  const timestamp = post.createdAt instanceof Date ? 
    formatTimestamp(post.createdAt) : 
    formatTimestamp(new Date(post.createdAt));

  const getVisibilityIcon = () => {
    switch (post.visibility) {
      case 'public': return <Globe className="w-3 h-3" />;
      case 'followers': return <Users className="w-3 h-3" />;
      case 'community': return <Lock className="w-3 h-3" />;
      default: return <Globe className="w-3 h-3" />;
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3">
          {/* Avatar */}
          <Link href={`/profile/${post.author?.walletAddress || profile.walletAddress}`}>
            <img
              src={
                post.author?.avatarCid ? `https://ipfs.io/ipfs/${post.author.avatarCid}` :
                post.author?.avatar ||
                profile.avatarCid ? `https://ipfs.io/ipfs/${profile.avatarCid}` :
                profile.avatar ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author?.walletAddress || profile.walletAddress}`
              }
              alt="Avatar"
              className="w-10 h-10 rounded-full ring-2 ring-gray-200 dark:ring-gray-700 hover:ring-4 hover:ring-gray-300 dark:hover:ring-gray-600 transition-all cursor-pointer"
            />
          </Link>

          {/* Author Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <Link href={`/profile/${post.author?.walletAddress || profile.walletAddress}`}>
                <span className="font-semibold text-gray-900 dark:text-white hover:underline cursor-pointer">
                  {post.author?.displayName || profile.displayName}
                </span>
              </Link>
              {post.author?.verified && (
                <div className="bg-blue-500 rounded-full p-0.5">
                  <Heart className="w-3 h-3 text-white fill-current" />
                </div>
              )}
              {getVisibilityIcon()}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {timestamp}
            </div>
          </div>
        </div>

        {/* More Options */}
        <button className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors min-h-[44px] min-w-[44px]">
          <MoreHorizontal className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="mb-4 prose prose-sm max-w-none dark:prose-invert">
        <div className="text-gray-900 dark:text-white leading-relaxed">
          {processContent(post.content || post.body, post.contentType)}
        </div>
      </div>

      {/* Media */}
      {post.media && post.media.length > 0 && (
        <div className="mb-4">
          {post.media.map((media: any, index: number) => (
            <div key={index} className="rounded-lg overflow-hidden">
              {media.type === 'image' && (
                <img
                  src={media.url}
                  alt={media.title || 'Post image'}
                  className="w-full max-h-96 object-cover"
                  loading="lazy"
                />
              )}
              {media.type === 'video' && (
                <video
                  src={media.url}
                  className="w-full max-h-96"
                  controls
                />
              )}
              {media.type === 'link' && (
                <a
                  href={media.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    {media.thumbnail && (
                      <img
                        src={media.thumbnail}
                        alt={media.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {media.title}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {media.description}
                      </p>
                      <div className="flex items-center space-x-1 mt-1">
                        <ExternalLink className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-400">External link</span>
                      </div>
                    </div>
                  </div>
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-6">
          {/* Vote */}
          <div className="flex items-center space-x-2">
            <button className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
              <ArrowUp className="w-5 h-5" />
              <span className="text-sm font-medium">{post.upvotes || 0}</span>
            </button>
            <button className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
              <ArrowDown className="w-5 h-5" />
              <span className="text-sm font-medium">{post.downvotes || 0}</span>
            </button>
          </div>

          {/* Comments */}
          <button className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">{post.comments || post.commentsCount || 0}</span>
          </button>

          {/* Share */}
          <button className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <Share2 className="w-5 h-5" />
            <span className="text-sm">Share</span>
          </button>

          {/* Save */}
          <button className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <Bookmark className="w-5 h-5" />
            <span className="text-sm">Save</span>
          </button>
        </div>

        {/* Staked Amount */}
        {post.stakedAmount && (
          <div className="flex items-center space-x-1 text-purple-600 dark:text-purple-400">
            <span className="text-sm font-medium">
              {post.stakedAmount} $LDAO staked
            </span>
          </div>
        )}
      </div>
    </div>
  );
}