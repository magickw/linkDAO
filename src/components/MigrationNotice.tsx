import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

interface MigrationNoticeProps {
  type: 'dashboard' | 'social';
  onDismiss?: () => void;
  autoRedirect?: boolean;
  redirectDelay?: number;
}

export default function MigrationNotice({ 
  type, 
  onDismiss, 
  autoRedirect = false, 
  redirectDelay = 5 
}: MigrationNoticeProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(redirectDelay);
  const [dismissed, setDismissed] = useState(false);

  // Check if user has already dismissed this notice
  useEffect(() => {
    const dismissedKey = `migration-notice-${type}-dismissed`;
    const isDismissed = localStorage.getItem(dismissedKey) === 'true';
    setDismissed(isDismissed);
  }, [type]);

  // Handle countdown and auto-redirect
  useEffect(() => {
    if (autoRedirect && !dismissed && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (autoRedirect && !dismissed && countdown === 0) {
      handleRedirect();
    }
  }, [autoRedirect, dismissed, countdown]);

  const handleDismiss = () => {
    const dismissedKey = `migration-notice-${type}-dismissed`;
    localStorage.setItem(dismissedKey, 'true');
    setDismissed(true);
    onDismiss?.();
  };

  const handleRedirect = () => {
    if (type === 'social') {
      router.push('/dashboard');
    } else if (type === 'dashboard') {
      router.push('/dashboard');
    }
  };

  if (dismissed) {
    return null;
  }

  const getNoticeContent = () => {
    switch (type) {
      case 'social':
        return {
          title: 'Social Feed Has Moved!',
          message: 'The social feed is now integrated into your personalized dashboard for a better experience.',
          actionText: 'Go to Dashboard',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          )
        };
      case 'dashboard':
        return {
          title: 'Dashboard Updated!',
          message: 'Your dashboard now includes an integrated social feed and community features.',
          actionText: 'Explore New Features',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          )
        };
      default:
        return {
          title: 'Page Updated!',
          message: 'This page has been updated with new features.',
          actionText: 'Continue',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        };
    }
  };

  const content = getNoticeContent();

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
      <div className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-lg shadow-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full text-blue-600 dark:text-blue-400">
              {content.icon}
            </div>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              {content.title}
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {content.message}
            </p>
            {autoRedirect && countdown > 0 && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Redirecting in {countdown} seconds...
              </p>
            )}
            <div className="mt-3 flex space-x-2">
              <button
                onClick={handleRedirect}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {content.actionText}
              </button>
              <button
                onClick={handleDismiss}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Dismiss
              </button>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleDismiss}
              className="bg-white dark:bg-gray-800 rounded-md inline-flex text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}