import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useWeb3 } from '../../context/Web3Context';
import { useToast } from '../../context/ToastContext';
import { serviceWorkerCacheService } from '../../services/serviceWorkerCacheService';
import { mediaProcessingService } from '../../services/mediaProcessingService';
import { DraftService } from '../../services/draftService';
import { PostDraft, ContentType, MediaFile as EnhancedMediaFile } from '../../types/enhancedPost';
import RichTextEditor from '../EnhancedPostComposer/RichTextEditor';
import { MediaUploadZone } from '../EnhancedPostComposer/MediaUploadZone';
import { HashtagMentionInput } from '../EnhancedPostComposer/HashtagMentionInput';
import { ErrorBoundary } from '../ErrorHandling/ErrorBoundary';

interface PostComposerProps {
  communityId?: string;
  onPost?: (postData: PostData) => Promise<void>;
  onCancel?: () => void;
  className?: string;
  placeholder?: string;
  maxLength?: number;
  enableDrafts?: boolean;
  enableCommunitySelection?: boolean;
}

interface PostData {
  content: string;
  title?: string;
  communityId?: string;
  tags: string[];
  mentions: string[];
  media: MediaFile[];
  contentType: 'text' | 'media' | 'link' | 'poll' | 'proposal';
  scheduledAt?: Date;
}

interface MediaFile {
  id: string;
  file: File;
  url: string;
  type: 'image' | 'video' | 'audio' | 'document';
  size: number;
  optimized?: boolean;
  ipfsHash?: string;
}

interface Community {
  id: string;
  name: string;
  displayName: string;
  iconUrl?: string;
  memberCount: number;
  canPost: boolean;
}

const MAX_CONTENT_LENGTH = 2000;
const MAX_TITLE_LENGTH = 200;
const MAX_MEDIA_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function PostComposer({
  communityId,
  onPost,
  onCancel,
  className = '',
  placeholder = "What's on your mind?",
  maxLength = MAX_CONTENT_LENGTH,
  enableDrafts = true,
  enableCommunitySelection = true
}: PostComposerProps) {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();

  // State
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [selectedCommunityId, setSelectedCommunityId] = useState(communityId || '');
  const [tags, setTags] = useState<string[]>([]);
  const [mentions, setMentions] = useState<string[]>([]);
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [contentType, setContentType] = useState<PostData['contentType']>('text');
  const [isPosting, setIsPosting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<Date | undefined>();
  const [showScheduler, setShowScheduler] = useState(false);

  // Refs
  const draftTimeoutRef = useRef<NodeJS.Timeout>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load communities on mount
  useEffect(() => {
    if (enableCommunitySelection && isConnected) {
      loadUserCommunities();
    }
  }, [enableCommunitySelection, isConnected]);

  // Auto-save draft
  useEffect(() => {
    if (!enableDrafts || !content.trim()) return;

    if (draftTimeoutRef.current) {
      clearTimeout(draftTimeoutRef.current);
    }

    draftTimeoutRef.current = setTimeout(() => {
      saveDraft();
    }, 2000); // Save after 2 seconds of inactivity

    return () => {
      if (draftTimeoutRef.current) {
        clearTimeout(draftTimeoutRef.current);
      }
    };
  }, [content, title, selectedCommunityId, tags, mentions, enableDrafts]);

  // Load user communities
  const loadUserCommunities = useCallback(async () => {
    if (!isConnected) return;

    setLoadingCommunities(true);
    try {
      // Try cache first
      const cachedResponse = await serviceWorkerCacheService.cacheWithStrategy(
        '/api/user/communities',
        'communities',
        ['communities', 'user-data']
      );

      let communitiesData;
      if (cachedResponse) {
        communitiesData = await cachedResponse.json();
      } else {
        // Fallback to mock data for development
        communitiesData = [
          {
            id: 'general',
            name: 'general',
            displayName: 'General Discussion',
            iconUrl: undefined,
            memberCount: 1234,
            canPost: true
          },
          {
            id: 'defi',
            name: 'defi',
            displayName: 'DeFi Hub',
            iconUrl: undefined,
            memberCount: 856,
            canPost: true
          },
          {
            id: 'nft',
            name: 'nft',
            displayName: 'NFT Marketplace',
            iconUrl: undefined,
            memberCount: 642,
            canPost: true
          }
        ];
      }

      setCommunities(communitiesData.filter((c: Community) => c.canPost));
    } catch (error) {
      console.error('Failed to load communities:', error);
      addToast('Failed to load communities', 'error');
    } finally {
      setLoadingCommunities(false);
    }
  }, [isConnected, addToast]);

  // Save draft
  const saveDraft = useCallback(async () => {
    if (!enableDrafts || !content.trim()) return;

    try {
      const now = new Date();
      const draftData: PostDraft = {
        id: `draft_${Date.now()}`,
        contentType: (contentType as ContentType) || ContentType.TEXT,
        title,
        content,
        media: (media || []).map(m => ({
          id: m.id,
          file: m.file,
          preview: m.url,
          type: m.type as 'image' | 'video' | 'audio',
          size: m.size,
          uploadStatus: 'completed' as const
        })),
        links: [],
        hashtags: tags || [],
        mentions: mentions || [],
        communityId: selectedCommunityId,
        scheduledAt,
        createdAt: now,
        updatedAt: now,
        autoSaved: true
      };

      await DraftService.saveDraft(draftData);
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }, [content, title, selectedCommunityId, tags, mentions, media, contentType, scheduledAt, enableDrafts]);

  // Load draft
  const loadDraft = useCallback(async () => {
    if (!enableDrafts) return;

    try {
      const draft = DraftService.loadDraft('feed');
      if (draft) {
        setContent(draft.content || '');
        setTitle(draft.title || '');
        setSelectedCommunityId(draft.communityId || '');
        setTags(draft.hashtags || []);
        setMentions(draft.mentions || []);
        setContentType(draft.contentType || 'text');
        setScheduledAt(draft.scheduledAt);
        
        addToast('Draft loaded', 'info');
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  }, [enableDrafts, addToast]);

  // Handle media upload
  const handleMediaUpload = useCallback(async (files: File[]) => {
    const newFiles: MediaFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        addToast(`File ${file.name} is too large (max 50MB)`, 'error');
        continue;
      }

      // Check total media count
      if (media.length + newFiles.length >= MAX_MEDIA_FILES) {
        addToast(`Maximum ${MAX_MEDIA_FILES} files allowed`, 'error');
        break;
      }

      // Determine file type
      let type: MediaFile['type'] = 'document';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';

      // Create media file object
      const mediaFile: MediaFile = {
        id: `${Date.now()}-${i}`,
        file,
        url: URL.createObjectURL(file),
        type,
        size: file.size,
        optimized: false
      };

      newFiles.push(mediaFile);

      // Optimize images
      if (type === 'image') {
        try {
          const result = await mediaProcessingService.processMedia(file, { quality: 0.8, enableCompression: true });
          const optimized = result.success && result.processedFile ? result.processedFile : file;
          mediaFile.file = optimized;
          mediaFile.url = URL.createObjectURL(optimized);
          mediaFile.optimized = true;
        } catch (error) {
          console.warn('Image optimization failed:', error);
        }
      }
    }

    setMedia(prev => [...prev, ...newFiles]);
    
    // Update content type if media added
    if (newFiles.length > 0 && contentType === 'text') {
      setContentType('media');
    }
  }, [media.length, addToast, contentType]);

  // Remove media file
  const removeMediaFile = useCallback((id: string) => {
    setMedia(prev => {
      const updated = prev.filter(m => m.id !== id);
      
      // Revoke object URL to prevent memory leaks
      const removed = prev.find(m => m.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.url);
      }

      // Update content type if no media left
      if (updated.length === 0 && contentType === 'media') {
        setContentType('text');
      }

      return updated;
    });
  }, [contentType]);

  // Handle hashtag/mention updates
  const handleTagsUpdate = useCallback((newTags: string[], newMentions: string[]) => {
    setTags(newTags);
    setMentions(newMentions);
  }, []);

  // Validate post data
  const validatePost = useCallback((): string | null => {
    if (!isConnected) return 'Please connect your wallet';
    if (!content.trim() && media.length === 0) return 'Post cannot be empty';
    if (content.length > maxLength) return `Content too long (max ${maxLength} characters)`;
    if (title.length > MAX_TITLE_LENGTH) return `Title too long (max ${MAX_TITLE_LENGTH} characters)`;
    if (selectedCommunityId && !communities.find(c => c.id === selectedCommunityId)) {
      return 'Selected community is invalid';
    }
    return null;
  }, [isConnected, content, media.length, maxLength, title.length, selectedCommunityId, communities]);

  // Handle post submission
  const handlePost = useCallback(async () => {
    const validationError = validatePost();
    if (validationError) {
      addToast(validationError, 'error');
      return;
    }

    setIsPosting(true);
    try {
      // Upload media to IPFS if present (TODO: implement IPFS service)
      const processedMedia = media.map(mediaFile => ({
        ...mediaFile,
        ipfsHash: `placeholder_${mediaFile.id}` // Placeholder until IPFS service is implemented
      }));

      const postData: PostData = {
        content: content.trim(),
        title: title.trim() || undefined,
        communityId: selectedCommunityId || undefined,
        tags,
        mentions,
        media: processedMedia,
        contentType,
        scheduledAt
      };

      if (onPost) {
        await onPost(postData);
      }

      // Clear form
      setContent('');
      setTitle('');
      setTags([]);
      setMentions([]);
      setMedia([]);
      setContentType('text');
      setScheduledAt(undefined);

      // Clear draft
      if (enableDrafts) {
      DraftService.deleteDraft('feed');
      }

      addToast(scheduledAt ? 'Post scheduled successfully!' : 'Post created successfully!', 'success');
    } catch (error) {
      console.error('Post creation failed:', error);
      addToast('Failed to create post', 'error');
    } finally {
      setIsPosting(false);
    }
  }, [validatePost, media, content, title, selectedCommunityId, tags, mentions, contentType, scheduledAt, onPost, enableDrafts, addToast]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (content.trim() || title.trim() || media.length > 0) {
      if (confirm('Are you sure you want to discard this post?')) {
        setContent('');
        setTitle('');
        setTags([]);
        setMentions([]);
        setMedia([]);
        setContentType('text');
        setScheduledAt(undefined);
        
        if (onCancel) {
          onCancel();
        }
      }
    } else {
      if (onCancel) {
        onCancel();
      }
    }
  }, [content, title, media.length, onCancel]);

  // Character count and validation
  const remainingChars = maxLength - content.length;
  const isOverLimit = remainingChars < 0;
  const canPost = !isPosting && !isOverLimit && (content.trim() || media.length > 0) && isConnected;

  return (
    <ErrorBoundary fallback={<ComposerErrorFallback />}>
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 ${className}`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Create Post
            </h3>
            
            <div className="flex items-center space-x-2">
              {enableDrafts && (
                <button
                  onClick={loadDraft}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
                >
                  Load Draft
                </button>
              )}
              
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  showPreview
                    ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {showPreview ? 'Edit' : 'Preview'}
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Community Selection */}
          {enableCommunitySelection && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Post to Community
              </label>
              <select
                value={selectedCommunityId}
                onChange={(e) => setSelectedCommunityId(e.target.value)}
                disabled={loadingCommunities}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select a community (optional)</option>
                {communities.map(community => (
                  <option key={community.id} value={community.id}>
                    {community.displayName} ({community.memberCount} members)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title (optional)"
              maxLength={MAX_TITLE_LENGTH}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {title.length > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {MAX_TITLE_LENGTH - title.length} characters remaining
              </div>
            )}
          </div>

          {/* Rich Text Editor */}
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder={placeholder}
            showPreview={showPreview}
            disabled={isPosting}
            className="min-h-[200px]"
          />

          {/* Character Count */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className={`${isOverLimit ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                {remainingChars} characters remaining
              </span>
              
              {tags.length > 0 && (
                <span className="text-gray-500 dark:text-gray-400">
                  {tags.length} hashtag{tags.length !== 1 ? 's' : ''}
                </span>
              )}
              
              {mentions.length > 0 && (
                <span className="text-gray-500 dark:text-gray-400">
                  {mentions.length} mention{mentions.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            
            <div className="text-gray-500 dark:text-gray-400">
              Type: {contentType}
            </div>
          </div>

          {/* Hashtag/Mention Input */}
          <HashtagMentionInput
            value={content}
            onChange={setContent}
            onHashtagsChange={(hashtags) => setTags(hashtags)}
            onMentionsChange={(mentions) => setMentions(mentions)}
            disabled={isPosting}
          />

          {/* Media Upload */}
          <MediaUploadZone
            onUpload={handleMediaUpload}
            maxFiles={MAX_MEDIA_FILES}
            acceptedTypes={['image/*', 'video/*', 'audio/*']}
          />
          
          {/* Display uploaded media */}
          {media.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              {media.map((file) => (
                <div key={file.id} className="relative">
                  <img 
                    src={file.url} 
                    alt="Upload preview" 
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeMediaFile(file.id)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    disabled={isPosting}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Scheduler */}
          {showScheduler && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Schedule Post
              </label>
              <input
                type="datetime-local"
                value={scheduledAt ? scheduledAt.toISOString().slice(0, 16) : ''}
                onChange={(e) => setScheduledAt(e.target.value ? new Date(e.target.value) : undefined)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Media Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isPosting || media.length >= MAX_MEDIA_FILES}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Add media"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>

            {/* Schedule Button */}
            <button
              onClick={() => setShowScheduler(!showScheduler)}
              disabled={isPosting}
              className={`p-2 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                showScheduler || scheduledAt
                  ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Schedule post"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
              onChange={(e) => e.target.files && handleMediaUpload(Array.from(e.target.files))}
              className="hidden"
            />
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleCancel}
              disabled={isPosting}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            
            <button
              onClick={handlePost}
              disabled={!canPost}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-200 disabled:cursor-not-allowed"
            >
              {isPosting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Posting...</span>
                </div>
              ) : scheduledAt ? (
                'Schedule Post'
              ) : (
                'Post'
              )}
            </button>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

// Composer Error Fallback
function ComposerErrorFallback() {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
      <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 mb-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span className="font-medium">Post Composer Error</span>
      </div>
      <p className="text-red-600 dark:text-red-400 text-sm">
        The post composer encountered an error. Please refresh the page and try again.
      </p>
    </div>
  );
}