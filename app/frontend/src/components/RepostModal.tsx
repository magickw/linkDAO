
import React, { useState, useEffect, useContext, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useWeb3 } from '@/context/Web3Context';
import { ToastContext } from '@/context/ToastContext';
import { getDisplayName, getDefaultAvatar } from '@/utils/userDisplay';
import { getProxiedIPFSUrl } from '@/utils/ipfsProxy';
import { EmojiPicker } from './Pickers/EmojiPicker';
import { GifPicker } from './Pickers/GifPicker';
import { LocationPicker } from './Pickers/LocationPicker';

interface Location {
    name: string;
    lat?: number;
    lng?: number;
}

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
            avatarCid?: string;
            handle?: string;
        };
    };
    onRepost: (postId: string, message?: string, media?: string[], replyRestriction?: string, location?: Location, gifUrl?: string) => Promise<void>;
}

type ReplyAudience = 'everyone' | 'followed' | 'verified' | 'mentioned';

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

    // Rich Media State
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
    const [selectedGif, setSelectedGif] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [showLocationPicker, setShowLocationPicker] = useState(false);

    // Refs for click outside
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const gifPickerRef = useRef<HTMLDivElement>(null);
    const locationPickerRef = useRef<HTMLDivElement>(null);

    // Audience Selector State
    const [replyAudience, setReplyAudience] = useState<ReplyAudience>('everyone');
    const [showAudienceMenu, setShowAudienceMenu] = useState(false);
    const audienceMenuRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Close audience menu when clicking outside
    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (audienceMenuRef.current && !audienceMenuRef.current.contains(event.target as Node)) {
                setShowAudienceMenu(false);
            }
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
            if (gifPickerRef.current && !gifPickerRef.current.contains(event.target as Node)) {
                setShowGifPicker(false);
            }
            if (locationPickerRef.current && !locationPickerRef.current.contains(event.target as Node)) {
                setShowLocationPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close modal on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                if (showAudienceMenu) {
                    setShowAudienceMenu(false);
                } else {
                    onClose();
                }
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
    }, [isOpen, onClose, showAudienceMenu]);

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
            // If we have a selected GIF, appending it to mediaUrls isn't quite right as it's an external URL. 
            // We pass it separately, but for now let's assume onRepost handles it. 
            // The backend update suggests mediaUrls handles external URLs too.
            // If both uploaded images and GIF exist, we combine? Or usually one or the other.
            // Let's pass the gifUrl explicitly if selected.

            await onRepost(
                post.id,
                repostMessage.trim() || undefined,
                mediaUrls,
                replyAudience,
                selectedLocation || undefined,
                selectedGif || undefined
            );
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

    const getAudienceLabel = () => {
        switch (replyAudience) {
            case 'everyone': return 'Everyone can reply';
            case 'followed': return 'Accounts you follow can reply';
            case 'verified': return 'Verified accounts can reply';
            case 'mentioned': return 'Only accounts you mention can reply';
        }
    };

    const getAudienceIcon = () => {
        switch (replyAudience) {
            case 'everyone': return (
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
            );
            case 'followed': return (
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
            );
            case 'verified': return (
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
            );
            case 'mentioned': return (
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M14.243 5.757a6 6 0 10-.986 9.284 1 1 0 111.087 1.678A8 8 0 1118 10a3 3 0 01-4.8 2.401A4 4 0 1114 10a1 1 0 102 0c0 .614-.047 1.216-.135 1.802a1.001 1.001 0 001.272 1.127.999.999 0 00.6-1.545A6.001 6.001 0 0014.243 5.757zM6 10a4 4 0 014-4 2 2 0 10-4 0z" clipRule="evenodd" />
                </svg>
            );
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
                className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl min-h-[600px] max-h-[90vh] shadow-2xl flex flex-col pt-1"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2">
                    <button
                        onClick={onClose}
                        className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition-colors"
                        aria-label="Close"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div className="flex items-center space-x-4">
                        <button
                            className="text-primary-600 font-semibold text-sm hover:bg-primary-50 dark:hover:bg-primary-900/20 px-4 py-1.5 rounded-full transition-colors"
                            onClick={() => {
                                // Save current content to local storage as 'draft'
                                if (repostMessage.trim()) {
                                    localStorage.setItem('repost_draft_' + post.id, repostMessage);
                                    addToast("Draft saved!", "success");
                                } else {
                                    // Try to load
                                    const saved = localStorage.getItem('repost_draft_' + post.id);
                                    if (saved) {
                                        setRepostMessage(saved);
                                        addToast("Draft loaded!", "success");
                                    } else {
                                        addToast("No draft found", "info");
                                    }
                                }
                            }}
                        >
                            Drafts
                        </button>
                    </div>
                </div>

                <div className="p-4 overflow-y-auto flex-1" style={{ maxHeight: 'calc(90vh - 180px)' }}>
                    {/* Input Area */}
                    <div className="flex gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0 mt-1">
                            {/* Current user avatar placeholder - would come from user context */}
                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">

                            {/* Audience Selector Button (Visible) */}
                            {/* Removed top selector to match Twitter flow (it's usually below) */}

                            <textarea
                                ref={textareaRef}
                                value={repostMessage}
                                onChange={(e) => setRepostMessage(e.target.value)}
                                rows={2}
                                className="w-full border-none focus:ring-0 bg-transparent text-xl p-0 resize-none placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white min-h-[50px]"
                                placeholder="Add a comment"
                                maxLength={500}
                                autoFocus
                            />

                            {/* Image Previews */}
                            {imagePreviews.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mt-2 mb-2">
                                    {imagePreviews.map((url, index) => (
                                        <div key={url} className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 h-48">
                                            <img src={url} alt="To upload" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Location Preview */}
                            {selectedLocation && (
                                <div className="flex items-center gap-2 text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 rounded-lg w-fit mt-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="text-sm font-medium">{selectedLocation.name}</span>
                                    <button
                                        onClick={() => setSelectedLocation(null)}
                                        className="ml-1 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-full p-0.5"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            )}

                            {/* GIF Preview */}
                            {selectedGif && (
                                <div className="relative mt-2 rounded-xl overflow-hidden w-full max-w-sm border border-gray-200 dark:border-gray-700">
                                    <img src={selectedGif} alt="Selected GIF" className="w-full h-auto object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setSelectedGif(null)}
                                        className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                        GIF
                                    </div>
                                </div>
                            )}

                            {/* Post Preview (Quote) */}
                            <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                <div className="p-3">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <div className="w-5 h-5 rounded-full overflow-hidden">
                                            {post.authorProfile?.avatarCid ? (
                                                <img src={`https://ipfs.io/ipfs/${post.authorProfile.avatarCid}`} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-[10px]">{post.author.charAt(0)}</div>
                                            )}
                                        </div>
                                        <span className="font-bold text-sm text-gray-900 dark:text-white truncate">{getDisplayName(post)}</span>
                                        <span className="text-gray-500 text-sm truncate">@{post.authorProfile?.handle || post.author.slice(0, 6)}</span>
                                        <span className="text-gray-500 text-sm flex-shrink-0">· {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                    </div>

                                    <div className="text-sm text-gray-900 dark:text-white mb-2">
                                        {post.title && <div className="font-bold mb-1">{post.title}</div>}
                                        <div className="line-clamp-3">
                                            {(post as any).content || 'Shared content'}
                                        </div>
                                    </div>

                                    {post.media && post.media.length > 0 && (
                                        <div className="rounded-lg overflow-hidden h-48 w-full mt-2">
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

                    {/* Everyone can reply - Bottom Selector */}
                    <div className="relative mt-2" ref={audienceMenuRef}>
                        <button
                            className="flex items-center text-primary-500 text-sm font-bold px-3 py-1 -ml-2 rounded-full hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors"
                            onClick={() => setShowAudienceMenu(!showAudienceMenu)}
                        >
                            {getAudienceIcon()}
                            {getAudienceLabel()}
                        </button>

                        {/* Audience Menu Popover */}
                        {showAudienceMenu && (
                            <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-[60] overflow-visible animate-fadeIn">
                                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                                    <h3 className="font-bold text-gray-900 dark:text-white">Who can reply?</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Choose who can reply to this post.<br />Anyone mentioned can always reply.</p>
                                </div>
                                <div className="py-1">
                                    {[
                                        { id: 'everyone', label: 'Everyone', icon: 'globe' },
                                        { id: 'followed', label: 'Accounts you follow', icon: 'user-group' },
                                        { id: 'verified', label: 'Verified accounts', icon: 'badge-check' },
                                        { id: 'mentioned', label: 'Only accounts you mention', icon: 'at-symbol' }
                                    ].map((option) => (
                                        <button
                                            key={option.id}
                                            onClick={() => {
                                                setReplyAudience(option.id as ReplyAudience);
                                                setShowAudienceMenu(false);
                                            }}
                                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <div className="flex items-center">
                                                <div className={`p-2 rounded-full mr-3 ${replyAudience === option.id ? 'bg-primary-500 text-white' : 'bg-primary-100 text-primary-500 dark:bg-gray-700 dark:text-gray-300'}`}>
                                                    {/* Simplified icon logic for brevity */}
                                                    {/* In real implementation, render specific icons based on option.icon */}
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <span className="font-medium text-gray-900 dark:text-white">{option.label}</span>
                                            </div>
                                            {replyAudience === option.id && (
                                                <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Controls & Post Button */}
                <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between mt-auto">
                    <div className="flex items-center space-x-1 relative">
                        <label className={`p-2 rounded-full cursor-pointer transition-colors ${selectedImages.length >= 4 ? 'text-gray-300 cursor-not-allowed' : 'text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20'}`}>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleImageChange}
                                disabled={selectedImages.length >= 4 || isPosting}
                            />
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </label>

                        {/* Gif Picker */}
                        <div className="relative" ref={gifPickerRef}>
                            <button
                                className={`p-2 rounded-full transition-colors ${showGifPicker ? 'text-primary-600 bg-primary-100 dark:bg-primary-900/40' : 'text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20'}`}
                                onClick={() => {
                                    setShowGifPicker(!showGifPicker);
                                    setShowEmojiPicker(false);
                                    setShowLocationPicker(false);
                                }}
                            >
                                <span className="font-bold border border-current rounded px-1 text-[10px]">GIF</span>
                            </button>
                            {showGifPicker && (
                                <div className="absolute bottom-full mb-2 left-0 z-50">
                                    <GifPicker
                                        onSelect={(url) => {
                                            setSelectedGif(url);
                                            setShowGifPicker(false);
                                        }}
                                        onClose={() => setShowGifPicker(false)}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Emoji Picker */}
                        <div className="relative" ref={emojiPickerRef}>
                            <button
                                className={`p-2 rounded-full transition-colors ${showEmojiPicker ? 'text-primary-600 bg-primary-100 dark:bg-primary-900/40' : 'text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20'}`}
                                onClick={() => {
                                    setShowEmojiPicker(!showEmojiPicker);
                                    setShowGifPicker(false);
                                    setShowLocationPicker(false);
                                }}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </button>
                            {showEmojiPicker && (
                                <div className="absolute bottom-full mb-2 left-0 z-[60]">
                                    <EmojiPicker
                                        onSelect={(emoji) => {
                                            if (textareaRef.current) {
                                                const start = textareaRef.current.selectionStart;
                                                const end = textareaRef.current.selectionEnd;
                                                const text = repostMessage;
                                                const newText = text.substring(0, start) + emoji + text.substring(end);
                                                setRepostMessage(newText);

                                                setTimeout(() => {
                                                    if (textareaRef.current) {
                                                        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + emoji.length;
                                                        textareaRef.current.focus();
                                                    }
                                                }, 0);
                                            } else {
                                                setRepostMessage(prev => prev + emoji);
                                            }
                                            setShowEmojiPicker(false);
                                        }}
                                        onClose={() => setShowEmojiPicker(false)}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Location Picker */}
                        <div className="relative" ref={locationPickerRef}>
                            <button
                                className={`p-2 rounded-full transition-colors ${showLocationPicker ? 'text-primary-600 bg-primary-100 dark:bg-primary-900/40' : 'text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20'}`}
                                onClick={() => {
                                    setShowLocationPicker(!showLocationPicker);
                                    setShowGifPicker(false);
                                    setShowEmojiPicker(false);
                                }}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </button>
                            {showLocationPicker && (
                                <div className="absolute bottom-full mb-2 left-0 z-50">
                                    <LocationPicker
                                        onSelect={(loc) => {
                                            setSelectedLocation(loc);
                                            setShowLocationPicker(false);
                                        }}
                                        onClose={() => setShowLocationPicker(false)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        {repostMessage.length > 0 && (
                            <div className="relative w-6 h-6 flex items-center justify-center">
                                {/* Simple character count ring */}
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" className="text-gray-200 dark:text-gray-700" />
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"
                                        strokeDasharray={2 * Math.PI * 10}
                                        strokeDashoffset={2 * Math.PI * 10 * (1 - repostMessage.length / 500)}
                                        className={repostMessage.length > 450 ? "text-red-500" : "text-primary-500"}
                                    />
                                </svg>
                            </div>
                        )}
                        <button
                            onClick={handleRepost}
                            disabled={isPosting || isUploading || (repostMessage.length === 0 && selectedImages.length === 0)}
                            className={`px-4 py-1.5 rounded-full font-bold text-sm transition-all shadow-sm
                                ${isPosting || isUploading || (repostMessage.length === 0 && selectedImages.length === 0)
                                    ? 'bg-primary-300 dark:bg-primary-800 cursor-not-allowed text-white/70'
                                    : 'bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white'
                                }`}
                        >
                            {isPosting || isUploading ? 'Posting...' : 'Post'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return typeof window !== 'undefined'
        ? createPortal(modalContent, document.body)
        : null;
}
