import React, { useState, useEffect, ReactNode } from 'react';
import { SellerSidebar, NavigationItem } from './SellerSidebar';

interface SellerDashboardLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadNotifications?: number;
  pendingOrdersCount?: number;
  unreadMessagesCount?: number;
  storeName?: string;
  storeImage?: string;
  tierName?: string;
  tierColor?: string;
}

export function SellerDashboardLayout({
  children,
  activeTab,
  onTabChange,
  unreadNotifications = 0,
  pendingOrdersCount = 0,
  unreadMessagesCount = 0,
  storeName = 'My Store',
  storeImage,
  tierName = 'Bronze',
  tierColor = 'from-orange-400 to-orange-600',
}: SellerDashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Handle responsive detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      // Auto-close sidebar on mobile when resizing
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar when navigating on mobile
  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  // Navigation sections with grouped structure
  const navigationSections: { id: string; label?: string; items: NavigationItem[] }[] = [
    {
      id: 'overview',
      items: [
        { id: 'overview', label: 'Overview', icon: 'LayoutDashboard' },
      ],
    },
    {
      id: 'sales',
      label: 'SALES',
      items: [
        { id: 'orders', label: 'Orders', icon: 'Package', badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined },
        { id: 'returns', label: 'Returns & Refunds', icon: 'RotateCcw' },
        { id: 'messaging', label: 'Messages', icon: 'MessageSquare', badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined },
      ],
    },
    {
      id: 'inventory',
      label: 'INVENTORY',
      items: [
        { id: 'listings', label: 'Listings', icon: 'Store' },
        { id: 'analytics', label: 'Analytics', icon: 'BarChart3' },
        { id: 'promotions', label: 'Promotions', icon: 'Tag' },
      ],
    },
    {
      id: 'finances',
      label: 'FINANCES',
      items: [
        { id: 'payouts', label: 'Payouts', icon: 'Wallet' },
        { id: 'billing', label: 'Billing', icon: 'CreditCard' },
      ],
    },
    {
      id: 'account',
      label: 'ACCOUNT',
      items: [
        { id: 'profile', label: 'Store Profile', icon: 'User' },
        { id: 'notifications', label: 'Notifications', icon: 'Bell', badge: unreadNotifications > 0 ? unreadNotifications : undefined },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Mobile Header with Hamburger */}
      <div className="lg:hidden sticky top-0 z-50 bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Toggle sidebar"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isSidebarOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
          <div className="flex items-center gap-2">
            {storeImage ? (
              <img
                src={storeImage}
                alt={storeName}
                className="w-8 h-8 rounded-full object-cover border border-purple-500/50"
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {storeName?.charAt(0) || 'S'}
                </span>
              </div>
            )}
            <span className="text-white font-medium">{storeName}</span>
          </div>
          <div className="w-10" /> {/* Spacer for balance */}
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Layout */}
      <div className="flex min-h-screen lg:min-h-[calc(100vh)]">
        {/* Sidebar */}
        <div
          className={`
            fixed lg:sticky top-0 left-0 z-50 lg:z-30
            w-64 h-screen lg:h-auto
            transform transition-transform duration-300 ease-in-out
            ${isMobile ? (isSidebarOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
            lg:translate-x-0
          `}
        >
          <SellerSidebar
            sections={navigationSections}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            storeName={storeName}
            storeImage={storeImage}
            tierName={tierName}
            tierColor={tierColor}
            onClose={() => setIsSidebarOpen(false)}
            showCloseButton={isMobile}
          />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 lg:ml-0">
          <div className="p-4 lg:p-6 xl:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default SellerDashboardLayout;
