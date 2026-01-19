import React from 'react';
import {
  LayoutDashboard,
  Package,
  Truck,
  RotateCcw,
  MessageSquare,
  Store,
  BarChart3,
  Tag,
  Wallet,
  CreditCard,
  User,
  Bell,
  X,
  ChevronRight,
} from 'lucide-react';

// Icon mapping for string-based icon selection
const iconMap = {
  LayoutDashboard,
  Package,
  Truck,
  RotateCcw,
  MessageSquare,
  Store,
  BarChart3,
  Tag,
  Wallet,
  CreditCard,
  User,
  Bell,
};

export interface NavigationItem {
  id: string;
  label: string;
  icon: keyof typeof iconMap;
  badge?: number;
  disabled?: boolean;
}

export interface NavigationSection {
  id: string;
  label?: string;
  items: NavigationItem[];
}

interface SellerSidebarProps {
  sections: NavigationSection[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  storeName?: string;
  storeImage?: string;
  tierName?: string;
  tierColor?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export function SellerSidebar({
  sections,
  activeTab,
  onTabChange,
  storeName = 'My Store',
  storeImage,
  tierName = 'Bronze',
  tierColor = 'from-orange-400 to-orange-600',
  onClose,
  showCloseButton = false,
}: SellerSidebarProps) {
  const renderIcon = (iconName: keyof typeof iconMap, className: string = 'w-5 h-5') => {
    const IconComponent = iconMap[iconName];
    return IconComponent ? <IconComponent className={className} /> : null;
  };

  return (
    <div className="h-full flex flex-col bg-black/30 backdrop-blur-xl border-r border-white/10">
      {/* Store Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {storeImage ? (
              <img
                src={storeImage}
                alt={storeName}
                className="w-10 h-10 rounded-full object-cover border-2 border-purple-500/50"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-lg font-bold">
                  {storeName?.charAt(0) || 'S'}
                </span>
              </div>
            )}
            <div className="hidden lg:block">
              <h2 className="text-white font-semibold text-sm truncate max-w-[140px]">
                {storeName}
              </h2>
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r ${tierColor} text-white mt-1`}
              >
                {tierName}
              </span>
            </div>
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {sections.map((section) => (
          <div key={section.id} className="mb-4">
            {/* Section Label */}
            {section.label && (
              <h3 className="px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.label}
              </h3>
            )}

            {/* Section Items */}
            <div className="space-y-1 px-2">
              {section.items.map((item) => {
                const isActive = activeTab === item.id;
                const isDisabled = item.disabled;

                return (
                  <button
                    key={item.id}
                    onClick={() => !isDisabled && onTabChange(item.id)}
                    disabled={isDisabled}
                    className={`
                      w-full flex items-center justify-between px-3 py-2.5 rounded-lg
                      text-sm font-medium transition-all duration-200
                      ${isActive
                        ? 'bg-purple-500/20 text-white border-l-2 border-purple-500 ml-0.5'
                        : isDisabled
                          ? 'text-gray-600 cursor-not-allowed'
                          : 'text-gray-300 hover:text-white hover:bg-white/5'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      {renderIcon(item.icon, `w-5 h-5 ${isActive ? 'text-purple-400' : ''}`)}
                      <span>{item.label}</span>
                    </div>

                    {/* Badge or Chevron */}
                    <div className="flex items-center gap-2">
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                      {isActive && (
                        <ChevronRight className="w-4 h-4 text-purple-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={() => onTabChange('help')}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Help & Support</span>
        </button>
      </div>
    </div>
  );
}

export default SellerSidebar;
