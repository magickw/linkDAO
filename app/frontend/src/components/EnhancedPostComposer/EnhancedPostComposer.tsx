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
import { contentValidationService } from '../../services/contentValidationService';
import { mediaProcessingService } from '../../services/mediaProcessingService';
import EnhancedMediaUploadZone from './EnhancedMediaUploadZone';
import { HashtagMentionInput } from './HashtagMentionInput';
import { PollCreator } from './PollCreator';
import { ProposalCreator } from './ProposalCreator';
import RichTextEditor from './RichTextEditor';

// Define placeholders outside component to prevent recreation on every render
const PLACEHOLDER_HINTS = [
  "Share your latest DAO proposal 🧠",
  "Post your NFT drop 🚀",
  "Comment on trending governance votes 🏛️",
  "Share what you're building in Web3 💻",
  "Ask the community a question 🤔"
];

export default function EnhancedPostComposer({
  context,
  communityId,
  initialContentType = ContentType.POST, // Default to unified POST type
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

  // Form state - contentType is now fixed to POST (allows all content types)
  const [contentType] = useState<ContentType>(ContentType.POST);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<MediaFile[]>([]); // Can contain images, videos, audio
  const [links, setLinks] = useState<LinkPreview[]>([]); // Can have multiple links
  const [poll, setPoll] = useState<PollData | undefined>(); // Optional poll
  const [proposal, setProposal] = useState<ProposalData | undefined>(); // Optional proposal
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
      // Nullify ref to prevent stale closures
      autoSaverRef.current = null;
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
    // Always use unified POST type, ignore draft contentType for backwards compatibility
    setTitle(draft.title || '');
    setContent(draft.content);
    setMedia(draft.media || []);
    setLinks(draft.links || []);
    setPoll(draft.poll);
    setProposal(draft.proposal);
    setHashtags(draft.hashtags || []);
    setMentions(draft.mentions || []);
    setScheduledAt(draft.scheduledAt);
    setIsExpanded(true);
    setDraftLastSaved(draft.updatedAt);
  }, []);

  // Validate form content using the validation service
  const validateContent = useCallback((): ContentValidation => {
    // Create a rich post input for validation
    const richPostInput: RichPostInput = {
      author: address || '',
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
      tags: [...hashtags, contentType]
    };

    // Use the validation service
    const validationResult = contentValidationService.validatePost(richPostInput);
    
    // Add wallet connection validation
    if (!isConnected || !address) {
      validationResult.errors.push({
        field: 'wallet',
        message: 'Please connect your wallet to post',
        code: 'WALLET_NOT_CONNECTED'
      });
      validationResult.isValid = false;
    }

    // Convert to the expected format
    const suggestions: string[] = [];
    if (hashtags.length === 0) {
      suggestions.push('Add hashtags to increase discoverability');
    }
    if (content.length < 50 && media.filter(m => m.uploadStatus === 'completed').length === 0) {
      suggestions.push('Consider adding more detail or media to your post');
    }

    return {
      isValid: validationResult.isValid,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      suggestions
    };
  }, [content, contentType, title, media, links, poll, proposal, hashtags, mentions, communityId, scheduledAt, isConnected, address]);

  // REMOVED: handleContentTypeChange - no longer needed with unified content type

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

      // Dispatch event to notify other components that a post was created
      window.dispatchEvent(new CustomEvent('postCreated'));

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
    // Keep contentType as POST
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

  // Get placeholder text based on content type - with rotating suggestions
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    if (!isExpanded) {
      // Only set interval when composer is collapsed to save resources
      const interval = setInterval(() => {
        setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_HINTS.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isExpanded]);

  const getPlaceholder = useCallback(() => {
    if (poll) {
      return "Ask the community a question...";
    }
    if (proposal) {
      return "Describe your governance proposal...";
    }
    return context === 'community'
      ? "Share your thoughts with the community..."
      : isExpanded ? "What's happening in Web3?" : PLACEHOLDER_HINTS[placeholderIndex];
  }, [poll, proposal, context, isExpanded, placeholderIndex]);

  // Collapsed state
  if (!isExpanded) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-700 ${className}`}>
        <div
          onClick={handleExpand}
          className="p-4 cursor-pointer hover:bg-gradient-to-r hover:from-gray-50 hover:to-primary-50/30 dark:hover:from-gray-700/50 dark:hover:to-primary-900/20 transition-all duration-200"
        >
          <div className="flex items-center space-x-3">
            {/* User Avatar with Gradient Border */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full blur-sm opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
              <div className="relative bg-gradient-to-br from-primary-400 to-secondary-500 border-2 border-white dark:border-gray-800 rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-200">
                <span className="text-white font-bold text-base">
                  {address ? address.slice(2, 4).toUpperCase() : 'U'}
                </span>
              </div>
            </div>

            {/* Post Input Placeholder with Animation */}
            <div className="flex-1 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-600 rounded-full px-5 py-3.5 text-gray-500 dark:text-gray-400 hover:from-gray-200 hover:to-gray-100 dark:hover:from-gray-600 dark:hover:to-gray-500 transition-all duration-300 hover:shadow-inner">
              <span className="transition-opacity duration-500">{getPlaceholder()}</span>
            </div>
          </div>

          {/* Quick Action Buttons with Icons */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                className="group flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200 hover:scale-105"
                onClick={(e) => { e.stopPropagation(); handleExpand(); }}
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">Media</span>
              </button>
              <button
                type="button"
                className="group flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 hover:scale-105"
                onClick={(e) => { e.stopPropagation(); setPoll({ question: '', options: [], allowMultiple: false, tokenWeighted: false }); handleExpand(); }}
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-sm font-medium">Poll</span>
              </button>
              {context === 'feed' && (
                <button
                  type="button"
                  className="group flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 hover:scale-105"
                  onClick={(e) => { e.stopPropagation(); setProposal({ title: '', description: '', type: 'governance', votingPeriod: 7, quorum: 10, threshold: 50 }); handleExpand(); }}
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-medium">Proposal</span>
                </button>
              )}
              <button
                type="button"
                className="group flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 hover:scale-105"
                onClick={(e) => { e.stopPropagation(); handleExpand(); }}
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
                <span className="text-sm font-medium">Thread</span>
              </button>
            </div>

            <div className="flex items-center space-x-2 text-xs text-gray-400 dark:text-gray-500">
              {hasDraft && (
                <span className="flex items-center space-x-1 text-amber-500 animate-pulse">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  <span className="font-medium">Draft saved</span>
                </span>
              )}
              <span className="text-gray-400">•</span>
              <span>Click to create post</span>
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
        {/* Title Input (optional for all posts) */}
        {(poll || proposal) && (
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {proposal ? 'Proposal Title' : poll ? 'Poll Question' : 'Title'}
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={proposal ? 'Enter proposal title...' : poll ? 'What would you like to ask?' : 'Enter title...'}
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

        {/* Media Upload Zone - Always available for all posts */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Media (Images, Videos, Audio)
          </label>
          <EnhancedMediaUploadZone
            files={media}
            onFilesChange={setMedia}
            disabled={isLoading}
          />
        </div>

        {/* Optional Content Toggles */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setPoll(poll ? undefined : { question: '', options: [], allowMultiple: false, tokenWeighted: false })}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
              poll
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            disabled={isLoading}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-sm font-medium">{poll ? 'Remove Poll' : 'Add Poll'}</span>
          </button>

          {context === 'feed' && (
            <button
              type="button"
              onClick={() => setProposal(proposal ? undefined : { title: '', description: '', type: 'governance', votingPeriod: 7, quorum: 10, threshold: 50 })}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
                proposal
                  ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              disabled={isLoading}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-medium">{proposal ? 'Remove Proposal' : 'Add Proposal'}</span>
            </button>
          )}
        </div>

        {/* Content Type Specific Components */}
        {poll && (
          <PollCreator
            poll={poll}
            onPollChange={setPoll}
            disabled={isLoading}
          />
        )}

        {proposal && (
          <ProposalCreator
            proposal={proposal}
            onProposalChange={setProposal}
            disabled={isLoading}
          />
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