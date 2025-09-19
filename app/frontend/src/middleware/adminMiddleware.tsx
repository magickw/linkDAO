import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/auth';
import { GlassPanel } from '@/design-system';
import { Shield, AlertTriangle } from 'lucide-react';

interface AdminMiddlewareProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  redirectTo?: string;
}

export function AdminMiddleware({ 
  children, 
  requiredRole = 'moderator',
  redirectTo = '/'
}: AdminMiddlewareProps) {
  const { user, isAuthenticated, isLoading, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login?redirect=' + encodeURIComponent(router.asPath));
    } else if (!isLoading && isAuthenticated && !hasRole(requiredRole)) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, isLoading, hasRole, requiredRole, router, redirectTo]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <GlassPanel className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white">Verifying access...</p>
        </GlassPanel>
      </div>
    );
  }

  // Show access denied if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <GlassPanel className="p-8 text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Authentication Required</h2>
          <p className="text-gray-400 mb-4">
            Please log in to access this page.
          </p>
        </GlassPanel>
      </div>
    );
  }

  // Show access denied if insufficient permissions
  if (!hasRole(requiredRole)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <GlassPanel className="p-8 text-center max-w-md">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-4">
            You need {requiredRole.replace('_', ' ')} privileges to access this page.
          </p>
          <p className="text-sm text-gray-500">
            Your current role: {user?.role.replace('_', ' ')}
          </p>
        </GlassPanel>
      </div>
    );
  }

  // User has proper access, render children
  return <>{children}</>;
}

// Higher-order component for page-level protection
export function withAdminAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredRole: UserRole = 'moderator'
) {
  const WithAdminAuthComponent = (props: P) => {
    return (
      <AdminMiddleware requiredRole={requiredRole}>
        <WrappedComponent {...props} />
      </AdminMiddleware>
    );
  };

  WithAdminAuthComponent.displayName = `withAdminAuth(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithAdminAuthComponent;
}