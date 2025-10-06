/**
 * SearchSuggestions Component
 * Provides search suggestions and autocomplete functionality
 * Implements requirements 4.1, 4.4 from the interconnected social platform spec
 */

import React from 'react';

interface SearchSuggestionsProps {
  suggestions: string[];
  onSuggestionSelect: (suggestion: string) => void;
  query: string;
  maxSuggestions?: number;
}

export const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  suggestions,
  onSuggestionSelect,
  query,
  maxSuggestions = 5
}) => {
  // Highlight matching text in suggestions
  const highlightMatch = (suggestion: string, query: string) => {
    if (!query.trim()) return suggestion;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = suggestion.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 text-gray-900 dark:text-white">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Get suggestion type icon
  const getSuggestionIcon = (suggestion: string) => {
    if (suggestion.startsWith('#')) {
      return (
        <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
        </svg>
      );
    } else if (suggestion.startsWith('@')) {
      return (
        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    } else if (suggestion.includes('community:') || suggestion.includes('in:')) {
      return (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    }
  };

  // Get suggestion type label
  const getSuggestionType = (suggestion: string) => {
    if (suggestion.startsWith('#')) {
      return 'Hashtag';
    } else if (suggestion.startsWith('@')) {
      return 'User';
    } else if (suggestion.includes('community:') || suggestion.includes('in:')) {
      return 'Community';
    } else {
      return 'Search';
    }
  };

  const displaySuggestions = suggestions.slice(0, maxSuggestions);

  if (displaySuggestions.length === 0) {
    return null;
  }

  return (
    <div className="search-suggestions">
      <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700">
        Suggestions
      </div>
      
      <div className="py-1">
        {displaySuggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionSelect(suggestion)}
            className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {/* Icon */}
            <div className="flex-shrink-0">
              {getSuggestionIcon(suggestion)}
            </div>

            {/* Suggestion Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-900 dark:text-white truncate">
                  {highlightMatch(suggestion, query)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                  {getSuggestionType(suggestion)}
                </span>
              </div>
            </div>

            {/* Arrow Icon */}
            <div className="flex-shrink-0">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      {suggestions.length > maxSuggestions && (
        <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
          +{suggestions.length - maxSuggestions} more suggestions
        </div>
      )}
    </div>
  );
};

export default SearchSuggestions;