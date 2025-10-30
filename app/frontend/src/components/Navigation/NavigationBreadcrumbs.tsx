import React from 'react';
import Link from 'next/link';
import { NavigationBreadcrumb } from '@/types/navigation';

interface NavigationBreadcrumbsProps {
  breadcrumbs: NavigationBreadcrumb[];
  className?: string;
}

export default function NavigationBreadcrumbs({ 
  breadcrumbs, 
  className = '' 
}: NavigationBreadcrumbsProps) {
  if (breadcrumbs.length === 0) return null;

  return (
    <nav className={`flex items-center space-x-1 text-sm ${className}`} aria-label="Breadcrumb">
      {breadcrumbs.map((breadcrumb, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && (
            <svg 
              className="w-4 h-4 text-gray-400 dark:text-gray-500 mx-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          
          {breadcrumb.href && !breadcrumb.isActive ? (
            <Link
              href={breadcrumb.href}
              className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              {breadcrumb.icon && (
                <span className="mr-1 text-base" role="img" aria-label={breadcrumb.label}>
                  {breadcrumb.icon}
                </span>
              )}
              <span className="hover:underline">{breadcrumb.label}</span>
            </Link>
          ) : (
            <span className={`flex items-center ${
              breadcrumb.isActive 
                ? 'text-gray-900 dark:text-white font-medium' 
                : 'text-gray-500 dark:text-gray-400'
            }`}>
              {breadcrumb.icon && (
                <span className="mr-1 text-base" role="img" aria-label={breadcrumb.label}>
                  {breadcrumb.icon}
                </span>
              )}
              {breadcrumb.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}

// Helper function to generate breadcrumbs based on current route
export const generateBreadcrumbs = (
  pathname: string, 
  communityName?: string,
  postTitle?: string
): NavigationBreadcrumb[] => {
  const breadcrumbs: NavigationBreadcrumb[] = [];
  
  // Always start with Home
  breadcrumbs.push({
    label: 'Home',
    href: '/',
    isActive: pathname === '/',
    icon: '🏠'
  });

  // Handle different routes
  if (pathname.startsWith('/dao/')) {
    const communityId = pathname.split('/')[2];
    breadcrumbs.push({
      label: 'Communities',
      href: '/communities',
      isActive: false,
      icon: '👥'
    });
    
    if (communityId && communityName) {
      breadcrumbs.push({
        label: communityName,
        href: `/dao/${communityId}`,
        isActive: pathname === `/dao/${communityId}`,
        icon: '🏛️'
      });
    }
  } else if (pathname.startsWith('/governance')) {
    breadcrumbs.push({
      label: 'Governance',
      href: '/governance',
      isActive: pathname === '/governance',
      icon: '🗳️'
    });
  } else if (pathname.startsWith('/marketplace')) {
    breadcrumbs.push({
      label: 'Marketplace',
      href: '/marketplace',
      isActive: pathname === '/marketplace',
      icon: '🛒'
    });
  } else if (pathname.startsWith('/search')) {
    breadcrumbs.push({
      label: 'Search & Discovery',
      href: '/search',
      isActive: pathname === '/search',
      icon: '🔍'
    });
  } else if (pathname.startsWith('/messaging')) {
    // Removed messaging breadcrumb as we now use FloatingChatWidget

  } else if (pathname.startsWith('/profile')) {
    breadcrumbs.push({
      label: 'Profile',
      href: '/profile',
      isActive: pathname === '/profile',
      icon: '👤'
    });
  }

  // Handle post-specific breadcrumbs
  if (postTitle && pathname.includes('/post/')) {
    breadcrumbs.push({
      label: postTitle.length > 30 ? `${postTitle.substring(0, 30)}...` : postTitle,
      isActive: true,
      icon: '📄'
    });
  }

  return breadcrumbs;
};