import { useState, useEffect, useCallback, useRef } from 'react';

// Mock types for real-time blockchain data
interface TokenPriceData {
  price: number;
  change24h: number;
  timestamp: Date;
}

interface PostUpdate {
  postId: string;
  updateType: 'new_comment' | 'reaction_added' | 'stake_added' | 'tip_received';
  timestamp: Date;
  data: {
    count?: number;
    amount?: number;
  };
}

interface GovernanceUpdate {
  proposalId: string;
  status: 'active' | 'passed' | 'failed' | 'executed';
  votingProgress: {
    for: number;
    against: number;
    abstain: number;
  };
  timestamp: Date;
}

// Mock hook for real-time token prices
export const useRealTimeTokenPrices = (tokenAddresses: string[]) => {
  const [tokenPrices, setTokenPrices] = useState<Record<string, TokenPriceData>>({});
  const lastApiCallTime = useRef<number>(0);
  const minApiCallInterval = 60000; // 1 minute minimum between API calls

  const getTokenPrice = useCallback((address: string) => {
    return tokenPrices[address];
  }, [tokenPrices]);

  const forceUpdate = useCallback((address: string) => {
    // Rate limiting check
    const now = Date.now();
    if (now - lastApiCallTime.current < minApiCallInterval) {
      console.log('Rate limiting API call, using mock data instead');
      // Use mock data if rate limited
      setTokenPrices(prev => ({
        ...prev,
        [address]: {
          price: prev[address]?.price || Math.random() * 100,
          change24h: (Math.random() - 0.5) * 20,
          timestamp: new Date()
        }
      }));
      return;
    }

    // Update last API call time
    lastApiCallTime.current = now;

    // Mock price update (in a real app, this would call an actual API)
    setTokenPrices(prev => ({
      ...prev,
      [address]: {
        price: Math.random() * 100,
        change24h: (Math.random() - 0.5) * 20,
        timestamp: new Date()
      }
    }));
  }, []);

  useEffect(() => {
    // Initialize mock data
    const mockData: Record<string, TokenPriceData> = {};
    tokenAddresses.forEach(address => {
      mockData[address] = {
        price: Math.random() * 100,
        change24h: (Math.random() - 0.5) * 20,
        timestamp: new Date()
      };
    });
    setTokenPrices(mockData);

    // Update prices every 10 seconds
    const interval = setInterval(() => {
      tokenAddresses.forEach(address => {
        forceUpdate(address);
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [tokenAddresses]);

  return { tokenPrices, getTokenPrice, forceUpdate };
};

// Mock hook for real-time post activity
export const useRealTimePostActivity = (postIds: string[]) => {
  const [postActivity, setPostActivity] = useState<Record<string, PostUpdate[]>>({});

  const getPostActivity = useCallback((postId: string) => {
    return postActivity[postId] || [];
  }, [postActivity]);

  useEffect(() => {
    // Generate mock activity data
    const mockActivity: Record<string, PostUpdate[]> = {};
    postIds.forEach(postId => {
      mockActivity[postId] = [
        {
          postId,
          updateType: 'new_comment',
          timestamp: new Date(),
          data: { count: Math.floor(Math.random() * 5) + 1 }
        },
        {
          postId,
          updateType: 'reaction_added',
          timestamp: new Date(),
          data: { count: Math.floor(Math.random() * 10) + 1 }
        }
      ];
    });
    setPostActivity(mockActivity);

    // Update activity every 15 seconds
    const interval = setInterval(() => {
      postIds.forEach(postId => {
        const newUpdate: PostUpdate = {
          postId,
          updateType: ['new_comment', 'reaction_added', 'stake_added', 'tip_received'][Math.floor(Math.random() * 4)] as any,
          timestamp: new Date(),
          data: { 
            count: Math.floor(Math.random() * 3) + 1,
            amount: Math.floor(Math.random() * 100) + 1
          }
        };

        setPostActivity(prev => ({
          ...prev,
          [postId]: [newUpdate, ...(prev[postId] || [])].slice(0, 10)
        }));
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [postIds]);

  return { postActivity, getPostActivity };
};

// Mock hook for real-time governance updates
export const useRealTimeGovernance = (communityIds: string[]) => {
  const [governanceUpdates, setGovernanceUpdates] = useState<Record<string, GovernanceUpdate[]>>({});

  const getGovernanceUpdates = useCallback((communityId: string) => {
    return governanceUpdates[communityId] || [];
  }, [governanceUpdates]);

  const forceUpdate = useCallback((communityId: string) => {
    // Mock governance update
    const mockUpdate: GovernanceUpdate = {
      proposalId: `prop-${Math.random().toString(36).substr(2, 9)}`,
      status: ['active', 'passed', 'failed'][Math.floor(Math.random() * 3)] as any,
      votingProgress: {
        for: Math.floor(Math.random() * 1000),
        against: Math.floor(Math.random() * 500),
        abstain: Math.floor(Math.random() * 200)
      },
      timestamp: new Date()
    };

    setGovernanceUpdates(prev => ({
      ...prev,
      [communityId]: [mockUpdate, ...(prev[communityId] || [])].slice(0, 5)
    }));
  }, []);

  useEffect(() => {
    // Initialize mock governance data
    const mockData: Record<string, GovernanceUpdate[]> = {};
    communityIds.forEach(communityId => {
      mockData[communityId] = [
        {
          proposalId: `prop-${Math.random().toString(36).substr(2, 9)}`,
          status: 'active',
          votingProgress: {
            for: Math.floor(Math.random() * 1000),
            against: Math.floor(Math.random() * 500),
            abstain: Math.floor(Math.random() * 200)
          },
          timestamp: new Date()
        }
      ];
    });
    setGovernanceUpdates(mockData);

    // Update governance data every 20 seconds
    const interval = setInterval(() => {
      communityIds.forEach(communityId => {
        forceUpdate(communityId);
      });
    }, 20000);

    return () => clearInterval(interval);
  }, [communityIds]);

  return { governanceUpdates, getGovernanceUpdates, forceUpdate };
};