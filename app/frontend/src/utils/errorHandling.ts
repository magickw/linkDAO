import React from 'react';
import { toast } from 'react-hot-toast';

// Error types that match backend
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  recovery?: {
    canRetry: boolean;
    suggestedActions: string[];
    alternativeOptions?: Array<{
      type: string;
      description: string;
    }>;
    estimatedResolutionTime?: number;
    helpUrl?: string;
  };
}

export interface ErrorResponse {
  success: false;
  error: ApiError;
  timestamp: string;
  path: string;
  method: string;
  requestId?: string;
}

// Error handling utility class
export class ErrorHandler {
  // Display user-friendly error messages
  static displayError(error: ApiError | Error | string, context?: string) {
    let message: string;
    let actions: string[] = [];
    let canRetry = false;

    if (typeof error === 'string') {
      message = error;
    } else if (error instanceof Error) {
      message = error.message;
    } else {
      message = error.message;
      actions = error.recovery?.suggestedActions || [];
      canRetry = error.recovery?.canRetry || false;
    }

    // Show toast notification
    toast.error(message, {
      duration: 6000,
      position: 'top-right',
    });

    // Log error for debugging
    console.error(`Error${context ? ` in ${context}` : ''}:`, error);

    return {
      message,
      actions,
      canRetry,
      context
    };
  }

  // Get user-friendly error messages
  static getUserFriendlyMessage(error: ApiError): string {
    const messageMap: { [key: string]: string } = {
      'ENS_VALIDATION_ERROR': 'Invalid ENS name format. Please check your ENS handle.',
      'ENS_RESOLUTION_ERROR': 'Unable to resolve ENS name. Please try again.',
      'IMAGE_UPLOAD_ERROR': 'Image upload failed. Please check file size and format.',
      'IPFS_STORAGE_ERROR': 'Image storage failed. Please try uploading again.',
      'CDN_DISTRIBUTION_ERROR': 'Image processing in progress. It will be available shortly.',
      'PAYMENT_VALIDATION_ERROR': 'Payment validation failed. Please check your payment details.',
      'INSUFFICIENT_BALANCE': 'Insufficient balance. Please add funds or try a different payment method.',
      'ESCROW_SETUP_ERROR': 'Escrow setup failed. Please try again or use direct payment.',
      'LISTING_PUBLICATION_ERROR': 'Failed to publish listing. Please check all required fields.',
      'ORDER_CREATION_ERROR': 'Order creation failed. Please try again.',
      'VALIDATION_ERROR': 'Please check your input and try again.',
      'NOT_FOUND': 'The requested resource was not found.',
      'UNAUTHORIZED': 'Please log in to continue.',
      'FORBIDDEN': 'You don\'t have permission to perform this action.',
      'RATE_LIMIT_EXCEEDED': 'Too many requests. Please wait a moment and try again.',
      'SERVICE_UNAVAILABLE': 'Service is temporarily unavailable. Please try again later.'
    };

    return messageMap[error.code] || error.message || 'An unexpected error occurred.';
  }

  // Handle API errors from fetch responses
  static async handleApiError(response: Response): Promise<never> {
    let errorData: ErrorResponse;
    
    try {
      errorData = await response.json();
    } catch {
      // If response is not JSON, create a generic error
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const error = new Error(this.getUserFriendlyMessage(errorData.error));
    (error as any).apiError = errorData.error;
    (error as any).statusCode = response.status;
    
    throw error;
  }

  // Retry mechanism with exponential backoff
  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }

        // Check if error is retryable
        const apiError = (error as any).apiError as ApiError;
        if (apiError && !apiError.recovery?.canRetry) {
          break;
        }

        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.log(`Retrying operation (attempt ${attempt + 1}/${maxRetries}) after ${delay}ms`);
      }
    }

    throw lastError!;
  }

  // Handle network errors
  static handleNetworkError(error: Error): void {
    if (error.message.includes('fetch')) {
      toast.error('Network error. Please check your internet connection.', {
        duration: 5000,
      });
    } else {
      this.displayError(error);
    }
  }

  // Handle form validation errors
  static handleValidationErrors(errors: { [field: string]: string[] }): void {
    const errorMessages = Object.entries(errors)
      .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
      .join('\n');

    toast.error(`Validation errors:\n${errorMessages}`, {
      duration: 8000,
    });
  }

  // Create error boundary fallback
  static createErrorBoundaryFallback(error: Error, errorInfo: any) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    return {
      hasError: true,
      error: {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      }
    };
  }
}

// Error recovery actions
export class ErrorRecoveryActions {
  // ENS-related recovery actions
  static async suggestENSAlternatives(baseName: string): Promise<string[]> {
    try {
      const response = await fetch(`/api/ens/suggestions?base=${encodeURIComponent(baseName)}`);
      if (!response.ok) {
        throw new Error('Failed to get ENS suggestions');
      }
      const data = await response.json();
      return data.suggestions || [];
    } catch (error) {
      console.error('Error getting ENS suggestions:', error);
      return [];
    }
  }

  // Image-related recovery actions
  static async compressImage(file: File, quality: number = 0.8): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions (max 1920x1080)
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Image compression failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Payment-related recovery actions
  static async getPaymentAlternatives(amount: number, currency: string): Promise<any[]> {
    try {
      const response = await fetch('/api/payment/alternatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency })
      });

      if (!response.ok) {
        throw new Error('Failed to get payment alternatives');
      }

      const data = await response.json();
      return data.alternatives || [];
    } catch (error) {
      console.error('Error getting payment alternatives:', error);
      return [];
    }
  }

  // Order-related recovery actions
  static async contactSeller(sellerId: string, message: string): Promise<boolean> {
    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: sellerId,
          message,
          type: 'order_inquiry'
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Error contacting seller:', error);
      return false;
    }
  }

  // Generic retry with user feedback
  static async retryWithFeedback<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3
  ): Promise<T> {
    const toastId = toast.loading(`${operationName}...`);

    try {
      const result = await ErrorHandler.retryOperation(operation, maxRetries);
      toast.success(`${operationName} completed successfully!`, { id: toastId });
      return result;
    } catch (error) {
      toast.error(`${operationName} failed after ${maxRetries} attempts.`, { id: toastId });
      throw error;
    }
  }
}

// Hook for error handling in React components
export const useErrorHandler = () => {
  const handleError = (error: any, context?: string) => {
    return ErrorHandler.displayError(error, context);
  };

  const handleApiError = async (response: Response) => {
    return ErrorHandler.handleApiError(response);
  };

  const retryOperation = <T>(
    operation: () => Promise<T>,
    maxRetries?: number,
    baseDelay?: number
  ) => {
    return ErrorHandler.retryOperation(operation, maxRetries, baseDelay);
  };

  return {
    handleError,
    handleApiError,
    retryOperation,
    displayError: ErrorHandler.displayError,
    getUserFriendlyMessage: ErrorHandler.getUserFriendlyMessage
  };
};

// Error boundary component
export const createErrorBoundary = (FallbackComponent: React.ComponentType<any>) => {
  return class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error?: Error }
  > {
    constructor(props: { children: React.ReactNode }) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: any) {
      ErrorHandler.createErrorBoundaryFallback(error, errorInfo);
    }

    render() {
      if (this.state.hasError) {
        return React.createElement(FallbackComponent, { error: this.state.error });
      }

      return this.props.children;
    }
  };
};