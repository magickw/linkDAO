import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CreatePostInput } from '@/models/Post';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';

interface UnifiedPostCreationProps {
  context: 'feed' | 'community';
  communityId?: string;
  onSubmit: (data: CreatePostInput) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  placeholder?: string;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  className?: string;
}

interface DraftData {
  content: string;
  tags: string;
  postType: string;
  nftAddress: string;
  nftTokenId: string;
  media: File | null;
  timestamp: number;
}

export default function UnifiedPostCreation({
  context,
  communityId,
  onSubmit,
  onCancel,
  isLoading = false,
  placeholder,
  expanded = false,
  onExpandedChange,
  className = ''
}: UnifiedPostCreationProps) {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Form state
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [media, setMedia] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [postType, setPostType] = useState('standard');
  const [nftAddress, setNftAddress] = useState('');
  const [nftTokenId, setNftTokenId] = useState('');
  const [isExpanded, setIsExpanded] = useState(expanded);
  
  // Social media sharing state
  const [shareToTwitter, setShareToTwitter] = useState(false);
  const [shareToFacebook, setShareToFacebook] = useState(false);
  const [shareToLinkedIn, setShareToLinkedIn] = useState(false);
  
  // Draft management
  const [draftKey, setDraftKey] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  
  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, []);

  // Initialize draft key based on context
  useEffect(() => {
    const key = context === 'community' && communityId 
      ? `draft_${context}_${communityId}` 
      : `draft_${context}`;
    setDraftKey(key);
  }, [context, communityId]);

  // Load draft on mount
  useEffect(() => {
    if (draftKey) {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const draft: DraftData = JSON.parse(savedDraft);
          // Only load draft if it's less than 24 hours old
          const isRecentDraft = Date.now() - draft.timestamp < 24 * 60 * 60 * 1000;
          
          if (isRecentDraft) {
            setContent(draft.content);
            setTags(draft.tags);
            setPostType(draft.postType);
            setNftAddress(draft.nftAddress);
            setNftTokenId(draft.nftTokenId);
            setHasDraft(true);
            
            // Don't restore media file as it can't be serialized
            if (draft.content.trim()) {
              setIsExpanded(true);
            }
          } else {
            // Remove old draft
            localStorage.removeItem(draftKey);
          }
        } catch (error) {
          console.error('Error loading draft:', error);
          localStorage.removeItem(draftKey);
        }
      }
    }
  }, [draftKey]);

  // Auto-save draft
  useEffect(() => {
    if (draftKey && (content.trim() || tags.trim() || postType !== 'standard')) {
      const draft: DraftData = {
        content,
        tags,
        postType,
        nftAddress,
        nftTokenId,
        media: null, // Can't serialize File objects
        timestamp: Date.now()
      };
      
      const timeoutId = setTimeout(() => {
        localStorage.setItem(draftKey, JSON.stringify(draft));
      }, 1000); // Debounce saves by 1 second
      
      return () => clearTimeout(timeoutId);
    }
  }, [content, tags, postType, nftAddress, nftTokenId, draftKey]);

  // Clear draft when form is reset
  const clearDraft = useCallback(() => {
    if (draftKey) {
      localStorage.removeItem(draftKey);
      setHasDraft(false);
    }
  }, [draftKey]);

  // Handle expansion state changes
  useEffect(() => {
    if (onExpandedChange) {
      onExpandedChange(isExpanded);
    }
  }, [isExpanded, onExpandedChange]);

  // Auto-resize textarea when content changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [content, adjustTextareaHeight]);

  const handleExpand = () => {
    setIsExpanded(true);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const handleCollapse = () => {
    if (!content.trim() && !tags.trim() && postType === 'standard') {
      setIsExpanded(false);
      clearDraft();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      addToast('Please enter some content for your post', 'error');
      return;
    }

    if (!isConnected || !address) {
      addToast('Please connect your wallet to post', 'error');
      return;
    }
    
    try {
      // Extract tags from input (comma separated)
      const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      
      // Add post type as a tag
      tagArray.push(postType);
      
      // Add community context if applicable
      if (context === 'community' && communityId) {
        tagArray.push(`community:${communityId}`);
      }
      
      const postData: CreatePostInput = {
        author: address,
        content,
        tags: tagArray,
        shareToSocialMedia: {
          twitter: shareToTwitter,
          facebook: shareToFacebook,
          linkedin: shareToLinkedIn,
        },
      };
      
      if (media) {
        // In a real implementation, we would upload the media to IPFS and store the CID
        // For now, we'll just add a placeholder
        postData.media = ['https://placehold.co/300'];
      }
      
      // Add NFT information if it's an NFT post
      if (postType === 'nft' && nftAddress && nftTokenId) {
        postData.onchainRef = `${nftAddress}:${nftTokenId}`;
      }
      
      await onSubmit(postData);
      
      // Reset form after successful submission
      handleReset();
      addToast('Post created successfully!', 'success');
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      addToast('Failed to create post. Please try again.', 'error');
    }
  };

  const handleReset = () => {
    setContent('');
    setTags('');
    setMedia(null);
    setPreview(null);
    setPostType('standard');
    setNftAddress('');
    setNftTokenId('');
    setIsExpanded(false);
    setShareToTwitter(false);
    setShareToFacebook(false);
    setShareToLinkedIn(false);
    clearDraft();
    
    if (onCancel) {
      onCancel();
    }
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        addToast('File size must be less than 10MB', 'error');
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        addToast('Only image files are supported', 'error');
        return;
      }
      
      setMedia(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeMedia = () => {
    setMedia(null);
    setPreview(null);
  };

  // Get context-specific placeholder text
  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    
    if (context === 'community') {
      return "Share your thoughts with the community...";
    }
    
    switch (postType) {
      case 'proposal':
        return "Describe your governance proposal...";
      case 'defi':
        return "Share your DeFi strategy or insights...";
      case 'nft':
        return "Showcase your NFT collection...";
      case 'analysis':
        return "Provide your market analysis...";
      default:
        return "What's happening in Web3?";
    }
  };

  // Get context-specific post types
  const getAvailablePostTypes = () => {
    const baseTypes = [
      { id: 'standard', label: 'Standard', icon: '📝' },
      { id: 'analysis', label: 'Analysis', icon: '📊' },
      { id: 'nft', label: 'NFT', icon: '🎨' },
      { id: 'defi', label: 'DeFi', icon: '💱' }
    ];
    
    if (context === 'community') {
      return [
        ...baseTypes,
        { id: 'discussion', label: 'Discussion', icon: '💬' },
        { id: 'question', label: 'Question', icon: '❓' }
      ];
    }
    
    return [
      ...baseTypes,
      { id: 'proposal', label: 'Proposal', icon: '🏛️' }
    ];
  };

  if (!isExpanded) {
    // Collapsed state - Facebook-style input
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
        <div 
          onClick={handleExpand}
          className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
        >
          <div className="flex items-center space-x-3">
            {/* User Avatar */}
            <div className="bg-gradient-to-br from-primary-400 to-secondary-500 border-2 border-white dark:border-gray-800 rounded-full w-10 h-10 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">
                {address ? address.slice(2, 4).toUpperCase() : 'U'}
              </span>
            </div>
            
            {/* Post Input Placeholder */}
            <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-3 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200">
              {getPlaceholder()}
            </div>
          </div>
          
          {/* Quick Action Buttons */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-4">
              <button 
                type="button"
                className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">Photo</span>
              </button>
              
              <button 
                type="button"
                className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
              >
                <span className="text-lg">🎨</span>
                <span className="text-sm font-medium">NFT</span>
              </button>
              
              {context === 'feed' && (
                <button 
                  type="button"
                  className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
                >
                  <span className="text-lg">🏛️</span>
                  <span className="text-sm font-medium">Proposal</span>
                </button>
              )}
            </div>
            
            <div className="text-xs text-gray-400 dark:text-gray-500">
              {hasDraft && <span className="text-amber-500 mr-2">Draft saved</span>}
              Click to create post
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Expanded state - Full post creation interface
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {context === 'community' ? 'Create Community Post' : 'Create Post'}
        </h3>
        <button 
          onClick={handleCollapse}
          className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200 transition-colors duration-200"
          disabled={isLoading}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6">
        {/* Post Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Post Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {getAvailablePostTypes().map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setPostType(type.id)}
                className={`flex flex-col items-center justify-center p-3 md:p-2 rounded-md border transition-all duration-200 touch-target ${
                  postType === type.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                disabled={isLoading}
              >
                <span className="text-xl md:text-lg">{type.icon}</span>
                <span className="text-xs mt-1">{type.label}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* NFT Fields (only show for NFT post type) */}
        {postType === 'nft' && (
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nftAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                NFT Contract Address
              </label>
              <input
                type="text"
                id="nftAddress"
                value={nftAddress}
                onChange={(e) => setNftAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="nftTokenId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Token ID
              </label>
              <input
                type="text"
                id="nftTokenId"
                value={nftTokenId}
                onChange={(e) => setNftTokenId(e.target.value)}
                placeholder="123"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                disabled={isLoading}
              />
            </div>
          </div>
        )}
        
        {/* Content Input */}
        <div className="mb-4">
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Content
          </label>
          <textarea
            ref={textareaRef}
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={getPlaceholder()}
            className="w-full px-3 py-3 md:py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white resize-none overflow-hidden transition-colors duration-200 text-base md:text-sm"
            rows={3}
            required
            disabled={isLoading}
            style={{ minHeight: '100px' }}
          />
          <div className="flex justify-between items-center mt-1">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Supports markdown formatting
            </div>
            <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
              {280 - content.length} remaining
            </div>
          </div>
        </div>
        
        {/* Media Preview */}
        {preview && (
          <div className="mb-4 relative">
            <img src={preview} alt="Preview" className="rounded-lg max-h-60 object-cover w-full" />
            <button
              type="button"
              onClick={removeMedia}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors duration-200"
              disabled={isLoading}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        {/* Media Upload */}
        <div className="mb-4">
          <label htmlFor="media" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Add Media
          </label>
          <input
            type="file"
            id="media"
            accept="image/*"
            onChange={handleMediaChange}
            className="block w-full text-sm text-gray-500 dark:text-gray-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-medium
              file:bg-primary-600 file:text-white
              hover:file:bg-primary-700
              dark:file:bg-primary-700 dark:hover:file:bg-primary-600
              transition-colors duration-200"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Max file size: 10MB. Supported formats: JPG, PNG, GIF
          </p>
        </div>
        
        {/* Tags Input */}
        <div className="mb-6">
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tags (comma separated)
          </label>
          <input
            type="text"
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder={context === 'community' ? "discussion, help, announcement" : "defi, nft, governance"}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Add relevant tags to help others discover your post
          </p>
        </div>
        
        {/* Social Media Sharing Options */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center space-x-2 mb-3">
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span className="text-sm font-medium text-gray-900 dark:text-white">Share to Social Media</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="flex items-center space-x-2 cursor-pointer p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <input
                type="checkbox"
                checked={shareToTwitter}
                onChange={(e) => setShareToTwitter(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="flex items-center space-x-2">
                <span className="text-lg">𝕏</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">Twitter</span>
              </div>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <input
                type="checkbox"
                checked={shareToFacebook}
                onChange={(e) => setShareToFacebook(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="flex items-center space-x-2">
                <span className="text-lg">f</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">Facebook</span>
              </div>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <input
                type="checkbox"
                checked={shareToLinkedIn}
                onChange={(e) => setShareToLinkedIn(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="flex items-center space-x-2">
                <span className="text-lg">in</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">LinkedIn</span>
              </div>
            </label>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
            {hasDraft && (
              <span className="flex items-center space-x-1 text-amber-500">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Draft saved</span>
              </span>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800 transition-colors duration-200"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={content.trim() === '' || isLoading || (postType === 'nft' && (!nftAddress || !nftTokenId))}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 dark:focus:ring-offset-gray-800 transition-colors duration-200"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Posting...</span>
                </div>
              ) : (
                'Post'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}