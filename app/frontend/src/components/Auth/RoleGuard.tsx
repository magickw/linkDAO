import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { UserRole, Permission } from '@/types/auth';

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredPermissions?: Permission[];
  requireAll?: boolean; // If true, user must have ALL permissions. If false, user needs ANY permission
  fallback?: React.ReactNode;
}

export function RoleGuard({ 
  children, 
  requiredRole, 
  requiredPermissions = [], 
  requireAll = false,
  fallback = null 
}: RoleGuardProps) {
  const { user, hasRole, hasPermission } = useAuth();

  if (!user) {
    return <>{fallback}</>;
  }

  // Check role requirement
  if (requiredRole && !hasRole(requiredRole)) {
    return <>{fallback}</>;
  }

  // Check permission requirements
  if (requiredPermissions.length > 0) {
    const hasRequiredPermissions = requireAll
      ? requiredPermissions.every(permission => hasPermission(permission))
      : requiredPermissions.some(permission => hasPermission(permission));

    if (!hasRequiredPermissions) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

// Convenience components for common role checks
export const AdminOnly = ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
  <RoleGuard requiredRole="admin" fallback={fallback}>
    {children}
  </RoleGuard>
);

export const ModeratorOnly = ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
  <RoleGuard requiredRole="moderator" fallback={fallback}>
    {children}
  </RoleGuard>
);

export const SuperAdminOnly = ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
  <RoleGuard requiredRole="super_admin" fallback={fallback}>
    {children}
  </RoleGuard>
);

// Hook for conditional rendering based on permissions
export function useRoleGuard() {
  const { user, hasRole, hasPermission } = useAuth();

  const canAccess = (requiredRole?: UserRole, requiredPermissions: Permission[] = [], requireAll = false) => {
    if (!user) return false;

    if (requiredRole && !hasRole(requiredRole)) {
      return false;
    }

    if (requiredPermissions.length > 0) {
      return requireAll
        ? requiredPermissions.every(permission => hasPermission(permission))
        : requiredPermissions.some(permission => hasPermission(permission));
    }

    return true;
  };

  return { canAccess };
}