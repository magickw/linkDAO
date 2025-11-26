import { useCallback } from 'react';
import { useAuth as useAuthContext } from '@/context/AuthContext';
import { UserRole, ROLE_PERMISSIONS } from '@/types/auth';

export const useAuth = () => {
  return useAuthContext();
};

export const usePermissions = () => {
  const { user } = useAuth();

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    // Check for wildcard permission (super_admin has all permissions)
    if (user.permissions?.includes('*')) return true;
    return user.permissions?.includes(permission) || false;
  }, [user]);

  const hasRole = useCallback((role: UserRole): boolean => {
    if (!user) return false;
    return user.role === role;
  }, [user]);

  const hasAnyRole = useCallback((roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  const isAdmin = useCallback((): boolean => {
    return hasAnyRole(['admin', 'super_admin']);
  }, [hasAnyRole]);

  const isModerator = useCallback((): boolean => {
    return hasAnyRole(['moderator', 'admin', 'super_admin']);
  }, [hasAnyRole]);

  const canModerateContent = useCallback((): boolean => {
    return hasPermission('content.moderate');
  }, [hasPermission]);

  const canManageUsers = useCallback((): boolean => {
    return hasPermission('users.suspend') || hasPermission('users.ban');
  }, [hasPermission]);

  const canResolveDisputes = useCallback((): boolean => {
    return hasPermission('disputes.resolve');
  }, [hasPermission]);

  const canReviewSellers = useCallback((): boolean => {
    return hasPermission('marketplace.seller_review');
  }, [hasPermission]);

  const getUserPermissions = useCallback((): string[] => {
    if (!user) return [];
    return user.permissions || [];
  }, [user]);

  const getRolePermissions = useCallback((role: UserRole): string[] => {
    const roleConfig = ROLE_PERMISSIONS.find(r => r.role === role);
    return roleConfig?.permissions || [];
  }, []);

  return {
    user,
    hasPermission,
    hasRole,
    hasAnyRole,
    isAdmin,
    isModerator,
    canModerateContent,
    canManageUsers,
    canResolveDisputes,
    canReviewSellers,
    getUserPermissions,
    getRolePermissions,
  };
};

export default useAuth;