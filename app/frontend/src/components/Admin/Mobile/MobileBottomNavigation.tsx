import React from 'react';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string | null;
  showInBottom: boolean;
  badge?: boolean;
}

interface MobileBottomNavigationProps {
  navigationItems: NavigationItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const MobileBottomNavigation: React.FC<MobileBottomNavigationProps> = ({
  navigationItems,
  activeTab,
  onTabChange
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200">
      <div className="flex items-center justify-around px-2 py-2">
        {navigationItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors min-w-0 flex-1 ${
                isActive
                  ? 'text-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-purple-600' : 'text-gray-400'}`} />
                {item.badge && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                )}
              </div>
              <span className={`text-xs font-medium mt-1 truncate max-w-full ${
                isActive ? 'text-purple-600' : 'text-gray-500'
              }`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-purple-600 rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};