import React, { useState } from 'react';
import { Users, Search, Filter, MoreVertical, Ban, CheckCircle, AlertTriangle } from 'lucide-react';

export const MobileUserManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Mock data - replace with actual API call
  const users = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      status: 'active',
      joinDate: new Date('2024-01-15'),
      lastActive: new Date(),
      role: 'user',
      reputation: 85
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      status: 'suspended',
      joinDate: new Date('2024-02-20'),
      lastActive: new Date('2024-10-10'),
      role: 'seller',
      reputation: 42
    }
  ];

  const filters = [
    { id: 'all', label: 'All Users', count: users.length },
    { id: 'active', label: 'Active', count: 1 },
    { id: 'suspended', label: 'Suspended', count: 1 },
    { id: 'sellers', label: 'Sellers', count: 1 }
  ];

  const handleUserAction = (userId: string, action: string) => {
    console.log(`Action ${action} on user ${userId}`);
    // TODO: Implement actual user management actions
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
          const StatusIcon = getStatusIcon(user.status);
          
          return (
            <div key={user.id} className="bg-white/10 backdrop-blur-md rounded-lg p-4">
              {/* User Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{user.name}</h3>
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
                  <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                    <StatusIcon className="w-3 h-3" />
                    <span>{user.status}</span>
                  </div>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Role</p>
                  <p className="text-white text-sm capitalize">{user.role}</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Reputation</p>
                  <p className="text-white text-sm">{user.reputation}/100</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Joined</p>
                  <p className="text-white text-sm">{user.joinDate.toLocaleDateString()}</p>
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
                {user.status === 'active' ? (
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