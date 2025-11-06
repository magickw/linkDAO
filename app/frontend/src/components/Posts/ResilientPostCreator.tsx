import React, { useState, useCallback } from 'react';
import { Send, Clock, AlertCircle, CheckCircle, WifiOff } from 'lucide-react';
import { useActionQueue } from '../../hooks/useActionQueue';
import ConnectivityErrorBoundary from '../ErrorHandling/ConnectivityErrorBoundary';

interface PostData {
  content: string;
  communityId?: string;
  attachments?: File[];
  tags?: string[];
}

interface ResilientPostCreatorProps {
  communityId?: string;
  onPostCreated?: (postId: string) => void;
  onPostQueued?: (actionId: string) => void;
  className?: string;
}

export const ResilientPostCreator: React.FC<ResilientPostCreatorProps> = ({
  communityId,
  onPostCreated,
  onPostQueued,
  className = ''
}) => {
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'queued' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const { addAction, queueSize } = useActionQueue();
  const isOnline = navigator.onLine;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setErrorMessage('Post content cannot be empty');
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    const postData: PostData = {
      content: content.trim(),
      communityId,
      tags
    };

    try {
      if (isOnline) {
        // Try direct submission first
        try {
          const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(postData)
          });

          if (response.ok) {
            const result = await response.json();
            setSubmitStatus('success');
            setContent('');
            setTags([]);
            onPostCreated?.(result.id);
            return;
          } else if (response.status === 503 || response.status === 429) {
            // Service unavailable or rate limited, queue the action
            throw new Error('Service temporarily unavailable');
          } else {
            throw new Error(`Failed to create post: ${response.statusText}`);
          }
        } catch (fetchError) {
          // If direct submission fails, queue the action
          console.log('Direct submission failed, queuing action:', fetchError);
        }
      }

      // Queue the action for later processing
      const actionId = await addAction('post', postData, {
        priority: 'high',
        maxRetries: 3
      });

      setSubmitStatus('queued');
      setContent('');
      setTags([]);
      onPostQueued?.(actionId);

    } catch (error) {
      console.error('Failed to submit post:', error);
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit post');
    } finally {
      setIsSubmitting(false);
    }
  }, [content, communityId, tags, isOnline, addAction, onPostCreated, onPostQueued]);

  const handleTagAdd = useCallback((tag: string) => {
    if (tag && !tags.includes(tag)) {
      setTags(prev => [...prev, tag]);
    }
  }, [tags]);

  const handleTagRemove = useCallback((tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  }, []);

  const getSubmitButtonText = () => {
    if (isSubmitting) {
      return isOnline ? 'Posting...' : 'Queuing...';
    }
    if (!isOnline) {
      return 'Queue Post';
    }
    return 'Post';
  };

  const getSubmitButtonIcon = () => {
    if (isSubmitting) {
      return <Clock className="h-4 w-4 animate-pulse" />;
    }
    if (!isOnline) {
      return <WifiOff className="h-4 w-4" />;
    }
    return <Send className="h-4 w-4" />;
  };

  return (
    <ConnectivityErrorBoundary>
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}>
        {/* Status Indicators */}
        {!isOnline && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
            <div className="flex items-center space-x-2">
              <WifiOff className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-orange-700">
                You're offline. Posts will be queued and submitted when connection returns.
              </span>
            </div>
          </div>
        )}

        {queueSize > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-blue-700">
                {queueSize} action{queueSize > 1 ? 's' : ''} queued for processing
              </span>
            </div>
          </div>
        )}

        {/* Success/Error Messages */}
        {submitStatus === 'success' && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-700">Post created successfully!</span>
            </div>
          </div>
        )}

        {submitStatus === 'queued' && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-blue-700">
                Post queued and will be submitted when service is available
              </span>
            </div>
          </div>
        )}

        {submitStatus === 'error' && errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Post Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              maxLength={500}
              disabled={isSubmitting}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-500">
                {content.length}/500 characters
              </span>
            </div>
          </div>

          {/* Tags */}
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleTagRemove(tag)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                    disabled={isSubmitting}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add tags (press Enter)"
              className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const value = e.currentTarget.value.trim();
                  if (value) {
                    handleTagAdd(value);
                    e.currentTarget.value = '';
                  }
                }
              }}
              disabled={isSubmitting}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">
              {!isOnline && 'Posts will be queued for later submission'}
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {getSubmitButtonIcon()}
              <span>{getSubmitButtonText()}</span>
            </button>
          </div>
        </form>
      </div>
    </ConnectivityErrorBoundary>
  );
};

export default ResilientPostCreator;