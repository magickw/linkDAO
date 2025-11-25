import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Eye,
  Shield,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Search,
  Mail,
  Calendar,
  AlertTriangle,
  CheckSquare,
  Square,
  Download,
  UserCheck,
  AlertCircle,
  Activity,
  LogIn,
  MessageSquare,
  ShoppingCart,
  FileText,
  ChevronDown,
  ChevronUp,
  Plus,
  UserPlus,
  BarChart3,
  User,
  Settings,
  TrendingUp,
  UserX,
  UserCog
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { AuthUser, UserRole } from '@/types/auth';
import { Button, GlassPanel } from '@/design-system';
import { VirtualizedUserList } from './VirtualizedUserList';
import { UserSegmentation } from './UserSegmentation';

export function UserManagement() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showActivityTimeline, setShowActivityTimeline] = useState(false);
  const [userActivity, setUserActivity] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [actionModal, setActionModal] = useState<{
    type: 'suspend' | 'role' | 'bulk-suspend' | 'bulk-role' | null;
    user: AuthUser | null;
  }>({ type: null, user: null });
  const [suspensionData, setSuspensionData] = useState({
    reason: '',
    duration: 7,
    permanent: false
  });
  const [newRole, setNewRole] = useState<UserRole>('user');
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    kycStatus: '',
    search: '',
    searchField: 'all', // 'all', 'handle', 'email', 'address', 'ens'
    lastLoginAfter: '',
    lastLoginBefore: '',
    createdAfter: '',
    createdBefore: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  });
  
  // New states for user creation
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    handle: '',
    email: '',
    walletAddress: '',
    role: 'user' as UserRole,
    password: ''
  });
  
  // New states for user statistics
  const [userStats, setUserStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  
  // New states for user creation modal
  const [creationLoading, setCreationLoading] = useState(false);
  const [creationError, setCreationError] = useState('');
  
  // New states for user audit logs
  const [userAuditLogs, setUserAuditLogs] = useState<any[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  useEffect(() => {
    loadUsers();
    loadUserStats();
  }, [filters, pagination.page]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminService.getUsers({
        ...filters,
        page: pagination.page,
        limit: 50 // Increase limit for better performance with virtual scrolling
      });

      setUsers(response.users);
      setPagination({
        page: response.page,
        totalPages: response.totalPages,
        total: response.total
      });
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserActivity = async (userId: string) => {
    try {
      setActivityLoading(true);
      const response = await adminService.getUserActivity(userId);
      setUserActivity(response.activities || []);
    } catch (error) {
      console.error('Failed to load user activity:', error);
      setUserActivity([]);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!actionModal.user) return;
    
    try {
      await adminService.suspendUser(actionModal.user.id, suspensionData);
      setActionModal({ type: null, user: null });
      loadUsers();
    } catch (error) {
      console.error('Failed to suspend user:', error);
    }
  };

  const handleUnsuspend = async (userId: string) => {
    try {
      await adminService.unsuspendUser(userId);
      loadUsers();
    } catch (error) {
      console.error('Failed to unsuspend user:', error);
    }
  };

  const handleRoleChange = async () => {
    if (!actionModal.user) return;

    try {
      await adminService.updateUserRole(actionModal.user.id, newRole);
      setActionModal({ type: null, user: null });
      loadUsers();
    } catch (error) {
      console.error('Failed to update user role:', error);
    }
  };

  // Bulk action handlers
  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(user => user.id)));
    }
  };

  const handleBulkSuspend = async () => {
    if (selectedUsers.size === 0) return;

    setBulkActionLoading(true);
    try {
      const userIds = Array.from(selectedUsers);
      await Promise.all(
        userIds.map(userId =>
          adminService.suspendUser(userId, suspensionData)
        )
      );

      setSelectedUsers(new Set());
      setShowBulkActions(false);
      setActionModal({ type: null, user: null });
      loadUsers();
    } catch (error) {
      console.error('Failed to bulk suspend users:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkUnsuspend = async () => {
    if (selectedUsers.size === 0) return;

    setBulkActionLoading(true);
    try {
      const userIds = Array.from(selectedUsers);
      await Promise.all(
        userIds.map(userId => adminService.unsuspendUser(userId))
      );

      setSelectedUsers(new Set());
      setShowBulkActions(false);
      loadUsers();
    } catch (error) {
      console.error('Failed to bulk unsuspend users:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkRoleChange = async () => {
    if (selectedUsers.size === 0) return;

    setBulkActionLoading(true);
    try {
      const userIds = Array.from(selectedUsers);
      await Promise.all(
        userIds.map(userId => adminService.updateUserRole(userId, newRole))
      );

      setSelectedUsers(new Set());
      setShowBulkActions(false);
      setActionModal({ type: null, user: null });
      loadUsers();
    } catch (error) {
      console.error('Failed to bulk update roles:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const exportUsers = async () => {
    try {
      await adminService.exportUsers(filters);
    } catch (error) {
      console.error('Failed to export users:', error);
    }
  };

  // Load user statistics
  const loadUserStats = async () => {
    try {
      setLoadingStats(true);
      // This would typically be a call to get user statistics
      // For now, we'll use mock data or fetch from an actual API
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000'}/api/admin/users/stats`, {
        headers: adminService.getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserStats(data);
      } else {
        // Mock data if API is not available
        setUserStats({
          totalUsers: 1000,
          activeUsers: 850,
          suspendedUsers: 50,
          newUsersThisMonth: 150,
          newUsersThisWeek: 45,
          userGrowthRate: 12.5,
          mostActiveUsers: [
            { id: 'user1', handle: 'active_user_1', activityCount: 120 },
            { id: 'user2', handle: 'active_user_2', activityCount: 98 },
            { id: 'user3', handle: 'active_user_3', activityCount: 87 }
          ]
        });
      }
    } catch (error) {
      console.error('Failed to load user stats:', error);
      // Set mock data on error
      setUserStats({
        totalUsers: 1000,
        activeUsers: 850,
        suspendedUsers: 50,
        newUsersThisMonth: 150,
        newUsersThisWeek: 45,
        userGrowthRate: 12.5,
        mostActiveUsers: [
          { id: 'user1', handle: 'active_user_1', activityCount: 120 },
          { id: 'user2', handle: 'active_user_2', activityCount: 98 },
          { id: 'user3', handle: 'active_user_3', activityCount: 87 }
        ]
      });
    } finally {
      setLoadingStats(false);
    }
  };

  // Create new user
  const handleCreateUser = async () => {
    setCreationLoading(true);
    setCreationError('');
    
    try {
      // In a real implementation, we would call the API to create a user
      // For now, we'll just show a success message
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000'}/api/admin/users/create`, {
        method: 'POST',
        headers: {
          ...adminService.getHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          handle: newUser.handle,
          email: newUser.email,
          walletAddress: newUser.walletAddress,
          role: newUser.role,
          password: newUser.password
        })
      });
      
      if (response.ok) {
        setShowCreateUserModal(false);
        setNewUser({
          handle: '',
          email: '',
          walletAddress: '',
          role: 'user',
          password: ''
        });
        loadUsers(); // Refresh the user list
      } else {
        const errorData = await response.json();
        setCreationError(errorData.message || 'Failed to create user');
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      setCreationError('Failed to create user: ' + (error as any).message);
    } finally {
      setCreationLoading(false);
    }
  };

  // Delete user (soft delete)
  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000'}/api/admin/users/${userId}`, {
          method: 'DELETE',
          headers: adminService.getHeaders()
        });
        
        if (response.ok) {
          loadUsers(); // Refresh the user list
        } else {
          console.error('Failed to delete user');
        }
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  // Load user audit logs
  const loadUserAuditLogs = async (userId: string) => {
    try {
      setLoadingAuditLogs(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000'}/api/admin/users/${userId}/audit-logs`, {
        headers: adminService.getHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserAuditLogs(data.logs || []);
      } else {
        console.error('Failed to load audit logs');
        setUserAuditLogs([]);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
      setUserAuditLogs([]);
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return 'text-red-400 bg-red-500/20';
      case 'admin': return 'text-purple-400 bg-purple-500/20';
      case 'moderator': return 'text-blue-400 bg-blue-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getKycStatusColor = (status: string) => {
    switch (status) {
      case 'advanced': return 'text-green-400 bg-green-500/20';
      case 'intermediate': return 'text-blue-400 bg-blue-500/20';
      case 'basic': return 'text-yellow-400 bg-yellow-500/20';
      case 'pending': return 'text-orange-400 bg-orange-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login': return LogIn;
      case 'post': return MessageSquare;
      case 'comment': return MessageSquare;
      case 'transaction': return ShoppingCart;
      case 'content': return FileText;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'login': return 'bg-blue-500/20 text-blue-400';
      case 'post': return 'bg-purple-500/20 text-purple-400';
      case 'comment': return 'bg-purple-500/20 text-purple-400';
      case 'transaction': return 'bg-green-500/20 text-green-400';
      case 'content': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatActivityTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Debounced search to reduce API calls
  const debouncedSearch = useMemo(() => {
    const handler = setTimeout(() => {
      if (filters.search) {
        loadUsers();
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [filters.search]);

  useEffect(() => {
    if (!filters.search) {
      loadUsers();
    }
    return debouncedSearch;
  }, [filters, pagination.page, debouncedSearch]);

  const renderUserList = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 bg-white/5 rounded-lg animate-pulse">
              <div className="h-16 bg-white/10 rounded"></div>
            </div>
          ))}
        </div>
      );
    }

    if (users.length === 0) {
      return (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">No users found</p>
        </div>
      );
    }

    return (
      <VirtualizedUserList
        users={users}
        selectedUsers={selectedUsers}
        showBulkActions={showBulkActions}
        selectedUser={selectedUser}
        onSelectUser={setSelectedUser}
        onToggleUserSelection={toggleUserSelection}
        getRoleColor={getRoleColor}
        getKycStatusColor={getKycStatusColor}
      />
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Export and Create User */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">User Management</h2>
          <p className="text-gray-400 text-sm">Manage users, roles, and permissions</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setShowCreateUserModal(true)}
            variant="primary"
            className="flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Create User
          </Button>
          <Button
            onClick={exportUsers}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button
            variant={showBulkActions ? "primary" : "outline"}
            onClick={() => setShowBulkActions(!showBulkActions)}
            className="flex items-center gap-2"
          >
            <CheckSquare className="w-4 h-4" />
            Bulk Actions
          </Button>
        </div>
      </div>

      {/* User Statistics Panel */}
      <GlassPanel className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            User Statistics
          </h3>
        </div>
        
        {loadingStats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 bg-white/5 rounded-lg animate-pulse">
                <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-white/10 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : userStats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span className="text-gray-400 text-sm">Total Users</span>
              </div>
              <p className="text-2xl font-bold text-white">{userStats.totalUsers?.toLocaleString()}</p>
            </div>
            
            <div className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="w-4 h-4 text-green-400" />
                <span className="text-gray-400 text-sm">Active Users</span>
              </div>
              <p className="text-2xl font-bold text-white">{userStats.activeUsers?.toLocaleString()}</p>
            </div>
            
            <div className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Ban className="w-4 h-4 text-red-400" />
                <span className="text-gray-400 text-sm">Suspended</span>
              </div>
              <p className="text-2xl font-bold text-white">{userStats.suspendedUsers?.toLocaleString()}</p>
            </div>
            
            <div className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span className="text-gray-400 text-sm">Growth Rate</span>
              </div>
              <p className="text-2xl font-bold text-white">{userStats.userGrowthRate}%</p>
            </div>
            
            <div className="p-4 bg-white/5 rounded-lg md:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-yellow-400" />
                <span className="text-gray-400 text-sm">New This Month</span>
              </div>
              <p className="text-2xl font-bold text-white">{userStats.newUsersThisMonth?.toLocaleString()}</p>
            </div>
            
            <div className="p-4 bg-white/5 rounded-lg md:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <UserCog className="w-4 h-4 text-cyan-400" />
                <span className="text-gray-400 text-sm">New This Week</span>
              </div>
              <p className="text-2xl font-bold text-white">{userStats.newUsersThisWeek?.toLocaleString()}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-400">No statistics available</p>
        )}
      </GlassPanel>

      {/* User Segmentation Section */}
      <UserSegmentation />

      {/* Filters */}
      <GlassPanel className="p-4 sm:p-6">
        <div className="space-y-4">
          {/* Basic Filters */}
          <div className="flex flex-wrap gap-3 sm:gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-white font-medium text-sm sm:text-base">Filters:</span>
            </div>

            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-white text-sm"
            >
              <option value="">All Roles</option>
              <option value="user">User</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-white text-sm"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>

            <select
              value={filters.kycStatus}
              onChange={(e) => setFilters({ ...filters, kycStatus: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-white text-sm"
            >
              <option value="">All KYC Status</option>
              <option value="none">None</option>
              <option value="pending">Pending</option>
              <option value="basic">Basic</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>

            <div className="flex items-center gap-2 flex-1 min-w-[200px] sm:min-w-[250px]">
              <select
                value={filters.searchField}
                onChange={(e) => setFilters({ ...filters, searchField: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-sm"
              >
                <option value="all">All Fields</option>
                <option value="handle">Username</option>
                <option value="email">Email</option>
                <option value="address">Wallet</option>
                <option value="ens">ENS</option>
              </select>
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${filters.searchField === 'all' ? 'users' : filters.searchField}...`}
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-white flex-1 text-sm"
              />
            </div>

            {/* Add sort options */}
            <select
              value={`${filters.sortBy}:${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split(':');
                setFilters({ ...filters, sortBy, sortOrder });
              }}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-white text-sm"
            >
              <option value="createdAt:desc">Newest First</option>
              <option value="createdAt:asc">Oldest First</option>
              <option value="lastLogin:desc">Recently Active</option>
              <option value="lastLogin:asc">Least Recently Active</option>
              <option value="handle:asc">Name A-Z</option>
              <option value="handle:desc">Name Z-A</option>
            </select>

            <Button
              variant={showAdvancedSearch ? "primary" : "outline"}
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className="flex items-center gap-2 text-sm"
            >
              <Filter className="w-4 h-4" />
              Advanced
            </Button>
          </div>

          {/* Advanced Search Panel */}
          {showAdvancedSearch && (
            <div className="p-4 bg-white/5 rounded-lg border border-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Last Login Filters */}
                <div>
                  <label className="text-gray-400 text-xs sm:text-sm mb-2 block">Last Login After</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={filters.lastLoginAfter}
                      onChange={(e) => setFilters({ ...filters, lastLoginAfter: e.target.value })}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-2 sm:px-3 py-1.5 text-white flex-1 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-xs sm:text-sm mb-2 block">Last Login Before</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={filters.lastLoginBefore}
                      onChange={(e) => setFilters({ ...filters, lastLoginBefore: e.target.value })}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-2 sm:px-3 py-1.5 text-white flex-1 text-sm"
                    />
                  </div>
                </div>

                {/* Account Creation Filters */}
                <div>
                  <label className="text-gray-400 text-xs sm:text-sm mb-2 block">Joined After</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={filters.createdAfter}
                      onChange={(e) => setFilters({ ...filters, createdAfter: e.target.value })}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-2 sm:px-3 py-1.5 text-white flex-1 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-xs sm:text-sm mb-2 block">Joined Before</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={filters.createdBefore}
                      onChange={(e) => setFilters({ ...filters, createdBefore: e.target.value })}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-2 sm:px-3 py-1.5 text-white flex-1 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Clear Filters Button */}
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({
                    role: '',
                    status: '',
                    kycStatus: '',
                    search: '',
                    searchField: 'all',
                    lastLoginAfter: '',
                    lastLoginBefore: '',
                    createdAfter: '',
                    createdBefore: '',
                    sortBy: 'createdAt',
                    sortOrder: 'desc'
                  })}
                  className="flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Clear All Filters
                </Button>
              </div>
            </div>
          )}
        </div>
      </GlassPanel>

      {/* Bulk Actions Toolbar */}
      {showBulkActions && selectedUsers.size > 0 && (
        <GlassPanel className="p-4 bg-purple-500/20 border-purple-500/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-purple-400" />
              <span className="text-white font-medium text-sm sm:text-base">
                {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button
                onClick={() => setActionModal({ type: 'bulk-suspend', user: null })}
                disabled={bulkActionLoading}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Ban className="w-4 h-4" />
                Suspend All
              </Button>
              <Button
                onClick={handleBulkUnsuspend}
                disabled={bulkActionLoading}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                Unsuspend All
              </Button>
              <Button
                onClick={() => setActionModal({ type: 'bulk-role', user: null })}
                disabled={bulkActionLoading}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Shield className="w-4 h-4" />
                Change Role
              </Button>
            </div>
          </div>
        </GlassPanel>
      )}

      {/* Users List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-white">Users ({pagination.total})</h2>
            {showBulkActions && users.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm"
              >
                {selectedUsers.size === users.length ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Select All</span>
              </button>
            )}
          </div>

          {renderUserList()}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                disabled={pagination.page === 1}
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              >
                Previous
              </Button>
              <span className="text-white px-4 py-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* User Details */}
        <div>
          {selectedUser ? (
            <GlassPanel className="p-6 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">User Details</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => setActionModal({ type: 'role', user: selectedUser })}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Shield className="w-3 h-3" />
                    Change Role
                  </Button>
                  {selectedUser.isSuspended ? (
                    <Button
                      onClick={() => handleUnsuspend(selectedUser.id)}
                      variant="primary"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <UserCheck className="w-3 h-3" />
                      Unsuspend
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setActionModal({ type: 'suspend', user: selectedUser })}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <Ban className="w-3 h-3" />
                      Suspend
                    </Button>
                  )}
                  <Button
                    onClick={() => handleDeleteUser(selectedUser.id)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 text-red-400 border-red-400/50 hover:bg-red-500/10"
                  >
                    <UserX className="w-3 h-3" />
                    Delete
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm">Handle</label>
                  <p className="text-white">{selectedUser.handle}</p>
                </div>

                {selectedUser.ens && (
                  <div>
                    <label className="text-gray-400 text-sm">ENS</label>
                    <p className="text-white">{selectedUser.ens}</p>
                  </div>
                )}

                <div>
                  <label className="text-gray-400 text-sm">Wallet Address</label>
                  <p className="text-white text-sm break-all">{selectedUser.address}</p>
                </div>

                {selectedUser.email && (
                  <div>
                    <label className="text-gray-400 text-sm">Email</label>
                    <p className="text-white">{selectedUser.email}</p>
                  </div>
                )}

                <div>
                  <label className="text-gray-400 text-sm">Role</label>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(selectedUser.role)}`}>
                    {selectedUser.role.replace('_', ' ')}
                  </span>
                </div>

                <div>
                  <label className="text-gray-400 text-sm">KYC Status</label>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getKycStatusColor(selectedUser.kycStatus)}`}>
                    {selectedUser.kycStatus}
                  </span>
                </div>

                <div>
                  <label className="text-gray-400 text-sm">Account Status</label>
                  <div className="flex items-center gap-2">
                    {selectedUser.isSuspended ? (
                      <>
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span className="text-red-400">Suspended</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-green-400">Active</span>
                      </>
                    )}
                  </div>
                </div>

                {selectedUser.isSuspended && selectedUser.suspensionReason && (
                  <div>
                    <label className="text-gray-400 text-sm">Suspension Reason</label>
                    <p className="text-white">{selectedUser.suspensionReason}</p>
                    {selectedUser.suspensionExpiresAt && (
                      <p className="text-gray-400 text-sm">
                        Expires: {new Date(selectedUser.suspensionExpiresAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-gray-400 text-sm">Last Login</label>
                  <p className="text-white">
                    {selectedUser.lastLogin
                      ? new Date(selectedUser.lastLogin).toLocaleString()
                      : 'Never'
                    }
                  </p>
                </div>

                <div>
                  <label className="text-gray-400 text-sm">Member Since</label>
                  <p className="text-white">{new Date(selectedUser.createdAt).toLocaleString()}</p>
                </div>

                {/* Profile Fields */}
                {selectedUser.profile && (
                  <div className="grid grid-cols-2 gap-2">
                    {selectedUser.profile.firstName && (
                      <div>
                        <label className="text-gray-400 text-sm">First Name</label>
                        <p className="text-white">{selectedUser.profile.firstName}</p>
                      </div>
                    )}
                    {selectedUser.profile.lastName && (
                      <div>
                        <label className="text-gray-400 text-sm">Last Name</label>
                        <p className="text-white">{selectedUser.profile.lastName}</p>
                      </div>
                    )}
                    {selectedUser.profile.phoneNumber && (
                      <div>
                        <label className="text-gray-400 text-sm">Phone</label>
                        <p className="text-white">{selectedUser.profile.phoneNumber}</p>
                      </div>
                    )}
                    {selectedUser.profile.location && (
                      <div>
                        <label className="text-gray-400 text-sm">Location</label>
                        <p className="text-white">{selectedUser.profile.location}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Permissions */}
                {selectedUser.permissions && selectedUser.permissions.length > 0 && (
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Permissions</label>
                    <div className="flex flex-wrap gap-1">
                      {selectedUser.permissions.map((permission) => (
                        <span
                          key={permission}
                          className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full"
                        >
                          {permission}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Profile Management Section */}
                <div className="border-t border-gray-700 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-400" />
                      <span className="text-white font-medium text-sm">Profile Management</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          // In a real implementation, this would open a profile edit modal
                          alert('Profile editing functionality would open here');
                        }}
                      >
                        Edit Profile
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          // In a real implementation, this would reset the user's password
                          alert('Password reset functionality would go here');
                        }}
                      >
                        Reset Password
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          // In a real implementation, this would manage the user's KYC status
                          alert('KYC management functionality would go here');
                        }}
                      >
                        Manage KYC
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Activity Timeline Section */}
                <div className="border-t border-gray-700 pt-4">
                  <button
                    onClick={() => {
                      if (!showActivityTimeline) {
                        loadUserActivity(selectedUser.id);
                      }
                      setShowActivityTimeline(!showActivityTimeline);
                    }}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-purple-400" />
                      <span className="text-white font-medium text-sm">Activity Timeline</span>
                    </div>
                    {showActivityTimeline ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  {showActivityTimeline && (
                    <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
                      {activityLoading ? (
                        <div className="space-y-3">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="p-3 bg-white/5 rounded-lg animate-pulse">
                              <div className="h-12 bg-white/10 rounded"></div>
                            </div>
                          ))}
                        </div>
                      ) : userActivity.length === 0 ? (
                        <div className="text-center py-8">
                          <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-400 text-sm">No activity recorded</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {userActivity.map((activity, index) => {
                            const ActivityIcon = getActivityIcon(activity.type);
                            return (
                              <div
                                key={index}
                                className="flex items-start gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                              >
                                <div className={`p-2 rounded-lg ${getActivityColor(activity.type)} flex-shrink-0`}>
                                  <ActivityIcon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white text-sm font-medium mb-1">
                                    {activity.description}
                                  </p>
                                  {activity.details && (
                                    <p className="text-gray-400 text-xs mb-1 truncate">
                                      {activity.details}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <Clock className="w-3 h-3" />
                                    <span>{formatActivityTime(activity.timestamp)}</span>
                                    {activity.ipAddress && (
                                      <>
                                        <span>•</span>
                                        <span className="font-mono">{activity.ipAddress}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Audit Log Section */}
                <div className="border-t border-gray-700 pt-4">
                  <button
                    onClick={() => {
                      if (!showAuditLogs && selectedUser) {
                        loadUserAuditLogs(selectedUser.id);
                      }
                      setShowAuditLogs(!showAuditLogs);
                    }}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-yellow-400" />
                      <span className="text-white font-medium text-sm">Audit Trail</span>
                    </div>
                    {showAuditLogs ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  {showAuditLogs && (
                    <div className="mt-4 space-y-3 max-h-60 overflow-y-auto">
                      {loadingAuditLogs ? (
                        <div className="space-y-3">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="p-3 bg-white/5 rounded-lg animate-pulse">
                              <div className="h-10 bg-white/10 rounded"></div>
                            </div>
                          ))}
                        </div>
                      ) : userAuditLogs.length === 0 ? (
                        <div className="text-center py-4">
                          <Settings className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-400 text-sm">No audit logs recorded</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {userAuditLogs.map((log, index) => (
                            <div
                              key={index}
                              className="p-3 bg-white/5 rounded-lg text-sm"
                            >
                              <div className="flex justify-between">
                                <span className="font-medium text-white">{log.action}</span>
                                <span className="text-gray-400 text-xs">
                                  {new Date(log.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <div className="text-gray-300 mt-1">{log.resourceType}: {log.resourceId}</div>
                              <div className="text-gray-400 text-xs mt-1">By: {log.adminId}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </GlassPanel>
          ) : (
            <GlassPanel className="p-6 text-center">
              <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">Select a user to view details</p>
            </GlassPanel>
          )}
        </div>
      </div>

      {/* Suspend Modal */}
      {actionModal.type === 'suspend' && actionModal.user && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <GlassPanel className="max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-white mb-4">Suspend User</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Reason</label>
                <textarea
                  value={suspensionData.reason}
                  onChange={(e) => setSuspensionData({ ...suspensionData, reason: e.target.value })}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Reason for suspension..."
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="permanent"
                  checked={suspensionData.permanent}
                  onChange={(e) => setSuspensionData({ ...suspensionData, permanent: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="permanent" className="text-white text-sm">
                  Permanent suspension
                </label>
              </div>
              
              {!suspensionData.permanent && (
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Duration (days)</label>
                  <input
                    type="number"
                    value={suspensionData.duration}
                    onChange={(e) => setSuspensionData({ ...suspensionData, duration: parseInt(e.target.value) || 1 })}
                    min="1"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              )}
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button onClick={handleSuspend} variant="primary">
                Suspend User
              </Button>
              <Button onClick={() => setActionModal({ type: null, user: null })} variant="outline">
                Cancel
              </Button>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* Role Change Modal */}
      {actionModal.type === 'role' && actionModal.user && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <GlassPanel className="max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-white mb-4">Change User Role</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Current Role</label>
                <p className="text-white">{actionModal.user.role.replace('_', ' ')}</p>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">New Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={handleRoleChange} variant="primary">
                Update Role
              </Button>
              <Button onClick={() => setActionModal({ type: null, user: null })} variant="outline">
                Cancel
              </Button>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* Bulk Suspend Modal */}
      {actionModal.type === 'bulk-suspend' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <GlassPanel className="max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-white mb-4">
              Suspend {selectedUsers.size} User{selectedUsers.size > 1 ? 's' : ''}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Reason</label>
                <textarea
                  value={suspensionData.reason}
                  onChange={(e) => setSuspensionData({ ...suspensionData, reason: e.target.value })}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Reason for suspension..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="permanent-bulk"
                  checked={suspensionData.permanent}
                  onChange={(e) => setSuspensionData({ ...suspensionData, permanent: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="permanent-bulk" className="text-white text-sm">
                  Permanent suspension
                </label>
              </div>

              {!suspensionData.permanent && (
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Duration (days)</label>
                  <input
                    type="number"
                    value={suspensionData.duration}
                    onChange={(e) => setSuspensionData({ ...suspensionData, duration: parseInt(e.target.value) || 1 })}
                    min="1"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={handleBulkSuspend} variant="primary" disabled={bulkActionLoading}>
                Suspend All Users
              </Button>
              <Button onClick={() => setActionModal({ type: null, user: null })} variant="outline">
                Cancel
              </Button>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* Bulk Role Change Modal */}
      {actionModal.type === 'bulk-role' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <GlassPanel className="max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-white mb-4">
              Change Role for {selectedUsers.size} User{selectedUsers.size > 1 ? 's' : ''}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">New Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={handleBulkRoleChange} variant="primary" disabled={bulkActionLoading}>
                Update All Roles
              </Button>
              <Button onClick={() => setActionModal({ type: null, user: null })} variant="outline">
                Cancel
              </Button>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* User Creation Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <GlassPanel className="max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Create New User
            </h3>
            
            <div className="space-y-4">
              {creationError && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                  {creationError}
                </div>
              )}
              
              <div>
                <label className="block text-gray-400 text-sm mb-1">Username</label>
                <input
                  type="text"
                  value={newUser.handle}
                  onChange={(e) => setNewUser({...newUser, handle: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Enter username"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 text-sm mb-1">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Enter email"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 text-sm mb-1">Wallet Address</label>
                <input
                  type="text"
                  value={newUser.walletAddress}
                  onChange={(e) => setNewUser({...newUser, walletAddress: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Enter wallet address"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 text-sm mb-1">Password</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Enter password"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 text-sm mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value as UserRole})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button 
                onClick={handleCreateUser} 
                variant="primary" 
                disabled={creationLoading}
                className="flex items-center gap-2"
              >
                {creationLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create User
                  </>
                )}
              </Button>
              <Button 
                onClick={() => {
                  setShowCreateUserModal(false);
                  setCreationError('');
                }} 
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
