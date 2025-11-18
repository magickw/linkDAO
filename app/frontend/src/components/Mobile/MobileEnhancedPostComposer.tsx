import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useMobileAccessibility } from '@/hooks/useMobileAccessibility';
import { MediaUploadZone } from '@/components/EnhancedPostComposer/MediaUploadZone';
import { HashtagMentionInput } from '@/components/EnhancedPostComposer/HashtagMentionInput';
import { PollCreator } from '@/components/EnhancedPostComposer/PollCreator';
import { ProposalCreator } from '@/components/EnhancedPostComposer/ProposalCreator';
import RichTextEditor from '@/components/EnhancedPostComposer/RichTextEditor';
import { RichPostInput, MediaFile, PollData, ProposalData, ContentType } from '@/types/enhancedPost';
import AuthContext from '@/context/AuthContext';

interface MobileEnhancedPostComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (post: RichPostInput) => Promise<void>;
  communityId?: string;
  initialContentType?: ContentType;
  className?: string;
}

const MobileEnhancedPostComposer: React.FC<MobileEnhancedPostComposerProps> = ({
  isOpen,
  onClose,
  onSubmit,
  communityId,
  initialContentType = ContentType.POST,
  className = ''
}) => {
  const { user } = useContext(AuthContext);
  const {
    isMobile,
    triggerHapticFeedback,
    safeAreaInsets,
    isKeyboardVisible,
    createSwipeHandler,
    touchTargetClasses,
    mobileOptimizedClasses
  } = useMobileOptimization();

  const {
    announceToScreenReader,
    manageFocus,
    accessibilityClasses
  } = useMobileAccessibility();

  // Unified content type - always POST, with optional poll/proposal
  const [contentType] = useState<ContentType>(ContentType.POST);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [mentions, setMentions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pollData, setPollData] = useState<PollData | undefined>(undefined);
  const [proposalData, setProposalData] = useState<ProposalData | undefined>(undefined);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      // Cleanup object URLs when component unmounts
      media.forEach(mediaItem => {
        if (mediaItem.preview && mediaItem.preview.startsWith('blob:')) {
          URL.revokeObjectURL(mediaItem.preview);
        }
      });
    };
  }, [media]); // Add media as dependency to cleanup when media changes

  const composerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  // Focus management
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
        manageFocus(textareaRef.current);
      }, 300);
    }
  }, [isOpen, manageFocus]);

  // Keyboard visibility handling
  useEffect(() => {
    if (isKeyboardVisible && composerRef.current) {
      composerRef.current.style.paddingBottom = '0px';
    } else if (composerRef.current) {
      composerRef.current.style.paddingBottom = `${safeAreaInsets.bottom}px`;
    }
  }, [isKeyboardVisible, safeAreaInsets.bottom]);

  const handleSwipeDown = createSwipeHandler({
    onSwipeDown: (info: PanInfo) => {
      if (info.velocity.y > 500 || info.offset.y > 100) {
        triggerHapticFeedback('light');
        onClose();
      }
    }
  });

  // Create a memoized submit handler
  const handleSubmit = useCallback(async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    triggerHapticFeedback('medium');

    try {
      const postData: RichPostInput = {
        author: user?.id || user?.address || 'anonymous',
        contentType, // Always ContentType.POST
        title: title.trim() || undefined,
        content: content.trim(),
        media: media.length > 0 ? media : undefined,
        hashtags,
        mentions,
        communityId,
        // Include poll data if present
        poll: pollData,
        // Include proposal data if present
        proposal: proposalData,
        tags: [...hashtags, contentType] // Include content type as tag
      };

      await onSubmit(postData);

      // Reset form
      setContent('');
      setTitle('');
      setMedia([]);
      setHashtags([]);
      setMentions([]);
      setPollData(undefined);
      setProposalData(undefined);

      triggerHapticFeedback('success');
      announceToScreenReader('Post created successfully');
      onClose();
    } catch (error) {
      triggerHapticFeedback('error');
      announceToScreenReader('Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  }, [content, contentType, title, media, hashtags, mentions, communityId, pollData, proposalData, user, onSubmit, triggerHapticFeedback, announceToScreenReader, onClose]);

  const handleMediaUpload = (files: File[]) => {
    const mediaFiles: MediaFile[] = files.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('image/') ? 'image' :
            file.type.startsWith('video/') ? 'video' : 'audio',
      size: file.size,
      uploadStatus: 'pending' as const
    }));

    setMedia(prev => [...prev, ...mediaFiles]);
    triggerHapticFeedback('light');
    announceToScreenReader(`${files.length} files uploaded`);
  };

  const handleMediaRemove = (index: number) => {
    setMedia(prev => {
      const newMedia = [...prev];
      const removedItem = newMedia[index];
      
      // Clean up object URL for the removed item
      if (removedItem.preview && removedItem.preview.startsWith('blob:')) {
        URL.revokeObjectURL(removedItem.preview);
      }
      
      return newMedia.filter((_, i) => i !== index);
    });
    triggerHapticFeedback('light');
  };

  // Add handlers for Poll and Proposal data
  const handlePollChange = (pollData: PollData) => {
    setPollData(pollData);
  };

  const handleProposalChange = (proposalData: ProposalData) => {
    setProposalData(proposalData);
  };

  // Content-type-specific validation and character limits
  const getContentLimits = (type: ContentType) => {
    switch (type) {
      case ContentType.POST:
        return { min: 1, max: 2000, field: 'content' };
      case ContentType.POLL:
        return { min: 1, max: 500, field: 'poll description' };
      case ContentType.PROPOSAL:
        return { min: 10, max: 5000, field: 'proposal content' };
      default:
        return { min: 1, max: 2000, field: 'content' };
    }
  };

  const validateContent = (type: ContentType, content: string): { isValid: boolean; errors: string[] } => {
    const limits = getContentLimits(type);
    const errors: string[] = [];
    
    // Basic length validation
    if (content.length < limits.min) {
      errors.push(`${limits.field} must be at least ${limits.min} characters`);
    }
    if (content.length > limits.max) {
      errors.push(`${limits.field} must not exceed ${limits.max} characters`);
    }
    
    // Content-type-specific validation
    switch (type) {
      case ContentType.POLL:
        if (!pollData || pollData.options.length < 2) {
          errors.push('Poll must have at least 2 options');
        }
        if (!pollData?.question?.trim()) {
          errors.push('Poll must have a question');
        }
        break;
      case ContentType.PROPOSAL:
        if (!proposalData || !proposalData.title?.trim()) {
          errors.push('Proposal must have a title');
        }
        if (!proposalData?.description?.trim()) {
          errors.push('Proposal must have a description');
        }
        break;
    }

    return { isValid: errors.length === 0, errors };
  };

  const { isValid, errors } = validateContent(contentType, content);
  const canSubmit = isValid && !isSubmitting;

  if (!isOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      <>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />

        {/* Composer Modal */}
        <motion.div
          ref={composerRef}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring' as any, damping: 25, stiffness: 300 }}
          className={`
            fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-gray-900
            rounded-t-3xl shadow-2xl max-h-[90vh] overflow-hidden
            ${mobileOptimizedClasses}
          `}
          style={{ paddingTop: safeAreaInsets.top }}
          {...handleSwipeDown}
        >
          {/* Drag Handle */}
          <div className="flex justify-center py-3">
            <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className={`
                text-gray-500 dark:text-gray-400 font-medium
                ${touchTargetClasses} ${accessibilityClasses}
              `}
              aria-label="Cancel post creation"
            >
              Cancel
            </button>
            
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Create Post
            </h2>
            
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`
                px-4 py-2 rounded-full font-medium transition-all
                ${canSubmit 
                  ? 'bg-blue-500 text-white hover:bg-blue-600' 
                  : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                }
                ${touchTargetClasses} ${accessibilityClasses}
              `}
              aria-label={isSubmitting ? 'Publishing post...' : 'Publish post'}
            >
              {isSubmitting ? 'Publishing...' : 'Post'}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Title Input (for polls and proposals) */}
            {(pollData || proposalData) && (
              <div className="px-4 py-3">
                <input
                  type="text"
                  placeholder={proposalData ? "Proposal Title" : pollData ? "Poll Question" : "Title"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`
                    w-full px-0 py-2 text-lg font-medium bg-transparent
                    border-none outline-none resize-none
                    text-gray-900 dark:text-white
                    placeholder-gray-500 dark:placeholder-gray-400
                    ${accessibilityClasses}
                  `}
                  maxLength={200}
                />
              </div>
            )}

            {/* Main Content Area */}
            <div className="px-4 py-3 space-y-4">
              {/* Text Input - Always visible */}
              <textarea
                ref={textareaRef}
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={`
                  w-full px-0 py-2 text-base bg-transparent
                  border-none outline-none resize-none min-h-[120px]
                  text-gray-900 dark:text-white
                  placeholder-gray-500 dark:placeholder-gray-400
                  ${accessibilityClasses}
                `}
                maxLength={2000}
                aria-label="Post content"
              />

              {/* Media Upload - Always available */}
              <div className="space-y-4">
                <MediaUploadZone
                  onUpload={handleMediaUpload}
                  maxFiles={10}
                  acceptedTypes={['image/*', 'video/*', 'audio/*']}
                />

                {media.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {media.map((file, index) => (
                      <div key={file.id} className="relative">
                        <img
                          src={file.preview}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => handleMediaRemove(index)}
                          className={`
                            absolute top-1 right-1 w-6 h-6 bg-red-500 text-white
                            rounded-full flex items-center justify-center text-xs
                            ${touchTargetClasses}
                          `}
                          aria-label={`Remove media ${index + 1}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Optional Content Toggles */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setPollData(pollData ? undefined : { question: '', options: [], allowMultiple: false, tokenWeighted: false });
                    triggerHapticFeedback('light');
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                    pollData
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                  } ${touchTargetClasses}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="text-sm">{pollData ? 'Remove Poll' : 'Add Poll'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProposalData(proposalData ? undefined : { title: '', description: '', type: 'governance', votingPeriod: 7, quorum: 10, threshold: 50 });
                    triggerHapticFeedback('light');
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                    proposalData
                      ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                  } ${touchTargetClasses}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm">{proposalData ? 'Remove Proposal' : 'Add Proposal'}</span>
                </button>
              </div>

              {/* Poll Creator - Conditionally shown */}
              {pollData && (
                <PollCreator
                  poll={pollData}
                  onPollChange={setPollData}
                  className="mobile-optimized"
                  disabled={isSubmitting}
                />
              )}

              {/* Proposal Creator - Conditionally shown */}
              {proposalData && (
                <ProposalCreator
                  proposal={proposalData}
                  onProposalChange={setProposalData}
                  className="mobile-optimized"
                  disabled={isSubmitting}
                />
              )}
            </div>

            {/* Hashtag and Mention Input */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <HashtagMentionInput
                value={content}
                onChange={setContent}
                onHashtagsChange={setHashtags}
                onMentionsChange={setMentions}
              />
            </div>

            {/* Character Count */}
            <div className="px-4 py-2 text-right">
              <span className={`
                text-sm ${content.length > 1800 ? 'text-red-500' : 'text-gray-500'}
              `}>
                {content.length}/2000
              </span>
            </div>
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  );
};

export default MobileEnhancedPostComposer;