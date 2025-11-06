import React, { useState, useCallback } from 'react';
import { Users, Clock, AlertCircle, CheckCircle, WifiOff, Image } from 'lucide-react';
import { useActionQueue } from '../../hooks/useActionQueue';
import ConnectivityErrorBoundary from '../ErrorHandling/ConnectivityErrorBoundary';
import { EnhancedStatusIndicator } from '../Status/EnhancedStatusIndicator';
import { communityCircuitBreaker } from '../../services/circuitBreaker';

interface CommunityData {
  name: string;
  description: string;
  category: string;
  isPrivate: boolean;
  rules?: string[];
  avatar?: File;
}

interface ResilientCommunityCreatorProps {
  onCommunityCreated?: (communityId: string) => void;
  onCommunityQueued?: (actionId: string) => void;
  onCancel?: () => void;
  className?: string;
}

const COMMUNITY_CATEGORIES = [
  'Technology',
  'Gaming',
  'Art & Design',
  'Business',
  'Education',
  'Entertainment',
  'Health & Fitness',
  'Lifestyle',
  'News & Politics',
  'Science',
  'Sports',
  'Travel',
  'Other'
];

export const ResilientCommunityCreator: React.FC<ResilientCommunityCreatorProps> = ({
  onCommunityCreated,
  onCommunityQueued,
  onCancel,
  className = ''
}) => {
  const [formData, setFormData] = useState<CommunityData>({
    name: '',
    description: '',
    category: '',
    isPrivate: false,
    rules: []
  });
  const [newRule, setNewRule] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'queued' | 'error' | 'retrying'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [estimatedRetryTime, setEstimatedRetryTime] = useState(0);
  
  const { addAction, queueSize } = useActionQueue();
  const isOnline = navigator.onLine;

  const handleInputChange = useCallback((field: keyof CommunityData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleAddRule = useCallback(() => {
    if (newRule.trim() && formData.rules && formData.rules.length < 10) {
      setFormData(prev => ({
        ...prev,
        rules: [...(prev.rules || []), newRule.trim()]
      }));
      setNewRule('');
    }
  }, [newRule, formData.rules]);

  const handleRemoveRule = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules?.filter((_, i) => i !== index) || []
    }));
  }, []);

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return 'Community name is required';
    }
    if (formData.name.length < 3) {
      return 'Community name must be at least 3 characters';
    }
    if (!formData.description.trim()) {
      return 'Community description is required';
    }
    if (!formData.category) {
      return 'Please select a category';
    }
    return null;
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      // Use circuit breaker for resilient API calls
      const success = await communityCircuitBreaker.execute(
        async () => {
          const communityData = {
            name: formData.name,
            displayName: formData.name,
            description: formData.description,
            category: formData.category,
            isPublic: !formData.isPrivate,
            rules: formData.rules || [],
            iconUrl: formData.avatar ? await fileToBase64(formData.avatar) : undefined
          };

          const response = await fetch('/api/communities', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(communityData)
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
            throw new Error(errorData.error || `Failed to create community: ${response.statusText}`);
          }
        },
        async () => {
          // Fallback: queue the action
          console.log('Using fallback: queuing community creation');
          const actionId = await addAction('community_create', {
            ...formData,
            avatar: formData.avatar ? await fileToBase64(formData.avatar) : undefined
          }, {
            priority: 'high',
            maxRetries: 3
          });
          return null; // Indicates fallback was used
        }
      );

      if (success) {
        // Direct submission succeeded
        setSubmitStatus('success');
        setFormData({
          name: '',
          description: '',
          category: '',
          isPrivate: false,
          rules: []
        });
        setRetryCount(0);
        onCommunityCreated?.(success.id);
      } else {
        // Fallback was used - action was queued
        setSubmitStatus('queued');
        setFormData({
          name: '',
          description: '',
          category: '',
          isPrivate: false,
          rules: []
        });
        setRetryCount(0);
        onCommunityQueued?.('queued-action-id');
      }

    } catch (error) {
      console.error('Failed to submit community:', error);
      
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
          const actionId = await addAction('community_create', {
            ...formData,
            avatar: formData.avatar ? await fileToBase64(formData.avatar) : undefined
          }, {
            priority: 'high',
            maxRetries: 3
          });
          
          setSubmitStatus('queued');
          setFormData({
            name: '',
            description: '',
            category: '',
            isPrivate: false,
            rules: []
          });
          setRetryCount(0);
          onCommunityQueued?.(actionId);
        } catch (queueError) {
          setSubmitStatus('error');
          setErrorMessage('Failed to queue community creation. Please try again.');
        }
      } else {
        setSubmitStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Failed to create community');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isOnline, addAction, onCommunityCreated, onCommunityQueued, retryCount]);

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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setErrorMessage('Avatar file size must be less than 5MB');
        setSubmitStatus('error');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Avatar must be an image file');
        setSubmitStatus('error');
        return;
      }
      handleInputChange('avatar', file);
    }
  }, [handleInputChange]);

  return (
    <ConnectivityErrorBoundary>
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center space-x-3 mb-6">
          <Users className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Create Community</h2>
        </div>

        {/* Status Indicators */}
        {!isOnline && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
            <div className="flex items-center space-x-2">
              <WifiOff className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-orange-700">
                You're offline. Community will be queued and created when connection returns.
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
            message="Community created successfully!"
            onDismiss={() => setSubmitStatus('idle')}
            className="mb-4"
          />
        )}

        {submitStatus === 'queued' && (
          <EnhancedStatusIndicator
            status="queued"
            message="Community queued and will be created when service is available"
            details="Your community is safely stored and will be created automatically"
            className="mb-4"
          />
        )}

        {submitStatus === 'retrying' && (
          <EnhancedStatusIndicator
            status="retrying"
            message="Retrying community creation..."
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

        {/* Community Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Community Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter community name"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={50}
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-gray-500 mt-1">{formData.name.length}/50 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what your community is about"
                className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                maxLength={500}
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-gray-500 mt-1">{formData.description.length}/500 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
                required
              >
                <option value="">Select a category</option>
                {COMMUNITY_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Community Avatar
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                    {formData.avatar ? (
                      <img
                        src={URL.createObjectURL(formData.avatar)}
                        alt="Avatar preview"
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <Image className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  disabled={isSubmitting}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Max file size: 5MB</p>
            </div>
          </div>

          {/* Privacy Settings */}
          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.isPrivate}
                onChange={(e) => handleInputChange('isPrivate', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isSubmitting}
              />
              <span className="text-sm font-medium text-gray-700">Private Community</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-7">
              Private communities require approval to join
            </p>
          </div>

          {/* Community Rules */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Community Rules (Optional)
            </label>
            <div className="space-y-2">
              {formData.rules?.map((rule, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
                  <span className="text-sm text-gray-700 flex-1">{index + 1}. {rule}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveRule(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                    disabled={isSubmitting}
                  >
                    Remove
                  </button>
                </div>
              ))}
              
              {(!formData.rules || formData.rules.length < 10) && (
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newRule}
                    onChange={(e) => setNewRule(e.target.value)}
                    placeholder="Add a community rule"
                    className="flex-1 p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={200}
                    disabled={isSubmitting}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRule();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddRule}
                    disabled={!newRule.trim() || isSubmitting}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formData.rules?.length || 0}/10 rules
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              {!isOnline && 'Community will be queued for creation when online'}
            </div>
            <div className="flex space-x-3">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting || !formData.name.trim() || !formData.description.trim() || !formData.category}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <Clock className="h-4 w-4 animate-pulse" />
                ) : !isOnline ? (
                  <WifiOff className="h-4 w-4" />
                ) : (
                  <Users className="h-4 w-4" />
                )}
                <span>
                  {isSubmitting 
                    ? (isOnline ? 'Creating...' : 'Queuing...') 
                    : (!isOnline ? 'Queue Community' : 'Create Community')
                  }
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </ConnectivityErrorBoundary>
  );
};

export default ResilientCommunityCreator;