import React, { useState, useRef, useEffect, useContext } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useMobileAccessibility } from '@/hooks/useMobileAccessibility';
import { ContentTypeTabs } from '@/components/EnhancedPostComposer/ContentTypeTabs';
import { MediaUploadZone } from '@/components/EnhancedPostComposer/MediaUploadZone';
import { HashtagMentionInput } from '@/components/EnhancedPostComposer/HashtagMentionInput';
import { PollCreator } from '@/components/EnhancedPostComposer/PollCreator';
import { ProposalCreator } from '@/components/EnhancedPostComposer/ProposalCreator';
import RichTextEditor from '@/components/EnhancedPostComposer/RichTextEditor';
import { RichPostInput, MediaFile, PollData, ProposalData } from '@/types/enhancedPost';
import AuthContext from '@/context/AuthContext';

interface MobileEnhancedPostComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (post: RichPostInput) => Promise<void>;
  communityId?: string;
  initialContentType?: ContentType;
  className?: string;
}

enum ContentType {
  TEXT = 'text',
  MEDIA = 'media',
  POLL = 'poll',
  PROPOSAL = 'proposal',
  LINK = 'link'
}

const MobileEnhancedPostComposer: React.FC<MobileEnhancedPostComposerProps> = ({
  isOpen,
  onClose,
  onSubmit,
  communityId,
  initialContentType = ContentType.TEXT,
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

  const [contentType, setContentType] = useState<ContentType>(initialContentType);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [mentions, setMentions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pollData, setPollData] = useState<PollData | undefined>(undefined);
  const [proposalData, setProposalData] = useState<ProposalData | undefined>(undefined);
  const [linkUrl, setLinkUrl] = useState('');

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
  }, []); // Only run on unmount

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

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    triggerHapticFeedback('medium');

    try {
      const postData: RichPostInput = {
        author: user?.id || user?.address || 'anonymous',
        contentType,
        title: title.trim() || undefined,
        content: content.trim(),
        media: media.length > 0 ? media : undefined,
        hashtags,
        mentions,
        communityId,
        // Include poll data for poll content type
        poll: contentType === ContentType.POLL ? pollData : undefined,
        // Include proposal data for proposal content type
        proposal: contentType === ContentType.PROPOSAL ? proposalData : undefined,
        // Include link data for link content type
        links: contentType === ContentType.LINK && linkUrl ? [{
          url: linkUrl,
          title: undefined,
          description: undefined,
          image: undefined,
          type: 'website' // Add the required type field
        }] : undefined
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
      setLinkUrl('');
      
      triggerHapticFeedback('success');
      announceToScreenReader('Post created successfully');
      onClose();
    } catch (error) {
      triggerHapticFeedback('error');
      announceToScreenReader('Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContentTypeChange = (type: ContentType) => {
    setContentType(type);
    
    // Clear content type-specific data when switching types
    if (type !== ContentType.POLL) {
      setPollData(undefined);
    }
    if (type !== ContentType.PROPOSAL) {
      setProposalData(undefined);
    }
    if (type !== ContentType.LINK) {
      setLinkUrl('');
    }
    
    triggerHapticFeedback('light');
    announceToScreenReader(`Switched to ${type} content type`);
  };

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

  const canSubmit = content.trim().length > 0 && !isSubmitting;

  return (
    <AnimatePresence>
      {isOpen && (
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
              {/* Content Type Tabs */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <ContentTypeTabs
                  activeType={contentType}
                  onTypeChange={handleContentTypeChange}
                  className="mobile-optimized"
                />
              </div>

              {/* Title Input (for certain content types) */}
              {(contentType === ContentType.LINK || contentType === ContentType.PROPOSAL) && (
                <div className="px-4 py-3">
                  <input
                    type="text"
                    placeholder="Title"
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
              <div className="px-4 py-3">
                {contentType === ContentType.TEXT && (
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
                )}

                {contentType === ContentType.MEDIA && (
                  <div className="space-y-4">
                    <MediaUploadZone
                      onUpload={handleMediaUpload}
                      maxFiles={10}
                      acceptedTypes={['image/*', 'video/*']}

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
                              aria-label={`Remove image ${index + 1}`}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <textarea
                      ref={textareaRef}
                      placeholder="Add a caption..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className={`
                        w-full px-0 py-2 text-base bg-transparent
                        border-none outline-none resize-none min-h-[80px]
                        text-gray-900 dark:text-white
                        placeholder-gray-500 dark:placeholder-gray-400
                        ${accessibilityClasses}
                      `}
                      maxLength={1000}
                    />
                  </div>
                )}

                {contentType === ContentType.POLL && (
                  <PollCreator
                    onPollChange={(pollData) => {
                      setPollData(pollData);
                    }}
                    className="mobile-optimized"
                  />
                )}

                {contentType === ContentType.PROPOSAL && (
                  <ProposalCreator
                    onProposalChange={(proposalData) => {
                      setProposalData(proposalData);
                    }}
                    className="mobile-optimized"
                  />
                )}

                {contentType === ContentType.LINK && (
                  <div className="space-y-4">
                    <input
                      type="url"
                      placeholder="Paste a link..."
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      className={`
                        w-full px-3 py-2 border border-gray-300 dark:border-gray-600
                        rounded-lg bg-white dark:bg-gray-800
                        text-gray-900 dark:text-white
                        placeholder-gray-500 dark:placeholder-gray-400
                        ${accessibilityClasses}
                      `}
                    />
                    
                    <textarea
                      ref={textareaRef}
                      placeholder="Add your thoughts..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className={`
                        w-full px-0 py-2 text-base bg-transparent
                        border-none outline-none resize-none min-h-[80px]
                        text-gray-900 dark:text-white
                        placeholder-gray-500 dark:placeholder-gray-400
                        ${accessibilityClasses}
                      `}
                      maxLength={1000}
                    />
                  </div>
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
      )}
    </AnimatePresence>
  );
};

export default MobileEnhancedPostComposer;
