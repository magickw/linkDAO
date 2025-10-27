import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Menu,
  X,
  Bell,
  Search,
  Settings,
  User,
  ChevronDown,
  Home,
  Shield,
  Users,
  BarChart3,
  AlertTriangle,
  ShoppingBag,
  History,
  Wifi,
  WifiOff,
  RefreshCw,
  Download,
  Upload,
  Zap
} from 'lucide-react';
import { usePermissions } from '@/hooks/useAuth';
import { MobileBottomNavigation } from './MobileBottomNavigation';
import { MobileSidebar } from './MobileSidebar';
import { MobileHeader } from './MobileHeader';

interface EnhancedMobileAdminLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  title?: string;
  showSearch?: boolean;
  showNotifications?: boolean;
  onRefresh?: () => void;
}

export const EnhancedMobileAdminLayout: React.FC<EnhancedMobileAdminLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  title = 'Admin Dashboard',
  showSearch = true,
  showNotifications = true,
  onRefresh
}) => {
  const router = useRouter();
  const { isAdmin, hasPermission } = usePermissions();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);

  // Navigation items with permissions
  const navigationItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Home,
      permission: null,
      showInBottom: true
    },
    {
      id: 'moderation',
      label: 'Moderation',
      icon: Shield,
      permission: 'content.moderate',
      showInBottom: true,
      badge: true
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      permission: 'system.analytics',
      showInBottom: true
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users,
      permission: 'users.view',
      showInBottom: true
    },
    {
      id: 'sellers',
      label: 'Sellers',
      icon: ShoppingBag,
      permission: 'marketplace.seller_review',
      showInBottom: false
    },
    {
      id: 'disputes',
      label: 'Disputes',
      icon: AlertTriangle,
      permission: 'disputes.view',
      showInBottom: false
    },
    {
      id: 'history',
      label: 'History',
      icon: History,
      permission: 'system.audit',
      showInBottom: false
    }
  ].filter(item => !item.permission || hasPermission(item.permission));

  // Check if user is admin
  useEffect(() => {
    if (!isAdmin()) {
      router.push('/');
    }
  }, [isAdmin, router]);

  // Load notification count
  useEffect(() => {
    // TODO: Load actual notification count from API
    setNotificationCount(3);
  }, []);

  // Online/offline status detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineBanner(false);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineBanner(true);
      setTimeout(() => setShowOfflineBanner(false), 5000);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial check
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto refresh when coming back online
  useEffect(() => {
    if (isOnline && !lastSync) {
      handleRefresh();
    }
  }, [isOnline, lastSync]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      // Call the refresh function if provided
      if (onRefresh) {
        await onRefresh();
      }
      
      // Update last sync time
      setLastSync(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, onRefresh]);

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId);
    setSidebarOpen(false);
  };

  const handleSync = async () => {
    // In a real implementation, this would sync pending offline actions
    console.log('Syncing offline actions...');
  };

  if (!isAdmin()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Offline Banner */}
      {showOfflineBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-900 p-2 text-center text-sm">
          <div className="flex items-center justify-center">
            <WifiOff className="w-4 h-4 mr-2" />
            <span>Working offline. Changes will sync when you're back online.</span>
          </div>
        </div>
      )}
      
      {/* Connection Status Bar */}
      <div className={`flex items-center justify-between px-4 py-1 text-xs ${
        isOnline ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
      }`}>
        <div className="flex items-center">
          {isOnline ? (
            <Wifi className="w-3 h-3 mr-1" />
          ) : (
            <WifiOff className="w-3 h-3 mr-1" />
          )}
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>
        {lastSync && (
          <div className="flex items-center">
            <span>Last sync: {lastSync}</span>
            <button 
              onClick={handleSync}
              className="ml-2 p-1 hover:bg-white/10 rounded"
              title="Sync now"
            >
              <Upload className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Mobile Header */}
      <div className="relative">
        <MobileHeader
          title={title}
          onMenuClick={() => setSidebarOpen(true)}
          onSearchClick={() => setSearchOpen(true)}
          onNotificationClick={() => router.push('/admin/notifications')}
          notificationCount={notificationCount}
          showSearch={showSearch}
          showNotifications={showNotifications}
        />
        {/* Refresh Button - positioned absolutely to appear in the header */}
        <div className="absolute top-3 right-16">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
          >
            {isRefreshing ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        navigationItems={navigationItems}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Main Content */}
      <main className={`pb-20 pt-16 ${showOfflineBanner ? 'pt-20' : 'pt-16'}`}>
        <div className="px-4 py-4">
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      <MobileBottomNavigation
        navigationItems={navigationItems.filter(item => item.showInBottom)}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/50">
          <div className="bg-white h-full">
            <div className="flex items-center p-4 border-b">
              <button
                onClick={() => setSearchOpen(false)}
                className="mr-3 p-2 -ml-2"
              >
                <X className="w-5 h-5" />
              </button>
              <input
                type="text"
                placeholder="Search admin functions..."
                className="flex-1 text-lg outline-none"
                autoFocus
              />
            </div>
            <div className="p-4">
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-gray-100 rounded-lg">
                  <Search className="w-5 h-5 text-gray-500 mr-3" />
                  <div>
                    <p className="font-medium">Search Users</p>
                    <p className="text-sm text-gray-500">Find and manage user accounts</p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-gray-100 rounded-lg">
                  <Shield className="w-5 h-5 text-gray-500 mr-3" />
                  <div>
                    <p className="font-medium">Moderation Queue</p>
                    <p className="text-sm text-gray-500">Review pending content</p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-gray-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-gray-500 mr-3" />
                  <div>
                    <p className="font-medium">Analytics</p>
                    <p className="text-sm text-gray-500">View platform metrics</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};