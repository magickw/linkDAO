import React, { useState, useEffect } from 'react';
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
  History
} from 'lucide-react';
import { usePermissions } from '@/hooks/useAuth';
import { MobileBottomNavigation } from './MobileBottomNavigation';
import { MobileSidebar } from './MobileSidebar';
import { MobileHeader } from './MobileHeader';

interface MobileAdminLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  title?: string;
  showSearch?: boolean;
  showNotifications?: boolean;
}

export const MobileAdminLayout: React.FC<MobileAdminLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  title = 'Admin Dashboard',
  showSearch = true,
  showNotifications = true
}) => {
  const router = useRouter();
  const { isAdmin, hasPermission } = usePermissions();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

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

  if (!isAdmin()) {
    return null;
  }

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Mobile Header */}
      <MobileHeader
        title={title}
        onMenuClick={() => setSidebarOpen(true)}
        onSearchClick={() => setSearchOpen(true)}
        onNotificationClick={() => router.push('/admin/notifications')}
        notificationCount={notificationCount}
        showSearch={showSearch}
        showNotifications={showNotifications}
      />

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        navigationItems={navigationItems}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Main Content */}
      <main className="pb-20 pt-16">
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
              <p className="text-gray-500 text-sm">Search functionality coming soon...</p>
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