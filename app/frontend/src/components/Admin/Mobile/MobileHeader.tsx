import React from 'react';
import { Menu, Search, Bell, Settings } from 'lucide-react';

interface MobileHeaderProps {
  title: string;
  onMenuClick: () => void;
  onSearchClick?: () => void;
  onNotificationClick?: () => void;
  onSettingsClick?: () => void;
  notificationCount?: number;
  showSearch?: boolean;
  showNotifications?: boolean;
  showSettings?: boolean;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  onMenuClick,
  onSearchClick,
  onNotificationClick,
  onSettingsClick,
  notificationCount = 0,
  showSearch = true,
  showNotifications = true,
  showSettings = false
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white/10 backdrop-blur-md border-b border-white/20">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side - Menu and Title */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-white truncate max-w-[200px]">
            {title}
          </h1>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-1">
          {showSearch && onSearchClick && (
            <button
              onClick={onSearchClick}
              className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
          )}

          {showNotifications && onNotificationClick && (
            <button
              onClick={onNotificationClick}
              className="relative p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>
          )}

          {showSettings && onSettingsClick && (
            <button
              onClick={onSettingsClick}
              className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};