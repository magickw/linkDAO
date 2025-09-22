/**
 * PostTypeIndicators Component
 * 
 * Displays color-coded labels for different post types with priority indicators
 * and animated transitions. Includes accessibility support for screen readers.
 * 
 * Requirements: 2.1, 7.1, 7.7
 */

import React, { memo, useMemo } from 'react';
import { PostType, PostTypeIndicatorProps } from '../../../types/communityEnhancements';

// Post type configuration with colors and icons
const POST_TYPE_CONFIG = {
  proposal: {
    label: 'Proposal',
    color: '#3B82F6', // Blue
    backgroundColor: '#EFF6FF',
    darkBackgroundColor: '#1E3A8A',
    icon: '🗳️',
    ariaLabel: 'Governance proposal post'
  },
  analysis: {
    label: 'Analysis',
    color: '#10B981', // Green
    backgroundColor: '#ECFDF5',
    darkBackgroundColor: '#064E3B',
    icon: '📊',
    ariaLabel: 'Analysis or research post'
  },
  showcase: {
    label: 'Showcase',
    color: '#F59E0B', // Amber
    backgroundColor: '#FFFBEB',
    darkBackgroundColor: '#92400E',
    icon: '✨',
    ariaLabel: 'Showcase or demonstration post'
  },
  discussion: {
    label: 'Discussion',
    color: '#8B5CF6', // Purple
    backgroundColor: '#F5F3FF',
    darkBackgroundColor: '#5B21B6',
    icon: '💬',
    ariaLabel: 'Discussion post'
  },
  announcement: {
    label: 'Announcement',
    color: '#EF4444', // Red
    backgroundColor: '#FEF2F2',
    darkBackgroundColor: '#991B1B',
    icon: '📢',
    ariaLabel: 'Official announcement post'
  }
} as const;

// Priority indicator configuration
const PRIORITY_CONFIG = {
  high: {
    indicator: '📌',
    className: 'animate-pulse',
    ariaLabel: 'High priority post'
  },
  medium: {
    indicator: '⭐',
    className: '',
    ariaLabel: 'Medium priority post'
  },
  low: {
    indicator: '',
    className: 'opacity-75',
    ariaLabel: 'Standard priority post'
  }
} as const;

const PostTypeIndicators: React.FC<PostTypeIndicatorProps> = memo(({
  postType,
  priority = 'low',
  animated = true
}) => {
  const typeConfig = useMemo(() => POST_TYPE_CONFIG[postType], [postType]);
  const priorityConfig = useMemo(() => PRIORITY_CONFIG[priority], [priority]);

  const indicatorClasses = useMemo(() => {
    const baseClasses = [
      'ce-post-type-indicator',
      `ce-post-type-${postType}`,
      'inline-flex',
      'items-center',
      'gap-1.5',
      'px-2.5',
      'py-1',
      'rounded-full',
      'text-xs',
      'font-medium',
      'border',
      'select-none',
      'relative'
    ];

    if (animated) {
      baseClasses.push('transition-all', 'duration-200', 'ease-in-out');
    }

    if (priority === 'high') {
      baseClasses.push('ce-priority-high');
    } else if (priority === 'medium') {
      baseClasses.push('ce-priority-medium');
    }

    if (priorityConfig.className) {
      baseClasses.push(priorityConfig.className);
    }

    return baseClasses.join(' ');
  }, [postType, animated, priority, priorityConfig.className]);

  const indicatorStyle = useMemo(() => ({
    color: typeConfig.color,
    backgroundColor: typeConfig.backgroundColor,
    borderColor: typeConfig.color + '40', // 25% opacity
    '--dark-bg': typeConfig.darkBackgroundColor
  }), [typeConfig]);

  return (
    <div className="flex items-center gap-2">
      {/* Main post type indicator */}
      <span
        className={indicatorClasses}
        style={indicatorStyle}
        role="badge"
        aria-label={`${typeConfig.ariaLabel}${priority !== 'low' ? `, ${priorityConfig.ariaLabel}` : ''}`}
      >
        {/* Post type icon */}
        <span 
          className="text-sm leading-none"
          aria-hidden="true"
        >
          {typeConfig.icon}
        </span>
        
        {/* Post type label */}
        <span className="font-semibold">
          {typeConfig.label}
        </span>
        
        {/* Priority indicator */}
        {priority !== 'low' && priorityConfig.indicator && (
          <span 
            className="text-sm leading-none ml-1"
            aria-hidden="true"
            title={priorityConfig.ariaLabel}
          >
            {priorityConfig.indicator}
          </span>
        )}
      </span>

      {/* Screen reader only priority information */}
      {priority !== 'low' && (
        <span className="sr-only">
          {priorityConfig.ariaLabel}
        </span>
      )}
    </div>
  );
});

PostTypeIndicators.displayName = 'PostTypeIndicators';

export default PostTypeIndicators;