import React, { useState, useRef, useEffect } from 'react';
import { CreatePostInput } from '@/models/Post';
import { Camera, Image, Link as LinkIcon, Smile, MapPin, Tag } from 'lucide-react';

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [tags, setTags] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handleFocus = () => {
    setIsExpanded(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) return;

    try {
      const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      
      const postData: CreatePostInput = {
        author: '',
        content: content.trim(),
        tags: tagArray,
        media: selectedFiles.length > 0 ? ['https://placehold.co/300'] : undefined
      };

      await onSubmit(postData);
      
      // Reset form
      setContent('');
      setTags('');
      setSelectedFiles([]);
      setPreviews([]);
      setIsExpanded(false);
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

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleCancel = () => {
    setContent('');
    setTags('');
    setSelectedFiles([]);
    setPreviews([]);
    setIsExpanded(false);
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
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
                placeholder="What's happening in Web3?"
                className="w-full resize-none border-none outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-lg"
                rows={isExpanded ? 3 : 1}
                disabled={isLoading}
                style={{ minHeight: isExpanded ? '80px' : '40px' }}
              />

              {/* File previews */}
              {previews.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {previews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 w-6 h-6 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white hover:bg-opacity-70"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Tags input (when expanded) */}
              {isExpanded && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="Add tags (comma separated)"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    disabled={isLoading}
                  />
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
                  className="flex items-center space-x-2 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
                  disabled={isLoading}
                >
                  <Camera className="w-5 h-5" />
                  <span className="text-sm font-medium">Video</span>
                </button>
                
                <button
                  type="button"
                  className="flex items-center space-x-2 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
                  disabled={isLoading}
                >
                  <LinkIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">Link</span>
                </button>
                
                <button
                  type="button"
                  className="flex items-center space-x-2 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
                  disabled={isLoading}
                >
                  <Smile className="w-5 h-5" />
                  <span className="text-sm font-medium">Feeling</span>
                </button>
                
                <button
                  type="button"
                  className="flex items-center space-x-2 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
                  disabled={isLoading}
                >
                  <MapPin className="w-5 h-5" />
                  <span className="text-sm font-medium">Location</span>
                </button>
                
                <button
                  type="button"
                  className="flex items-center space-x-2 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
                  disabled={isLoading}
                >
                  <Tag className="w-5 h-5" />
                  <span className="text-sm font-medium">Tag</span>
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}