import React from 'react';
import { ContentType, ContentTypeTab } from '../../types/enhancedPost';

interface ContentTypeTabsProps {
  activeType: ContentType;
  onTypeChange: (type: ContentType) => void;
  context: 'feed' | 'community';
  communityId?: string;
  disabled?: boolean;
  className?: string;
}

export default function ContentTypeTabs({
  activeType,
  onTypeChange,
  context,
  communityId,
  disabled = false,
  className = ''
}: ContentTypeTabsProps) {
  
  // Define available content types based on context
  const getAvailableContentTypes = (): ContentTypeTab[] => {
    const baseTypes: ContentTypeTab[] = [
      {
        type: ContentType.TEXT,
        label: 'Text',
        icon: '📝',
        description: 'Share your thoughts and ideas',
        enabled: true
      },
      {
        type: ContentType.MEDIA,
        label: 'Media',
        icon: '📸',
        description: 'Share photos, videos, and files',
        enabled: true
      },
      {
        type: ContentType.LINK,
        label: 'Link',
        icon: '🔗',
        description: 'Share interesting links with previews',
        enabled: true
      },
      {
        type: ContentType.POLL,
        label: 'Poll',
        icon: '📊',
        description: 'Create token-weighted polls',
        enabled: true,
        requiresAuth: true
      }
    ];

    // Add context-specific types
    if (context === 'feed') {
      baseTypes.push({
        type: ContentType.PROPOSAL,
        label: 'Proposal',
        icon: '🏛️',
        description: 'Create governance proposals',
        enabled: true,
        requiresAuth: true
      });
    }

    return baseTypes;
  };

  const contentTypes = getAvailableContentTypes();

  const handleTabClick = (type: ContentType) => {
    if (disabled) return;
    
    const tabConfig = contentTypes.find(t => t.type === type);
    if (!tabConfig?.enabled) return;
    
    onTypeChange(type);
  };

  const getTabClassName = (type: ContentType) => {
    const tabConfig = contentTypes.find(t => t.type === type);
    const isActive = activeType === type;
    const isEnabled = tabConfig?.enabled && !disabled;
    
    let baseClasses = 'flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer min-w-[80px] relative group';
    
    if (isActive) {
      baseClasses += ' border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 shadow-sm';
    } else if (isEnabled) {
      baseClasses += ' border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300';
    } else {
      baseClasses += ' border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50';
    }
    
    return baseClasses;
  };

  return (
    <div className={`flex flex-wrap gap-2 p-1 ${className}`}>
      {contentTypes.map((tab) => (
        <div key={tab.type} className="relative">
          <button
            type="button"
            onClick={() => handleTabClick(tab.type)}
            className={getTabClassName(tab.type)}
            disabled={disabled || !tab.enabled}
            title={tab.description}
            aria-label={`Switch to ${tab.label} content type`}
          >
            {/* Icon */}
            <span className="text-xl mb-1 group-hover:scale-110 transition-transform duration-200">
              {tab.icon}
            </span>
            
            {/* Label */}
            <span className="text-xs font-medium">
              {tab.label}
            </span>
            
            {/* Active indicator */}
            {activeType === tab.type && (
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
            )}
            
            {/* Auth required indicator */}
            {tab.requiresAuth && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full flex items-center justify-center">
                <span className="text-[8px] text-white">🔒</span>
              </div>
            )}
          </button>
          
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
            {tab.description}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
          </div>
        </div>
      ))}
      
      {/* Content type description */}
      <div className="w-full mt-2 px-2">
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          {contentTypes.find(t => t.type === activeType)?.description}
        </p>
      </div>
    </div>
  );
}