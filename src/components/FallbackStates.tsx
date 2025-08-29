import React from 'react';
import { LoadingSpinner } from './LoadingSkeletons';

// Empty state component
interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ title, description, icon, action, className = '' }: EmptyStateProps) {
  const defaultIcon = (
    <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center ${className}`}>
      {icon || defaultIcon}
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
        {description}
      </p>
      {action && (
        <button 
          onClick={action.onClick}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200 font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// No posts empty state
export function NoPostsState({ 
  isConnected, 
  activeFilter, 
  onCreatePost,
  className = '' 
}: { 
  isConnected: boolean; 
  activeFilter: string;
  onCreatePost?: () => void;
  className?: string;
}) {
  const getContent = () => {
    if (!isConnected) {
      return {
        title: 'Connect Your Wallet',
        description: 'Connect your wallet to see posts from the community and start participating in discussions.',
        icon: (
          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )
      };
    }

    switch (activeFilter) {
      case 'following':
        return {
          title: 'No posts from people you follow',
          description: 'Follow some users to see their posts here, or check out trending content to discover new people.',
          icon: (
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          )
        };
      case 'trending':
        return {
          title: 'No trending posts right now',
          description: 'Check back later for trending content, or switch to "All Posts" to see the latest from the community.',
          icon: (
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          )
        };
      default:
        return {
          title: 'No posts yet',
          description: 'Be the first to post something! Share your thoughts, ideas, or interesting content with the community.',
          icon: (
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          ),
          action: isConnected && activeFilter === 'all' && onCreatePost ? {
            label: 'Create Your First Post',
            onClick: onCreatePost
          } : undefined
        };
    }
  };

  const content = getContent();

  return (
    <EmptyState
      title={content.title}
      description={content.description}
      icon={content.icon}
      action={content.action}
      className={className}
    />
  );
}

// No communities empty state
export function NoCommunitiesState({ 
  onExplore,
  className = '' 
}: { 
  onExplore?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      title="No communities yet"
      description="Discover and join communities to participate in focused discussions about topics you're interested in."
      icon={
        <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      }
      action={onExplore ? {
        label: 'Explore Communities',
        onClick: onExplore
      } : undefined}
      className={className}
    />
  );
}

// Connection required state
export function ConnectionRequiredState({ 
  onConnect,
  className = '' 
}: { 
  onConnect?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      title="Wallet Connection Required"
      description="Connect your wallet to access your personalized feed, join communities, and interact with posts."
      icon={
        <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      }
      action={onConnect ? {
        label: 'Connect Wallet',
        onClick: onConnect
      } : undefined}
      className={className}
    />
  );
}

// Loading state with message
interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingState({ 
  message = 'Loading...', 
  size = 'md',
  className = '' 
}: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <LoadingSpinner size={size} className="mb-4" />
      <p className="text-gray-600 dark:text-gray-300 text-center">
        {message}
      </p>
    </div>
  );
}

// Retry state for failed operations
interface RetryStateProps {
  title: string;
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
  className?: string;
}

export function RetryState({ 
  title, 
  message, 
  onRetry, 
  isRetrying = false,
  className = '' 
}: RetryStateProps) {
  return (
    <div className={`bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-8 text-center ${className}`}>
      <svg className="mx-auto h-12 w-12 text-yellow-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">
        {title}
      </h3>
      <p className="text-yellow-600 dark:text-yellow-300 mb-6">
        {message}
      </p>
      <button 
        onClick={onRetry}
        disabled={isRetrying}
        className="inline-flex items-center px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
      >
        {isRetrying ? (
          <>
            <LoadingSpinner size="sm" className="mr-2" />
            Retrying...
          </>
        ) : (
          'Try Again'
        )}
      </button>
    </div>
  );
}

// Maintenance state
export function MaintenanceState({ className = '' }: { className?: string }) {
  return (
    <EmptyState
      title="Under Maintenance"
      description="We're currently performing maintenance to improve your experience. Please check back in a few minutes."
      icon={
        <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      }
      className={className}
    />
  );
}

// Permission denied state
export function PermissionDeniedState({ 
  resource = 'this content',
  onGoBack,
  className = '' 
}: { 
  resource?: string;
  onGoBack?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      title="Access Denied"
      description={`You don't have permission to access ${resource}. You may need to join the community or have the required role.`}
      icon={
        <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
        </svg>
      }
      action={onGoBack ? {
        label: 'Go Back',
        onClick: onGoBack
      } : undefined}
      className={className}
    />
  );
}

// Rate limit state
export function RateLimitState({ 
  resetTime,
  onGoBack,
  className = '' 
}: { 
  resetTime?: Date;
  onGoBack?: () => void;
  className?: string;
}) {
  const timeUntilReset = resetTime ? Math.ceil((resetTime.getTime() - Date.now()) / 1000 / 60) : null;
  
  return (
    <EmptyState
      title="Rate Limit Exceeded"
      description={`You've made too many requests. ${timeUntilReset ? `Please wait ${timeUntilReset} minutes before trying again.` : 'Please wait a moment before trying again.'}`}
      icon={
        <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
      action={onGoBack ? {
        label: 'Go Back',
        onClick: onGoBack
      } : undefined}
      className={className}
    />
  );
}