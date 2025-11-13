import React, { useState, useRef } from 'react';
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
  Megaphone
} from 'lucide-react';
import { useCommunityInteractions } from '../../hooks/useCommunityInteractions';

interface CommunityPostCreatorProps {
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

export default function CommunityPostCreator({
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
}: CommunityPostCreatorProps) {
  const { createPost, loading, error, clearError } = useCommunityInteractions();
  
  const [postType, setPostType] = useState(allowedPostTypes.find(t => t.enabled)?.id || 'discussion');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaInput, setMediaInput] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // Reset form
      setTitle('');
      setContent('');
      setTags([]);
      setMediaUrls([]);
      setPostType(allowedPostTypes.find(t => t.enabled)?.id || 'discussion');

      // Dispatch event to notify other components that a post was created
      window.dispatchEvent(new CustomEvent('postCreated'));

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

  const enabledPostTypes = allowedPostTypes.filter(type => type.enabled);

  return (
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
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-red-800 dark:text-red-200 text-sm">{error}</span>
            </div>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Post Type Selection */}
        {enabledPostTypes.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Post Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {enabledPostTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setPostType(type.id)}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    postType === type.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
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

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a descriptive title for your post..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            required
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Content *
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your thoughts, ask questions, or start a discussion..."
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-vertical"
            required
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tags
          </label>
          <div className="flex items-center space-x-2 mb-2">
            <div className="flex-1 flex items-center space-x-2">
              <Hash className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add tags (press Enter)"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={handleAddTag}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
            >
              Add
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm rounded-full"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Media URLs */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Media Links
          </label>
          <div className="flex items-center space-x-2 mb-2">
            <div className="flex-1 flex items-center space-x-2">
              <Link className="w-4 h-4 text-gray-400" />
              <input
                type="url"
                value={mediaInput}
                onChange={(e) => setMediaInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddMedia())}
                placeholder="Add image or video URL"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={handleAddMedia}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
            >
              Add
            </button>
          </div>
          {mediaUrls.length > 0 && (
            <div className="space-y-2">
              {mediaUrls.map((url) => (
                <div
                  key={url}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-2">
                    <Image className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {url}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(url)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !title.trim() || !content.trim()}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>{loading ? 'Creating...' : 'Create Post'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}