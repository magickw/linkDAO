import React, { useState, useCallback } from 'react';
import { X, Users, ChevronRight, ChevronLeft, Camera, Search, Check, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '../../design-system';
import { unifiedMessagingService } from '../../services/unifiedMessagingService';

interface GroupCreationWizardProps {
  currentUserAddress: string;
  onClose: () => void;
  onGroupCreated: (groupId: string) => void;
}

interface SelectedMember {
  address: string;
  nickname?: string;
}

type WizardStep = 'details' | 'members' | 'review';

export const GroupCreationWizard: React.FC<GroupCreationWizardProps> = ({
  currentUserAddress,
  onClose,
  onGroupCreated
}) => {
  // State
  const [currentStep, setCurrentStep] = useState<WizardStep>('details');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupAvatar, setGroupAvatar] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<SelectedMember[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation
  const isDetailsValid = groupName.trim().length >= 3;
  const isMembersValid = selectedMembers.length >= 1; // At least 1 other member

  const steps: { key: WizardStep; label: string; description: string }[] = [
    { key: 'details', label: 'Group Details', description: 'Name and description' },
    { key: 'members', label: 'Add Members', description: 'Invite participants' },
    { key: 'review', label: 'Review', description: 'Confirm and create' }
  ];

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);

  const handleAddMember = useCallback((address: string) => {
    const trimmedAddress = address.trim();
    if (!trimmedAddress) return;

    // Validate address format (basic check)
    if (!trimmedAddress.startsWith('0x') || trimmedAddress.length !== 42) {
      setError('Invalid wallet address format');
      return;
    }

    // Check if already added
    if (selectedMembers.some(m => m.address.toLowerCase() === trimmedAddress.toLowerCase())) {
      setError('This member is already added');
      return;
    }

    // Check if it's the current user
    if (trimmedAddress.toLowerCase() === currentUserAddress.toLowerCase()) {
      setError("You'll be added as admin automatically");
      return;
    }

    setSelectedMembers(prev => [...prev, { address: trimmedAddress }]);
    setMemberSearchQuery('');
    setError(null);
  }, [selectedMembers, currentUserAddress]);

  const handleRemoveMember = useCallback((address: string) => {
    setSelectedMembers(prev => prev.filter(m => m.address.toLowerCase() !== address.toLowerCase()));
  }, []);

  const handleCreateGroup = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await unifiedMessagingService.createGroupConversation({
        name: groupName.trim(),
        description: groupDescription.trim() || undefined,
        participants: selectedMembers.map(m => m.address),
        isPublic
      });

      onGroupCreated(result.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setIsLoading(false);
    }
  }, [groupName, groupDescription, selectedMembers, isPublic, onGroupCreated, onClose]);

  const goNext = () => {
    if (currentStep === 'details' && isDetailsValid) {
      setCurrentStep('members');
    } else if (currentStep === 'members' && isMembersValid) {
      setCurrentStep('review');
    }
  };

  const goBack = () => {
    if (currentStep === 'members') {
      setCurrentStep('details');
    } else if (currentStep === 'review') {
      setCurrentStep('members');
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Group</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{steps[currentStepIndex].description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.key}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      index < currentStepIndex
                        ? 'bg-green-500 text-white'
                        : index === currentStepIndex
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {index < currentStepIndex ? <Check size={16} /> : index + 1}
                  </div>
                  <span
                    className={`text-sm hidden sm:block ${
                      index === currentStepIndex ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
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
          {currentStep === 'details' && (
            <div className="space-y-6">
              {/* Avatar */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    {groupAvatar ? (
                      <img
                        src={groupAvatar}
                        alt="Group avatar"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <Users className="w-12 h-12 text-white" />
                    )}
                  </div>
                  <button className="absolute bottom-0 right-0 p-2 bg-blue-500 rounded-full text-white hover:bg-blue-600 transition-colors shadow-lg">
                    <Camera size={16} />
                  </button>
                </div>
              </div>

              {/* Group Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Group Name <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter group name..."
                  maxLength={50}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{groupName.length}/50 characters</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description <span className="text-gray-500">(optional)</span>
                </label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                  placeholder="What is this group about?"
                  rows={3}
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{groupDescription.length}/200 characters</p>
              </div>

              {/* Visibility */}
              <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-700/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Public Group</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Anyone can find and join this group</p>
                </div>
                <button
                  onClick={() => setIsPublic(!isPublic)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    isPublic ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                      isPublic ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {currentStep === 'members' && (
            <div className="space-y-4">
              {/* Add Member Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Add Members
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <input
                      type="text"
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddMember(memberSearchQuery);
                        }
                      }}
                      className="w-full pl-10 pr-4 py-3 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500"
                      placeholder="Enter wallet address (0x...)"
                    />
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => handleAddMember(memberSearchQuery)}
                    disabled={!memberSearchQuery.trim()}
                  >
                    <Plus size={20} />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Add at least 1 member. You'll be the group admin automatically.
                </p>
              </div>

              {/* Selected Members */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Members ({selectedMembers.length})
                  </label>
                </div>

                {selectedMembers.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                    <Users className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-2" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No members added yet</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Add wallet addresses above</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedMembers.map((member) => (
                      <div
                        key={member.address}
                        className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-white">
                              {member.address.slice(2, 4).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {member.nickname || truncateAddress(member.address)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{member.address}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveMember(member.address)}
                          className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 'review' && (
            <div className="space-y-6">
              {/* Group Preview */}
              <div className="flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-700/30 rounded-lg">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  {groupAvatar ? (
                    <img
                      src={groupAvatar}
                      alt="Group avatar"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <Users className="w-8 h-8 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{groupName}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedMembers.length + 1} members (including you)
                  </p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      isPublic
                        ? 'bg-green-500/10 text-green-500 dark:text-green-400'
                        : 'bg-gray-500/10 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {isPublic ? 'Public' : 'Private'}
                  </span>
                </div>
              </div>

              {/* Description */}
              {groupDescription && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <p className="text-gray-600 dark:text-gray-400 text-sm p-3 bg-gray-100 dark:bg-gray-700/30 rounded-lg">
                    {groupDescription}
                  </p>
                </div>
              )}

              {/* Members List */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Members
                </label>
                <div className="space-y-2">
                  {/* Current user as admin */}
                  <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-700/30 rounded-lg">
                    <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-white">
                        {currentUserAddress.slice(2, 4).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {truncateAddress(currentUserAddress)}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 rounded-full border border-yellow-500/20">
                      Admin (You)
                    </span>
                  </div>

                  {/* Other members */}
                  {selectedMembers.map((member) => (
                    <div
                      key={member.address}
                      className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-700/30 rounded-lg"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-white">
                          {member.address.slice(2, 4).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {member.nickname || truncateAddress(member.address)}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-0.5 bg-gray-500/10 text-gray-500 dark:text-gray-400 rounded-full border border-gray-500/20">
                        Member
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <Button
            variant="outline"
            onClick={currentStep === 'details' ? onClose : goBack}
          >
            <ChevronLeft size={16} className="mr-1" />
            {currentStep === 'details' ? 'Cancel' : 'Back'}
          </Button>

          {currentStep === 'review' ? (
            <Button
              variant="primary"
              onClick={handleCreateGroup}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">...</span>
                  Creating...
                </>
              ) : (
                <>
                  Create Group
                  <Check size={16} className="ml-1" />
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={goNext}
              disabled={
                (currentStep === 'details' && !isDetailsValid) ||
                (currentStep === 'members' && !isMembersValid)
              }
            >
              Next
              <ChevronRight size={16} className="ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupCreationWizard;
