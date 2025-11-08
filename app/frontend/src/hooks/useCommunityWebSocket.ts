/**
 * React Hook for Community WebSocket Integration
 * Provides easy-to-use interface for real-time community features
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { 
  communityWebSocketService, 
  CommunityRealTimeEvents 
} from '../services/communityWebSocketService';

// Hook options interface
interface UseCommunityWebSocketOptions {
  autoConnect?: boolean;
  communityId?: string;
  postId?: string;
  userId?: string;
  enableGovernance?: boolean;
  enableActivity?: boolean;
}

// Connection status interface
interface ConnectionStatus {
  isConnected: boolean;
  reconnectAttempts: number;
  lastConnected: number | null;
  queuedMessages: number;
}

/**
 * Main community WebSocket hook
 */
export function useCommunityWebSocket(options?: UseCommunityWebSocketOptions): any;
export function useCommunityWebSocket(communityId: string): any;
export function useCommunityWebSocket(optionsOrId?: UseCommunityWebSocketOptions | string) {
  // Handle overload: if it's a string, treat it as communityId
  const options = typeof optionsOrId === 'string'
    ? { communityId: optionsOrId, autoConnect: true }
    : optionsOrId || {};

  const {
    autoConnect = true,
    communityId,
    postId,
    userId,
    enableGovernance = false,
    enableActivity = false
  } = options;

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    reconnectAttempts: 0,
    lastConnected: null,
    queuedMessages: 0
  });

  const listenersRef = useRef<Map<string, Function>>(new Map());

  // Update connection status
  const updateConnectionStatus = useCallback(() => {
    const status = communityWebSocketService.getConnectionStatus();
    setConnectionStatus({
      isConnected: status.isConnected,
      reconnectAttempts: status.reconnectAttempts,
      lastConnected: status.lastConnected,
      queuedMessages: status.queuedMessages
    });
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    communityWebSocketService.connect();
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    communityWebSocketService.disconnect();
  }, []);

  // Subscribe to community
  const subscribeToCommunity = useCallback((id: string) => {
    communityWebSocketService.subscribeToCommunity(id);
  }, []);

  // Unsubscribe from community
  const unsubscribeFromCommunity = useCallback((id: string) => {
    communityWebSocketService.unsubscribeFromCommunity(id);
  }, []);

  // Subscribe to post
  const subscribeToPost = useCallback((id: string) => {
    communityWebSocketService.subscribeToPost(id);
  }, []);

  // Unsubscribe from post
  const unsubscribeFromPost = useCallback((id: string) => {
    communityWebSocketService.unsubscribeFromPost(id);
  }, []);

  // Send action
  const sendAction = useCallback((action: string, data: any) => {
    communityWebSocketService.sendAction(action, data);
  }, []);

  // Generic event listener
  const addEventListener = useCallback(<K extends keyof CommunityRealTimeEvents>(
    event: K,
    callback: (data: CommunityRealTimeEvents[K]) => void
  ) => {
    communityWebSocketService.on(event, callback);
    listenersRef.current.set(event, callback);
    
    return () => {
      communityWebSocketService.off(event, callback);
      listenersRef.current.delete(event);
    };
  }, []);

  // Setup connection status listeners
  useEffect(() => {
    const handleConnectionEstablished = () => updateConnectionStatus();
    const handleConnectionLost = () => updateConnectionStatus();
    const handleConnectionError = () => updateConnectionStatus();

    communityWebSocketService.on('connection:established', handleConnectionEstablished);
    communityWebSocketService.on('connection:lost', handleConnectionLost);
    communityWebSocketService.on('connection:error', handleConnectionError);

    // Initial status update
    updateConnectionStatus();

    return () => {
      communityWebSocketService.off('connection:established', handleConnectionEstablished);
      communityWebSocketService.off('connection:lost', handleConnectionLost);
      communityWebSocketService.off('connection:error', handleConnectionError);
    };
  }, [updateConnectionStatus]);

  // Auto-connect and subscribe based on options
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    if (communityId) {
      subscribeToCommunity(communityId);
      
      if (enableGovernance) {
        communityWebSocketService.subscribeToGovernance(communityId);
      }
    }

    if (postId) {
      subscribeToPost(postId);
    }

    if (userId && enableActivity) {
      communityWebSocketService.subscribeToWalletActivity(userId);
    }

    return () => {
      // Cleanup subscriptions
      if (communityId) {
        unsubscribeFromCommunity(communityId);
      }
      if (postId) {
        unsubscribeFromPost(postId);
      }
    };
  }, [
    autoConnect, 
    communityId, 
    postId, 
    userId, 
    enableGovernance, 
    enableActivity,
    connect,
    subscribeToCommunity,
    subscribeToPost,
    unsubscribeFromCommunity,
    unsubscribeFromPost
  ]);

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      listenersRef.current.forEach((callback, event) => {
        communityWebSocketService.off(event, callback);
      });
      listenersRef.current.clear();
    };
  }, []);

  return {
    connectionStatus,
    isConnected: connectionStatus.isConnected,
    connect,
    disconnect,
    subscribeToCommunity,
    unsubscribeFromCommunity,
    subscribeToPost,
    unsubscribeFromPost,
    sendAction,
    addEventListener
  };
}

/**
 * Hook for community-specific real-time updates
 */
export function useCommunityUpdates(communityId: string) {
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const { addEventListener } = useCommunityWebSocket({
    communityId,
    enableGovernance: true
  });

  useEffect(() => {
    const unsubscribeMemberJoined = addEventListener('community:member_joined', (data: any) => {
      if (data.communityId === communityId) {
        setMemberCount(data.memberCount);
        setRecentActivity(prev => [
          { type: 'member_joined', userId: data.userId, timestamp: Date.now() },
          ...prev.slice(0, 9)
        ]);
      }
    });

    const unsubscribeMemberLeft = addEventListener('community:member_left', (data: any) => {
      if (data.communityId === communityId) {
        setMemberCount(data.memberCount);
        setRecentActivity(prev => [
          { type: 'member_left', userId: data.userId, timestamp: Date.now() },
          ...prev.slice(0, 9)
        ]);
      }
    });

    const unsubscribeCommunityUpdated = addEventListener('community:updated', (data: any) => {
      if (data.communityId === communityId) {
        setRecentActivity(prev => [
          { type: 'community_updated', data: data.data, timestamp: Date.now() },
          ...prev.slice(0, 9)
        ]);
      }
    });

    return () => {
      unsubscribeMemberJoined();
      unsubscribeMemberLeft();
      unsubscribeCommunityUpdated();
    };
  }, [communityId, addEventListener]);

  return {
    memberCount,
    recentActivity
  };
}

/**
 * Hook for post-specific real-time updates
 */
export function usePostUpdates(postId: string) {
  const [liveViewers, setLiveViewers] = useState<number>(0);
  const [recentComments, setRecentComments] = useState<any[]>([]);
  const [recentReactions, setRecentReactions] = useState<any[]>([]);

  const { addEventListener } = useCommunityWebSocket({
    postId
  });

  useEffect(() => {
    const unsubscribeViewers = addEventListener('live:viewers_count', (data: any) => {
      if (data.postId === postId) {
        setLiveViewers(data.count);
      }
    });

    const unsubscribeComments = addEventListener('live:comment_added', (data: any) => {
      if (data.postId === postId) {
        setRecentComments(prev => [data.comment, ...prev.slice(0, 4)]);
      }
    });

    const unsubscribeReactions = addEventListener('live:reaction_added', (data: any) => {
      if (data.postId === postId) {
        setRecentReactions(prev => [data.reaction, ...prev.slice(0, 9)]);
      }
    });

    const unsubscribePostReaction = addEventListener('post:reaction', (data: any) => {
      if (data.postId === postId) {
        setRecentReactions(prev => [data.reaction, ...prev.slice(0, 9)]);
      }
    });

    const unsubscribePostTip = addEventListener('post:tip', (data: any) => {
      if (data.postId === postId) {
        // Handle tip updates
      }
    });

    return () => {
      unsubscribeViewers();
      unsubscribeComments();
      unsubscribeReactions();
      unsubscribePostReaction();
      unsubscribePostTip();
    };
  }, [postId, addEventListener]);

  return {
    liveViewers,
    recentComments,
    recentReactions
  };
}

/**
 * Hook for governance real-time updates
 */
export function useGovernanceUpdates(communityId: string) {
  const [activeProposals, setActiveProposals] = useState<any[]>([]);
  const [recentVotes, setRecentVotes] = useState<any[]>([]);

  const { addEventListener } = useCommunityWebSocket({
    communityId,
    enableGovernance: true
  });

  useEffect(() => {
    const unsubscribeProposalCreated = addEventListener('governance:proposal_created', (data: any) => {
      if (data.communityId === communityId) {
        setActiveProposals(prev => [data.proposal, ...prev]);
      }
    });

    const unsubscribeProposalUpdated = addEventListener('governance:proposal_updated', (data: any) => {
      if (data.communityId === communityId) {
        setActiveProposals(prev => 
          prev.map(proposal => 
            proposal.id === data.proposalId 
              ? { ...proposal, ...data.updates }
              : proposal
          )
        );
      }
    });

    const unsubscribeVoteCast = addEventListener('governance:vote_cast', (data: any) => {
      if (data.communityId === communityId) {
        setRecentVotes(prev => [data.vote, ...prev.slice(0, 9)]);
      }
    });

    const unsubscribeProposalEnded = addEventListener('governance:proposal_ended', (data: any) => {
      if (data.communityId === communityId) {
        setActiveProposals(prev => 
          prev.filter(proposal => proposal.id !== data.proposalId)
        );
      }
    });

    return () => {
      unsubscribeProposalCreated();
      unsubscribeProposalUpdated();
      unsubscribeVoteCast();
      unsubscribeProposalEnded();
    };
  }, [communityId, addEventListener]);

  return {
    activeProposals,
    recentVotes
  };
}

/**
 * Hook for wallet activity real-time updates
 */
export function useWalletActivityUpdates(userId: string) {
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [celebratoryActivity, setCelebratoryActivity] = useState<any | null>(null);

  const { addEventListener } = useCommunityWebSocket({
    userId,
    enableActivity: true
  });

  useEffect(() => {
    const unsubscribeActivity = addEventListener('activity:new', (data: any) => {
      if (data.userId === userId) {
        setRecentActivities(prev => [data.activity, ...prev.slice(0, 19)]);
      }
    });

    const unsubscribeTipReceived = addEventListener('activity:tip_received', (data: any) => {
      if (data.userId === userId) {
        setCelebratoryActivity(data.tip);
        setRecentActivities(prev => [
          { type: 'tip_received', ...data.tip, timestamp: Date.now() },
          ...prev.slice(0, 19)
        ]);
        
        // Clear celebratory activity after 5 seconds
        setTimeout(() => setCelebratoryActivity(null), 5000);
      }
    });

    const unsubscribeBadgeEarned = addEventListener('activity:badge_earned', (data: any) => {
      if (data.userId === userId) {
        setCelebratoryActivity(data.badge);
        setRecentActivities(prev => [
          { type: 'badge_earned', ...data.badge, timestamp: Date.now() },
          ...prev.slice(0, 19)
        ]);
        
        // Clear celebratory activity after 5 seconds
        setTimeout(() => setCelebratoryActivity(null), 5000);
      }
    });

    return () => {
      unsubscribeActivity();
      unsubscribeTipReceived();
      unsubscribeBadgeEarned();
    };
  }, [userId, addEventListener]);

  return {
    recentActivities,
    celebratoryActivity
  };
}