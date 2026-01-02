
import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useWeb3 } from '@/context/Web3Context';
import { ToastContext } from '@/context/ToastContext';
import { getDisplayName, getDefaultAvatar } from '@/utils/userDisplay';
import { getProxiedIPFSUrl } from '@/utils/ipfsProxy';

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
        media?: string[];
        authorProfile?: {
            avatar?: string;
            handle?: string;
        };
    };
    onRepost: (postId: string, message?: string, media?: string[]) => Promise<void>;
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
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);

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

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            if (selectedImages.length + files.length > 4) {
                addToast('Maximum 4 images allowed', 'warning');
                return;
            }

            const newPreviews = files.map(file => URL.createObjectURL(file));
            setSelectedImages(prev => [...prev, ...files]);
            setImagePreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeImage = (index: number) => {
        URL.revokeObjectURL(imagePreviews[index]);
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const uploadImages = async (): Promise<string[]> => {
        if (selectedImages.length === 0) return [];

        setIsUploading(true);
        try {
            const uploadPromises = selectedImages.map(async (file) => {
                const formData = new FormData();
                formData.append('file', file);
                const response = await fetch('/api/ipfs/upload', {
                    method: 'POST',
                    body: formData
                });
                if (!response.ok) throw new Error('Failed to upload image');
                const result = await response.json();
                return result.data.ipfsHash;
            });

            return await Promise.all(uploadPromises);
        } finally {
            setIsUploading(false);
        }
    };

    const handleRepost = async () => {
        if (!isConnected) {
            addToast('Please connect your wallet to repost', 'error');
            return;
        }

        try {
            setIsPosting(true);
            const mediaUrls = await uploadImages();
            await onRepost(post.id, repostMessage.trim() || undefined, mediaUrls);
            addToast('Post reposted to your timeline!', 'success');
            setRepostMessage('');
            setSelectedImages([]);
            setImagePreviews([]);
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
                                <div className="line-clamp-3 text-gray-700 dark:text-gray-300">
                                    {(post as any).content
                                        ? ((post as any).content.length > 200
                                            ? (post as any).content.substring(0, 200) + '...'
                                            : (post as any).content)
                                        : 'No content preview available'}
                                </div>
                                {post.media && post.media.length > 0 && (
                                    <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 max-h-32">
                                        <img
                                            src={getProxiedIPFSUrl(post.media[0])}
                                            alt="Original post media"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Message Input */}
                <div className="p-4 space-y-4">
                    <div>
                        <textarea
                            value={repostMessage}
                            onChange={(e) => setRepostMessage(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-base"
                            placeholder="Add a comment..."
                            maxLength={500}
                            autoFocus
                        />
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex justify-end">
                            {repostMessage.length}/500
                        </div>
                    </div>

                    {/* Image Previews */}
                    {imagePreviews.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            {imagePreviews.map((url, index) => (
                                <div key={url} className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 h-24">
                                    <img src={url} alt="To upload" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Toolbar */}
                    <div className="flex items-center space-x-2 border-t border-gray-100 dark:border-gray-700 pt-3">
                        <label className={`p-2 rounded-full cursor-pointer transition-colors ${selectedImages.length >= 4 ? 'text-gray-300 cursor-not-allowed' : 'text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20'}`}>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleImageChange}
                                disabled={selectedImages.length >= 4 || isPosting}
                            />
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </label>
                        <button
                            type="button"
                            className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-full transition-colors"
                            onClick={() => addToast('Emoji support coming soon!', 'info')}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>
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
                        disabled={isPosting || isUploading}
                        className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center shadow-lg"
                    >
                        {isPosting || isUploading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {isUploading ? 'Uploading...' : 'Reposting...'}
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
