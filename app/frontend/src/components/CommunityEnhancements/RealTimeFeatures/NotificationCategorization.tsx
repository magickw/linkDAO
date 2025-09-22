/**
 * Notification Categorization Component
 * Displays categorized notifications with filtering and grouping
 * Requirements: 8.1, 8.3, 8.4
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Filter, 
  Settings, 
  ChevronDown, 
  ChevronRight,
  X,
  Plus,
  Edit3,
  Trash2,
  Bell,
  BellOff,
  Eye,
  EyeOff,
  MoreHorizontal,
  Search,
  Calendar,
  Users,
  Tag,
  Star,
  Clock
} from 'lucide-react';
import { 
  useNotificationCategorization,
  useNotificationFiltering,
  useNotificationHistory
} from '../../../hooks/useNotificationCategorization';
import { 
  NotificationFilter,
  NotificationGroup,
  CategoryConfig,
  EnhancedNotificationCategory
} from '../../../services/notificationCategorizationService';
import { RealTimeNotification, NotificationPriority } from '../../../types/realTimeNotifications';

interface NotificationCategorizationProps {
  notifications: RealTimeNotification[];
  onNotificationClick?: (notification: RealTimeNotification) => void;
  onNotificationAction?: (notification: RealTimeNotification, action: string) => void;
  showFilters?: boolean;
  showGrouping?: boolean;
  showHistory?: boolean;
  maxHeight?: string;
  className?: string;
}

/**
 * Main Notification Categorization Component
 */
export const NotificationCategorization: React.FC<NotificationCategorizationProps> = ({
  notifications,
  onNotificationClick,
  onNotificationAction,
  showFilters = true,
  showGrouping = true,
  showHistory = false,
  maxHeight = '400px',
  className = ''
}) => {
  const {
    filters,
    activeFilters,
    categoryConfigs,
    filterNotifications,
    groupNotifications,
    categorizeNotification,
    activateFilter,
    deactivateFilter,
    statistics
  } = useNotificationCategorization();

  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showCategorySettings, setShowCategorySettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<EnhancedNotificationCategory>>(new Set());
  const [selectedPriorities, setSelectedPriorities] = useState<Set<NotificationPriority>>(new Set());

  // Filter and group notifications
  const processedNotifications = useMemo(() => {
    let filtered = notifications;

    // Apply service filters
    filtered = filterNotifications(filtered);

    // Apply local search filter
    if (searchQuery) {
      filtered = filtered.filter(notification =>
        notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedCategories.size > 0) {
      filtered = filtered.filter(notification => {
        const { category } = categorizeNotification(notification);
        return selectedCategories.has(category);
      });
    }

    // Apply priority filter
    if (selectedPriorities.size > 0) {
      filtered = filtered.filter(notification =>
        selectedPriorities.has(notification.priority)
      );
    }

    return showGrouping ? groupNotifications(filtered) : filtered.map(n => {
      const { category } = categorizeNotification(n);
      return {
        id: n.id,
        category,
        title: n.title,
        notifications: [n],
        count: 1,
        latestTimestamp: n.timestamp,
        priority: n.priority,
        isCollapsed: false
      };
    });
  }, [
    notifications,
    filterNotifications,
    groupNotifications,
    showGrouping,
    searchQuery,
    selectedCategories,
    selectedPriorities,
    categorizeNotification
  ]);

  // Handle filter toggle
  const handleFilterToggle = useCallback((filterId: string, isActive: boolean) => {
    if (isActive) {
      activateFilter(filterId);
    } else {
      deactivateFilter(filterId);
    }
  }, [activateFilter, deactivateFilter]);

  // Handle category toggle
  const handleCategoryToggle = useCallback((category: EnhancedNotificationCategory) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  // Handle priority toggle
  const handlePriorityToggle = useCallback((priority: NotificationPriority) => {
    setSelectedPriorities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(priority)) {
        newSet.delete(priority);
      } else {
        newSet.add(priority);
      }
      return newSet;
    });
  }, []);

  // Get category icon
  const getCategoryIcon = (category: EnhancedNotificationCategory) => {
    const config = categoryConfigs.find(c => c.category === category);
    return config?.icon || 'bell';
  };

  // Get category color
  const getCategoryColor = (category: EnhancedNotificationCategory) => {
    const config = categoryConfigs.find(c => c.category === category);
    return config?.color || '#6B7280';
  };

  // Get priority color
  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 'text-red-500 bg-red-50 border-red-200';
      case NotificationPriority.HIGH:
        return 'text-orange-500 bg-orange-50 border-orange-200';
      case NotificationPriority.NORMAL:
        return 'text-blue-500 bg-blue-50 border-blue-200';
      case NotificationPriority.LOW:
        return 'text-gray-500 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <Bell size={20} className="text-gray-600 dark:text-gray-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Notifications
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {processedNotifications.length} items • {statistics.unreadCount} unread
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter toggle */}
          {showFilters && (
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`p-2 rounded-lg border transition-colors ${
                showFilterPanel
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Filter size={16} />
            </button>
          )}

          {/* Settings */}
          <button
            onClick={() => setShowCategorySettings(!showCategorySettings)}
            className="p-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilterPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
          >
            <FilterPanel
              filters={filters}
              activeFilters={activeFilters}
              categoryConfigs={categoryConfigs}
              selectedCategories={selectedCategories}
              selectedPriorities={selectedPriorities}
              onFilterToggle={handleFilterToggle}
              onCategoryToggle={handleCategoryToggle}
              onPriorityToggle={handlePriorityToggle}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Settings Panel */}
      <AnimatePresence>
        {showCategorySettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
          >
            <CategorySettingsPanel
              categoryConfigs={categoryConfigs}
              onClose={() => setShowCategorySettings(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications List */}
      <div className="overflow-y-auto" style={{ maxHeight }}>
        {processedNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
            <BellOff size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">No notifications</p>
            <p className="text-sm">You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            <AnimatePresence>
              {processedNotifications.map((group) => (
                <NotificationGroupItem
                  key={group.id}
                  group={group}
                  categoryConfigs={categoryConfigs}
                  onNotificationClick={onNotificationClick}
                  onNotificationAction={onNotificationAction}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Statistics Footer */}
      {showHistory && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <NotificationStatistics statistics={statistics} />
        </div>
      )}
    </div>
  );
};

/**
 * Filter Panel Component
 */
const FilterPanel: React.FC<{
  filters: NotificationFilter[];
  activeFilters: NotificationFilter[];
  categoryConfigs: CategoryConfig[];
  selectedCategories: Set<EnhancedNotificationCategory>;
  selectedPriorities: Set<NotificationPriority>;
  onFilterToggle: (filterId: string, isActive: boolean) => void;
  onCategoryToggle: (category: EnhancedNotificationCategory) => void;
  onPriorityToggle: (priority: NotificationPriority) => void;
}> = ({
  filters,
  activeFilters,
  categoryConfigs,
  selectedCategories,
  selectedPriorities,
  onFilterToggle,
  onCategoryToggle,
  onPriorityToggle
}) => {
  return (
    <div className="p-4 space-y-4">
      {/* Preset Filters */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Quick Filters
        </h4>
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const isActive = activeFilters.some(af => af.id === filter.id);
            return (
              <button
                key={filter.id}
                onClick={() => onFilterToggle(filter.id, !isActive)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  isActive
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                {filter.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category Filters */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Categories
        </h4>
        <div className="flex flex-wrap gap-2">
          {categoryConfigs.map((config) => {
            const isSelected = selectedCategories.has(config.category);
            return (
              <button
                key={config.category}
                onClick={() => onCategoryToggle(config.category)}
                className={`flex items-center space-x-2 px-3 py-1 text-sm rounded-full border transition-colors ${
                  isSelected
                    ? 'text-white border-transparent'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
                style={isSelected ? { backgroundColor: config.color } : {}}
              >
                <span>{config.displayName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Priority Filters */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Priority
        </h4>
        <div className="flex flex-wrap gap-2">
          {Object.values(NotificationPriority).map((priority) => {
            const isSelected = selectedPriorities.has(priority);
            return (
              <button
                key={priority}
                onClick={() => onPriorityToggle(priority)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors capitalize ${
                  isSelected
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                {priority}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * Category Settings Panel Component
 */
const CategorySettingsPanel: React.FC<{
  categoryConfigs: CategoryConfig[];
  onClose: () => void;
}> = ({ categoryConfigs, onClose }) => {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Category Settings
        </h4>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {categoryConfigs.map((config) => (
          <div
            key={config.category}
            className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center space-x-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {config.displayName}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {config.description}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                className={`p-1 rounded ${
                  config.soundEnabled
                    ? 'text-blue-500 bg-blue-50'
                    : 'text-gray-400 bg-gray-50'
                }`}
                title="Sound notifications"
              >
                <Bell size={14} />
              </button>
              <button
                className={`p-1 rounded ${
                  config.desktopEnabled
                    ? 'text-blue-500 bg-blue-50'
                    : 'text-gray-400 bg-gray-50'
                }`}
                title="Desktop notifications"
              >
                <Eye size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Notification Group Item Component
 */
const NotificationGroupItem: React.FC<{
  group: NotificationGroup;
  categoryConfigs: CategoryConfig[];
  onNotificationClick?: (notification: RealTimeNotification) => void;
  onNotificationAction?: (notification: RealTimeNotification, action: string) => void;
}> = ({ group, categoryConfigs, onNotificationClick, onNotificationAction }) => {
  const [isExpanded, setIsExpanded] = useState(!group.isCollapsed);

  const config = categoryConfigs.find(c => c.category === group.category);

  const handleNotificationClick = useCallback((notification: RealTimeNotification) => {
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  }, [onNotificationClick]);

  const handleNotificationAction = useCallback((notification: RealTimeNotification, action: string) => {
    if (onNotificationAction) {
      onNotificationAction(notification, action);
    }
  }, [onNotificationAction]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    >
      {/* Group Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          {group.count > 1 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          )}
          
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: config?.color || '#6B7280' }}
          />
          
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {group.title}
            </h4>
            {group.summary && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {group.summary}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {group.count > 1 && (
            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full">
              {group.count}
            </span>
          )}
          
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {group.latestTimestamp.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Individual Notifications */}
      <AnimatePresence>
        {(isExpanded || group.count === 1) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-2"
          >
            {group.notifications.map((notification) => (
              <div
                key={notification.id}
                className="ml-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {notification.message}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-3">
                    <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                      notification.priority === NotificationPriority.URGENT
                        ? 'bg-red-100 text-red-700'
                        : notification.priority === NotificationPriority.HIGH
                        ? 'bg-orange-100 text-orange-700'
                        : notification.priority === NotificationPriority.NORMAL
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {notification.priority}
                    </span>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNotificationAction(notification, 'dismiss');
                      }}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/**
 * Notification Statistics Component
 */
const NotificationStatistics: React.FC<{
  statistics: {
    totalNotifications: number;
    unreadCount: number;
    categoryBreakdown: Record<string, number>;
    priorityBreakdown: Record<string, number>;
  };
}> = ({ statistics }) => {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
        Statistics
      </h4>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-500 dark:text-gray-400">Total</div>
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {statistics.totalNotifications}
          </div>
        </div>
        
        <div>
          <div className="text-gray-500 dark:text-gray-400">Unread</div>
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {statistics.unreadCount}
          </div>
        </div>
      </div>

      {Object.keys(statistics.categoryBreakdown).length > 0 && (
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            By Category
          </div>
          <div className="space-y-1">
            {Object.entries(statistics.categoryBreakdown).map(([category, count]) => (
              <div key={category} className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400 capitalize">
                  {category.replace('_', ' ')}
                </span>
                <span className="text-gray-900 dark:text-gray-100">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCategorization;