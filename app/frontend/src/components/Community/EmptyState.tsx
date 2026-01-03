import React from 'react';

interface EmptyStateProps {
    icon?: React.ReactNode;
    emoji?: string;
    title: string;
    description: string;
    action?: React.ReactNode;
    className?: string;
}

/**
 * EmptyState Component
 * 
 * Displays a friendly empty state with icon/emoji, title, description, and optional action.
 * Used when there's no content to display (no posts, no quests, no results, etc.)
 * 
 * @example
 * ```tsx
 * <EmptyState
 *   emoji="📝"
 *   title="No posts yet"
 *   description="Be the first to share something with the community!"
 *   action={
 *     <Button onClick={handleCreatePost}>Create Post</Button>
 *   }
 * />
 * ```
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    emoji,
    title,
    description,
    action,
    className = ''
}) => {
    return (
        <div className={`
      flex flex-col items-center justify-center 
      py-12 px-4 text-center
      ${className}
    `}>
            {/* Icon or Emoji */}
            {emoji ? (
                <div className="text-6xl mb-4 animate-bounce-slow">
                    {emoji}
                </div>
            ) : icon ? (
                <div className="mb-4 text-gray-400 dark:text-gray-600">
                    {icon}
                </div>
            ) : (
                <div className="mb-4">
                    <svg
                        className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                    </svg>
                </div>
            )}

            {/* Title */}
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {title}
            </h3>

            {/* Description */}
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                {description}
            </p>

            {/* Action Button */}
            {action && (
                <div className="mt-2">
                    {action}
                </div>
            )}
        </div>
    );
};

// Predefined empty states for common scenarios
export const NoPostsEmptyState: React.FC<{ onCreatePost?: () => void }> = ({ onCreatePost }) => (
    <EmptyState
        emoji="📝"
        title="No posts yet"
        description="Be the first to share something with the community!"
        action={onCreatePost && (
            <button
                onClick={onCreatePost}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
                Create First Post
            </button>
        )}
    />
);

export const NoQuestsEmptyState: React.FC = () => (
    <EmptyState
        emoji="🎁"
        title="No active quests right now"
        description="Check back tomorrow for new opportunities to earn LDAO tokens!"
    />
);

export const NoSearchResultsEmptyState: React.FC<{ searchQuery?: string; onClearSearch?: () => void }> = ({ searchQuery, onClearSearch }) => (
    <EmptyState
        emoji="🔍"
        title="No results found"
        description={searchQuery
            ? `We couldn't find anything matching "${searchQuery}". Try different keywords or check your spelling.`
            : "No results found. Try adjusting your filters."}
        action={onClearSearch && (
            <button
                onClick={onClearSearch}
                className="mt-4 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
                Clear Search & Filters
            </button>
        )}
    />
);

export const NoCommentsEmptyState: React.FC = () => (
    <EmptyState
        emoji="💬"
        title="No comments yet"
        description="Be the first to share your thoughts on this post!"
    />
);

export const ErrorEmptyState: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
    <EmptyState
        emoji="⚠️"
        title="Something went wrong"
        description="We encountered an error loading this content. Please try again."
        action={onRetry && (
            <button
                onClick={onRetry}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
                Try Again
            </button>
        )}
    />
);

export default EmptyState;
