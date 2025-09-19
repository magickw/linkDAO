import React, { useState, useEffect } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { AuthUser, UserRole } from '@/types/auth';
import { Button, GlassPanel } from '@/design-system';

export function UserManagement() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
  const [actionModal, setActionModal] = useState<{
    type: 'suspend' | 'role' | null;
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
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  });

  useEffect(() => {
    loadUsers();
  }, [filters, pagination.page]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminService.getUsers({
        ...filters,
        page: pagination.page,
        limit: 20
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

  return (
    <div className="space-y-6">
      {/* Filters */}
      <GlassPanel className="p-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-white font-medium">Filters:</span>
          </div>
          
          <select
            value={filters.role}
            onChange={(e) => setFilters({ ...filters, role: e.target.value })}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
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
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>

          <select
            value={filters.kycStatus}
            onChange={(e) => setFilters({ ...filters, kycStatus: e.target.value })}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
          >
            <option value="">All KYC Status</option>
            <option value="none">None</option>
            <option value="pending">Pending</option>
            <option value="basic">Basic</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>

          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white flex-1"
            />
          </div>
        </div>
      </GlassPanel>

      {/* Users List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Users ({pagination.total})</h2>
          
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <GlassPanel key={i} className="p-4 animate-pulse">
                  <div className="h-20 bg-white/10 rounded"></div>
                </GlassPanel>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <GlassPanel
                  key={user.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedUser?.id === user.id ? 'ring-2 ring-purple-500' : 'hover:bg-white/5'
                  }`}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">
                          {user.handle.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium">{user.handle}</span>
                          {user.ens && (
                            <span className="text-blue-400 text-sm">({user.ens})</span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm mb-1">{user.address}</p>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                            {user.role.replace('_', ' ')}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getKycStatusColor(user.kycStatus)}`}>
                            KYC: {user.kycStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {user.isSuspended ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium text-red-400 bg-red-500/20">
                          Suspended
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium text-green-400 bg-green-500/20">
                          Active
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        Joined {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </GlassPanel>
              ))}
            </div>
          )}

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
                <div className="flex gap-2">
                  <Button
                    onClick={() => setActionModal({ type: 'role', user: selectedUser })}
                    variant="outline"
                    size="small"
                  >
                    Change Role
                  </Button>
                  {selectedUser.isSuspended ? (
                    <Button
                      onClick={() => handleUnsuspend(selectedUser.id)}
                      variant="primary"
                      size="small"
                    >
                      Unsuspend
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setActionModal({ type: 'suspend', user: selectedUser })}
                      variant="outline"
                      size="small"
                    >
                      Suspend
                    </Button>
                  )}
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
    </div>
  );
}