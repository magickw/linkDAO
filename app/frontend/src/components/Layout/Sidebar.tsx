import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  Home, 
  ShoppingBag, 
  Users, 
  MessageSquare, 
  Settings,
  TrendingUp,
  Wallet,
  Bell,
  Search,
  Plus
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AdminNavigation } from '@/components/Navigation/AdminNavigation';
import { GlassPanel } from '@/design-system';

export function Sidebar() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const mainLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
    { href: '/social', label: 'Social', icon: Users },
    { href: '/governance', label: 'Governance', icon: TrendingUp },
    { href: '/messages', label: 'Messages', icon: MessageSquare, requireAuth: true },
    { href: '/wallet', label: 'Wallet', icon: Wallet, requireAuth: true },
  ];

  const userLinks = [
    { href: '/profile', label: 'Profile', icon: Users, requireAuth: true },
    { href: '/notifications', label: 'Notifications', icon: Bell, requireAuth: true },
    { href: '/settings', label: 'Settings', icon: Settings, requireAuth: true },
  ];

  const isActiveLink = (href: string) => {
    if (href === '/') {
      return router.pathname === '/';
    }
    return router.pathname.startsWith(href);
  };

  const NavLink = ({ href, label, icon: Icon, requireAuth = false }: any) => {
    if (requireAuth && !isAuthenticated) {
      return null;
    }

    return (
      <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActiveLink(href)
            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
            : 'text-gray-300 hover:text-white hover:bg-white/5'
        }`}
      >
        <Icon className="w-4 h-4" />
        {label}
      </Link>
    );
  };

  return (
    <div className="w-64 h-screen bg-black/20 backdrop-blur-xl border-r border-white/10 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">LD</span>
          </div>
          <span className="text-white font-bold text-lg">LinkDAO</span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Main Navigation */}
        <div className="space-y-2">
          <div className="px-3 py-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Main
            </h3>
          </div>
          {mainLinks.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
        </div>

        {/* User Navigation */}
        {isAuthenticated && (
          <div className="space-y-2">
            <div className="px-3 py-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Account
              </h3>
            </div>
            {userLinks.map((link) => (
              <NavLink key={link.href} {...link} />
            ))}
          </div>
        )}

        {/* Admin Navigation */}
        <AdminNavigation />

        {/* Quick Actions */}
        {isAuthenticated && (
          <div className="space-y-2">
            <div className="px-3 py-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Quick Actions
              </h3>
            </div>
            <Link
              href="/marketplace/create"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Listing
            </Link>
            <Link
              href="/search"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Search className="w-4 h-4" />
              Search
            </Link>
          </div>
        )}
      </div>

      {/* User Info */}
      {isAuthenticated && user && (
        <div className="p-4 border-t border-white/10">
          <GlassPanel className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {user.handle.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium text-sm truncate">
                  {user.handle}
                </div>
                <div className="text-gray-400 text-xs capitalize">
                  {user.role.replace('_', ' ')}
                </div>
              </div>
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}