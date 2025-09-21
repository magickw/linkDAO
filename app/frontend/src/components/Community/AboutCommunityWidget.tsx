import React, { useState, useCallback } from 'react';
import { 
  AboutCommunityWidgetProps, 
  CommunityWidgetState 
} from '../../types/community';
import { formatDistanceToNow } from 'date-fns';

/**
 * AboutCommunityWidget Component
 * 
 * Displays comprehensive community information including description,
 * creation date, member info, and expandable rules section.
 * Provides edit functionality for moderators.
 */
export const AboutCommunityWidget: React.FC<AboutCommunityWidgetProps> = ({
  community,
  stats,
  rules,
  canEdit,
  onEdit
}) => {
  const [state, setState] = useState<CommunityWidgetState>({
    isRulesExpanded: false,
    isEditing: false,
    loading: false,
    error: null
  });

  const toggleRulesExpansion = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRulesExpanded: !prev.isRulesExpanded
    }));
  }, []);

  const handleEditClick = useCallback(() => {
    if (onEdit) {
      onEdit();
    }
  }, [onEdit]);

  const formatMemberCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const formatCreationDate = (date: Date): string => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Widget Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          About Community
        </h3>
        {canEdit && (
          <button
            onClick={handleEditClick}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
            aria-label="Edit community information"
          >
            Edit
          </button>
        )}
      </div>

      {/* Community Description */}
      <div className="px-4 py-3">
        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          {community.description || 'No description available.'}
        </p>
      </div>

      {/* Community Stats */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {formatMemberCount(stats.memberCount)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Members
            </div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-600 dark:text-green-400">
              {stats.onlineCount.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Online
            </div>
          </div>
        </div>
      </div>

      {/* Creation Date and Category */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Created</span>
            <span className="text-gray-700 dark:text-gray-300">
              {formatCreationDate(community.createdAt)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Category</span>
            <span className="text-gray-700 dark:text-gray-300 capitalize">
              {community.category}
            </span>
          </div>
          {community.tags && community.tags.length > 0 && (
            <div className="flex items-start justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Tags</span>
              <div className="flex flex-wrap gap-1 max-w-32">
                {community.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
                {community.tags.length > 3 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    +{community.tags.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Community Rules Section */}
      {rules && rules.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={toggleRulesExpansion}
            className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            aria-expanded={state.isRulesExpanded}
            aria-controls="community-rules"
          >
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Community Rules ({rules.length})
            </span>
            <svg
              className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
                state.isRulesExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          
          {state.isRulesExpanded && (
            <div id="community-rules" className="px-4 pb-4">
              <div className="space-y-3">
                {rules.map((rule, index) => (
                  <div key={rule.id} className="border-l-2 border-blue-200 dark:border-blue-800 pl-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {index + 1}. {rule.title}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {rule.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Additional Community Info */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="text-center">
            <div className="font-semibold text-gray-900 dark:text-white">
              {stats.postsThisWeek}
            </div>
            <div className="text-gray-500 dark:text-gray-400">
              Posts this week
            </div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-900 dark:text-white">
              {stats.activeDiscussions}
            </div>
            <div className="text-gray-500 dark:text-gray-400">
              Active discussions
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {state.error && (
        <div className="px-4 py-3 border-t border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <div className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </div>
        </div>
      )}
    </div>
  );
};

export default AboutCommunityWidget;