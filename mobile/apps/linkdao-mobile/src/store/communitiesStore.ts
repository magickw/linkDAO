/**
 * Communities Store
 * Manages communities state using Zustand
 */

import { create } from 'zustand';

export interface Community {
  id: string;
  name: string;
  handle: string;
  description?: string;
  avatar?: string;
  banner?: string;
  members: number;
  posts: number;
  isJoined: boolean;
  isPublic: boolean;
  createdAt: string;
  tags?: string[];
}

interface CommunitiesState {
  communities: Community[];
  featuredCommunities: Community[];
  myCommunities: Community[];
  loading: boolean;
  error: string | null;

  // Actions
  setCommunities: (communities: Community[]) => void;
  setFeaturedCommunities: (communities: Community[]) => void;
  setMyCommunities: (communities: Community[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  joinCommunity: (id: string) => void;
  leaveCommunity: (id: string) => void;
  updateCommunity: (id: string, updates: Partial<Community>) => void;
}

export const useCommunitiesStore = create<CommunitiesState>((set) => ({
  communities: [],
  featuredCommunities: [],
  myCommunities: [],
  loading: false,
  error: null,

  setCommunities: (communities) => set({ communities }),
  setFeaturedCommunities: (featuredCommunities) => set({ featuredCommunities }),
  setMyCommunities: (myCommunities) => set({ myCommunities }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  joinCommunity: (id) => set((state) => ({
    communities: state.communities.map((c) =>
      c.id === id ? { ...c, isJoined: true, members: c.members + 1 } : c
    ),
    myCommunities: state.myCommunities.some((c) => c.id === id)
      ? state.myCommunities
      : state.communities.filter((c) => c.id === id).map((c) => ({ ...c, isJoined: true })),
  })),

  leaveCommunity: (id) => set((state) => ({
    communities: state.communities.map((c) =>
      c.id === id ? { ...c, isJoined: false, members: c.members - 1 } : c
    ),
    myCommunities: state.myCommunities.filter((c) => c.id !== id),
  })),

  updateCommunity: (id, updates) => set((state) => ({
    communities: state.communities.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    ),
    myCommunities: state.myCommunities.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    ),
  })),
}));