import React from 'react';
import { NextPageContext } from 'next';
import Link from 'next/link';
import { isExtensionError } from '@/utils/extensionErrorHandler';

interface ErrorProps {
  statusCode?: number;
  hasGetInitialPropsRun?: boolean;
  err?: Error & { statusCode?: number };
}

function Error({ statusCode, hasGetInitialPropsRun, err }: ErrorProps) {
  // Check if this is an extension-related error using the utility
  const isExtensionErrorDetected = React.useMemo(() => {
    return err ? (isExtensionError(err) || err.message?.includes('chrome.runtime.sendMessage')) : false;
  }, [err]);

  // If it's an extension error, redirect to home instead of showing error page
  React.useEffect(() => {
    if (isExtensionErrorDetected) {
      console.debug('Extension error detected in _error.tsx, redirecting to home');
      window.location.href = '/';
    }
  }, [isExtensionErrorDetected]);

  // Don't render anything for extension errors while redirecting
  if (isExtensionErrorDetected) {
    return null;
  }

  const getErrorMessage = () => {
    if (statusCode === 404) {
      return {
        title: 'Page Not Found',
        description: 'The page you are looking for does not exist.',
        action: 'Go Home'
      };
    }
    
    if (statusCode === 500) {
      return {
        title: 'Server Error',
        description: 'An internal server error occurred. Please try again later.',
        action: 'Try Again'
      };
    }
    
    if (statusCode) {
      return {
        title: `Error ${statusCode}`,
        description: 'An unexpected error occurred.',
        action: 'Go Home'
      };
    }
    
    return {
      title: 'Client Error',
      description: 'An unexpected error occurred on the client side.',
      action: 'Reload Page'
    };
  };

  const errorInfo = getErrorMessage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 dark:bg-red-900 rounded-full mb-6">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {errorInfo.title}
        </h1>
        
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {errorInfo.description}
        </p>
        
        {process.env.NODE_ENV === 'development' && err && (
          <details className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded text-left text-sm">
            <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300 mb-2">
              Error Details (Development)
            </summary>
            <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto whitespace-pre-wrap">
              {err.message}
              {err.stack && `\n\n${err.stack}`}
            </pre>
          </details>
        )}
        
        <div className="space-y-3">
          {statusCode === 404 ? (
            <Link
              href="/"
              className="block w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              {errorInfo.action}
            </Link>
          ) : (
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              {errorInfo.action}
            </button>
          )}
          
          <Link
            href="/"
            className="block w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext): ErrorProps => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  
  // Check if this is an extension-related error using the utility
  if (err && (isExtensionError(err) || err.message?.includes('chrome.runtime.sendMessage'))) {
    console.debug('Extension error detected in getInitialProps:', err);
    // Return minimal props for extension errors
    return { statusCode: 200, hasGetInitialPropsRun: true };
  }
  
  return { statusCode, hasGetInitialPropsRun: true, err: err || undefined };
};

export default Error;