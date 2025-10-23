import React, { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Phone, Bell, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface NotificationCategory {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export const MobilePushSetup: React.FC = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [isRegistered, setIsRegistered] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [categories, setCategories] = useState<NotificationCategory[]>([
    {
      id: 'moderation',
      name: 'Content Moderation',
      description: 'New content requiring review',
      enabled: true,
      priority: 'high'
    },
    {
      id: 'system',
      name: 'System Alerts',
      description: 'System status and performance alerts',
      enabled: true,
      priority: 'critical'
    },
    {
      id: 'security',
      name: 'Security Alerts',
      description: 'Security incidents and threats',
      enabled: true,
      priority: 'critical'
    },
    {
      id: 'user',
      name: 'User Management',
      description: 'User-related notifications',
      enabled: true,
      priority: 'medium'
    },
    {
      id: 'seller',
      name: 'Seller Applications',
      description: 'New seller applications and updates',
      enabled: true,
      priority: 'medium'
    },
    {
      id: 'dispute',
      name: 'Disputes',
      description: 'New disputes and escalations',
      enabled: true,
      priority: 'high'
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkNotificationSupport();
    loadPreferences();
  }, []);

  const checkNotificationSupport = () => {
    if ('Notification' in window) {
      setIsSupported(true);
      setPermissionStatus(Notification.permission);
    } else {
      setIsSupported(false);
    }
  };

  const loadPreferences = () => {
    // Load saved preferences from localStorage
    const savedCategories = localStorage.getItem('admin-notification-categories');
    if (savedCategories) {
      try {
        setCategories(JSON.parse(savedCategories));
      } catch (e) {
        console.error('Failed to load notification preferences:', e);
      }
    }
  };

  const requestPermission = async () => {
    if (!isSupported) return;

    setLoading(true);
    setError(null);

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      
      if (permission === 'granted') {
        // In a real implementation, we would get the actual token from a service
        // For now, we'll generate a mock token
        const mockToken = `mock-token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setToken(mockToken);
        
        // Register with backend
        await adminService.registerMobilePushToken(mockToken, 'web');
        setIsRegistered(true);
        
        // Save to localStorage
        localStorage.setItem('admin-push-token', mockToken);
      }
    } catch (err) {
      setError('Failed to request notification permission');
      console.error('Error requesting permission:', err);
    } finally {
      setLoading(false);
    }
  };

  const unregister = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      await adminService.unregisterMobilePushToken(token);
      setIsRegistered(false);
      setToken(null);
      setPermissionStatus('default');
      
      // Remove from localStorage
      localStorage.removeItem('admin-push-token');
      localStorage.removeItem('admin-notification-categories');
    } catch (err) {
      setError('Failed to unregister push notifications');
      console.error('Error unregistering:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setCategories(categories.map(category => 
      category.id === categoryId 
        ? { ...category, enabled: !category.enabled } 
        : category
    ));
    
    // Save to localStorage
    localStorage.setItem('admin-notification-categories', JSON.stringify(categories));
  };

  const getStatusIcon = () => {
    if (!isSupported) {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
    
    switch (permissionStatus) {
      case 'granted':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'denied':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusText = () => {
    if (!isSupported) {
      return 'Not supported in this browser';
    }
    
    switch (permissionStatus) {
      case 'granted':
        return 'Notifications enabled';
      case 'denied':
        return 'Notifications blocked';
      default:
        return 'Notifications not yet configured';
    }
  };

  const getStatusColor = () => {
    if (!isSupported) {
      return 'text-red-500';
    }
    
    switch (permissionStatus) {
      case 'granted':
        return 'text-green-500';
      case 'denied':
        return 'text-red-500';
      default:
        return 'text-yellow-500';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mobile Push Notifications</h1>
        <p className="text-gray-600 mt-2">
          Configure push notifications for important admin alerts and updates
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Notification Status
          </CardTitle>
          <CardDescription>
            Manage your mobile push notification settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <p className={`font-medium ${getStatusColor()}`}>
                  {getStatusText()}
                </p>
                {isRegistered && token && (
                  <p className="text-sm text-gray-500 mt-1">
                    Device registered with token: {token.substring(0, 20)}...
                  </p>
                )}
              </div>
            </div>
            <div>
              {permissionStatus === 'granted' ? (
                <Button 
                  onClick={unregister}
                  variant="outline"
                  disabled={loading}
                >
                  {loading ? 'Unregistering...' : 'Unregister'}
                </Button>
              ) : (
                <Button 
                  onClick={requestPermission}
                  disabled={!isSupported || loading}
                >
                  {loading ? 'Enabling...' : 'Enable Notifications'}
                </Button>
              )}
            </div>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Categories</CardTitle>
          <CardDescription>
            Choose which types of notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categories.map((category) => (
              <div 
                key={category.id} 
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <h3 className="font-medium">{category.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      category.priority === 'critical' ? 'bg-red-100 text-red-800' :
                      category.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      category.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {category.priority} priority
                    </span>
                  </div>
                </div>
                <Switch
                  id={`category-${category.id}`}
                  checked={category.enabled}
                  onCheckedChange={() => toggleCategory(category.id)}
                />
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              localStorage.setItem('admin-notification-categories', JSON.stringify(categories));
            }}
          >
            Save Preferences
          </Button>
        </CardFooter>
      </Card>

      {/* Test Notification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Test Notifications
          </CardTitle>
          <CardDescription>
            Send a test notification to verify your setup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button 
              variant="secondary"
              disabled={permissionStatus !== 'granted' || loading}
              onClick={async () => {
                if (permissionStatus === 'granted' && 'Notification' in window) {
                  new Notification('Test Notification', {
                    body: 'This is a test notification from the admin dashboard',
                    icon: '/icons/admin-badge.png'
                  });
                }
              }}
            >
              Send Test Notification
            </Button>
            <p className="text-sm text-gray-600">
              {permissionStatus === 'granted' 
                ? 'Click to send a test notification' 
                : 'Enable notifications first'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};