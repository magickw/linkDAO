import { NextPageContext } from 'next';
import React from 'react';

interface ErrorPageProps {
  statusCode?: number;
  err?: Error;
  hasGetInitialPropsRun?: boolean;
}

function Error({ statusCode, err }: ErrorPageProps) {
  // Check if this is an extension-related error and suppress it
  const isExtensionError = err?.message && (
    err.message.toLowerCase().includes('chrome.runtime.sendmessage') ||
    err.message.toLowerCase().includes('opfgelmcmbiajamepnmloijbpoleiama') ||
    err.message.toLowerCase().includes('extension id') ||
    err.message.toLowerCase().includes('runtime.sendmessage(optional string extensionid')
  );

  // For extension errors, don't show error page - just return empty
  if (isExtensionError) {
    console.debug('🔇 Extension error suppressed in _error.tsx:', err?.message?.substring(0, 200));
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-6xl font-bold text-blue-500">
            {statusCode || 'Error'}
          </h1>
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            {statusCode === 404 ? 'Page not found' : 'Something went wrong'}
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            {statusCode === 404
              ? "The page you're looking for doesn't exist."
              : 'An unexpected error occurred. Please try again.'}
          </p>
        </div>
        
        <div className="mt-8 space-y-4">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Try Again
          </button>
          
          <button
            onClick={() => window.history.back()}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Go Back
          </button>
          
          <a
            href="/"
            className="block w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Return Home
          </a>
        </div>
        
        {process.env.NODE_ENV === 'development' && err && !isExtensionError && (
          <details className="mt-8 text-left">
            <summary className="cursor-pointer text-gray-400 hover:text-gray-300">
              Error Details (Development)
            </summary>
            <pre className="mt-4 text-xs text-red-400 bg-gray-800 p-4 rounded overflow-auto">
              {err.stack || err.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 404;
  
  // Suppress extension-related errors at the getInitialProps level too
  if (err?.message) {
    const isExtensionError = (
      err.message.toLowerCase().includes('chrome.runtime.sendmessage') ||
      err.message.toLowerCase().includes('opfgelmcmbiajamepnmloijbpoleiama') ||
      err.message.toLowerCase().includes('extension id') ||
      err.message.toLowerCase().includes('runtime.sendmessage(optional string extensionid')
    );
    
    if (isExtensionError) {
      console.debug('🔇 Extension error suppressed in getInitialProps:', err.message.substring(0, 200));
      // Return minimal props to avoid showing error page
      return { statusCode: 200 };
    }
  }
  
  return { statusCode, err };
};

export default Error;