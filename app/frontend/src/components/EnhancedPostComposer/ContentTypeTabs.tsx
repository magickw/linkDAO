import React from 'react';
import { ContentType } from '@/types/enhancedPost';

interface ContentTypeTabsProps {
  activeType: ContentType;
  onTypeChange: (type: ContentType) => void;
  className?: string;
  context?: 'feed' | 'community';
  communityId?: string;
  disabled?: boolean;
}

export const ContentTypeTabs: React.FC<ContentTypeTabsProps> = ({
  activeType,
  onTypeChange,
  className = '',
  context,
  communityId,
  disabled = false
}) => {
  const tabs = [
    { type: ContentType.TEXT, label: 'Text', icon: '📝' },
    { type: ContentType.MEDIA, label: 'Media', icon: '📷' },
    { type: ContentType.LINK, label: 'Link', icon: '🔗' },
    { type: ContentType.POLL, label: 'Poll', icon: '📊' },
    { type: ContentType.PROPOSAL, label: 'Proposal', icon: '📋' },
  ];

  return (
    <div className={`flex space-x-2 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.type}
          onClick={() => onTypeChange(tab.type)}
          className={`
            flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium
            ${activeType === tab.type 
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }
          `}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
};