
import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useWeb3 } from '@/context/Web3Context';
import { ToastContext } from '@/context/ToastContext';
import { getDisplayName, getDefaultAvatar } from '@/utils/userDisplay';

// Custom hook to safely access toast context with fallback for portal components
const useToastOrFallback = () => {
    const context = useContext(ToastContext);

    if (context) {
        return context;
    }

    // Fallback implementation when no provider is present
    const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', options?: any) => {
        console.log(`[Toast fallback] ${type.toUpperCase()}: ${message}`);
    };

    return { addToast };
};

interface RepostModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: {
        id: string;
        title?: string;
        contentCid: string;
        author: string;
        communityId?: string;
        communityName?: string;
        authorProfile?: {
            avatar?: string;
            handle?: string;
        };
    };
    onRepost: (postId: string, message?: string) => Promise<void>;
}

export default function RepostModal({
    isOpen,
    onClose,
    post,
    onRepost
}: RepostModalProps) {
    const { isConnected } = useWeb3();
    const { addToast } = useToastOrFallback();
    const [repostMessage, setRepostMessage] = useState('');
    const [isPosting, setIsPosting] = useState(false);

    // Close modal on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
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

    const handleRepost = async () => {
        if (!isConnected) {
            addToast('Please connect your wallet to repost', 'error');
            return;
        }

        try {
            setIsPosting(true);
            await onRepost(post.id, repostMessage.trim() || undefined);
            addToast('Post reposted to your timeline!', 'success');
            setRepostMessage('');
            onClose();
        } catch (error) {
            console.error('Error reposting:', error);
            addToast('Failed to repost. Please try again.', 'error');
        } finally {
            setIsPosting(false);
        }
    };

    if (!isOpen) return null;

    const modalContent = (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="repost-modal-title"
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 id="repost-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                        Repost to Timeline
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Post Preview (Quote) */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-start space-x-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                            {post.authorProfile?.avatar ? (
                                <img
                                    src={post.authorProfile.avatar}
                                    alt={post.authorProfile.handle || post.author}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        if (e.currentTarget.nextSibling) {
                                            (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
                                        }
                                    }}
                                />
                            ) : null}
                            <div
                                className="bg-gradient-to-br from-primary-400 to-secondary-500 w-full h-full flex items-center justify-center"
                                style={{ display: post.authorProfile?.avatar ? 'none' : 'flex' }}
                            >
                                <span className="text-white font-bold text-sm">
                                    {getDefaultAvatar(getDisplayName(post))}
                                </span>
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {getDisplayName(post)}
                                </span>
                                {post.communityName && (
                                    <>
                                        <span>•</span>
                                        <span>{post.communityName}</span>
                                    </>
                                )}
                            </div>
                            <div className="text-gray-900 dark:text-white text-sm">
                                {post.title && (
                                    <div className="font-medium mb-1">{post.title}</div>
                                )}
                                <div className="line-clamp-3">
                                    {(post as any).content
                                        ? ((post as any).content.length > 150
                                            ? (post as any).content.substring(0, 150) + '...'
                                            : (post as any).content)
                                        : 'No content preview available'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Message Input */}
                <div className="p-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Add a comment (optional)
                    </label>
                    <textarea
                        value={repostMessage}
                        onChange={(e) => setRepostMessage(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                        placeholder="What's on your mind?"
                        maxLength={280}
                        autoFocus
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex justify-end">
                        {repostMessage.length}/280
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        disabled={isPosting}
                        className="px-4 py-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors duration-200 font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleRepost}
                        disabled={isPosting}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center"
                    >
                        {isPosting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Reposting...
                            </>
                        ) : (
                            'Repost'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    return typeof window !== 'undefined'
        ? createPortal(modalContent, document.body)
        : null;
}
