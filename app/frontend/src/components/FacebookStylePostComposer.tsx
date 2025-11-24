import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ipfsUploadService } from '@/services/ipfsUploadService';
import { CreatePostInput } from '@/models/Post';
import { Camera, Image, Link as LinkIcon, Smile, MapPin, Video, X } from 'lucide-react';

interface FacebookStylePostComposerProps {
  onSubmit: (postData: CreatePostInput) => Promise<void>;
  isLoading: boolean;
  userAvatar?: string;
  userName?: string;
  className?: string;
}

const FacebookStylePostComposer = React.memo(({
  onSubmit,
  isLoading,
  userAvatar,
  userName,
  className = ''
}: FacebookStylePostComposerProps) => {
  const [content, setContent] = useState('');
  const HINTS = useMemo(() => [
    'Share your latest DAO proposal 🧠',
    'Post your NFT drop 🚀',
    'Comment on trending governance votes 🏛️',
  ], []);
  const [hintIdx, setHintIdx] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [feeling, setFeeling] = useState('');
  const [location, setLocation] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [showFeelingInput, setShowFeelingInput] = useState(false);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  // Rotate placeholder hints
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const id = window.setInterval(() => {
        setHintIdx((i) => (i + 1) % HINTS.length);
      }, 4000);
      return () => window.clearInterval(id);
    }
  }, [HINTS]);

  const handleFocus = useCallback(() => {
    setIsExpanded(true);
  }, []);

  // Extract hashtags from content
  const extractHashtags = useCallback((text: string): string[] => {
    const hashtagRegex = /#[\w]+/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  }, []);

  // ... (imports)

  // ... (interface)

  // ... (component start)

  // ... (state)

  // ... (effects)

  // ... (extractHashtags)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) return;

    try {
      // Extract hashtags from content
      const tagArray = extractHashtags(content);

      // Build content with additional info
      let finalContent = content.trim();
      if (feeling) finalContent += ` — feeling ${feeling}`;
      if (location) finalContent += ` at ${location}`;
      if (linkUrl) finalContent += ` ${linkUrl}`;

      // Upload files if any
      let mediaCids: string[] = [];
      if (selectedFiles.length > 0) {
        try {
          // Show loading state or toast here if needed
          const uploadPromises = selectedFiles.map(async (file) => {
            const result = await ipfsUploadService.uploadFile(file);
            return result.cid;
          });
          mediaCids = await Promise.all(uploadPromises);
        } catch (uploadError) {
          console.error('Error uploading files:', uploadError);
          // You might want to show an error toast here
          return;
        }
      }

      const postData: CreatePostInput = {
        author: userName || '', // Use the userName prop as author
        content: finalContent,
        tags: tagArray,
        media: mediaCids.length > 0 ? mediaCids : undefined
      };

      await onSubmit(postData);

      // Reset form
      setContent('');
      setFeeling('');
      setLocation('');
      setLinkUrl('');
      setSelectedFiles([]);
      setPreviews([]);
      setIsExpanded(false);
      setShowFeelingInput(false);
      setShowLocationInput(false);
      setShowLinkInput(false);
    } catch (error) {
      console.error('Error submitting post:', error);
    }
  }, [content, feeling, location, linkUrl, selectedFiles, onSubmit, extractHashtags]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSelectedFiles(prev => [...prev, ...files]);

    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPreviews(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleVideoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSelectedFiles(prev => [...prev, ...files]);

    // Create previews for videos
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPreviews(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleCancel = useCallback(() => {
    setContent('');
    setFeeling('');
    setLocation('');
    setLinkUrl('');
    setSelectedFiles([]);
    setPreviews([]);
    setIsExpanded(false);
    setShowFeelingInput(false);
    setShowLocationInput(false);
    setShowLinkInput(false);
  }, []);

  // Memoized hashtag preview
  const hashtagPreview = useMemo(() => {
    if (!isExpanded || extractHashtags(content).length === 0) return null;

    return (
      <div className="mt-2 flex flex-wrap gap-1">
        {extractHashtags(content).map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200"
          >
            #{tag}
          </span>
        ))}
      </div>
    );
  }, [isExpanded, content, extractHashtags]);

  // Memoized file previews
  const filePreviews = useMemo(() => {
    if (previews.length === 0) return null;

    return (
      <div className="mt-3 grid grid-cols-2 gap-2">
        {previews.map((preview, index) => {
          const file = selectedFiles[index];
          const isVideo = file?.type.startsWith('video/');

          return (
            <div key={index} className="relative">
              {isVideo ? (
                <video
                  src={preview}
                  className="w-full h-32 object-cover rounded-lg"
                  controls
                />
              ) : (
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
              )}
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute top-2 right-2 w-6 h-6 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white hover:bg-opacity-70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    );
  }, [previews, selectedFiles, removeFile]);

  return (
    <div className={`group rounded-xl shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700 ${className} bg-white dark:bg-gray-800 transition-all duration-300 focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500/50`}>
      <form onSubmit={handleSubmit}>
        {/* Main composer area */}
        <div className="p-4">
          <div className="flex space-x-4">
            {/* User avatar */}
            <div className="flex-shrink-0">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName || 'User'}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {userName ? userName.charAt(0).toUpperCase() : '?'}
                </div>
              )}
            </div>

            {/* Text input area */}
            <div className="flex-1 min-w-0">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onFocus={handleFocus}
                placeholder={content.length ? '' : HINTS[hintIdx]}
                className="w-full resize-none border-none outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-lg leading-relaxed"
                rows={isExpanded ? 3 : 1}
                disabled={isLoading}
                style={{ minHeight: isExpanded ? '80px' : '40px' }}
              />

              {/* Hashtag preview */}
              {hashtagPreview}

              {/* File previews */}
              {filePreviews}

              {/* Additional inputs when expanded */}
              {isExpanded && (
                <div className="mt-4 space-y-3 animate-fade-in">
                  {/* Feeling input */}
                  {showFeelingInput && (
                    <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 border border-gray-100 dark:border-gray-700">
                      <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                        <Smile className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <input
                        type="text"
                        value={feeling}
                        onChange={(e) => setFeeling(e.target.value)}
                        placeholder="How are you feeling?"
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-900 dark:text-white placeholder-gray-500"
                        disabled={isLoading}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowFeelingInput(false);
                          setFeeling('');
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Location input */}
                  {showLocationInput && (
                    <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 border border-gray-100 dark:border-gray-700">
                      <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Where are you?"
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-900 dark:text-white placeholder-gray-500"
                        disabled={isLoading}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowLocationInput(false);
                          setLocation('');
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Link input */}
                  {showLinkInput && (
                    <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 border border-gray-100 dark:border-gray-700">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <LinkIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <input
                        type="url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="Add a link..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-900 dark:text-white placeholder-gray-500"
                        disabled={isLoading}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowLinkInput(false);
                          setLinkUrl('');
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {isExpanded && (
          <div className="border-t border-gray-100 dark:border-gray-700/50 px-4 py-3 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-xl">
            <div className="flex items-center justify-between">
              {/* Media and action buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all"
                  title="Add Photo"
                  disabled={isLoading}
                >
                  <Image className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all"
                  title="Add Video"
                  disabled={isLoading}
                >
                  <Video className="w-5 h-5" />
                </button>

                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

                <button
                  type="button"
                  onClick={() => setShowLinkInput(!showLinkInput)}
                  className={`p-2 rounded-lg transition-all ${showLinkInput
                    ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    }`}
                  title="Add Link"
                  disabled={isLoading}
                >
                  <LinkIcon className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowFeelingInput(!showFeelingInput)}
                  className={`p-2 rounded-lg transition-all ${showFeelingInput
                    ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
                    : 'text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                    }`}
                  title="Add Feeling"
                  disabled={isLoading}
                >
                  <Smile className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowLocationInput(!showLocationInput)}
                  className={`p-2 rounded-lg transition-all ${showLocationInput
                    ? 'text-red-600 bg-red-50 dark:bg-red-900/20'
                    : 'text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                    }`}
                  title="Add Location"
                  disabled={isLoading}
                >
                  <MapPin className="w-5 h-5" />
                </button>
              </div>

              {/* Submit and cancel buttons */}
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!content.trim() || isLoading}
                  className="px-6 py-2 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:transform-none disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Character count (when expanded) */}
        {isExpanded && (
          <div className="px-4 pb-2 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-xl -mt-2">
            <div className="text-right">
              <span className={`text-xs font-medium ${content.length > 280 ? 'text-red-500' : 'text-gray-400'}`}>
                {content.length}/280
              </span>
            </div>
          </div>
        )}
      </form>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        multiple
        onChange={handleVideoSelect}
        className="hidden"
      />
    </div>
  );
});

// Add display name for debugging
FacebookStylePostComposer.displayName = 'FacebookStylePostComposer';

export default FacebookStylePostComposer;