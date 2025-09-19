import { useAuth as useAuthContext } from '@/context/AuthContext';
import { UserRole, ROLE_PERMISSIONS } from '@/types/auth';

export const useAuth = () => {
  return useAuthContext();
};

export const usePermissions = () => {
  const { user } = useAuth();
  
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return user.permissions?.includes(permission) || false;
  };
  
  const hasRole = (role: UserRole): boolean => {
    if (!user) return false;
    return user.role === role;
  };
  
  const hasAnyRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };
  
  const isAdmin = (): boolean => {
    return hasAnyRole(['admin', 'super_admin']);
  };
  
  const isModerator = (): boolean => {
    return hasAnyRole(['moderator', 'admin', 'super_admin']);
  };
  
  const canModerateContent = (): boolean => {
    return hasPermission('content.moderate');
  };
  
  const canManageUsers = (): boolean => {
    return hasPermission('users.suspend') || hasPermission('users.ban');
  };
  
  const canResolveDisputes = (): boolean => {
    return hasPermission('disputes.resolve');
  };
  
  const canReviewSellers = (): boolean => {
    return hasPermission('marketplace.seller_review');
  };
  
  const getUserPermissions = (): string[] => {
    if (!user) return [];
    return user.permissions || [];
  };
  
  const getRolePermissions = (role: UserRole): string[] => {
    const roleConfig = ROLE_PERMISSIONS.find(r => r.role === role);
    return roleConfig?.permissions || [];
  };
  
  return {
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