import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/animations/LoadingSkeletons';
import { Alert } from '@/components/ui/alert';
import { 
  Bell, 
  BellOff, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Settings
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'verification_status_changed' | 'verification_approved' | 'verification_rejected' | 'verification_expired';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  resourceId?: string;
}

export const SellerVerificationNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState({
    email: true,
    push: true,
    sms: false
  });

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      // Fetch from real API endpoint
      const response = await fetch('/api/marketplace/notifications/user/notifications', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Mock notifications for demonstration
        const mockNotifications: Notification[] = [
          {
            id: '1',
            type: 'verification_approved',
            title: 'Seller Verification Approved',
            message: 'Your seller verification request has been approved. You can now list products on the marketplace.',
            read: false,
            createdAt: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
          },
          {
            id: '2',
            type: 'verification_status_changed',
            title: 'Verification In Progress',
            message: 'Your seller verification is currently under review by our team.',
            read: true,
            createdAt: new Date(Date.now() - 86400000).toISOString() // 1 day ago
          }
        ];
        setNotifications(mockNotifications);
      } else {
        throw new Error(result.message || 'Failed to fetch notifications');
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to fetch notifications: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // In a real implementation, this would call the API to mark notification as read
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      // In a real implementation, this would call the API to mark all notifications as read
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const updatePreferences = async (newPreferences: typeof preferences) => {
    try {
      const response = await fetch('/api/marketplace/notifications/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPreferences),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setPreferences(newPreferences);
        alert('Notification preferences updated successfully');
      } else {
        throw new Error(result.message || 'Failed to update preferences');
      }
    } catch (err) {
      console.error('Error updating preferences:', err);
      alert('Failed to update preferences: ' + (err as Error).message);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'verification_approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'verification_rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'verification_expired':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'verification_approved':
        return 'border-green-200 bg-green-50 dark:bg-green-900/20';
      case 'verification_rejected':
        return 'border-red-200 bg-red-50 dark:bg-red-900/20';
      case 'verification_expired':
        return 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20';
      default:
        return 'border-blue-200 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading notifications...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        {error}
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Verification Notifications
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Stay updated on your seller verification status
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={markAllAsRead}
            variant="outline"
            disabled={notifications.every(n => n.read)}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
          <Button variant="secondary">
            <Settings className="w-4 h-4 mr-2" />
            Preferences
          </Button>
        </div>
      </div>

      {/* Notification Preferences */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Notification Preferences
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Email Notifications</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Receive updates via email</p>
              </div>
            </div>
            <Button
              variant={preferences.email ? "default" : "outline"}
              size="small"
              onClick={() => updatePreferences({ ...preferences, email: !preferences.email })}
            >
              {preferences.email ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Push Notifications</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Mobile app notifications</p>
              </div>
            </div>
            <Button
              variant={preferences.push ? "default" : "outline"}
              size="small"
              onClick={() => updatePreferences({ ...preferences, push: !preferences.push })}
            >
              {preferences.push ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <BellOff className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">SMS Notifications</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Text message alerts</p>
              </div>
            </div>
            <Button
              variant={preferences.sms ? "default" : "outline"}
              size="small"
              onClick={() => updatePreferences({ ...preferences, sms: !preferences.sms })}
            >
              {preferences.sms ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Notifications List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Recent Notifications
          </h2>
          <Badge variant="secondary">
            {notifications.filter(n => !n.read).length} unread
          </Badge>
        </div>

        {notifications.length === 0 ? (
          <Card className="p-8 text-center">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              No notifications yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              You'll see verification updates here when they happen
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card 
                key={notification.id} 
                className={`p-5 border-l-4 ${getNotificationColor(notification.type)} ${
                  !notification.read ? 'ring-2 ring-blue-500/20' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {notification.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mt-1">
                          {notification.message}
                        </p>
                      </div>
                      {!notification.read && (
                        <Badge variant="destructive" className="flex-shrink-0">
                          New
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(notification.createdAt)}
                      </p>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="small"
                          onClick={() => markAsRead(notification.id)}
                        >
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};