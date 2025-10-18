/**
 * Marketplace Error Fallback Components
 * Provides user-friendly error messages with recovery options
 */

import React from 'react';
import { useRouter } from 'next/router';

interface BaseErrorFallbackProps {
  title: string;
  message: string;
  icon: React.ReactNode;
  actions: Array<{
    label: string;
    onClick: () => void;
    variant: 'primary' | 'secondary';
    icon?: React.ReactNode;
  }>;
  suggestedActions?: string[];
  showTechnicalDetails?: boolean;
  error?: Error;
}

const BaseErrorFallback: React.FC<BaseErrorFallbackProps> = ({
  title,
  message,
  icon,
  actions,
  suggestedActions,
  showTechnicalDetails = false,
  error
}) => {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        {icon}
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {title}
        </h2>
        
        <p className="text-gray-600 mb-6">
          {message}
        </p>

        {suggestedActions && suggestedActions.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg text-left">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              What you can try:
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              {suggestedActions.map((action, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`w-full px-4 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 ${
                action.variant === 'primary'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        {showTechnicalDetails && error && process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Technical Details
            </summary>
            <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono text-gray-700 overflow-auto max-h-32">
              <div className="mb-2">
                <strong>Error:</strong> {error.message}
              </div>
              {error.stack && (
                <div>
                  <strong>Stack:</strong>
                  <pre className="whitespace-pre-wrap">{error.stack}</pre>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

// Product Not Found Error
export const ProductNotFoundFallback: React.FC<{ productId?: string; onRetry?: () => void }> = ({
  productId,
  onRetry
}) => {
  const router = useRouter();

  const actions = [
    ...(onRetry ? [{
      label: 'Try Again',
      onClick: onRetry,
      variant: 'primary' as const,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    }] : []),
    {
      label: 'Browse Marketplace',
      onClick: () => router.push('/marketplace'),
      variant: 'secondary' as const,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        </svg>
      )
    },
    {
      label: 'Go Back',
      onClick: () => router.back(),
      variant: 'secondary' as const,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      )
    }
  ];

  return (
    <BaseErrorFallback
      title="Product Not Found"
      message={`The product${productId ? ` (ID: ${productId})` : ''} you're looking for could not be found. It may have been removed, sold, or the link might be incorrect.`}
      icon={
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      }
      actions={actions}
      suggestedActions={[
        'Check if the product URL is correct',
        'Search for similar products',
        'Browse categories to find what you need',
        'Contact support if you believe this is an error'
      ]}
    />
  );
};

// Seller Store Not Found Error
export const SellerNotFoundFallback: React.FC<{ sellerId?: string; onRetry?: () => void }> = ({
  sellerId,
  onRetry
}) => {
  const router = useRouter();

  const actions = [
    ...(onRetry ? [{
      label: 'Try Again',
      onClick: onRetry,
      variant: 'primary' as const,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    }] : []),
    {
      label: 'Browse All Sellers',
      onClick: () => router.push('/marketplace?tab=sellers'),
      variant: 'secondary' as const,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      label: 'Return to Marketplace',
      onClick: () => router.push('/marketplace'),
      variant: 'secondary' as const,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        </svg>
      )
    }
  ];

  return (
    <BaseErrorFallback
      title="Seller Store Not Found"
      message={`The seller store${sellerId ? ` (ID: ${sellerId})` : ''} you're looking for could not be found. The seller may have deactivated their store or the link might be incorrect.`}
      icon={
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-1.72L10.213 6.344a1.122 1.122 0 011.574 0L14.25 8.344c.307.307.307.805 0 1.112L12.793 11.344a.75.75 0 01-1.06 0L10.213 9.824a.75.75 0 010-1.06L11.793 7.344a.75.75 0 011.06 0L14.25 8.344c.307.307.307.805 0 1.112L12.793 11.344a.75.75 0 01-1.06 0L10.213 9.824a.75.75 0 010-1.06z" />
        </svg>
      }
      actions={actions}
      suggestedActions={[
        'Check if the seller URL is correct',
        'Browse other verified sellers',
        'Search for products from different sellers',
        'Contact support if you had a previous transaction with this seller'
      ]}
    />
  );
};

// Network Error Fallback
export const NetworkErrorFallback: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  const router = useRouter();

  const actions = [
    ...(onRetry ? [{
      label: 'Try Again',
      onClick: onRetry,
      variant: 'primary' as const,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    }] : []),
    {
      label: 'Refresh Page',
      onClick: () => window.location.reload(),
      variant: 'secondary' as const,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    },
    {
      label: 'Go Back',
      onClick: () => router.back(),
      variant: 'secondary' as const,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      )
    }
  ];

  return (
    <BaseErrorFallback
      title="Connection Problem"
      message="Unable to connect to the marketplace. Please check your internet connection and try again."
      icon={
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
        </svg>
      }
      actions={actions}
      suggestedActions={[
        'Check your internet connection',
        'Disable VPN or proxy if enabled',
        'Try switching to a different network',
        'Contact your internet service provider if the problem persists'
      ]}
    />
  );
};

// Server Error Fallback
export const ServerErrorFallback: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  const router = useRouter();

  const actions = [
    ...(onRetry ? [{
      label: 'Try Again',
      onClick: onRetry,
      variant: 'primary' as const,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    }] : []),
    {
      label: 'Return to Marketplace',
      onClick: () => router.push('/marketplace'),
      variant: 'secondary' as const,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        </svg>
      )
    }
  ];

  return (
    <BaseErrorFallback
      title="Service Temporarily Unavailable"
      message="The marketplace service is currently experiencing issues. Our team has been notified and is working to resolve this quickly."
      icon={
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3V6a3 3 0 013-3h13.5a3 3 0 013 3v5.25a3 3 0 01-3 3m-13.5 0h13.5m-13.5 0v5.25A2.25 2.25 0 007.5 21.75h9A2.25 2.25 0 0018.75 19.5V14.25m-13.5 0V9a2.25 2.25 0 012.25-2.25h9A2.25 2.25 0 0118.75 9v5.25" />
        </svg>
      }
      actions={actions}
      suggestedActions={[
        'Wait a few minutes and try again',
        'Check our status page for updates',
        'Follow us on social media for real-time updates',
        'Contact support if the issue persists'
      ]}
    />
  );
};

// Generic Marketplace Error Fallback
export const GenericMarketplaceErrorFallback: React.FC<{
  error?: Error;
  onRetry?: () => void;
}> = ({ error, onRetry }) => {
  const router = useRouter();

  const actions = [
    ...(onRetry ? [{
      label: 'Try Again',
      onClick: onRetry,
      variant: 'primary' as const,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    }] : []),
    {
      label: 'Go Back',
      onClick: () => router.back(),
      variant: 'secondary' as const,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      )
    },
    {
      label: 'Return to Marketplace',
      onClick: () => router.push('/marketplace'),
      variant: 'secondary' as const,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        </svg>
      )
    }
  ];

  return (
    <BaseErrorFallback
      title="Something went wrong"
      message="An unexpected error occurred while loading the marketplace content. Please try again or return to the main marketplace."
      icon={
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      }
      actions={actions}
      suggestedActions={[
        'Try refreshing the page',
        'Check your internet connection',
        'Clear your browser cache',
        'Contact support if the problem continues'
      ]}
      showTechnicalDetails={true}
      error={error}
    />
  );
};