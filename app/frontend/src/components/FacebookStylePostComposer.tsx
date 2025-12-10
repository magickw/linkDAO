import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ipfsUploadService } from '@/services/ipfsUploadService';
import { CreatePostInput } from '@/models/Post';
import { Camera, Image, Link as LinkIcon, Smile, MapPin, Video, X, AlertCircle } from 'lucide-react';
import VideoEmbed from './VideoEmbed';
import { extractVideoUrls } from '@/utils/videoUtils';

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
  const [uploadError, setUploadError] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Get max file size from service
  const maxFileSize = useMemo(() => ipfsUploadService.getMaxFileSize(), []);

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

  // Extract video URLs from content
  const extractVideoLinks = useCallback((text: string) => {
    return extractVideoUrls(text);
  }, []);

  // Memoize video embeds
  const videoEmbeds = useMemo(() => {
    const videoInfos = extractVideoLinks(content);
    return videoInfos.map((videoInfo, index) => (
      <div key={index} className="mt-3">
        <VideoEmbed url={videoInfo.url} width={560} height={315} />
      </div>
    ));
  }, [content, extractVideoLinks]);

  // Extract hashtags from content
  const extractHashtags = useCallback((text: string): string[] => {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    if (!matches) return [];
    return matches.map(tag => tag.slice(1)); // Remove the # prefix
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) return;

    try {
      // Clear any previous errors
      setUploadError('');

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
          const uploadPromises = selectedFiles.map(async (file) => {
            const result = await ipfsUploadService.uploadFile(file);
            return result.cid;
          });
          mediaCids = await Promise.all(uploadPromises);
        } catch (uploadError) {
          console.error('Error uploading files:', uploadError);
          // Show error in UI
          const errorMessage = uploadError instanceof Error ? uploadError.message : 'Failed to upload files. Please try again.';
          setUploadError(errorMessage);
          return; // Don't proceed with post creation
        }
      }

      const postData: CreatePostInput = {
        author: userName || '', // Use the userName prop as author
        content: finalContent,
        tags: tagArray,
        media: mediaCids.length > 0 ? mediaCids : undefined
      };

      await onSubmit(postData);

      // Reset form only after successful submission
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
      setUploadError('');
    } catch (error) {
      console.error('Error submitting post:', error);
      // Show error in UI
      const errorMessage = error instanceof Error ? error.message : 'Failed to create post. Please try again.';
      setUploadError(errorMessage);
    }
  }, [content, feeling, location, linkUrl, selectedFiles, onSubmit, extractHashtags, userName]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file sizes
    const oversizedFiles = files.filter(file => file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map(f => f.name).join(', ');
      const maxSizeMB = maxFileSize / 1024 / 1024;
      setUploadError(`The following files exceed the ${maxSizeMB}MB limit: ${fileNames}`);
      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Clear any previous errors
    setUploadError('');

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
  }, [maxFileSize]);

  const handleVideoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file sizes
    const oversizedFiles = files.filter(file => file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map(f => f.name).join(', ');
      const maxSizeMB = maxFileSize / 1024 / 1024;
      setUploadError(`The following videos exceed the ${maxSizeMB}MB limit: ${fileNames}`);
      // Reset the input
      if (videoInputRef.current) {
        videoInputRef.current.value = '';
      }
      return;
    }

    // Clear any previous errors
    setUploadError('');

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
  }, [maxFileSize]);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
    // Clear error when files are removed
    setUploadError('');
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
    setUploadError('');
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
    if (previews.length === 0 && videoEmbeds.length === 0) return null;

    return (
      <div className="mt-3 space-y-3">
        {/* Video Embeds */}
        {videoEmbeds}
        
        {/* File Previews */}
        {previews.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {previews.map((preview, index) => {
              const file = selectedFiles[index];
              const isVideo = file?.type.startsWith('video/');
              const fileSize = file ? ipfsUploadService.formatFileSize(file.size) : '';
              const fileSizePercent = file ? (file.size / maxFileSize) * 100 : 0;
              const sizeColor = fileSizePercent > 90 ? 'text-red-500' : fileSizePercent > 70 ? 'text-yellow-500' : 'text-green-500';

              return (
                <div key={index} className="relative group">
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
                  {/* File info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-lg">
                    <div className="text-white text-xs truncate">{file?.name}</div>
                    <div className={`text-xs font-medium ${sizeColor}`}>{fileSize}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute top-2 right-2 w-6 h-6 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white hover:bg-opacity-70 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }, [previews, selectedFiles, removeFile, videoEmbeds]);

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

              {/* Upload error display */}
              {uploadError && (
                <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">Upload Error</p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">{uploadError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadError('')}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

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
                  className={`p-2 rounded-lg transition-all ${showLinkInput
                    ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20'
                    : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                    }`}
                  title="Add Video (YouTube, Vimeo, TikTok, Instagram, Twitter, Facebook)"
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