/**
 * Posts Store
 * Manages posts and feed state using Zustand
 */

import { create } from 'zustand';

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar?: string;
  content: string;
  attachments?: Array<{
    id: string;
    type: 'image' | 'video' | 'link';
    url: string;
    thumbnail?: string;
  }>;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  createdAt: string;
  updatedAt?: string;
  communityId?: string;
  communityName?: string;
  isStatus?: boolean; // Indicates if this is a status post vs community post
}

interface PostsState {
  posts: Post[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;

  // Actions
  setPosts: (posts: Post[]) => void;
  addPost: (post: Post) => void;
  updatePost: (id: string, updates: Partial<Post>) => void;
  deletePost: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setHasMore: (hasMore: boolean) => void;
  setCurrentPage: (page: number) => void;
  reset: () => void;
}

export const usePostsStore = create<PostsState>((set, get) => ({
  posts: [],
  loading: false,
  error: null,
  hasMore: true,
  currentPage: 1,

  setPosts: (posts) => set({ posts }),

  addPost: (post) => set((state) => ({ posts: [post, ...state.posts] })),

  updatePost: (id, updates) => set((state) => ({
    posts: state.posts.map((post) =>
      post.id === id ? { ...post, ...updates } : post
    ),
  })),

  deletePost: (id) => set((state) => ({
    posts: state.posts.filter((post) => post.id !== id),
  })),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setHasMore: (hasMore) => set({ hasMore }),
  setCurrentPage: (page) => set({ currentPage: page }),

  reset: () => set({
    posts: [],
    loading: false,
    error: null,
    hasMore: true,
    currentPage: 1,
  }),
}));