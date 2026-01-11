import React, { useState, useCallback } from 'react';
import { X, UserPlus, Settings, Shield, Trash2, Edit3, Camera, Users, Search, Crown, AlertTriangle, LogOut, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../design-system';

interface GroupMember {
  address: string;
  role: 'admin' | 'moderator' | 'member';
  nickname?: string;
  joinedAt: Date;
  isOnline?: boolean;
}

interface GroupData {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  members: GroupMember[];
  createdAt: Date;
  isPublic?: boolean;
  maxMembers?: number;
}

interface GroupManagementProps {
  group: GroupData;
  currentUserAddress: string;
  currentUserRole: 'admin' | 'moderator' | 'member';
  onAddMember: (address: string) => Promise<void>;
  onRemoveMember: (address: string) => Promise<void>;
  onUpdateRole: (address: string, role: 'admin' | 'moderator' | 'member') => Promise<void>;
  onUpdateGroupSettings: (settings: { name?: string; description?: string; avatar?: string }) => Promise<void>;
  onLeaveGroup: () => Promise<void>;
  onClose: () => void;
}

export const GroupManagement: React.FC<GroupManagementProps> = ({
  group,
  currentUserAddress,
  currentUserRole,
  onAddMember,
  onRemoveMember,
  onUpdateRole,
  onUpdateGroupSettings,
  onLeaveGroup,
  onClose
}) => {
  const [newMemberAddress, setNewMemberAddress] = useState('');
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [groupName, setGroupName] = useState(group.name);
  const [groupDescription, setGroupDescription] = useState(group.description || '');
  const [memberSearch, setMemberSearch] = useState('');
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'remove' | 'leave'; address?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'settings'>('members');

  const isAdmin = currentUserRole === 'admin';
  const isModerator = currentUserRole === 'moderator' || isAdmin;

  const handleAddMember = useCallback(async () => {
    if (!newMemberAddress.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      await onAddMember(newMemberAddress.trim());
      setNewMemberAddress('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setIsLoading(false);
    }
  }, [newMemberAddress, onAddMember]);

  const handleRemoveMember = useCallback(async (address: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await onRemoveMember(address);
      setConfirmAction(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setIsLoading(false);
    }
  }, [onRemoveMember]);

  const handleUpdateRole = useCallback(async (address: string, role: 'admin' | 'moderator' | 'member') => {
    setIsLoading(true);
    setError(null);
    try {
      await onUpdateRole(address, role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setIsLoading(false);
    }
  }, [onUpdateRole]);

  const handleSaveSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onUpdateGroupSettings({
        name: groupName,
        description: groupDescription
      });
      setIsEditingDetails(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  }, [groupName, groupDescription, onUpdateGroupSettings]);

  const handleLeaveGroup = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onLeaveGroup();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave group');
    } finally {
      setIsLoading(false);
    }
  }, [onLeaveGroup, onClose]);

  const filteredMembers = group.members.filter(member =>
    member.address.toLowerCase().includes(memberSearch.toLowerCase()) ||
    member.nickname?.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const displayedMembers = showAllMembers ? filteredMembers : filteredMembers.slice(0, 5);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-3 h-3 text-yellow-500" />;
      case 'moderator': return <Shield className="w-3 h-3 text-blue-500" />;
      default: return null;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'moderator': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="group-management bg-white dark:bg-gray-800 rounded-xl shadow-xl max-h-[80vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            {group.avatar ? (
              <img src={group.avatar} alt={group.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <Users className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{group.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{group.members.length} members</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('members')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'members'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Members
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'settings'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4 inline mr-2" />
          Settings
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400">
          <AlertTriangle size={16} />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'members' ? (
          <div className="space-y-4">
            {/* Add Member (Admin/Moderator only) */}
            {isModerator && (
              <div className="p-4 bg-gray-100 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Add New Member
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMemberAddress}
                    onChange={(e) => setNewMemberAddress(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter wallet address (0x...)"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAddMember}
                    disabled={!newMemberAddress.trim() || isLoading}
                  >
                    <UserPlus size={16} />
                  </Button>
                </div>
              </div>
            )}

            {/* Search Members */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500"
                placeholder="Search members..."
              />
            </div>

            {/* Members List */}
            <div className="space-y-2">
              {displayedMembers.map((member) => (
                <div
                  key={member.address}
                  className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700/30 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-white">
                          {member.address.slice(2, 4).toUpperCase()}
                        </span>
                      </div>
                      {member.isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {member.nickname || truncateAddress(member.address)}
                        </p>
                        {member.address.toLowerCase() === currentUserAddress.toLowerCase() && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">(You)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${getRoleBadge(member.role)}`}>
                          {getRoleIcon(member.role)}
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Member Actions (Admin only, can't modify self) */}
                  {isAdmin && member.address.toLowerCase() !== currentUserAddress.toLowerCase() && (
                    <div className="flex items-center gap-1">
                      {/* Role Dropdown */}
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateRole(member.address, e.target.value as 'admin' | 'moderator' | 'member')}
                        disabled={isLoading}
                        className="text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500"
                      >
                        <option value="member">Member</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={() => setConfirmAction({ type: 'remove', address: member.address })}
                        className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Remove member"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {filteredMembers.length > 5 && (
                <button
                  onClick={() => setShowAllMembers(!showAllMembers)}
                  className="w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center justify-center gap-1 transition-colors"
                >
                  {showAllMembers ? (
                    <>
                      <ChevronUp size={16} />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown size={16} />
                      Show All ({filteredMembers.length - 5} more)
                    </>
                  )}
                </button>
              )}

              {filteredMembers.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">No members found</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Group Details */}
            <div className="space-y-4">
              {/* Avatar Upload (Admin only) */}
              {isAdmin && (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      {group.avatar ? (
                        <img src={group.avatar} alt={group.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <Users className="w-8 h-8 text-white" />
                      )}
                    </div>
                    <button className="absolute bottom-0 right-0 p-1 bg-blue-500 rounded-full text-white hover:bg-blue-600 transition-colors">
                      <Camera size={12} />
                    </button>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Click to change group avatar
                  </div>
                </div>
              )}

              {/* Group Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Group Name</label>
                {isEditingDetails && isAdmin ? (
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    placeholder="Enter group name"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white px-3 py-2 bg-gray-100 dark:bg-gray-700/30 rounded-lg">{group.name}</p>
                )}
              </div>

              {/* Group Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                {isEditingDetails && isAdmin ? (
                  <textarea
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
                    placeholder="Add a group description..."
                    rows={3}
                  />
                ) : (
                  <p className="text-gray-700 dark:text-gray-300 px-3 py-2 bg-gray-100 dark:bg-gray-700/30 rounded-lg min-h-[60px]">
                    {group.description || 'No description'}
                  </p>
                )}
              </div>

              {/* Edit/Save Buttons (Admin only) */}
              {isAdmin && (
                <div className="flex gap-2">
                  {isEditingDetails ? (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveSettings}
                        disabled={isLoading}
                      >
                        Save Changes
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditingDetails(false);
                          setGroupName(group.name);
                          setGroupDescription(group.description || '');
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingDetails(true)}
                    >
                      <Edit3 size={14} className="mr-2" />
                      Edit Details
                    </Button>
                  )}
                </div>
              )}

              {/* Group Info */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Created</span>
                  <span className="text-gray-900 dark:text-white">{new Date(group.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Members</span>
                  <span className="text-gray-900 dark:text-white">{group.members.length} / {group.maxMembers || 100}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Visibility</span>
                  <span className="text-gray-900 dark:text-white">{group.isPublic ? 'Public' : 'Private'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="outline"
          className="w-full text-red-500 dark:text-red-400 border-red-500/30 dark:border-red-400/30 hover:bg-red-500/10"
          onClick={() => setConfirmAction({ type: 'leave' })}
        >
          <LogOut size={16} className="mr-2" />
          Leave Group
        </Button>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {confirmAction.type === 'leave' ? 'Leave Group?' : 'Remove Member?'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {confirmAction.type === 'leave'
                ? 'Are you sure you want to leave this group? You may need to be invited again to rejoin.'
                : `Are you sure you want to remove ${truncateAddress(confirmAction.address || '')} from the group?`}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1 bg-red-500 hover:bg-red-600"
                onClick={() => {
                  if (confirmAction.type === 'leave') {
                    handleLeaveGroup();
                  } else if (confirmAction.address) {
                    handleRemoveMember(confirmAction.address);
                  }
                }}
                disabled={isLoading}
              >
                {confirmAction.type === 'leave' ? 'Leave' : 'Remove'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
