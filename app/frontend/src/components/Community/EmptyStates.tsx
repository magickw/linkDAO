import React from 'react';
import { Users, Search, Filter, Plus, Sparkles, TrendingUp } from 'lucide-react';

type EmptyStateType = 'no-communities' | 'no-posts' | 'no-search-results' | 'no-filter-results' | 'not-joined';

interface EmptyStatesProps {
  type: EmptyStateType;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
  searchQuery?: string;
  activeFilters?: string[];
}

const EmptyStates: React.FC<EmptyStatesProps> = ({
  type,
  onAction,
  actionLabel,
  className = '',
  searchQuery = '',
  activeFilters = []
}) => {
  const getEmptyStateContent = () => {
    switch (type) {
      case 'no-communities':
        return {
          icon: Users,
          iconColor: 'text-purple-400',
          bgColor: 'bg-purple-100 dark:bg-purple-900/20',
          title: 'No communities yet',
          description: 'Start building the decentralized future by creating the first community.',
          illustration: '🏛️',
          action: actionLabel || 'Create Community'
        };
      
      case 'no-posts':
        return {
          icon: Sparkles,
          iconColor: 'text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/20',
          title: 'No posts yet',
          description: 'Be the first to share something with your communities.',
          illustration: '✨',
          action: actionLabel || 'Create Post'
        };
      
      case 'no-search-results':
        return {
          icon: Search,
          iconColor: 'text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-800',
          title: `No results for "${searchQuery}"`,
          description: 'Try adjusting your search terms or browse all communities.',
          illustration: '🔍',
          action: actionLabel || 'Browse Communities'
        };
      
      case 'no-filter-results':
        return {
          icon: Filter,
          iconColor: 'text-orange-400',
          bgColor: 'bg-orange-100 dark:bg-orange-900/20',
          title: 'No communities match your filters',
          description: activeFilters.length > 0 
            ? `Try removing some filters: ${activeFilters.join(', ')}`
            : 'Try adjusting your filter criteria.',
          illustration: '🎯',
          action: actionLabel || 'Clear Filters'
        };
      
      case 'not-joined':
        return {
          icon: TrendingUp,
          iconColor: 'text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/20',
          title: 'Join communities to see posts',
          description: 'Discover and join communities that match your interests.',
          illustration: '🚀',
          action: actionLabel || 'Explore Communities'
        };
      
      default:
        return {
          icon: Users,
          iconColor: 'text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-800',
          title: 'Nothing here yet',
          description: 'Start exploring and join communities.',
          illustration: '🌟',
          action: actionLabel || 'Get Started'
        };
    }
  };

  const content = getEmptyStateContent();
  const Icon = content.icon;

  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      {/* Illustration */}
      <div className={`w-24 h-24 mx-auto mb-6 ${content.bgColor} rounded-full flex items-center justify-center`}>
        <span className="text-5xl" role="img" aria-label="illustration">
          {content.illustration}
        </span>
      </div>

      {/* Icon (optional, for additional visual) */}
      <div className="mb-4">
        <Icon className={`w-12 h-12 mx-auto ${content.iconColor}`} />
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
        {content.title}
      </h3>

      {/* Description */}
      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
        {content.description}
      </p>

      {/* Action Button */}
      {onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
        >
          <Plus className="w-5 h-5 mr-2" />
          {content.action}
        </button>
      )}

      {/* Additional suggestions for filter/search scenarios */}
      {(type === 'no-search-results' || type === 'no-filter-results') && (
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Suggestions:
          </p>
          <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
            <span className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-400">
              Check your spelling
            </span>
            <span className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-400">
              Use broader terms
            </span>
            <span className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-400">
              Try fewer filters
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmptyStates;
