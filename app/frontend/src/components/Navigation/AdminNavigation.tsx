import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  Shield, 
  Users, 
  AlertTriangle, 
  ShoppingBag, 
  BarChart3,
  Settings,
  FileText,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { RoleGuard } from '@/components/Auth/RoleGuard';

export function AdminNavigation() {
  const router = useRouter();
  const { user } = useAuth();

  const adminLinks = [
    {
      href: '/admin',
      label: 'Admin Panel',
      icon: Shield,
      requiredRole: 'moderator' as const,
      description: 'Access admin dashboard'
    },
    {
      href: '/admin?tab=moderation',
      label: 'Moderation',
      icon: FileText,
      requiredRole: 'moderator' as const,
      description: 'Review content and posts'
    },
    {
      href: '/admin?tab=sellers',
      label: 'Seller Applications',
      icon: ShoppingBag,
      requiredRole: 'moderator' as const,
      description: 'Approve seller applications'
    },
    {
      href: '/admin?tab=disputes',
      label: 'Disputes',
      icon: AlertTriangle,
      requiredRole: 'moderator' as const,
      description: 'Resolve user disputes'
    },
    {
      href: '/admin?tab=users',
      label: 'User Management',
      icon: Users,
      requiredRole: 'admin' as const,
      description: 'Manage user accounts'
    },
    {
      href: '/admin?tab=analytics',
      label: 'Analytics',
      icon: BarChart3,
      requiredRole: 'admin' as const,
      description: 'View platform analytics'
    }
  ];

  if (!user || user.role === 'user') {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="px-3 py-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Administration
        </h3>
      </div>
      
      {adminLinks.map((link) => (
        <RoleGuard key={link.href} requiredRole={link.requiredRole}>
          <Link
            href={link.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group ${
              router.asPath === link.href || (link.href === '/admin' && router.pathname === '/admin')
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <link.icon className="w-4 h-4" />
            <div className="flex-1">
              <div className="font-medium">{link.label}</div>
              <div className="text-xs text-gray-400 group-hover:text-gray-300">
                {link.description}
              </div>
            </div>
          </Link>
        </RoleGuard>
      ))}
      
      {/* Role Badge */}
      <div className="px-3 py-2 mt-4">
        <div className="flex items-center gap-2 p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
          <Shield className="w-4 h-4 text-purple-400" />
          <div>
            <div className="text-xs font-medium text-purple-400 capitalize">
              {user.role.replace('_', ' ')}
            </div>
            <div className="text-xs text-gray-400">
              Admin privileges
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}