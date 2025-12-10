import React, { useMemo } from 'react';
import { List } from 'react-virtualized';
import { AuthUser, UserRole } from '@/types/auth';
import { CheckSquare, Square } from 'lucide-react';

interface VirtualizedUserListProps {
  users: AuthUser[];
  selectedUsers: Set<string>;
  showBulkActions: boolean;
  selectedUser: AuthUser | null;
  onSelectUser: (user: AuthUser) => void;
  onToggleUserSelection: (userId: string) => void;
  getRoleColor: (role: UserRole) => string;
  getKycStatusColor: (status: string) => string;
}

const UserRow: React.FC<{
  index: number;
  style: React.CSSProperties;
  data: {
    users: AuthUser[];
    selectedUsers: Set<string>;
    showBulkActions: boolean;
    selectedUser: AuthUser | null;
    onSelectUser: (user: AuthUser) => void;
    onToggleUserSelection: (userId: string) => void;
    getRoleColor: (role: UserRole) => string;
    getKycStatusColor: (status: string) => string;
  };
}> = ({ index, style, data }) => {
  const {
    users,
    selectedUsers,
    showBulkActions,
    selectedUser,
    onSelectUser,
    onToggleUserSelection,
    getRoleColor,
    getKycStatusColor
  } = data;
  
  const user = users[index];
  const isSelected = selectedUsers.has(user.id);
  
  return (
    <div style={style} className="py-1">
      <div
        className={`bg-white/10 backdrop-blur-md rounded-lg p-4 cursor-pointer transition-colors ${
          selectedUser?.id === user.id ? 'ring-2 ring-purple-500' :
          isSelected ? 'ring-2 ring-blue-500 bg-blue-500/10' :
          'hover:bg-white/15'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Selection Checkbox */}
          {showBulkActions && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleUserSelection(user.id);
              }}
              className="mt-1 flex-shrink-0"
            >
              {isSelected ? (
                <CheckSquare className="w-5 h-5 text-blue-400" />
              ) : (
                <Square className="w-5 h-5 text-gray-400 hover:text-gray-300" />
              )}
            </button>
          )}

          {/* User Content */}
          <div className="flex-1 min-w-0" onClick={() => onSelectUser(user)}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">
                    {user.handle ? user.handle.charAt(0).toUpperCase() : '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-white font-medium text-sm sm:text-base">{user.handle || 'N/A'}</span>
                    {user.ens && (
                      <span className="text-blue-400 text-xs sm:text-sm">({user.ens})</span>
                    )}
                  </div>
                  <p className="text-gray-400 text-xs sm:text-sm mb-1 truncate">{user.address || 'N/A'}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                      {user.role ? user.role.replace('_', ' ') : 'Unknown'}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getKycStatusColor(user.kycStatus)}`}>
                      KYC: {user.kycStatus}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {user.isSuspended ? (
                  <span className="px-2 py-1 rounded-full text-xs font-medium text-red-400 bg-red-500/20 whitespace-nowrap">
                    Suspended
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded-full text-xs font-medium text-green-400 bg-green-500/20 whitespace-nowrap">
                    Active
                  </span>
                )}
                <span className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const VirtualizedUserList: React.FC<VirtualizedUserListProps> = ({
  users,
  selectedUsers,
  showBulkActions,
  selectedUser,
  onSelectUser,
  onToggleUserSelection,
  getRoleColor,
  getKycStatusColor
}) => {
  const rowRenderer = ({ index, key, style }: any) => {
    const user = users[index];
    return (
      <div key={key} style={style}>
        <UserRow
          index={index}
          style={{}}
          data={{
            users,
            selectedUsers,
            showBulkActions,
            selectedUser,
            onSelectUser,
            onToggleUserSelection,
            getRoleColor,
            getKycStatusColor,
          }}
        />
      </div>
    );
  };

  return (
    <List
      height={600}
      rowCount={users.length}
      rowHeight={180}
      rowRenderer={rowRenderer}
      width={1000}
    />
  );
};