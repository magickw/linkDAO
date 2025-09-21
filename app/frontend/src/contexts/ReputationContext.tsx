import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import {
  ReputationState,
  UserReputation,
  Badge,
  Achievement,
  ProgressMilestone,
  LeaderboardEntry,
  AchievementNotification,
  ReputationLevel,
  ReputationEvent,
  AchievementCategory,
  BadgeRarity
} from './types';

// Action Types
type ReputationAction =
  | { type: 'SET_USER_REPUTATION'; payload: UserReputation }
  | { type: 'UPDATE_REPUTATION_SCORE'; payload: { points: number; category: AchievementCategory; description: string } }
  | { type: 'ADD_BADGE'; payload: Badge }
  | { type: 'REMOVE_BADGE'; payload: string }
  | { type: 'UNLOCK_ACHIEVEMENT'; payload: Achievement }
  | { type: 'UPDATE_PROGRESS'; payload: ProgressMilestone[] }
  | { type: 'SET_LEADERBOARD'; payload: { category: string; entries: LeaderboardEntry[] } }
  | { type: 'ADD_ACHIEVEMENT_NOTIFICATION'; payload: AchievementNotification }
  | { type: 'MARK_NOTIFICATION_SEEN'; payload: string }
  | { type: 'MARK_CELEBRATION_SHOWN'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'CALCULATE_LEVEL'; payload: number }
  | { type: 'BATCH_UPDATE_PROGRESS'; payload: { category: AchievementCategory; progress: number }[] };

// Reputation Levels Configuration
const REPUTATION_LEVELS: ReputationLevel[] = [
  { id: 1, level: 1, name: 'Newcomer', minScore: 0, maxScore: 99, privileges: ['post', 'comment'], color: '#94a3b8', icon: '🌱' },
  { id: 2, level: 2, name: 'Member', minScore: 100, maxScore: 499, privileges: ['post', 'comment', 'react'], color: '#22c55e', icon: '🌿' },
  { id: 3, level: 3, name: 'Contributor', minScore: 500, maxScore: 1499, privileges: ['post', 'comment', 'react', 'tip'], color: '#3b82f6', icon: '⭐' },
  { id: 4, level: 4, name: 'Expert', minScore: 1500, maxScore: 4999, privileges: ['post', 'comment', 'react', 'tip', 'moderate'], color: '#8b5cf6', icon: '💎' },
  { id: 5, level: 5, name: 'Leader', minScore: 5000, maxScore: 14999, privileges: ['post', 'comment', 'react', 'tip', 'moderate', 'govern'], color: '#f59e0b', icon: '👑' },
  { id: 6, level: 6, name: 'Legend', minScore: 15000, maxScore: Infinity, privileges: ['post', 'comment', 'react', 'tip', 'moderate', 'govern', 'mentor'], color: '#ef4444', icon: '🏆' },
];

// Initial State
const initialState: ReputationState = {
  userReputation: {
    totalScore: 0,
    level: REPUTATION_LEVELS[0],
    breakdown: {
      posting: 0,
      engagement: 0,
      community: 0,
      governance: 0,
      trading: 0,
    },
    history: [],
    nextMilestone: {
      category: AchievementCategory.POSTING,
      current: 0,
      target: 100,
      reward: 'Member Badge',
      progress: 0,
    },
  },
  badges: [],
  achievements: [],
  progress: [],
  leaderboards: new Map(),
  notifications: [],
};

// Reducer
function reputationReducer(state: ReputationState, action: ReputationAction): ReputationState {
  switch (action.type) {
    case 'SET_USER_REPUTATION': {
      return {
        ...state,
        userReputation: action.payload,
      };
    }

    case 'UPDATE_REPUTATION_SCORE': {
      const { points, category, description } = action.payload;
      const newBreakdown = {
        ...state.userReputation.breakdown,
        [category]: state.userReputation.breakdown[category] + points,
      };

      const newTotalScore = Object.values(newBreakdown).reduce((sum, score) => sum + score, 0);
      const newLevel = REPUTATION_LEVELS.find(level => 
        newTotalScore >= level.minScore && newTotalScore <= level.maxScore
      ) || REPUTATION_LEVELS[0];

      const reputationEvent: ReputationEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: category,
        points,
        description,
        timestamp: new Date(),
      };

      const newHistory = [reputationEvent, ...state.userReputation.history].slice(0, 100); // Keep last 100 events

      // Calculate next milestone
      const nextLevel = REPUTATION_LEVELS.find(level => level.minScore > newTotalScore);
      const nextMilestone: ProgressMilestone = nextLevel ? {
        category: AchievementCategory.POSTING, // Default category
        current: newTotalScore,
        target: nextLevel.minScore,
        reward: `${nextLevel.name} Level`,
        progress: (newTotalScore - newLevel.minScore) / (nextLevel.minScore - newLevel.minScore),
      } : state.userReputation.nextMilestone;

      return {
        ...state,
        userReputation: {
          ...state.userReputation,
          totalScore: newTotalScore,
          level: newLevel,
          breakdown: newBreakdown,
          history: newHistory,
          nextMilestone,
        },
      };
    }

    case 'ADD_BADGE': {
      const newBadges = [...state.badges, action.payload];
      
      // Create achievement notification
      const notification: AchievementNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        achievement: {
          id: action.payload.id,
          name: action.payload.name,
          description: action.payload.description,
          icon: action.payload.icon,
          points: getBadgePoints(action.payload.rarity),
          unlockedAt: new Date(),
          category: AchievementCategory.COMMUNITY,
        },
        timestamp: new Date(),
        seen: false,
        celebrationShown: false,
      };

      return {
        ...state,
        badges: newBadges,
        notifications: [notification, ...state.notifications],
      };
    }

    case 'REMOVE_BADGE': {
      const newBadges = state.badges.filter(badge => badge.id !== action.payload);
      return {
        ...state,
        badges: newBadges,
      };
    }

    case 'UNLOCK_ACHIEVEMENT': {
      const newAchievements = [...state.achievements, action.payload];
      
      // Create achievement notification
      const notification: AchievementNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        achievement: action.payload,
        timestamp: new Date(),
        seen: false,
        celebrationShown: false,
      };

      return {
        ...state,
        achievements: newAchievements,
        notifications: [notification, ...state.notifications],
      };
    }

    case 'UPDATE_PROGRESS': {
      return {
        ...state,
        progress: action.payload,
      };
    }

    case 'SET_LEADERBOARD': {
      const { category, entries } = action.payload;
      const newLeaderboards = new Map(state.leaderboards);
      newLeaderboards.set(category, entries);

      return {
        ...state,
        leaderboards: newLeaderboards,
      };
    }

    case 'ADD_ACHIEVEMENT_NOTIFICATION': {
      const newNotifications = [action.payload, ...state.notifications].slice(0, 50); // Keep last 50 notifications
      return {
        ...state,
        notifications: newNotifications,
      };
    }

    case 'MARK_NOTIFICATION_SEEN': {
      const newNotifications = state.notifications.map(notification =>
        notification.id === action.payload
          ? { ...notification, seen: true }
          : notification
      );

      return {
        ...state,
        notifications: newNotifications,
      };
    }

    case 'MARK_CELEBRATION_SHOWN': {
      const newNotifications = state.notifications.map(notification =>
        notification.id === action.payload
          ? { ...notification, celebrationShown: true }
          : notification
      );

      return {
        ...state,
        notifications: newNotifications,
      };
    }

    case 'CLEAR_NOTIFICATIONS': {
      return {
        ...state,
        notifications: [],
      };
    }

    case 'CALCULATE_LEVEL': {
      const totalScore = action.payload;
      const newLevel = REPUTATION_LEVELS.find(level => 
        totalScore >= level.minScore && totalScore <= level.maxScore
      ) || REPUTATION_LEVELS[0];

      return {
        ...state,
        userReputation: {
          ...state.userReputation,
          level: newLevel,
        },
      };
    }

    case 'BATCH_UPDATE_PROGRESS': {
      const updates = action.payload;
      const newProgress = [...state.progress];

      updates.forEach(({ category, progress }) => {
        const existingIndex = newProgress.findIndex(p => p.category === category);
        if (existingIndex >= 0) {
          newProgress[existingIndex] = {
            ...newProgress[existingIndex],
            current: progress,
            progress: progress / newProgress[existingIndex].target,
          };
        }
      });

      return {
        ...state,
        progress: newProgress,
      };
    }

    default:
      return state;
  }
}

// Helper Functions
function getBadgePoints(rarity: BadgeRarity): number {
  switch (rarity) {
    case BadgeRarity.COMMON: return 10;
    case BadgeRarity.RARE: return 25;
    case BadgeRarity.EPIC: return 50;
    case BadgeRarity.LEGENDARY: return 100;
    default: return 10;
  }
}

// Context
interface ReputationContextType {
  state: ReputationState;
  updateReputationScore: (points: number, category: AchievementCategory, description: string) => void;
  addBadge: (badge: Badge) => void;
  removeBadge: (badgeId: string) => void;
  unlockAchievement: (achievement: Achievement) => void;
  updateProgress: (progress: ProgressMilestone[]) => void;
  setLeaderboard: (category: string, entries: LeaderboardEntry[]) => void;
  markNotificationSeen: (notificationId: string) => void;
  markCelebrationShown: (notificationId: string) => void;
  clearNotifications: () => void;
  getUserLevel: () => ReputationLevel;
  getNextLevel: () => ReputationLevel | null;
  getProgressToNextLevel: () => number;
  getBadgesByRarity: (rarity: BadgeRarity) => Badge[];
  getAchievementsByCategory: (category: AchievementCategory) => Achievement[];
  getUnseenNotifications: () => AchievementNotification[];
  getLeaderboard: (category: string) => LeaderboardEntry[];
  getUserRank: (category: string, userId: string) => number;
  calculateTotalPoints: () => number;
  getReputationHistory: (limit?: number) => ReputationEvent[];
  hasPrivilege: (privilege: string) => boolean;
}

const ReputationContext = createContext<ReputationContextType | undefined>(undefined);

// Provider
interface ReputationProviderProps {
  children: React.ReactNode;
}

export function ReputationProvider({ children }: ReputationProviderProps) {
  const [state, dispatch] = useReducer(reputationReducer, initialState);

  // Auto-calculate progress milestones
  useEffect(() => {
    const milestones: ProgressMilestone[] = [
      {
        category: AchievementCategory.POSTING,
        current: state.userReputation.breakdown.posting,
        target: Math.ceil(state.userReputation.breakdown.posting / 100) * 100 + 100,
        reward: 'Content Creator Badge',
        progress: (state.userReputation.breakdown.posting % 100) / 100,
      },
      {
        category: AchievementCategory.GOVERNANCE,
        current: state.userReputation.breakdown.governance,
        target: Math.ceil(state.userReputation.breakdown.governance / 50) * 50 + 50,
        reward: 'Governance Participant Badge',
        progress: (state.userReputation.breakdown.governance % 50) / 50,
      },
      {
        category: AchievementCategory.COMMUNITY,
        current: state.userReputation.breakdown.community,
        target: Math.ceil(state.userReputation.breakdown.community / 75) * 75 + 75,
        reward: 'Community Builder Badge',
        progress: (state.userReputation.breakdown.community % 75) / 75,
      },
    ];

    dispatch({ type: 'UPDATE_PROGRESS', payload: milestones });
  }, [state.userReputation.breakdown]);

  const updateReputationScore = useCallback((
    points: number, 
    category: AchievementCategory, 
    description: string
  ) => {
    dispatch({ type: 'UPDATE_REPUTATION_SCORE', payload: { points, category, description } });
  }, []);

  const addBadge = useCallback((badge: Badge) => {
    dispatch({ type: 'ADD_BADGE', payload: badge });
  }, []);

  const removeBadge = useCallback((badgeId: string) => {
    dispatch({ type: 'REMOVE_BADGE', payload: badgeId });
  }, []);

  const unlockAchievement = useCallback((achievement: Achievement) => {
    dispatch({ type: 'UNLOCK_ACHIEVEMENT', payload: achievement });
  }, []);

  const updateProgress = useCallback((progress: ProgressMilestone[]) => {
    dispatch({ type: 'UPDATE_PROGRESS', payload: progress });
  }, []);

  const setLeaderboard = useCallback((category: string, entries: LeaderboardEntry[]) => {
    dispatch({ type: 'SET_LEADERBOARD', payload: { category, entries } });
  }, []);

  const markNotificationSeen = useCallback((notificationId: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_SEEN', payload: notificationId });
  }, []);

  const markCelebrationShown = useCallback((notificationId: string) => {
    dispatch({ type: 'MARK_CELEBRATION_SHOWN', payload: notificationId });
  }, []);

  const clearNotifications = useCallback(() => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
  }, []);

  const getUserLevel = useCallback((): ReputationLevel => {
    return state.userReputation.level;
  }, [state.userReputation.level]);

  const getNextLevel = useCallback((): ReputationLevel | null => {
    const currentLevel = state.userReputation.level.level;
    return REPUTATION_LEVELS.find(level => level.level === currentLevel + 1) || null;
  }, [state.userReputation.level]);

  const getProgressToNextLevel = useCallback((): number => {
    const nextLevel = getNextLevel();
    if (!nextLevel) return 1; // Already at max level

    const currentScore = state.userReputation.totalScore;
    const currentLevelMin = state.userReputation.level.minScore;
    const nextLevelMin = nextLevel.minScore;

    return (currentScore - currentLevelMin) / (nextLevelMin - currentLevelMin);
  }, [state.userReputation, getNextLevel]);

  const getBadgesByRarity = useCallback((rarity: BadgeRarity): Badge[] => {
    return state.badges.filter(badge => badge.rarity === rarity);
  }, [state.badges]);

  const getAchievementsByCategory = useCallback((category: AchievementCategory): Achievement[] => {
    return state.achievements.filter(achievement => achievement.category === category);
  }, [state.achievements]);

  const getUnseenNotifications = useCallback((): AchievementNotification[] => {
    return state.notifications.filter(notification => !notification.seen);
  }, [state.notifications]);

  const getLeaderboard = useCallback((category: string): LeaderboardEntry[] => {
    return state.leaderboards.get(category) || [];
  }, [state.leaderboards]);

  const getUserRank = useCallback((category: string, userId: string): number => {
    const leaderboard = state.leaderboards.get(category) || [];
    const entry = leaderboard.find(entry => entry.user.id === userId);
    return entry ? entry.rank : -1;
  }, [state.leaderboards]);

  const calculateTotalPoints = useCallback((): number => {
    return state.userReputation.totalScore;
  }, [state.userReputation.totalScore]);

  const getReputationHistory = useCallback((limit = 20): ReputationEvent[] => {
    return state.userReputation.history.slice(0, limit);
  }, [state.userReputation.history]);

  const hasPrivilege = useCallback((privilege: string): boolean => {
    return state.userReputation.level.privileges.includes(privilege);
  }, [state.userReputation.level]);

  const contextValue: ReputationContextType = {
    state,
    updateReputationScore,
    addBadge,
    removeBadge,
    unlockAchievement,
    updateProgress,
    setLeaderboard,
    markNotificationSeen,
    markCelebrationShown,
    clearNotifications,
    getUserLevel,
    getNextLevel,
    getProgressToNextLevel,
    getBadgesByRarity,
    getAchievementsByCategory,
    getUnseenNotifications,
    getLeaderboard,
    getUserRank,
    calculateTotalPoints,
    getReputationHistory,
    hasPrivilege,
  };

  return (
    <ReputationContext.Provider value={contextValue}>
      {children}
    </ReputationContext.Provider>
  );
}

// Hook
export function useReputation() {
  const context = useContext(ReputationContext);
  if (context === undefined) {
    throw new Error('useReputation must be used within a ReputationProvider');
  }
  return context;
}