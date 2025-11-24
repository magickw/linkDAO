import React, { useState, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import Link from 'next/link';
import EnhancedCommentSystem from './EnhancedCommentSystem';
import PostInteractionBar from './PostInteractionBar';
import { IPFSContentService } from '@/services/ipfsContentService';
import OptimizedImage from './OptimizedImage';

interface PostModalProps {
  post: any;
  isOpen: boolean;
  onClose: () => void;
  onComment?: (postId: string) => Promise<void>;
  onReaction?: (postId: string, reactionType: string, amount?: number) => Promise<void>;
  onTip?: (postId: string, amount: string, token: string) => Promise<void>;
  onShare?: (postId: string, shareType: string, message?: string) => Promise<void>;
}

export default function PostModal({
  post,
  isOpen,
  onClose,
  onComment,
  onReaction,
  onTip,
  onShare
}: PostModalProps) {
  const { address } = useWeb3();
  const { addToast } = useToast();

  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  // Fetch post content from IPFS
  useEffect(() => {
    const fetchContent = async () => {
      if (!post) return;

      setLoading(true);
      try {
        // Check if post has direct content
        if (post.content && typeof post.content === 'string' && post.content.length > 0 &&
          !post.content.startsWith('Qm') && !post.content.startsWith('bafy')) {
          setContent(post.content);
          setLoading(false);
          return;
        }

        // Fetch from IPFS if contentCid exists
        if (post.contentCid && (post.contentCid.startsWith('Qm') || post.contentCid.startsWith('bafy'))) {
          const contentText = await IPFSContentService.getContentFromIPFS(post.contentCid);
          if (contentText) {
            try {
              const parsed = JSON.parse(contentText);
              setContent(parsed.content || parsed.text || contentText);
            } catch {
              setContent(contentText);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching post content:', error);
        setContent('Failed to load content');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchContent();
    }
  }, [post, isOpen]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !post) return null;

  // Get avatar URL
  const getAvatarUrl = (cid: string | undefined) => {
    if (!cid) return undefined;
    if (cid.startsWith('Qm') || cid.startsWith('bafy')) {
      return `https://ipfs.io/ipfs/${cid}`;
    }
    try {
      new URL(cid);
      return cid;
    } catch {
      return undefined;
    }
  };

  const avatarUrl = getAvatarUrl(post.authorProfile?.avatarCid || post.avatar);
  const authorName = post.authorProfile?.displayName || post.authorProfile?.handle || post.author;
  const authorHandle = post.authorProfile?.handle || `${post.author.substring(0, 6)}...${post.author.substring(post.author.length - 4)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Post</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          {/* Author Information */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <Link
              href={`/u/${post.author}`}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0">
                {avatarUrl && !avatarError ? (
                  <OptimizedImage
                    src={avatarUrl}
                    alt={authorName}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {authorName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  @{authorHandle}
                </p>
              </div>
            </Link>
            {post.createdAt && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {new Date(post.createdAt).toLocaleString()}
              </p>
            )}
          </div>

          {/* Post Content */}
          <div className="p-6">
            {post.title && (
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {post.title}
              </h3>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {content}
                </p>
              </div>
            )}

            {/* Media attachments */}
            {post.media && post.media.length > 0 && (
              <div className="mt-4 grid gap-2">
                {post.media.map((mediaUrl: string, index: number) => (
                  <OptimizedImage
                    key={index}
                    src={mediaUrl}
                    alt={`Media ${index + 1}`}
                    width={800}
                    height={600}
                    className="rounded-lg w-full"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Interaction Bar */}
          <div className="px-6 pb-6">
            <PostInteractionBar
              post={{
                id: post.id,
                title: post.title,
                contentCid: post.contentCid,
                author: post.author,
                dao: post.dao,
                communityId: post.communityId,
                commentCount: post.commentCount,
                stakedValue: post.stakedValue,
              }}
              postType={post.communityId ? 'community' : 'feed'}
              onComment={() => setShowComments(!showComments)}
              onReaction={onReaction}
              onTip={onTip}
              onShare={onShare}
            />
          </div>

          {/* Comments Section */}
          {showComments && (
            <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <EnhancedCommentSystem
                postId={post.id}
                postType={post.communityId ? 'community' : 'feed'}
                communityId={post.communityId}
                className="p-6"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
