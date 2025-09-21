import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import {
  EngagementState,
  PostReactions,
  TipActivity,
  SocialProofData,
  UserEngagementData,
  TokenReaction,
  ReactionType,
  AnimationState,
  ReactionUser
} from './types';

// Action Types
type EngagementAction =
  | { type: 'SET_POST_REACTIONS'; payload: { postId: string; reactions: PostReactions } }
  | { type: 'ADD_REACTION'; payload: { postId: string; reaction: TokenReaction } }
  | { type: 'REMOVE_REACTION'; payload: { postId: string; userId: string; type: ReactionType } }
  | { type: 'UPDATE_REACTION'; payload: { postId: string; userId: string; updates: Partial<TokenReaction> } }
  | { type: 'SET_TIPS'; payload: { postId: string; tips: TipActivity[] } }
  | { type: 'ADD_TIP'; payload: { postId: string; tip: TipActivity } }
  | { type: 'SET_SOCIAL_PROOF'; payload: { postId: string; socialProof: SocialProofData } }
  | { type: 'UPDATE_USER_ENGAGEMENT'; payload: Partial<UserEngagementData> }
  | { type: 'START_REACTION_ANIMATION'; payload: { postId: string; animation: AnimationState } }
  | { type: 'END_REACTION_ANIMATION'; payload: { postId: string; animationId: string } }
  | { type: 'INCREMENT_ENGAGEMENT_STREAK' }
  | { type: 'RESET_ENGAGEMENT_STREAK' }
  | { type: 'BATCH_UPDATE_REACTIONS'; payload: { updates: Array<{ postId: string; reactions: PostReactions }> } };

// Initial State
const initialState: EngagementState = {
  reactions: new Map(),
  tips: new Map(),
  socialProof: new Map(),
  userEngagement: {
    totalReactionsGiven: 0,
    totalTipsGiven: 0,
    totalReactionsReceived: 0,
    totalTipsReceived: 0,
    engagementScore: 0,
    streakDays: 0,
  },
  reactionAnimations: new Map(),
};

// Reducer
function engagementReducer(state: EngagementState, action: EngagementAction): EngagementState {
  switch (action.type) {
    case 'SET_POST_REACTIONS': {
      const { postId, reactions } = action.payload;
      const newReactions = new Map(state.reactions);
      newReactions.set(postId, reactions);

      return {
        ...state,
        reactions: newReactions,
      };
    }

    case 'ADD_REACTION': {
      const { postId, reaction } = action.payload;
      const existingReactions = state.reactions.get(postId);
      
      if (!existingReactions) {
        const newReactions: PostReactions = {
          postId,
          reactions: [reaction],
          totalValue: reaction.amount,
          userReaction: reaction,
          recentReactors: [reaction.user],
        };
        
        const updatedReactions = new Map(state.reactions);
        updatedReactions.set(postId, newReactions);

        return {
          ...state,
          reactions: updatedReactions,
          userEngagement: {
            ...state.userEngagement,
            totalReactionsGiven: state.userEngagement.totalReactionsGiven + 1,
            engagementScore: state.userEngagement.engagementScore + reaction.amount,
          },
        };
      }

      // Check if user already reacted
      const existingUserReaction = existingReactions.reactions.find(r => r.user.id === reaction.user.id);
      
      let updatedReactions: TokenReaction[];
      if (existingUserReaction) {
        // Update existing reaction
        updatedReactions = existingReactions.reactions.map(r => 
          r.user.id === reaction.user.id ? reaction : r
        );
      } else {
        // Add new reaction
        updatedReactions = [...existingReactions.reactions, reaction];
      }

      const totalValue = updatedReactions.reduce((sum, r) => sum + r.amount, 0);
      const recentReactors = updatedReactions
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 5)
        .map(r => r.user);

      const newPostReactions: PostReactions = {
        ...existingReactions,
        reactions: updatedReactions,
        totalValue,
        userReaction: reaction,
        recentReactors,
      };

      const newReactionsMap = new Map(state.reactions);
      newReactionsMap.set(postId, newPostReactions);

      return {
        ...state,
        reactions: newReactionsMap,
        userEngagement: {
          ...state.userEngagement,
          totalReactionsGiven: existingUserReaction 
            ? state.userEngagement.totalReactionsGiven 
            : state.userEngagement.totalReactionsGiven + 1,
          engagementScore: state.userEngagement.engagementScore + 
            (existingUserReaction ? reaction.amount - existingUserReaction.amount : reaction.amount),
        },
      };
    }

    case 'REMOVE_REACTION': {
      const { postId, userId, type } = action.payload;
      const existingReactions = state.reactions.get(postId);
      
      if (!existingReactions) return state;

      const reactionToRemove = existingReactions.reactions.find(
        r => r.user.id === userId && r.type === type
      );
      
      if (!reactionToRemove) return state;

      const updatedReactions = existingReactions.reactions.filter(
        r => !(r.user.id === userId && r.type === type)
      );

      const totalValue = updatedReactions.reduce((sum, r) => sum + r.amount, 0);
      const recentReactors = updatedReactions
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 5)
        .map(r => r.user);

      const newPostReactions: PostReactions = {
        ...existingReactions,
        reactions: updatedReactions,
        totalValue,
        userReaction: undefined,
        recentReactors,
      };

      const newReactionsMap = new Map(state.reactions);
      newReactionsMap.set(postId, newPostReactions);

      return {
        ...state,
        reactions: newReactionsMap,
        userEngagement: {
          ...state.userEngagement,
          totalReactionsGiven: Math.max(0, state.userEngagement.totalReactionsGiven - 1),
          engagementScore: Math.max(0, state.userEngagement.engagementScore - reactionToRemove.amount),
        },
      };
    }

    case 'SET_TIPS': {
      const { postId, tips } = action.payload;
      const newTips = new Map(state.tips);
      newTips.set(postId, tips);

      return {
        ...state,
        tips: newTips,
      };
    }

    case 'ADD_TIP': {
      const { postId, tip } = action.payload;
      const existingTips = state.tips.get(postId) || [];
      const updatedTips = [...existingTips, tip];

      const newTips = new Map(state.tips);
      newTips.set(postId, updatedTips);

      return {
        ...state,
        tips: newTips,
        userEngagement: {
          ...state.userEngagement,
          totalTipsGiven: state.userEngagement.totalTipsGiven + 1,
          engagementScore: state.userEngagement.engagementScore + tip.amount,
        },
      };
    }

    case 'SET_SOCIAL_PROOF': {
      const { postId, socialProof } = action.payload;
      const newSocialProof = new Map(state.socialProof);
      newSocialProof.set(postId, socialProof);

      return {
        ...state,
        socialProof: newSocialProof,
      };
    }

    case 'UPDATE_USER_ENGAGEMENT': {
      return {
        ...state,
        userEngagement: {
          ...state.userEngagement,
          ...action.payload,
        },
      };
    }

    case 'START_REACTION_ANIMATION': {
      const { postId, animation } = action.payload;
      const animationKey = `${postId}_${animation.id}`;
      const newAnimations = new Map(state.reactionAnimations);
      newAnimations.set(animationKey, animation);

      return {
        ...state,
        reactionAnimations: newAnimations,
      };
    }

    case 'END_REACTION_ANIMATION': {
      const { postId, animationId } = action.payload;
      const animationKey = `${postId}_${animationId}`;
      const newAnimations = new Map(state.reactionAnimations);
      newAnimations.delete(animationKey);

      return {
        ...state,
        reactionAnimations: newAnimations,
      };
    }

    case 'INCREMENT_ENGAGEMENT_STREAK': {
      return {
        ...state,
        userEngagement: {
          ...state.userEngagement,
          streakDays: state.userEngagement.streakDays + 1,
        },
      };
    }

    case 'RESET_ENGAGEMENT_STREAK': {
      return {
        ...state,
        userEngagement: {
          ...state.userEngagement,
          streakDays: 0,
        },
      };
    }

    case 'BATCH_UPDATE_REACTIONS': {
      const { updates } = action.payload;
      const newReactions = new Map(state.reactions);
      
      updates.forEach(({ postId, reactions }) => {
        newReactions.set(postId, reactions);
      });

      return {
        ...state,
        reactions: newReactions,
      };
    }

    default:
      return state;
  }
}

// Context
interface EngagementContextType {
  state: EngagementState;
  addReaction: (postId: string, type: ReactionType, amount: number, user: ReactionUser) => Promise<void>;
  removeReaction: (postId: string, userId: string, type: ReactionType) => Promise<void>;
  addTip: (postId: string, amount: number, token: string, message?: string) => Promise<void>;
  getPostReactions: (postId: string) => PostReactions | undefined;
  getPostTips: (postId: string) => TipActivity[];
  getSocialProof: (postId: string) => SocialProofData | undefined;
  getUserEngagement: () => UserEngagementData;
  startReactionAnimation: (postId: string, type: ReactionType) => void;
  endReactionAnimation: (postId: string, animationId: string) => void;
  calculateEngagementScore: (userId: string) => number;
  getTopReactors: (postId: string, limit?: number) => ReactionUser[];
  getTotalTipAmount: (postId: string) => number;
  hasUserReacted: (postId: string, userId: string) => boolean;
  getUserReaction: (postId: string, userId: string) => TokenReaction | undefined;
}

const EngagementContext = createContext<EngagementContextType | undefined>(undefined);

// Provider
interface EngagementProviderProps {
  children: React.ReactNode;
}

export function EngagementProvider({ children }: EngagementProviderProps) {
  const [state, dispatch] = useReducer(engagementReducer, initialState);

  // Auto-cleanup animations
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = new Date();
      state.reactionAnimations.forEach((animation, key) => {
        const elapsed = now.getTime() - animation.startTime.getTime();
        if (elapsed > animation.duration) {
          const [postId, animationId] = key.split('_');
          dispatch({ type: 'END_REACTION_ANIMATION', payload: { postId, animationId } });
        }
      });
    }, 1000);

    return () => clearInterval(cleanup);
  }, [state.reactionAnimations]);

  const addReaction = useCallback(async (
    postId: string, 
    type: ReactionType, 
    amount: number, 
    user: ReactionUser
  ): Promise<void> => {
    const reaction: TokenReaction = {
      type,
      user,
      amount,
      tokenType: 'LDAO', // Default token type
      timestamp: new Date(),
    };

    // Start animation
    const animationId = `reaction_${Date.now()}`;
    const animation: AnimationState = {
      id: animationId,
      type: `reaction_${type}`,
      isPlaying: true,
      duration: 2000,
      startTime: new Date(),
    };

    dispatch({ type: 'START_REACTION_ANIMATION', payload: { postId, animation } });
    dispatch({ type: 'ADD_REACTION', payload: { postId, reaction } });

    // TODO: Integrate with backend API
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Reaction added:', { postId, type, amount });
    } catch (error) {
      console.error('Failed to add reaction:', error);
      // Rollback on error
      dispatch({ type: 'REMOVE_REACTION', payload: { postId, userId: user.id, type } });
      throw error;
    }
  }, []);

  const removeReaction = useCallback(async (
    postId: string, 
    userId: string, 
    type: ReactionType
  ): Promise<void> => {
    dispatch({ type: 'REMOVE_REACTION', payload: { postId, userId, type } });

    // TODO: Integrate with backend API
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Reaction removed:', { postId, userId, type });
    } catch (error) {
      console.error('Failed to remove reaction:', error);
      throw error;
    }
  }, []);

  const addTip = useCallback(async (
    postId: string, 
    amount: number, 
    token: string, 
    message?: string
  ): Promise<void> => {
    const tip: TipActivity = {
      id: `tip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from: 'current_user', // TODO: Get from auth context
      to: 'post_author', // TODO: Get from post data
      amount,
      token,
      message,
      timestamp: new Date(),
    };

    dispatch({ type: 'ADD_TIP', payload: { postId, tip } });

    // TODO: Integrate with backend API and blockchain
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Tip added:', { postId, amount, token });
    } catch (error) {
      console.error('Failed to add tip:', error);
      throw error;
    }
  }, []);

  const getPostReactions = useCallback((postId: string): PostReactions | undefined => {
    return state.reactions.get(postId);
  }, [state.reactions]);

  const getPostTips = useCallback((postId: string): TipActivity[] => {
    return state.tips.get(postId) || [];
  }, [state.tips]);

  const getSocialProof = useCallback((postId: string): SocialProofData | undefined => {
    return state.socialProof.get(postId);
  }, [state.socialProof]);

  const getUserEngagement = useCallback((): UserEngagementData => {
    return state.userEngagement;
  }, [state.userEngagement]);

  const startReactionAnimation = useCallback((postId: string, type: ReactionType) => {
    const animationId = `reaction_${Date.now()}`;
    const animation: AnimationState = {
      id: animationId,
      type: `reaction_${type}`,
      isPlaying: true,
      duration: 1500,
      startTime: new Date(),
    };

    dispatch({ type: 'START_REACTION_ANIMATION', payload: { postId, animation } });
  }, []);

  const endReactionAnimation = useCallback((postId: string, animationId: string) => {
    dispatch({ type: 'END_REACTION_ANIMATION', payload: { postId, animationId } });
  }, []);

  const calculateEngagementScore = useCallback((userId: string): number => {
    // Calculate engagement score based on reactions and tips
    let score = 0;
    
    state.reactions.forEach((postReactions) => {
      const userReaction = postReactions.reactions.find(r => r.user.id === userId);
      if (userReaction) {
        score += userReaction.amount;
      }
    });

    state.tips.forEach((tipActivities) => {
      tipActivities.forEach((tip) => {
        if (tip.from === userId) {
          score += tip.amount;
        }
      });
    });

    return score;
  }, [state.reactions, state.tips]);

  const getTopReactors = useCallback((postId: string, limit = 5): ReactionUser[] => {
    const reactions = state.reactions.get(postId);
    if (!reactions) return [];

    return reactions.recentReactors.slice(0, limit);
  }, [state.reactions]);

  const getTotalTipAmount = useCallback((postId: string): number => {
    const tips = state.tips.get(postId) || [];
    return tips.reduce((total, tip) => total + tip.amount, 0);
  }, [state.tips]);

  const hasUserReacted = useCallback((postId: string, userId: string): boolean => {
    const reactions = state.reactions.get(postId);
    if (!reactions) return false;

    return reactions.reactions.some(r => r.user.id === userId);
  }, [state.reactions]);

  const getUserReaction = useCallback((postId: string, userId: string): TokenReaction | undefined => {
    const reactions = state.reactions.get(postId);
    if (!reactions) return undefined;

    return reactions.reactions.find(r => r.user.id === userId);
  }, [state.reactions]);

  const contextValue: EngagementContextType = {
    state,
    addReaction,
    removeReaction,
    addTip,
    getPostReactions,
    getPostTips,
    getSocialProof,
    getUserEngagement,
    startReactionAnimation,
    endReactionAnimation,
    calculateEngagementScore,
    getTopReactors,
    getTotalTipAmount,
    hasUserReacted,
    getUserReaction,
  };

  return (
    <EngagementContext.Provider value={contextValue}>
      {children}
    </EngagementContext.Provider>
  );
}

// Hook
export function useEngagement() {
  const context = useContext(EngagementContext);
  if (context === undefined) {
    throw new Error('useEngagement must be used within an EngagementProvider');
  }
  return context;
}