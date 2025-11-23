import React, { useState, useEffect } from 'react';
import { Bell, Trash2, Filter, Search, Clock, AlertTriangle, Shield, Users, ShoppingBag, MessageSquare } from 'lucide-react';
import { mobilePushNotificationService, AdminNotification } from './MobilePushNotificationService';
import { TouchOptimizedButton, TouchOptimizedInput } from '../TouchInteractions';

export const NotificationHistory: React.FC = () => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<AdminNotification[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [notifications, searchTerm, categoryFilter, priorityFilter]);

  const loadNotifications = () => {
    const history = mobilePushNotificationService.getNotificationHistory();
    setNotifications(history);
  };

  const filterNotifications = () => {
    let filtered = [...notifications];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(notification =>
        notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.body.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(notification => notification.category === categoryFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(notification => notification.priority === priorityFilter);
    }

    setFilteredNotifications(filtered);
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all notification history?')) {
      mobilePushNotificationService.clearNotificationHistory();
      setNotifications([]);
    }
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
      moderation: Shield,
      system: AlertTriangle,
      security: AlertTriangle,
      user: Users,
      seller: ShoppingBag,
      dispute: MessageSquare
    };
    return iconMap[category] || Bell;
  };

  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      moderation: 'bg-blue-500',
      system: 'bg-orange-500',
      security: 'bg-red-500',
      user: 'bg-green-500',
      seller: 'bg-purple-500',
      dispute: 'bg-yellow-500'
    };
    return colorMap[category] || 'bg-gray-500';
  };

  const getPriorityColor = (priority: string) => {
    const colorMap: Record<string, string> = {
      low: 'text-green-400',
      medium: 'text-yellow-400',
      high: 'text-orange-400',
      critical: 'text-red-400'
    };
    return colorMap[priority] || 'text-gray-400';
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'moderation', label: 'Moderation' },
    { id: 'system', label: 'System' },
    { id: 'security', label: 'Security' },
    { id: 'user', label: 'Users' },
    { id: 'seller', label: 'Sellers' },
    { id: 'dispute', label: 'Disputes' }
  ];

  const priorities = [
    { id: 'all', label: 'All Priorities' },
    { id: 'critical', label: 'Critical' },
    { id: 'high', label: 'High' },
    { id: 'medium', label: 'Medium' },
    { id: 'low', label: 'Low' }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Notification History</h2>
          <p className="text-white/70 text-sm">{notifications.length} total notifications</p>
        </div>
        {notifications.length > 0 && (
          <TouchOptimizedButton
            onClick={handleClearHistory}
            variant="danger"
            size="sm"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </TouchOptimizedButton>
        )}
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <TouchOptimizedInput
          label=""
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search notifications..."
          className="mb-0"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id} className="bg-gray-800">
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {priorities.map((priority) => (
                <option key={priority.id} value={priority.id} className="bg-gray-800">
                  {priority.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => {
            const CategoryIcon = getCategoryIcon(notification.category);
            const categoryColor = getCategoryColor(notification.category);
            const priorityColor = getPriorityColor(notification.priority);

            return (
              <div key={notification.id} className="bg-white/10 backdrop-blur-md rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${categoryColor} flex-shrink-0`}>
                    <CategoryIcon className="w-4 h-4 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-white font-medium truncate">{notification.title}</h3>
                      <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                        <span className={`text-xs px-2 py-1 rounded-full bg-white/10 ${priorityColor}`}>
                          {notification.priority}
                        </span>
                        <span className="text-white/50 text-xs">
                          {formatTimeAgo(notification.timestamp)}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-white/70 text-sm mb-2">{notification.body}</p>
                    
                    <div className="flex items-center space-x-4 text-xs text-white/50">
                      <span className="capitalize">{notification.category}</span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{notification.timestamp.toLocaleTimeString()}</span>
                      </span>
                    </div>

                    {/* Actions */}
                    {notification.actions && notification.actions.length > 0 && (
                      <div className="flex space-x-2 mt-3">
                        {notification.actions.map((action) => (
                          <TouchOptimizedButton
                            key={action.id}
                            onClick={() => {
                              // Handle action click
                              console.log(`Action ${action.id} clicked for notification ${notification.id}`);
                            }}
                            variant="secondary"
                            size="sm"
                          >
                            {action.title}
                          </TouchOptimizedButton>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-white/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              {notifications.length === 0 ? 'No notifications yet' : 'No matching notifications'}
            </h3>
            <p className="text-white/70 text-sm">
              {notifications.length === 0 
                ? 'Notifications will appear here when you receive them'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
          </div>
        )}
      </div>

      {/* Load More */}
      {filteredNotifications.length > 0 && filteredNotifications.length < notifications.length && (
        <TouchOptimizedButton
          onClick={() => {
            // Load more notifications if needed
          }}
          variant="secondary"
          className="w-full"
        >
          Load More
        </TouchOptimizedButton>
      )}
    </div>
  );
};