import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  UserMinus, 
  Users, 
  Check, 
  Loader2,
  AlertCircle,
  Crown,
  Shield
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { useCommunityInteractions } from '../../hooks/useCommunityInteractions';
import { CommunityMembershipService } from '../../services/communityMembershipService';

interface CommunityJoinButtonProps {
  communityId: string;
  communityName: string;
  memberCount: number;
  isPublic?: boolean;
  className?: string;
  onMembershipChange?: (isMember: boolean) => void;
}

export default function CommunityJoinButton({
  communityId,
  communityName,
  memberCount,
  isPublic = true,
  className = '',
  onMembershipChange
}: CommunityJoinButtonProps) {
  const { address } = useAccount();
  const { joinCommunity, leaveCommunity, loading, error, clearError } = useCommunityInteractions();
  
  const [isMember, setIsMember] = useState(false);
  const [memberRole, setMemberRole] = useState<string | null>(null);
  const [checkingMembership, setCheckingMembership] = useState(true);
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);

  // Check membership status on component mount and address change
  useEffect(() => {
    const checkMembership = async () => {
      if (!address) {
        setIsMember(false);
        setMemberRole(null);
        setCheckingMembership(false);
        return;
      }

      try {
        setCheckingMembership(true);
        const membership = await CommunityMembershipService.getMembership(communityId, address);
        
        if (membership && membership.isActive) {
          setIsMember(true);
          setMemberRole(membership.role);
        } else {
          setIsMember(false);
          setMemberRole(null);
        }
      } catch (err) {
        console.error('Error checking membership:', err);
        setIsMember(false);
        setMemberRole(null);
      } finally {
        setCheckingMembership(false);
      }
    };

    checkMembership();
  }, [address, communityId]);

  const handleJoin = async () => {
    if (!address) {
      return;
    }

    const success = await joinCommunity(communityId);
    
    if (success) {
      setIsMember(true);
      setMemberRole('member');
      onMembershipChange?.(true);
    }
  };

  const handleLeave = async () => {
    if (!address) {
      return;
    }

    const success = await leaveCommunity(communityId);
    
    if (success) {
      setIsMember(false);
      setMemberRole(null);
      setShowConfirmLeave(false);
      onMembershipChange?.(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
      case 'admin':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'moderator':
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'admin':
        return 'Admin';
      case 'moderator':
        return 'Moderator';
      default:
        return 'Member';
    }
  };

  // Don't show button if not connected
  if (!address) {
    return (
      <div className={`flex items-center space-x-2 text-gray-500 dark:text-gray-400 ${className}`}>
        <Users className="w-4 h-4" />
        <span className="text-sm">{memberCount.toLocaleString()} members</span>
      </div>
    );
  }

  // Show loading state while checking membership
  if (checkingMembership) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500 dark:text-gray-400">Checking...</span>
      </div>
    );
  }

  // Show private community message if not public and not a member
  if (!isPublic && !isMember) {
    return (
      <div className={`flex items-center space-x-2 text-gray-500 dark:text-gray-400 ${className}`}>
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">Private Community</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Error Display */}
      {error && (
        <div className="flex items-center space-x-1 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
          <button
            onClick={clearError}
            className="text-red-400 hover:text-red-600"
          >
            ×
          </button>
        </div>
      )}

      {/* Member Count */}
      <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
        <Users className="w-4 h-4" />
        <span className="text-sm">{memberCount.toLocaleString()}</span>
      </div>

      {/* Join/Leave Button */}
      {isMember ? (
        <div className="flex items-center space-x-2">
          {/* Member Status */}
          <div className="flex items-center space-x-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-sm">
            {memberRole && getRoleIcon(memberRole)}
            <Check className="w-4 h-4" />
            <span>{memberRole ? getRoleLabel(memberRole) : 'Member'}</span>
          </div>

          {/* Leave Button (only for regular members) */}
          {memberRole === 'member' && (
            <>
              {!showConfirmLeave ? (
                <button
                  onClick={() => setShowConfirmLeave(true)}
                  className="flex items-center space-x-1 px-3 py-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  disabled={loading}
                >
                  <UserMinus className="w-4 h-4" />
                  <span className="text-sm">Leave</span>
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Leave {communityName}?
                  </span>
                  <button
                    onClick={handleLeave}
                    disabled={loading}
                    className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded text-sm hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'Yes'
                    )}
                  </button>
                  <button
                    onClick={() => setShowConfirmLeave(false)}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    No
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <button
          onClick={handleJoin}
          disabled={loading || !isPublic}
          className="flex items-center space-x-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          <span className="text-sm">
            {loading ? 'Joining...' : 'Join Community'}
          </span>
        </button>
      )}
    </div>
  );
}