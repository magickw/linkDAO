import React, { useState, useCallback } from 'react';
import { Send, Clock, AlertCircle, CheckCircle, WifiOff } from 'lucide-react';
import { useActionQueue } from '../../hooks/useActionQueue';
import ConnectivityErrorBoundary from '../ErrorHandling/ConnectivityErrorBoundary';
import { EnhancedStatusIndicator } from '../Status/EnhancedStatusIndicator';
import { apiCircuitBreaker } from '../../services/circuitBreaker';

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
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'queued' | 'error' | 'retrying'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [estimatedRetryTime, setEstimatedRetryTime] = useState(0);
  
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
      // Use circuit breaker for resilient API calls
      const success = await apiCircuitBreaker.execute(
        async () => {
          const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(postData)
          });

          if (response.ok) {
            const result = await response.json();
            return result.data;
          } else if (response.status === 503 || response.status === 429 || response.status >= 500) {
            const errorData = await response.json().catch(() => ({}));
            const error = new Error(errorData.error || `Service temporarily unavailable (${response.status})`);
            (error as any).status = response.status;
            (error as any).retryable = errorData.retryable;
            (error as any).retryAfter = errorData.retryAfter;
            throw error;
          } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to create post: ${response.statusText}`);
          }
        },
        async () => {
          // Fallback: queue the action
          console.log('Using fallback: queuing post creation');
          const actionId = await addAction('post', postData, {
            priority: 'high',
            maxRetries: 3
          });
          return null; // Indicates fallback was used
        }
      );

      if (success) {
        // Direct submission succeeded
        setSubmitStatus('success');
        setContent('');
        setTags([]);
        setRetryCount(0);
        onPostCreated?.(success.id);
      } else {
        // Fallback was used - action was queued
        setSubmitStatus('queued');
        setContent('');
        setTags([]);
        setRetryCount(0);
        onPostQueued?.('queued-action-id');
      }

    } catch (error) {
      console.error('Failed to submit post:', error);
      
      // Check if we should retry
      const isRetryableError = error instanceof Error && (
        (error as any).retryable ||
        error.message.includes('503') ||
        error.message.includes('Service temporarily unavailable') ||
        error.message.includes('network') ||
        error.message.includes('timeout')
      );

      if (isRetryableError && retryCount < 3) {
        setSubmitStatus('retrying');
        setRetryCount(prev => prev + 1);
        
        const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        setEstimatedRetryTime(retryDelay / 1000);
        
        setTimeout(() => {
          handleSubmit(e);
        }, retryDelay);
        return;
      }

      // If not retryable or max retries exceeded, try to queue
      if (!isOnline || retryCount >= 3) {
        try {
          const actionId = await addAction('post', postData, {
            priority: 'high',
            maxRetries: 3
          });
          
          setSubmitStatus('queued');
          setContent('');
          setTags([]);
          setRetryCount(0);
          onPostQueued?.(actionId);
        } catch (queueError) {
          setSubmitStatus('error');
          setErrorMessage('Failed to queue post. Please try again.');
        }
      } else {
        setSubmitStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Failed to create post');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [content, communityId, tags, isOnline, addAction, onPostCreated, onPostQueued, retryCount]);

  const handleRetry = useCallback(() => {
    setRetryCount(0);
    setSubmitStatus('idle');
    setErrorMessage('');
    
    // Create a synthetic form event for retry
    const syntheticEvent = {
      preventDefault: () => {}
    } as React.FormEvent;
    
    handleSubmit(syntheticEvent);
  }, [handleSubmit]);

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

        {/* Enhanced Status Messages */}
        {submitStatus === 'success' && (
          <EnhancedStatusIndicator
            status="success"
            message="Post created successfully!"
            onDismiss={() => setSubmitStatus('idle')}
            className="mb-4"
          />
        )}

        {submitStatus === 'queued' && (
          <EnhancedStatusIndicator
            status="queued"
            message="Post queued and will be submitted when service is available"
            details="Your post is safely stored and will be published automatically"
            className="mb-4"
          />
        )}

        {submitStatus === 'retrying' && (
          <EnhancedStatusIndicator
            status="retrying"
            message="Retrying post submission..."
            retryCount={retryCount}
            maxRetries={3}
            estimatedTime={estimatedRetryTime}
            className="mb-4"
          />
        )}

        {submitStatus === 'error' && errorMessage && (
          <EnhancedStatusIndicator
            status="error"
            message={errorMessage}
            retryable={retryCount < 3}
            onRetry={handleRetry}
            onDismiss={() => setSubmitStatus('idle')}
            actionLabel="Try Again"
            className="mb-4"
          />
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