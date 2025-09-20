import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import { 
  ContentType, 
  RichPostInput, 
  PostDraft, 
  MediaFile,
  LinkPreview,
  PollData,
  ProposalData,
  EnhancedPostComposerProps,
  ContentValidation
} from '../../types/enhancedPost';
import { DraftService } from '../../services/draftService';
import ContentTypeTabs from './ContentTypeTabs';
import MediaUploadZone from './MediaUploadZone';
import HashtagMentionInput from './HashtagMentionInput';

export default function EnhancedPostComposer({
  context,
  communityId,
  initialContentType = ContentType.TEXT,
  initialDraft,
  onSubmit,
  onDraftSave,
  onDraftLoad,
  onCancel,
  isLoading = false,
  className = ''
}: EnhancedPostComposerProps) {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  
  // Form state
  const [contentType, setContentType] = useState<ContentType>(initialContentType);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [links, setLinks] = useState<LinkPreview[]>([]);
  const [poll, setPoll] = useState<PollData | undefined>();
  const [proposal, setProposal] = useState<ProposalData | undefined>();
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [mentions, setMentions] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState<Date | undefined>();
  
  // UI state
  const [isExpanded, setIsExpanded] = useState(false);
  const [validation, setValidation] = useState<ContentValidation | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftLastSaved, setDraftLastSaved] = useState<Date | null>(null);
  
  // Refs
  const autoSaverRef = useRef<{ save: (draft: Partial<PostDraft>) => void; cancel: () => void } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Initialize auto-saver
  useEffect(() => {
    autoSaverRef.current = DraftService.createAutoSaver(context, communityId);
    
    return () => {
      autoSaverRef.current?.cancel();
    };
  }, [context, communityId]);

  // Load initial draft
  useEffect(() => {
    if (initialDraft) {
      loadDraftData(initialDraft);
    } else {
      const existingDraft = DraftService.loadDraft(context, communityId);
      if (existingDraft) {
        loadDraftData(existingDraft);
        setHasDraft(true);
      }
    }
  }, [context, communityId, initialDraft]);

  // Auto-save current state
  useEffect(() => {
    if (autoSaverRef.current && (content.trim() || media.length > 0 || title.trim())) {
      const draftData: Partial<PostDraft> = {
        contentType,
        title,
        content,
        media,
        links,
        poll,
        proposal,
        hashtags,
        mentions,
        scheduledAt,
        communityId
      };
      
      autoSaverRef.current.save(draftData);
      setDraftLastSaved(new Date());
    }
  }, [contentType, title, content, media, links, poll, proposal, hashtags, mentions, scheduledAt, communityId]);

  // Load draft data into form
  const loadDraftData = useCallback((draft: PostDraft) => {
    setContentType(draft.contentType);
    setTitle(draft.title || '');
    setContent(draft.content);
    setMedia(draft.media);
    setLinks(draft.links);
    setPoll(draft.poll);
    setProposal(draft.proposal);
    setHashtags(draft.hashtags);
    setMentions(draft.mentions);
    setScheduledAt(draft.scheduledAt);
    setIsExpanded(true);
    setDraftLastSaved(draft.updatedAt);
  }, []);

  // Validate form content
  const validateContent = useCallback((): ContentValidation => {
    const errors = [];
    const warnings = [];
    const suggestions = [];

    // Basic content validation
    if (!content.trim()) {
      errors.push({
        field: 'content',
        message: 'Content is required',
        code: 'CONTENT_REQUIRED'
      });
    }

    // Content type specific validation
    switch (contentType) {
      case ContentType.MEDIA:
        if (media.length === 0) {
          errors.push({
            field: 'media',
            message: 'At least one media file is required for media posts',
            code: 'MEDIA_REQUIRED'
          });
        }
        break;
      
      case ContentType.POLL:
        if (!poll || poll.options.length < 2) {
          errors.push({
            field: 'poll',
            message: 'Poll must have at least 2 options',
            code: 'POLL_OPTIONS_REQUIRED'
          });
        }
        break;
      
      case ContentType.PROPOSAL:
        if (!proposal || !proposal.title.trim()) {
          errors.push({
            field: 'proposal',
            message: 'Proposal title is required',
            code: 'PROPOSAL_TITLE_REQUIRED'
          });
        }
        break;
    }

    // Wallet connection validation
    if (!isConnected || !address) {
      errors.push({
        field: 'wallet',
        message: 'Please connect your wallet to post',
        code: 'WALLET_NOT_CONNECTED'
      });
    }

    // Content length warnings
    if (content.length > 2000) {
      warnings.push({
        field: 'content',
        message: 'Long posts may have reduced visibility',
        code: 'CONTENT_TOO_LONG'
      });
    }

    // Suggestions
    if (hashtags.length === 0) {
      suggestions.push('Add hashtags to increase discoverability');
    }

    if (contentType === ContentType.TEXT && content.length < 50) {
      suggestions.push('Consider adding more detail to your post');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }, [content, contentType, media, poll, proposal, isConnected, address, hashtags]);

  // Handle content type change
  const handleContentTypeChange = useCallback((newType: ContentType) => {
    setContentType(newType);
    
    // Clear type-specific data when switching
    if (newType !== ContentType.MEDIA) {
      setMedia([]);
    }
    if (newType !== ContentType.POLL) {
      setPoll(undefined);
    }
    if (newType !== ContentType.PROPOSAL) {
      setProposal(undefined);
    }
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationResult = validateContent();
    setValidation(validationResult);
    
    if (!validationResult.isValid) {
      addToast('Please fix the errors before submitting', 'error');
      return;
    }

    try {
      // Prepare rich post input
      const richPostInput: RichPostInput = {
        author: address!,
        content,
        contentType,
        title: title.trim() || undefined,
        media: media.filter(m => m.uploadStatus === 'completed'),
        links,
        poll,
        proposal,
        hashtags,
        mentions,
        communityId,
        scheduledAt,
        tags: [...hashtags, contentType] // Include content type as tag
      };

      await onSubmit(richPostInput);
      
      // Clear form and draft on successful submission
      handleReset();
      addToast('Post created successfully!', 'success');
      
    } catch (error) {
      console.error('Error submitting post:', error);
      addToast('Failed to create post. Please try again.', 'error');
    }
  }, [validateContent, address, content, contentType, title, media, links, poll, proposal, hashtags, mentions, communityId, scheduledAt, onSubmit, addToast]);

  // Reset form
  const handleReset = useCallback(() => {
    setContentType(ContentType.TEXT);
    setTitle('');
    setContent('');
    setMedia([]);
    setLinks([]);
    setPoll(undefined);
    setProposal(undefined);
    setHashtags([]);
    setMentions([]);
    setScheduledAt(undefined);
    setIsExpanded(false);
    setValidation(null);
    setHasDraft(false);
    setDraftLastSaved(null);
    
    // Clear draft
    DraftService.deleteDraft(context, communityId);
    autoSaverRef.current?.cancel();
    
    if (onCancel) {
      onCancel();
    }
  }, [context, communityId, onCancel]);

  // Handle expand/collapse
  const handleExpand = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const handleCollapse = useCallback(() => {
    if (!content.trim() && media.length === 0 && !title.trim()) {
      setIsExpanded(false);
      DraftService.deleteDraft(context, communityId);
    }
  }, [content, media, title, context, communityId]);

  // Get placeholder text based on content type
  const getPlaceholder = useCallback(() => {
    switch (contentType) {
      case ContentType.MEDIA:
        return "Share your media with the world...";
      case ContentType.LINK:
        return "Share an interesting link...";
      case ContentType.POLL:
        return "Ask the community a question...";
      case ContentType.PROPOSAL:
        return "Describe your governance proposal...";
      default:
        return context === 'community' 
          ? "Share your thoughts with the community..."
          : "What's happening in Web3?";
    }
  }, [contentType, context]);

  // Collapsed state
  if (!isExpanded) {
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
              <button type="button" className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200">
                <span className="text-lg">📸</span>
                <span className="text-sm font-medium">Media</span>
              </button>
              <button type="button" className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200">
                <span className="text-lg">📊</span>
                <span className="text-sm font-medium">Poll</span>
              </button>
              {context === 'feed' && (
                <button type="button" className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200">
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

  // Expanded state
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Create {contentType.charAt(0).toUpperCase() + contentType.slice(1)} Post
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
      
      <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Content Type Tabs */}
        <ContentTypeTabs
          activeType={contentType}
          onTypeChange={handleContentTypeChange}
          context={context}
          communityId={communityId}
          disabled={isLoading}
        />
        
        {/* Title Input (for certain content types) */}
        {(contentType === ContentType.PROPOSAL || contentType === ContentType.POLL) && (
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {contentType === ContentType.PROPOSAL ? 'Proposal Title' : 'Poll Question'}
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={contentType === ContentType.PROPOSAL ? 'Enter proposal title...' : 'What would you like to ask?'}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
              disabled={isLoading}
              required
            />
          </div>
        )}
        
        {/* Content Input */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Content
          </label>
          <HashtagMentionInput
            value={content}
            onChange={setContent}
            onHashtagsChange={setHashtags}
            onMentionsChange={setMentions}
            placeholder={getPlaceholder()}
            disabled={isLoading}
          />
        </div>
        
        {/* Media Upload (for media content type) */}
        {contentType === ContentType.MEDIA && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Media Files
            </label>
            <MediaUploadZone
              files={media}
              onFilesChange={setMedia}
              disabled={isLoading}
            />
          </div>
        )}
        
        {/* Validation Messages */}
        {validation && (
          <div className="space-y-2">
            {validation.errors.map((error, index) => (
              <div key={index} className="text-sm text-red-600 dark:text-red-400 flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error.message}</span>
              </div>
            ))}
            {validation.warnings.map((warning, index) => (
              <div key={index} className="text-sm text-amber-600 dark:text-amber-400 flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span>{warning.message}</span>
              </div>
            ))}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
            {draftLastSaved && (
              <span className="flex items-center space-x-1 text-green-500">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Draft saved {draftLastSaved.toLocaleTimeString()}</span>
              </span>
            )}
            <span>{content.length} characters</span>
            {hashtags.length > 0 && <span>{hashtags.length} hashtags</span>}
            {mentions.length > 0 && <span>{mentions.length} mentions</span>}
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800 transition-colors duration-200"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !content.trim()}
              className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 dark:focus:ring-offset-gray-800 transition-colors duration-200"
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