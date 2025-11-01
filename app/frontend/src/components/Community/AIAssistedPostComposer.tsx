import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  PlusCircle, 
  Image, 
  Link, 
  Hash, 
  Send, 
  X, 
  AlertCircle,
  FileText,
  MessageSquare,
  HelpCircle,
  Megaphone,
  Sparkles,
  Wand2,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { useCommunityInteractions } from '../../hooks/useCommunityInteractions';
import { useAIAssistedPostCreation } from '../../hooks/useAIAssistedPostCreation';
import { useMobileOptimization } from '../../hooks/useMobileOptimization';
import { analyticsService } from '../../services/analyticsService';
import { ContentCreationErrorBoundary } from '../../components/ErrorHandling/ErrorBoundary';
import { Skeleton } from '../../components/LoadingSkeletons';
import { debounce } from '../../utils/performanceOptimizations';
import { KEYBOARD_KEYS } from '../../utils/accessibility';

interface AIAssistedPostComposerProps {
  communityId: string;
  communityName: string;
  allowedPostTypes?: Array<{
    id: string;
    name: string;
    description: string;
    enabled: boolean;
  }>;
  onPostCreated?: (post: any) => void;
  onCancel?: () => void;
}

const AIAssistedPostComposer: React.FC<AIAssistedPostComposerProps> = ({
  communityId,
  communityName,
  allowedPostTypes = [
    { id: 'discussion', name: 'Discussion', description: 'General discussion posts', enabled: true },
    { id: 'news', name: 'News', description: 'News and updates', enabled: true },
    { id: 'question', name: 'Question', description: 'Ask questions', enabled: true },
    { id: 'announcement', name: 'Announcement', description: 'Important announcements', enabled: true }
  ],
  onPostCreated,
  onCancel
}) => {
  const { createPost, loading: creatingPost, error: postError, clearError } = useCommunityInteractions();
  const { 
    loading: aiLoading, 
    error: aiError, 
    suggestions,
    generatePostTitle,
    generatePostContent,
    generatePostTags,
    improvePostContent,
    clearError: clearAIError
  } = useAIAssistedPostCreation();
  
  const { isMobile, touchTargetClasses, shouldUseCompactLayout } = useMobileOptimization();
  const [postType, setPostType] = useState(allowedPostTypes.find(t => t.enabled)?.id || 'discussion');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaInput, setMediaInput] = useState('');
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiAction, setAiAction] = useState<'title' | 'content' | 'tags' | 'improve' | null>(null);
  const [prefetching, setPrefetching] = useState(false);
  
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Prefetch AI recommendations when component mounts
  useEffect(() => {
    const prefetchAIRecommendations = async () => {
      setPrefetching(true);
      try {
        // Simulate prefetching - in a real implementation, this would prefetch AI models
        await new Promise(resolve => setTimeout(resolve, 100));
      } finally {
        setPrefetching(false);
      }
    };

    prefetchAIRecommendations();
    
    // Track component load for analytics
    analyticsService.trackUserEvent('ai_post_composer_loaded', {
      communityId,
      communityName,
      timestamp: new Date().toISOString()
    });
  }, [communityId, communityName]);

  // Debounced content change handler for performance
  const debouncedContentChange = useCallback(
    debounce((value: string) => {
      // This would be used for real-time suggestions or validation
      console.log('Content changed:', value.substring(0, 50) + '...');
    }, 300),
    []
  );

  const getPostTypeIcon = (type: string) => {
    switch (type) {
      case 'discussion':
        return <MessageSquare className="w-4 h-4" />;
      case 'news':
        return <Megaphone className="w-4 h-4" />;
      case 'question':
        return <HelpCircle className="w-4 h-4" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags(prev => [...prev, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleAddMedia = () => {
    if (mediaInput.trim() && !mediaUrls.includes(mediaInput.trim())) {
      setMediaUrls(prev => [...prev, mediaInput.trim()]);
      setMediaInput('');
    }
  };

  const handleRemoveMedia = (urlToRemove: string) => {
    setMediaUrls(prev => prev.filter(url => url !== urlToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      return;
    }

    const success = await createPost({
      communityId,
      title: title.trim(),
      content: content.trim(),
      tags,
      mediaUrls,
      postType
    });

    if (success) {
      // Track successful post creation
      analyticsService.trackUserEvent('post_created', {
        communityId,
        postType,
        titleLength: title.length,
        contentLength: content.length,
        tagCount: tags.length,
        mediaCount: mediaUrls.length
      });

      // Reset form
      setTitle('');
      setContent('');
      setTags([]);
      setMediaUrls([]);
      setPostType(allowedPostTypes.find(t => t.enabled)?.id || 'discussion');
      
      // Notify parent component
      if (onPostCreated) {
        onPostCreated({
          title,
          content,
          tags,
          mediaUrls,
          postType,
          communityId
        });
      }
    }
  };

  const handleGenerateTitle = async () => {
    setAiAction('title');
    const generatedTitle = await generatePostTitle(content, communityId, communityName);
    if (generatedTitle) {
      setTitle(generatedTitle);
      // Track AI title generation
      analyticsService.trackUserEvent('ai_title_generated', {
        communityId,
        contentLength: content.length
      });
    }
  };

  const handleGenerateContent = async () => {
    setAiAction('content');
    const generatedContent = await generatePostContent(title, communityId, communityName);
    if (generatedContent) {
      setContent(generatedContent);
      // Track AI content generation
      analyticsService.trackUserEvent('ai_content_generated', {
        communityId,
        titleLength: title.length
      });
    }
  };

  const handleGenerateTags = async () => {
    setAiAction('tags');
    const generatedTags = await generatePostTags(content, communityId, communityName);
    if (generatedTags.length > 0) {
      setTags(prev => [...new Set([...prev, ...generatedTags])]);
      // Track AI tag generation
      analyticsService.trackUserEvent('ai_tags_generated', {
        communityId,
        contentLength: content.length,
        tagCount: generatedTags.length
      });
    }
  };

  const handleImproveContent = async () => {
    setAiAction('improve');
    const improvedContent = await improvePostContent(content, communityId, communityName);
    if (improvedContent) {
      setContent(improvedContent);
      // Track AI content improvement
      analyticsService.trackUserEvent('ai_content_improved', {
        communityId,
        originalContentLength: content.length,
        improvedContentLength: improvedContent.length
      });
    }
  };

  const handleUseSuggestion = (suggestion: string) => {
    if (contentRef.current) {
      const startPos = contentRef.current.selectionStart || content.length;
      const endPos = contentRef.current.selectionEnd || content.length;
      const newContent = content.substring(0, startPos) + suggestion + content.substring(endPos);
      setContent(newContent);
    }
  };

  // Keyboard navigation handlers
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === KEYBOARD_KEYS.ENTER || e.key === KEYBOARD_KEYS.SPACE) {
      e.preventDefault();
      action();
    }
  };

  const enabledPostTypes = allowedPostTypes.filter(type => type.enabled);

  // Loading skeleton for AI panel
  if (prefetching) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4">
          <Skeleton className="h-6 w-1/3 mb-4" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <ContentCreationErrorBoundary>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <PlusCircle className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Create Post in {communityName}
            </h3>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className={`${touchTargetClasses} text-gray-400 hover:text-gray-600 dark:hover:text-gray-300`}
              aria-label="Cancel"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Error Display */}
        {(postError || aiError) && (
          <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-red-800 dark:text-red-200 text-sm">
                  {postError || aiError}
                </span>
              </div>
              <button
                onClick={() => {
                  clearError();
                  clearAIError();
                }}
                className="text-red-600 hover:text-red-800"
                aria-label="Close error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* AI Assistant Toggle */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowAIPanel(!showAIPanel)}
              className={`flex items-center space-x-2 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 ${touchTargetClasses}`}
              aria-expanded={showAIPanel}
              aria-controls="ai-assistant-panel"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Assistant</span>
              <Wand2 className={`w-4 h-4 transition-transform ${showAIPanel ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* AI Assistant Panel */}
          {showAIPanel && (
            <div 
              id="ai-assistant-panel"
              className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3"
            >
              <h4 className="font-medium text-blue-800 dark:text-blue-200 flex items-center">
                <Sparkles className="w-4 h-4 mr-2" />
                AI Post Assistant
              </h4>
              
              <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} gap-2`}>
                <button
                  type="button"
                  onClick={handleGenerateTitle}
                  disabled={aiLoading || !content.trim()}
                  className={`flex items-center justify-center px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-blue-300 dark:border-blue-600 rounded-md text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed ${touchTargetClasses}`}
                  onKeyDown={(e) => handleKeyDown(e, handleGenerateTitle)}
                  aria-busy={aiLoading && aiAction === 'title'}
                >
                  <Wand2 className="w-4 h-4 mr-1" />
                  Generate Title
                </button>
                
                <button
                  type="button"
                  onClick={handleGenerateContent}
                  disabled={aiLoading || !title.trim()}
                  className={`flex items-center justify-center px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-blue-300 dark:border-blue-600 rounded-md text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed ${touchTargetClasses}`}
                  onKeyDown={(e) => handleKeyDown(e, handleGenerateContent)}
                  aria-busy={aiLoading && aiAction === 'content'}
                >
                  <Wand2 className="w-4 h-4 mr-1" />
                  Generate Content
                </button>
                
                <button
                  type="button"
                  onClick={handleGenerateTags}
                  disabled={aiLoading || !content.trim()}
                  className={`flex items-center justify-center px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-blue-300 dark:border-blue-600 rounded-md text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed ${touchTargetClasses}`}
                  onKeyDown={(e) => handleKeyDown(e, handleGenerateTags)}
                  aria-busy={aiLoading && aiAction === 'tags'}
                >
                  <Hash className="w-4 h-4 mr-1" />
                  Suggest Tags
                </button>
                
                <button
                  type="button"
                  onClick={handleImproveContent}
                  disabled={aiLoading || !content.trim()}
                  className={`flex items-center justify-center px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-blue-300 dark:border-blue-600 rounded-md text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed ${touchTargetClasses}`}
                  onKeyDown={(e) => handleKeyDown(e, handleImproveContent)}
                  aria-busy={aiLoading && aiAction === 'improve'}
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  Improve Content
                </button>
              </div>
              
              {/* AI Suggestions */}
              {suggestions.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">Suggestions:</h5>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleUseSuggestion(suggestion)}
                        className={`px-2 py-1 text-xs bg-blue-100 dark:bg-blue-800/30 text-blue-800 dark:text-blue-200 rounded-full hover:bg-blue-200 dark:hover:bg-blue-700/50 ${touchTargetClasses}`}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* AI Loading Indicator */}
              {aiLoading && (
                <div className="flex items-center text-sm text-blue-600 dark:text-blue-400 mt-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                  {aiAction === 'title' && 'Generating title...'}
                  {aiAction === 'content' && 'Generating content...'}
                  {aiAction === 'tags' && 'Generating tags...'}
                  {aiAction === 'improve' && 'Improving content...'}
                </div>
              )}
            </div>
          )}

          {/* Post Type Selection */}
          {enabledPostTypes.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Post Type
              </label>
              <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} gap-2`}>
                {enabledPostTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setPostType(type.id)}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      postType === type.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    } ${touchTargetClasses}`}
                    aria-pressed={postType === type.id}
                  >
                    <div className="flex items-center space-x-2">
                      {getPostTypeIcon(type.id)}
                      <span className="text-sm font-medium">{type.name}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {type.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title Input */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title
            </label>
            <div className="relative">
              <input
                ref={titleRef}
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter a title for your post"
                aria-describedby="title-help"
              />
              <div id="title-help" className="sr-only">Enter a descriptive title for your post</div>
              {aiLoading && aiAction === 'title' && (
                <div className="absolute right-3 top-2.5">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
          </div>

          {/* Content Textarea */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Content
            </label>
            <div className="relative">
              <textarea
                ref={contentRef}
                id="content"
                rows={shouldUseCompactLayout() ? 4 : 6}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  debouncedContentChange(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="What would you like to share with the community?"
                aria-describedby="content-help"
              />
              <div id="content-help" className="sr-only">Write your post content here</div>
              {(aiLoading && aiAction === 'content') || (aiLoading && aiAction === 'improve') && (
                <div className="absolute right-3 top-2.5">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
          </div>

          {/* Tags Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tags
            </label>
            <div className="flex">
              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Add tags (press Enter)"
                aria-describedby="tags-help"
              />
              <div id="tags-help" className="sr-only">Press Enter to add tags</div>
              <button
                type="button"
                onClick={handleAddTag}
                className={`px-4 py-2 bg-gray-100 dark:bg-gray-600 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500 ${touchTargetClasses}`}
                aria-label="Add tag"
              >
                Add
              </button>
            </div>
            {aiLoading && aiAction === 'tags' && (
              <div className="mt-2 flex items-center text-sm text-blue-600 dark:text-blue-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                Generating tags...
              </div>
            )}
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className={`flex-shrink-0 ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none focus:bg-blue-500 focus:text-white ${touchTargetClasses}`}
                      aria-label={`Remove tag ${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Media URLs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Media URLs
            </label>
            <div className="flex">
              <input
                type="text"
                value={mediaInput}
                onChange={(e) => setMediaInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddMedia())}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Add image or video URLs (press Enter)"
                aria-describedby="media-help"
              />
              <div id="media-help" className="sr-only">Press Enter to add media URLs</div>
              <button
                type="button"
                onClick={handleAddMedia}
                className={`px-4 py-2 bg-gray-100 dark:bg-gray-600 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500 ${touchTargetClasses}`}
                aria-label="Add media"
              >
                Add
              </button>
            </div>
            {mediaUrls.length > 0 && (
              <div className="mt-2 space-y-2">
                {mediaUrls.map((url, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{url}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(url)}
                      className={`text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ${touchTargetClasses}`}
                      aria-label={`Remove media ${url}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className={`px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${touchTargetClasses}`}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={creatingPost || !title.trim() || !content.trim()}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed ${touchTargetClasses}`}
              aria-busy={creatingPost}
            >
              {creatingPost ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Posting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Post to Community
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </ContentCreationErrorBoundary>
  );
};

export default AIAssistedPostComposer;