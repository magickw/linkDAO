import React, { useState, useRef, useEffect } from 'react';
import { CreatePostInput } from '@/models/Post';
import { Camera, Image, Link as LinkIcon, Smile, MapPin, Video, X } from 'lucide-react';

interface FacebookStylePostComposerProps {
  onSubmit: (postData: CreatePostInput) => Promise<void>;
  isLoading: boolean;
  userAvatar?: string;
  userName?: string;
  className?: string;
}

export default function FacebookStylePostComposer({
  onSubmit,
  isLoading,
  userAvatar,
  userName,
  className = ''
}: FacebookStylePostComposerProps) {
  const [content, setContent] = useState('');
  const HINTS = [
    'Share your latest DAO proposal 🧠',
    'Post your NFT drop 🚀',
    'Comment on trending governance votes 🏛️',
  ];
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
  }, []);

  const handleFocus = () => {
    setIsExpanded(true);
  };

  // Extract hashtags from content
  const extractHashtags = (text: string): string[] => {
    const hashtagRegex = /#[\w]+/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

      const postData: CreatePostInput = {
        author: '', // This will be overridden by the parent component
        content: finalContent,
        tags: tagArray,
        media: selectedFiles.length > 0 ? ['https://placehold.co/300'] : undefined
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
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleCancel = () => {
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
  };

  return (
    <div className={`group rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className} bg-white dark:bg-gray-800 transition-colors focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent bg-gradient-to-r from-transparent to-transparent focus-within:from-primary-500/10 focus-within:to-purple-500/10`}>
      <form onSubmit={handleSubmit}>
        {/* Main composer area */}
        <div className="p-4">
          <div className="flex space-x-3">
            {/* User avatar */}
            <div className="flex-shrink-0">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName || 'User'}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {userName ? userName.charAt(0).toUpperCase() : '?'}
                </div>
              )}
            </div>

            {/* Text input area */}
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onFocus={handleFocus}
                placeholder={content.length ? '' : HINTS[hintIdx]}
                className="w-full resize-none border-none outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-lg"
                rows={isExpanded ? 3 : 1}
                disabled={isLoading}
                style={{ minHeight: isExpanded ? '80px' : '40px' }}
              />

              {/* Hashtag preview */}
              {isExpanded && extractHashtags(content).length > 0 && (
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
              )}

              {/* File previews */}
              {previews.length > 0 && (
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
              )}

              {/* Additional inputs when expanded */}
              {isExpanded && (
                <div className="mt-3 space-y-2">
                  {/* Feeling input */}
                  {showFeelingInput && (
                    <div className="flex items-center space-x-2">
                      <Smile className="w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        value={feeling}
                        onChange={(e) => setFeeling(e.target.value)}
                        placeholder="How are you feeling?"
                        className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowFeelingInput(false);
                          setFeeling('');
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Location input */}
                  {showLocationInput && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Where are you?"
                        className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowLocationInput(false);
                          setLocation('');
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Link input */}
                  {showLinkInput && (
                    <div className="flex items-center space-x-2">
                      <LinkIcon className="w-4 h-4 text-gray-500" />
                      <input
                        type="url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="Add a link..."
                        className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowLinkInput(false);
                          setLinkUrl('');
                        }}
                        className="text-gray-400 hover:text-gray-600"
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
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Media and action buttons */}
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-2 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
                  disabled={isLoading}
                >
                  <Image className="w-5 h-5" />
                  <span className="text-sm font-medium">Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="flex items-center space-x-2 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
                  disabled={isLoading}
                >
                  <Video className="w-5 h-5" />
                  <span className="text-sm font-medium">Video</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowLinkInput(!showLinkInput)}
                  className={`flex items-center space-x-2 transition-colors ${showLinkInput
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400'
                    }`}
                  disabled={isLoading}
                >
                  <LinkIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">Link</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowFeelingInput(!showFeelingInput)}
                  className={`flex items-center space-x-2 transition-colors ${showFeelingInput
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400'
                    }`}
                  disabled={isLoading}
                >
                  <Smile className="w-5 h-5" />
                  <span className="text-sm font-medium">Feeling</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowLocationInput(!showLocationInput)}
                  className={`flex items-center space-x-2 transition-colors ${showLocationInput
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400'
                    }`}
                  disabled={isLoading}
                >
                  <MapPin className="w-5 h-5" />
                  <span className="text-sm font-medium">Location</span>
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
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Character count (when expanded) */}
        {isExpanded && (
          <div className="px-4 pb-2">
            <div className="text-right">
              <span className={`text-xs ${content.length > 280 ? 'text-red-500' : 'text-gray-400'}`}>
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
}