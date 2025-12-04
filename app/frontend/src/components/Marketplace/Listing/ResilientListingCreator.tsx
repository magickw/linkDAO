import React, { useState, useCallback, useEffect } from 'react';
import { Package, Clock, AlertCircle, CheckCircle, WifiOff, Save, Upload } from 'lucide-react';
import { useActionQueue } from '../../../hooks/useActionQueue';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';
import ConnectivityErrorBoundary from '../../ErrorHandling/ConnectivityErrorBoundary';
import { marketplaceCircuitBreaker } from '../../../services/circuitBreaker';

interface ProductData {
  title: string;
  description: string;
  price: string;
  currency: string;
  category: string;
  condition: string;
  tags: string[];
  images: string[];
  quantity: number;
  unlimitedQuantity: boolean;
  escrowEnabled: boolean;
  shippingCost: string;
  estimatedDelivery: string;
}

interface ResilientListingCreatorProps {
  onListingCreated?: (listingId: string) => void;
  onListingQueued?: (actionId: string) => void;
  onCancel?: () => void;
  className?: string;
}

const CATEGORIES = [
  'electronics', 'fashion', 'home', 'books', 'sports', 'toys',
  'automotive', 'health', 'beauty', 'jewelry', 'art', 'collectibles'
];

const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like-new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' }
];

export const ResilientListingCreator: React.FC<ResilientListingCreatorProps> = ({
  onListingCreated,
  onListingQueued,
  onCancel,
  className = ''
}) => {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { addAction, queueSize } = useActionQueue();
  
  const [formData, setFormData] = useState<ProductData>({
    title: '',
    description: '',
    price: '',
    currency: 'USD',
    category: 'electronics',
    condition: 'new',
    tags: [],
    images: [],
    quantity: 1,
    unlimitedQuantity: false,
    escrowEnabled: true,
    shippingCost: '0',
    estimatedDelivery: '3-5 days'
  });

  const [currentTag, setCurrentTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'queued' | 'error' | 'draft_saved'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isDraftMode, setIsDraftMode] = useState(false);
  
  const isOnline = navigator.onLine;
  const maxRetries = 3;

  // Auto-save draft functionality
  useEffect(() => {
    const draftKey = `listing_draft_${address}`;
    
    // Load draft on mount
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setFormData(draft);
        setIsDraftMode(true);
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    }

    // Auto-save draft every 30 seconds
    const autoSaveInterval = setInterval(() => {
      if (formData.title || formData.description) {
        localStorage.setItem(draftKey, JSON.stringify(formData));
      }
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [address, formData]);

  const handleInputChange = useCallback((field: keyof ProductData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSubmitStatus('idle');
    setErrorMessage('');
  }, []);

  const handleTagAdd = useCallback(() => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      handleInputChange('tags', [...formData.tags, currentTag.trim()]);
      setCurrentTag('');
    }
  }, [currentTag, formData.tags, handleInputChange]);

  const handleTagRemove = useCallback((tagToRemove: string) => {
    handleInputChange('tags', formData.tags.filter(tag => tag !== tagToRemove));
  }, [formData.tags, handleInputChange]);

  const validateForm = (): string | null => {
    if (!formData.title.trim()) return 'Product title is required';
    if (formData.title.length < 3) return 'Title must be at least 3 characters';
    if (!formData.description.trim()) return 'Product description is required';
    if (formData.description.length < 10) return 'Description must be at least 10 characters';
    if (!formData.price || parseFloat(formData.price) <= 0) return 'Valid price is required';
    if (!formData.unlimitedQuantity && formData.quantity < 1) return 'Quantity must be at least 1';
    return null;
  };

  const saveDraft = useCallback(() => {
    const draftKey = `listing_draft_${address}`;
    localStorage.setItem(draftKey, JSON.stringify(formData));
    setSubmitStatus('draft_saved');
    setIsDraftMode(true);
    setTimeout(() => setSubmitStatus('idle'), 2000);
  }, [address, formData]);

  const clearDraft = useCallback(() => {
    const draftKey = `listing_draft_${address}`;
    localStorage.removeItem(draftKey);
    setIsDraftMode(false);
  }, [address]);

  const attemptDirectSubmission = async (): Promise<boolean> => {
    try {
      const listingData = {
        sellerWalletAddress: address,
        tokenAddress: '0x0000000000000000000000000000000000000000',
        price: formData.price,
        quantity: formData.unlimitedQuantity ? 999999 : formData.quantity,
        itemType: 'PHYSICAL',
        listingType: 'FIXED_PRICE',
        metadataURI: JSON.stringify({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          condition: formData.condition,
          tags: formData.tags,
          images: formData.images,
          shippingCost: formData.shippingCost,
          estimatedDelivery: formData.estimatedDelivery
        }),
        isEscrowed: formData.escrowEnabled
      };

      const response = await fetch('/api/marketplace/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(listingData)
      });

      if (response.ok) {
        const result = await response.json();
        return result.success;
      } else if (response.status === 503 || response.status === 429 || response.status >= 500) {
        throw new Error(`Service temporarily unavailable (${response.status})`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create listing: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Direct submission failed:', error);
      throw error;
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      setErrorMessage('Please connect your wallet to create a listing');
      setSubmitStatus('error');
      return;
    }

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
      const success = await marketplaceCircuitBreaker.execute(
        () => attemptDirectSubmission(),
        async () => {
          // Fallback: queue the action
          console.log('Using fallback: queuing listing creation');
          const actionId = await addAction('product_create', formData, {
            priority: 'high',
            maxRetries: 3,
            userId: address
          });
          return false; // Indicates fallback was used
        }
      );

      if (success) {
        // Direct submission succeeded
        setSubmitStatus('success');
        clearDraft();
        setFormData({
          title: '',
          description: '',
          price: '',
          currency: 'USD',
          category: 'electronics',
          condition: 'new',
          tags: [],
          images: [],
          quantity: 1,
          unlimitedQuantity: false,
          escrowEnabled: true,
          shippingCost: '0',
          estimatedDelivery: '3-5 days'
        });
        onListingCreated?.('temp-id');
      } else {
        // Fallback was used - action was queued
        setSubmitStatus('queued');
        saveDraft(); // Keep draft for reference
        onListingQueued?.('queued-action-id');
      }

      setRetryCount(0);
    } catch (error) {
      console.error('Failed to submit listing:', error);
      
      // Check if we should retry or queue
      const isRetryableError = error instanceof Error && (
        error.message.includes('503') ||
        error.message.includes('Service temporarily unavailable') ||
        error.message.includes('network') ||
        error.message.includes('timeout')
      );

      if (isRetryableError && retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        setErrorMessage(`Attempt ${retryCount + 1}/${maxRetries} failed. Retrying...`);
        
        // Exponential backoff retry
        setTimeout(() => {
          handleSubmit(e);
        }, Math.pow(2, retryCount) * 1000);
        return;
      }

      // If not online or max retries exceeded, queue the action
      if (!isOnline || retryCount >= maxRetries) {
        try {
          const actionId = await addAction('product_create', formData, {
            priority: 'high',
            maxRetries: 3,
            userId: address
          });
          
          setSubmitStatus('queued');
          saveDraft();
          onListingQueued?.(actionId);
        } catch (queueError) {
          setSubmitStatus('error');
          setErrorMessage('Failed to queue listing. Please try again.');
        }
      } else {
        setSubmitStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Failed to create listing');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isConnected, address, formData, retryCount, maxRetries, isOnline,
    addAction, onListingCreated, onListingQueued, saveDraft, clearDraft
  ]);

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

  const getSubmitButtonText = () => {
    if (isSubmitting) {
      if (retryCount > 0) {
        return `Retrying (${retryCount}/${maxRetries})...`;
      }
      return isOnline ? 'Creating Listing...' : 'Queuing Listing...';
    }
    if (!isOnline) {
      return 'Queue Listing';
    }
    return 'Create Listing';
  };

  const getSubmitButtonIcon = () => {
    if (isSubmitting) {
      return <Clock className="h-4 w-4 animate-pulse" />;
    }
    if (!isOnline) {
      return <WifiOff className="h-4 w-4" />;
    }
    return <Package className="h-4 w-4" />;
  };

  return (
    <ConnectivityErrorBoundary onRetry={handleRetry}>
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Package className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Create Product Listing</h2>
          </div>
          
          {isDraftMode && (
            <div className="flex items-center space-x-2 text-sm text-orange-600">
              <Save className="h-4 w-4" />
              <span>Draft loaded</span>
            </div>
          )}
        </div>

        {/* Status Indicators */}
        {!isOnline && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
            <div className="flex items-center space-x-2">
              <WifiOff className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-orange-700">
                You're offline. Listings will be queued and created when connection returns.
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

        {/* Success/Error/Status Messages */}
        {submitStatus === 'success' && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-700">Listing created successfully!</span>
            </div>
          </div>
        )}

        {submitStatus === 'queued' && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-blue-700">
                Listing queued and will be created when service is available
              </span>
            </div>
          </div>
        )}

        {submitStatus === 'draft_saved' && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center space-x-2">
              <Save className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-blue-700">Draft saved automatically</span>
            </div>
          </div>
        )}

        {submitStatus === 'error' && errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-700">{errorMessage}</span>
              </div>
              {retryCount < maxRetries && (
                <button
                  onClick={handleRetry}
                  className="text-sm text-red-600 hover:text-red-800 underline"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter a descriptive title for your product"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={100}
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-gray-500 mt-1">{formData.title.length}/100 characters</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe your product in detail..."
                className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                maxLength={1000}
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-gray-500 mt-1">{formData.description.length}/1000 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price *
              </label>
              <div className="flex">
                <input
                  type="number"
                  step="0.0001"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  placeholder="0.00"
                  className="flex-1 p-3 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                  required
                />
                <select
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="p-3 border border-gray-300 border-l-0 rounded-r-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                >
                  <option value="ETH">ETH</option>
                  <option value="USDC">USDC</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
                  disabled={formData.unlimitedQuantity || isSubmitting}
                  className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
                <label className="flex items-center text-gray-700 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={formData.unlimitedQuantity}
                    onChange={(e) => handleInputChange('unlimitedQuantity', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                    disabled={isSubmitting}
                  />
                  Unlimited
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Specify the number of items available for sale. Check "Unlimited" for digital products or services with unlimited availability.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
              >
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Condition
              </label>
              <select
                value={formData.condition}
                onChange={(e) => handleInputChange('condition', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
              >
                {CONDITIONS.map(condition => (
                  <option key={condition.value} value={condition.value}>
                    {condition.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag) => (
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
            <div className="flex space-x-2">
              <input
                type="text"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                placeholder="Add tags (press Enter)"
                className="flex-1 p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleTagAdd();
                  }
                }}
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={handleTagAdd}
                disabled={!currentTag.trim() || isSubmitting}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="escrowEnabled"
                checked={formData.escrowEnabled}
                onChange={(e) => handleInputChange('escrowEnabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isSubmitting}
              />
              <label htmlFor="escrowEnabled" className="text-sm font-medium text-gray-700">
                Enable escrow protection (recommended)
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={saveDraft}
                disabled={isSubmitting || (!formData.title && !formData.description)}
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>Save Draft</span>
              </button>
              
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
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-xs text-gray-500">
                {!isOnline && 'Listing will be queued for creation when online'}
                {retryCount > 0 && `Retry ${retryCount}/${maxRetries}`}
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting || !formData.title.trim() || !formData.description.trim() || !formData.price}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {getSubmitButtonIcon()}
                <span>{getSubmitButtonText()}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </ConnectivityErrorBoundary>
  );
};

export default ResilientListingCreator;