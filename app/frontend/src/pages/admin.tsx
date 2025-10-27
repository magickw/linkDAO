import React, { useEffect } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { EnhancedAdminDashboard } from '@/components/Admin/EnhancedAdminDashboard';
import { GlassPanel } from '@/design-system';

const AdminPage: NextPage = () => {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Redirect to admin login if not authenticated
    if (!isLoading && !isAuthenticated) {
      router.replace('/admin-login?redirect=' + encodeURIComponent(router.asPath));
    } else if (!isLoading && isAuthenticated && user) {
      // Check if user has admin privileges
      const isAdminUser = ['admin', 'super_admin', 'moderator'].includes(user.role);
      if (!isAdminUser) {
        router.replace('/');
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <GlassPanel className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white">Loading admin dashboard...</p>
        </GlassPanel>
      </div>
    );
  }

  // Don't render dashboard if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  return <EnhancedAdminDashboard />;
};

export default AdminPage;
