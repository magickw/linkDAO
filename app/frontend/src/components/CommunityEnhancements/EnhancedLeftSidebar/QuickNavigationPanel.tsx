import React, { useState, useCallback, useEffect } from 'react';
import { 
  Clock, 
  Star, 
  MessageCircle, 
  TrendingUp, 
  Users, 
  Plus, 
  Bell,
  ChevronRight,
  Bookmark,
  Activity
} from 'lucide-react';
import { EnhancedCommunityData } from '../../../types/communityEnhancements';

interface QuickNavigationPanelProps {
  communities: EnhancedCommunityData[];
  onCommunitySelect: (communityId: string) => void;
  onQuickAction: (action: string, communityId?: string) => void;
}

interface QuickActionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: string;
  badge?: number;
  shortcut?: string;
}

interface FrequentCommunity extends EnhancedCommunityData {
  visitCount: number;
  lastVisited: Date;
  unreadCount: number;
}

/**
 * QuickNavigationPanel Component
 * 
 * Provides quick access to frequently visited communities,
 * recent activity indicators, and common action shortcuts.
 * 
 * Requirements: 1.7, 7.1, 9.1
 */
export const QuickNavigationPanel: React.FC<QuickNavigationPanelProps> = ({
  communities,
  onCommunitySelect,
  onQuickAction
}) => {
  const [frequentCommunities, setFrequentCommunities] = useState<FrequentCommunity[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isExpanded, setIsExpanded] = useState(true);

  // Load frequent communities from localStorage and merge with current data
  useEffect(() => {
    const savedData = localStorage.getItem('frequent-communities');
    const frequentData: Record<string, { visitCount: number; lastVisited: string }> = 
      savedData ? JSON.parse(savedData) : {};

    const enhanced = communities
      .map(community => ({
        ...community,
        visitCount: frequentData[community.id]?.visitCount || 0,
        lastVisited: frequentData[community.id]?.lastVisited 
          ? new Date(frequentData[community.id].lastVisited)
          : new Date(),
        unreadCount: Math.floor(Math.random() * 5) // Mock unread count
      }))
      .filter(community => community.visitCount > 0 || community.userMembership.isJoined)
      .sort((a, b) => {
        // Sort by visit frequency and recency
        if (a.visitCount !== b.visitCount) {
          return b.visitCount - a.visitCount;
        }
        return b.lastVisited.getTime() - a.lastVisited.getTime();
      })
      .slice(0, 5); // Show top 5

    setFrequentCommunities(enhanced);
  }, [communities]);

  // Track community visits
  const handleCommunityClick = useCallback((communityId: string) => {
    // Update visit count
    const savedData = localStorage.getItem('frequent-communities');
    const frequentData = savedData ? JSON.parse(savedData) : {};
    
    frequentData[communityId] = {
      visitCount: (frequentData[communityId]?.visitCount || 0) + 1,
      lastVisited: new Date().toISOString()
    };
    
    localStorage.setItem('frequent-communities', JSON.stringify(frequentData));
    
    onCommunitySelect(communityId);
  }, [onCommunitySelect]);

  // Quick action items
  const quickActions: QuickActionItem[] = [
    {
      id: 'create-post',
      label: 'Create Post',
      icon: <Plus className="w-4 h-4" />,
      action: 'create-post',
      shortcut: 'C'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell className="w-4 h-4" />,
      action: 'notifications',
      badge: 3, // Mock notification count
      shortcut: 'N'
    },
    {
      id: 'bookmarks',
      label: 'Bookmarks',
      icon: <Bookmark className="w-4 h-4" />,
      action: 'bookmarks',
      shortcut: 'B'
    },
    {
      id: 'activity',
      label: 'Activity Feed',
      icon: <Activity className="w-4 h-4" />,
      action: 'activity',
      shortcut: 'A'
    }
  ];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if the panel is focused or no other input is focused
      if (document.activeElement?.tagName === 'INPUT') return;

      const totalItems = frequentCommunities.length + quickActions.length;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex(prev => (prev + 1) % totalItems);
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex(prev => (prev - 1 + totalItems) % totalItems);
          break;
        case 'Enter':
          event.preventDefault();
          if (focusedIndex >= 0) {
            if (focusedIndex < frequentCommunities.length) {
              handleCommunityClick(frequentCommunities[focusedIndex].id);
            } else {
              const actionIndex = focusedIndex - frequentCommunities.length;
              onQuickAction(quickActions[actionIndex].action);
            }
          }
          break;
        case 'Escape':
          setFocusedIndex(-1);
          break;
        default:
          // Handle shortcut keys
          const shortcutAction = quickActions.find(action => 
            action.shortcut?.toLowerCase() === event.key.toLowerCase()
          );
          if (shortcutAction && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            onQuickAction(shortcutAction.action);
          }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, frequentCommunities, quickActions, handleCommunityClick, onQuickAction]);

  const formatLastVisited = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="quick-navigation-panel bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Quick Access
          </h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={isExpanded ? 'Collapse panel' : 'Expand panel'}
          >
            <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Quick Actions */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Quick Actions
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action, index) => {
                const globalIndex = frequentCommunities.length + index;
                const isFocused = focusedIndex === globalIndex;
                
                return (
                  <button
                    key={action.id}
                    onClick={() => onQuickAction(action.action)}
                    className={`
                      relative flex items-center p-3 rounded-lg text-left transition-all duration-200
                      hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 
                      focus:ring-blue-500 focus:ring-offset-2
                      ${isFocused ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500' : ''}
                    `}
                  >
                    <div className="flex items-center space-x-2">
                      {action.icon}
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {action.label}
                      </span>
                    </div>
                    
                    {action.badge && action.badge > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full 
                                    flex items-center justify-center">
                        <span className="text-xs font-bold text-white">
                          {action.badge > 9 ? '9+' : action.badge}
                        </span>
                      </div>
                    )}
                    
                    {action.shortcut && (
                      <div className="absolute bottom-1 right-1 px-1 py-0.5 text-xs text-gray-400 
                                    bg-gray-100 dark:bg-gray-700 rounded">
                        ⌘{action.shortcut}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Frequent Communities */}
          {frequentCommunities.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Recent Communities
              </h4>
              <div className="space-y-2">
                {frequentCommunities.map((community, index) => {
                  const isFocused = focusedIndex === index;
                  
                  return (
                    <button
                      key={community.id}
                      onClick={() => handleCommunityClick(community.id)}
                      className={`
                        w-full flex items-center p-3 rounded-lg text-left transition-all duration-200
                        hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 
                        focus:ring-blue-500 focus:ring-offset-2
                        ${isFocused ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500' : ''}
                      `}
                    >
                      {/* Community Icon */}
                      <div className="relative flex-shrink-0">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600">
                          <img
                            src={community.icon}
                            alt={`${community.name} icon`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(community.name)}&background=6366f1&color=fff`;
                            }}
                          />
                        </div>
                        
                        {/* Unread indicator */}
                        {community.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full 
                                        flex items-center justify-center">
                            <span className="text-xs font-bold text-white">
                              {community.unreadCount > 9 ? '9+' : community.unreadCount}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Community Info */}
                      <div className="flex-1 min-w-0 ml-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {community.name}
                          </h5>
                          
                          <div className="flex items-center space-x-1 ml-2">
                            {community.userMembership.isJoined && (
                              <Star className="w-3 h-3 text-yellow-500 fill-current" />
                            )}
                            
                            {community.activityMetrics.trendingScore > 0.8 && (
                              <TrendingUp className="w-3 h-3 text-green-500" />
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>{formatLastVisited(community.lastVisited)}</span>
                          </div>
                          
                          <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                            <MessageCircle className="w-3 h-3" />
                            <span>{community.activityMetrics.postsToday}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Keyboard Shortcuts Help */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <details className="group">
              <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer 
                               hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                Keyboard Shortcuts
              </summary>
              <div className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Navigate</span>
                  <span>↑↓ arrows</span>
                </div>
                <div className="flex justify-between">
                  <span>Select</span>
                  <span>Enter</span>
                </div>
                <div className="flex justify-between">
                  <span>Create Post</span>
                  <span>⌘C</span>
                </div>
                <div className="flex justify-between">
                  <span>Notifications</span>
                  <span>⌘N</span>
                </div>
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickNavigationPanel;