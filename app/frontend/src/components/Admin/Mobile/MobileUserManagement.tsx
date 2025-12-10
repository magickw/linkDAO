import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, MoreVertical, Ban, CheckCircle, AlertTriangle } from 'lucide-react';
import { adminService } from '@/services/adminService';
import { AuthUser, UserRole } from '@/types/auth';

export const MobileUserManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.getUsers({});
      setUsers(response.users);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filters = [
    { id: 'all', label: 'All Users', count: users.length },
    { id: 'active', label: 'Active', count: users.filter(u => !u.isSuspended).length },
    { id: 'suspended', label: 'Suspended', count: users.filter(u => u.isSuspended).length },
    { id: 'sellers', label: 'Sellers', count: users.filter(u => u.role === 'seller' as UserRole).length }
  ];

  const handleUserAction = async (userId: string, action: string) => {
    try {
      switch (action) {
        case 'suspend':
          // Implement suspension logic
          console.log(`Suspending user ${userId}`);
          break;
        case 'activate':
          // Implement activation logic
          console.log(`Activating user ${userId}`);
          break;
        case 'view':
          // Implement view profile logic
          console.log(`Viewing profile for user ${userId}`);
          break;
        default:
          console.log(`Action ${action} on user ${userId}`);
      }
    } catch (err) {
      console.error(`Failed to perform action ${action} on user ${userId}:`, err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return CheckCircle;
      case 'suspended': return Ban;
      case 'pending': return AlertTriangle;
      default: return Users;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Search and Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
            <div className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg animate-pulse"></div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="px-3 py-1.5 rounded-full bg-white/10 animate-pulse"></div>
              ))}
            </div>

            <div className="p-2 bg-white/10 rounded-lg animate-pulse"></div>
          </div>
        </div>

        {/* User List */}
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white/10 backdrop-blur-md rounded-lg p-4 animate-pulse">
              <div className="h-20 bg-white/20 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Error Loading Users</h3>
        <p className="text-white/70 text-sm mb-4">{error}</p>
        <button
          onClick={loadUsers}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {filters.map((filterItem) => (
              <button
                key={filterItem.id}
                onClick={() => setFilter(filterItem.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === filterItem.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {filterItem.label} ({filterItem.count})
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4">
          <h3 className="text-white font-medium mb-3">Advanced Filters</h3>
          <div className="grid grid-cols-2 gap-3">
            <select className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm">
              <option value="">Role</option>
              <option value="user">User</option>
              <option value="seller">Seller</option>
              <option value="admin">Admin</option>
            </select>
            <select className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm">
              <option value="">Join Date</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
      )}

      {/* User List */}
      <div className="space-y-3">
        {users.map((user) => {
          const StatusIcon = getStatusIcon(user.isSuspended ? 'suspended' : 'active');
          const status = user.isSuspended ? 'suspended' : 'active';
          
          return (
            <div key={user.id} className="bg-white/10 backdrop-blur-md rounded-lg p-4">
              {/* User Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {user.handle ? user.handle.split(' ').map(n => n[0]).join('') : '?'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{user.handle || 'N/A'}</h3>
                    <p className="text-white/70 text-sm">{user.email}</p>
                  </div>
                </div>
                <button className="p-1 text-white/70 hover:text-white">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>

              {/* User Details */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-white/50 text-xs">Status</p>
                  <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                    <StatusIcon className="w-3 h-3" />
                    <span>{status}</span>
                  </div>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Role</p>
                  <p className="text-white text-sm capitalize">{user.role}</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Reputation</p>
                  <p className="text-white text-sm">N/A</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Joined</p>
                  <p className="text-white text-sm">{new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleUserAction(user.id, 'view')}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  View Profile
                </button>
                {status === 'active' ? (
                  <button
                    onClick={() => handleUserAction(user.id, 'suspend')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                  >
                    Suspend
                  </button>
                ) : (
                  <button
                    onClick={() => handleUserAction(user.id, 'activate')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                  >
                    Activate
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {users.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No users found</h3>
          <p className="text-white/70 text-sm">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}
    </div>
  );
};