import React, { forwardRef } from 'react';
import { SearchSuggestion } from '../../types/enhancedSearch';

interface SearchSuggestionsProps {
  suggestions: SearchSuggestion[];
  onSelect: (suggestion: SearchSuggestion) => void;
  onClose: () => void;
}

export const SearchSuggestions = forwardRef<HTMLDivElement, SearchSuggestionsProps>(
  ({ suggestions, onSelect, onClose }, ref) => {
    const getSuggestionIcon = (type: string) => {
      switch (type) {
        case 'post':
          return '📝';
        case 'community':
          return '👥';
        case 'user':
          return '👤';
        case 'hashtag':
          return '#';
        case 'topic':
          return '🏷️';
        default:
          return '🔍';
      }
    };

    const getSuggestionPrefix = (type: string) => {
      switch (type) {
        case 'user':
          return '@';
        case 'hashtag':
          return '#';
        case 'community':
          return 'r/';
        default:
          return '';
      }
    };

    const groupedSuggestions = suggestions.reduce((acc, suggestion) => {
      if (!acc[suggestion.type]) {
        acc[suggestion.type] = [];
      }
      acc[suggestion.type].push(suggestion);
      return acc;
    }, {} as Record<string, SearchSuggestion[]>);

    const typeOrder = ['hashtag', 'community', 'user', 'topic', 'post'];
    const typeLabels = {
      hashtag: 'Hashtags',
      community: 'Communities',
      user: 'Users',
      topic: 'Topics',
      post: 'Posts'
    };

    return (
      <div
        ref={ref}
        className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-96 overflow-y-auto"
      >
        <div className="p-2">
          {typeOrder.map((type) => {
            const typeSuggestions = groupedSuggestions[type];
            if (!typeSuggestions || typeSuggestions.length === 0) return null;

            return (
              <div key={type} className="mb-3 last:mb-0">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">
                  {typeLabels[type as keyof typeof typeLabels]}
                </div>
                <div className="space-y-1">
                  {typeSuggestions.map((suggestion, index) => (
                    <button
                      key={`${type}-${index}`}
                      onClick={() => onSelect(suggestion)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center space-x-3 transition-colors group"
                    >
                      {/* Icon/Avatar */}
                      <div className="flex-shrink-0">
                        {suggestion.avatar ? (
                          <img
                            src={suggestion.avatar}
                            alt=""
                            className="w-6 h-6 rounded-full"
                          />
                        ) : (
                          <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs">
                            {getSuggestionIcon(suggestion.type)}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-900 dark:text-white font-medium truncate">
                            {getSuggestionPrefix(suggestion.type)}{suggestion.text}
                          </span>
                          
                          {/* Badges */}
                          <div className="flex items-center space-x-1">
                            {suggestion.verified && (
                              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                            
                            {suggestion.trending && (
                              <div className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 text-xs rounded-full font-medium">
                                🔥
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Description */}
                        {suggestion.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {suggestion.description}
                          </div>
                        )}
                      </div>

                      {/* Count */}
                      {suggestion.count !== undefined && (
                        <div className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
                          {suggestion.count.toLocaleString()}
                        </div>
                      )}

                      {/* Arrow */}
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">↵</kbd> to search or <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Esc</kbd> to close
          </div>
        </div>
      </div>
    );
  }
);