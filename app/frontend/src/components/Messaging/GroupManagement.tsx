import React, { useState } from 'react';
import { X, UserPlus, Settings, Shield, Trash2, Edit3 } from 'lucide-react';
import { Button } from '../../design-system';

interface GroupManagementProps {
  conversationId: string;
  onAddMember: (address: string) => void;
  onRemoveMember: (address: string) => void;
  onUpdateRole: (address: string, role: 'admin' | 'member') => void;
  onUpdateGroupName: (name: string) => void;
  onLeaveGroup: () => void;
}

export const GroupManagement: React.FC<GroupManagementProps> = ({
  conversationId,
  onAddMember,
  onRemoveMember,
  onUpdateRole,
  onUpdateGroupName,
  onLeaveGroup
}) => {
  const [newMemberAddress, setNewMemberAddress] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [groupName, setGroupName] = useState('Group Chat');

  const handleAddMember = () => {
    if (newMemberAddress.trim()) {
      onAddMember(newMemberAddress.trim());
      setNewMemberAddress('');
    }
  };

  const handleUpdateGroupName = () => {
    onUpdateGroupName(groupName);
    setIsEditingName(false);
  };

  return (
    <div className="group-management">
      {/* Group Name */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-300">Group Name</label>
          {isEditingName ? (
            <div className="flex space-x-2">
              <button
                onClick={handleUpdateGroupName}
                className="text-sm text-green-500 hover:text-green-400"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditingName(false);
                  setGroupName('Group Chat');
                }}
                className="text-sm text-gray-400 hover:text-gray-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="text-sm text-blue-500 hover:text-blue-400"
            >
              <Edit3 size={14} />
            </button>
          )}
        </div>
        
        {isEditingName ? (
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            placeholder="Enter group name"
          />
        ) : (
          <p className="text-white">{groupName}</p>
        )}
      </div>

      {/* Add Member */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Add Member
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMemberAddress}
            onChange={(e) => setNewMemberAddress(e.target.value)}
            className="flex-1 px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            placeholder="Enter wallet address"
          />
          <Button 
            variant="primary" 
            size="sm"
            onClick={handleAddMember}
            disabled={!newMemberAddress.trim()}
          >
            <UserPlus size={16} />
          </Button>
        </div>
      </div>

      {/* Members List */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Members</h4>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {/* Mock members list */}
          {['0x1234...5678', '0x9876...5432', '0x5555...6666'].map((address, index) => (
            <div 
              key={address} 
              className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-white">
                    {address.slice(0, 4)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    {address}
                  </p>
                  <p className="text-xs text-gray-400">
                    {index === 0 ? 'Admin' : 'Member'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {index !== 0 && (
                  <>
                    <button
                      onClick={() => onUpdateRole(address, 'admin')}
                      className="p-1 text-gray-400 hover:text-blue-400 rounded"
                      title="Promote to admin"
                    >
                      <Shield size={16} />
                    </button>
                    <button
                      onClick={() => onRemoveMember(address)}
                      className="p-1 text-gray-400 hover:text-red-400 rounded"
                      title="Remove member"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Group Actions */}
      <div className="space-y-3">
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={onLeaveGroup}
        >
          <Settings size={16} className="mr-2" />
          Leave Group
        </Button>
      </div>
    </div>
  );
};