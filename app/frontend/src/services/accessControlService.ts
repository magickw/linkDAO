/**
 * Access Control Service
 * Role-based permissions for sensitive operations
 */

export type Permission =
  | 'wallet:read'
  | 'wallet:create'
  | 'wallet:import'
  | 'wallet:delete'
  | 'wallet:sign'
  | 'wallet:export'
  | 'transaction:read'
  | 'transaction:create'
  | 'transaction:sign'
  | 'admin:all'
  | 'admin:users'
  | 'admin:audit'
  | 'community:read'
  | 'community:create'
  | 'community:moderate'
  | 'content:read'
  | 'content:create'
  | 'content:moderate'
  | 'content:delete';

export type Role = 'user' | 'moderator' | 'admin' | 'super_admin';

export interface RolePermissions {
  role: Role;
  permissions: Permission[];
  description: string;
}

export interface UserPermissions {
  userId: string;
  roles: Role[];
  customPermissions: Permission[];
}

/**
 * Default role permissions
 */
const ROLE_PERMISSIONS: Record<Role, RolePermissions> = {
  user: {
    role: 'user',
    permissions: [
      'wallet:read',
      'wallet:create',
      'wallet:import',
      'wallet:sign',
      'wallet:export',
      'transaction:read',
      'transaction:create',
      'transaction:sign',
      'community:read',
      'community:create',
      'content:read',
      'content:create',
    ],
    description: 'Standard user permissions'
  },
  moderator: {
    role: 'moderator',
    permissions: [
      'wallet:read',
      'wallet:create',
      'wallet:import',
      'wallet:sign',
      'wallet:export',
      'transaction:read',
      'transaction:create',
      'transaction:sign',
      'community:read',
      'community:create',
      'community:moderate',
      'content:read',
      'content:create',
      'content:moderate',
      'admin:audit',
    ],
    description: 'Moderator permissions with content moderation'
  },
  admin: {
    role: 'admin',
    permissions: [
      'wallet:read',
      'wallet:create',
      'wallet:import',
      'wallet:sign',
      'wallet:export',
      'wallet:delete',
      'transaction:read',
      'transaction:create',
      'transaction:sign',
      'community:read',
      'community:create',
      'community:moderate',
      'content:read',
      'content:create',
      'content:moderate',
      'content:delete',
      'admin:all',
      'admin:users',
      'admin:audit',
    ],
    description: 'Administrator permissions with full access'
  },
  super_admin: {
    role: 'super_admin',
    permissions: [
      'wallet:read',
      'wallet:create',
      'wallet:import',
      'wallet:sign',
      'wallet:export',
      'wallet:delete',
      'transaction:read',
      'transaction:create',
      'transaction:sign',
      'community:read',
      'community:create',
      'community:moderate',
      'content:read',
      'content:create',
      'content:moderate',
      'content:delete',
      'admin:all',
      'admin:users',
      'admin:audit',
    ],
    description: 'Super administrator with all permissions'
  }
};

/**
 * Access Control Service
 */
export class AccessControlService {
  private static instance: AccessControlService;
  private userPermissions: Map<string, UserPermissions> = new Map();
  private rolePermissions: Map<Role, Permission[]> = new Map();

  private constructor() {
    // Initialize role permissions
    Object.entries(ROLE_PERMISSIONS).forEach(([role, config]) => {
      this.rolePermissions.set(role as Role, config.permissions);
    });
  }

  static getInstance(): AccessControlService {
    if (!AccessControlService.instance) {
      AccessControlService.instance = new AccessControlService();
    }
    return AccessControlService.instance;
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(userId: string, permission: Permission): boolean {
    const userPerms = this.userPermissions.get(userId);
    if (!userPerms) {
      return false;
    }

    // Check custom permissions
    if (userPerms.customPermissions.includes(permission)) {
      return true;
    }

    // Check role permissions
    for (const role of userPerms.roles) {
      const rolePerms = this.rolePermissions.get(role);
      if (rolePerms && rolePerms.includes(permission)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if user has all specified permissions
   */
  hasAllPermissions(userId: string, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(userId, permission));
  }

  /**
   * Check if user has at least one of the specified permissions
   */
  hasAnyPermission(userId: string, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(userId, permission));
  }

  /**
   * Check if user has a specific role
   */
  hasRole(userId: string, role: Role): boolean {
    const userPerms = this.userPermissions.get(userId);
    return userPerms ? userPerms.roles.includes(role) : false;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(userId: string, roles: Role[]): boolean {
    const userPerms = this.userPermissions.get(userId);
    return userPerms ? roles.some(role => userPerms.roles.includes(role)) : false;
  }

  /**
   * Assign a role to a user
   */
  assignRole(userId: string, role: Role): void {
    const userPerms = this.userPermissions.get(userId) || {
      userId,
      roles: [],
      customPermissions: []
    };

    if (!userPerms.roles.includes(role)) {
      userPerms.roles.push(role);
      this.userPermissions.set(userId, userPerms);
    }
  }

  /**
   * Remove a role from a user
   */
  removeRole(userId: string, role: Role): void {
    const userPerms = this.userPermissions.get(userId);
    if (userPerms) {
      userPerms.roles = userPerms.roles.filter(r => r !== role);
      this.userPermissions.set(userId, userPerms);
    }
  }

  /**
   * Assign a custom permission to a user
   */
  assignPermission(userId: string, permission: Permission): void {
    const userPerms = this.userPermissions.get(userId) || {
      userId,
      roles: [],
      customPermissions: []
    };

    if (!userPerms.customPermissions.includes(permission)) {
      userPerms.customPermissions.push(permission);
      this.userPermissions.set(userId, userPerms);
    }
  }

  /**
   * Remove a custom permission from a user
   */
  removePermission(userId: string, permission: Permission): void {
    const userPerms = this.userPermissions.get(userId);
    if (userPerms) {
      userPerms.customPermissions = userPerms.customPermissions.filter(p => p !== permission);
      this.userPermissions.set(userId, userPerms);
    }
  }

  /**
   * Get all permissions for a user
   */
  getUserPermissions(userId: string): Permission[] {
    const userPerms = this.userPermissions.get(userId);
    if (!userPerms) {
      return [];
    }

    const permissions: Set<Permission> = new Set();

    // Add custom permissions
    userPerms.customPermissions.forEach(p => permissions.add(p));

    // Add role permissions
    userPerms.roles.forEach(role => {
      const rolePerms = this.rolePermissions.get(role);
      if (rolePerms) {
        rolePerms.forEach(p => permissions.add(p));
      }
    });

    return Array.from(permissions);
  }

  /**
   * Get user roles
   */
  getUserRoles(userId: string): Role[] {
    const userPerms = this.userPermissions.get(userId);
    return userPerms ? userPerms.roles : [];
  }

  /**
   * Check if user is admin
   */
  isAdmin(userId: string): boolean {
    return this.hasAnyRole(userId, ['admin', 'super_admin']);
  }

  /**
   * Check if user is moderator or higher
   */
  isModeratorOrHigher(userId: string): boolean {
    return this.hasAnyRole(userId, ['moderator', 'admin', 'super_admin']);
  }

  /**
   * Set user permissions
   */
  setUserPermissions(userId: string, permissions: UserPermissions): void {
    this.userPermissions.set(userId, permissions);
  }

  /**
   * Remove user permissions
   */
  removeUserPermissions(userId: string): void {
    this.userPermissions.delete(userId);
  }

  /**
   * Get all role permissions
   */
  getRolePermissions(role: Role): Permission[] {
    return this.rolePermissions.get(role) || [];
  }

  /**
   * Get all available roles
   */
  getAvailableRoles(): Role[] {
    return Object.keys(ROLE_PERMISSIONS) as Role[];
  }

  /**
   * Get role description
   */
  getRoleDescription(role: Role): string {
    return ROLE_PERMISSIONS[role]?.description || '';
  }

  /**
   * Clear all user permissions
   */
  clearAll(): void {
    this.userPermissions.clear();
  }

  /**
   * Export user permissions (for backup/persistence)
   */
  exportUserPermissions(userId: string): UserPermissions | null {
    return this.userPermissions.get(userId) || null;
  }

  /**
   * Import user permissions (for restore)
   */
  importUserPermissions(userId: string, permissions: UserPermissions): void {
    this.userPermissions.set(userId, permissions);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalUsers: number;
    usersByRole: Record<Role, number>;
    totalPermissions: number;
  } {
    const usersByRole: Record<Role, number> = {
      user: 0,
      moderator: 0,
      admin: 0,
      super_admin: 0
    };

    this.userPermissions.forEach(userPerms => {
      userPerms.roles.forEach(role => {
        usersByRole[role]++;
      });
    });

    return {
      totalUsers: this.userPermissions.size,
      usersByRole,
      totalPermissions: this.rolePermissions.size
    };
  }
}

export const accessControlService = AccessControlService.getInstance();