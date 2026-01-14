/**
 * Auth Store
 * Manages authentication state using Zustand
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser } from '@linkdao/shared';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  clearStorage: () => void;
  setMockAuth: () => void; // Development only
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      logout: () => set({ user: null, token: null, isAuthenticated: false, error: null }),
      clearStorage: () => {
        set({ user: null, token: null, isAuthenticated: false, error: null, isLoading: false });
        // Clear the persisted storage
        useAuthStore.persist.clearStorage();
      },
      setMockAuth: () => {
        // Development only - set mock authenticated user
        const mockUser: AuthUser = {
          id: 'mock-user-id',
          address: '0x1234567890123456789012345678901234567890',
          displayName: 'Test User',
          email: 'test@linkdao.io',
          role: 'user',
          tier: 'free',
          createdAt: new Date().toISOString(),
        };
        set({
          user: mockUser,
          token: 'mock-jwt-token',
          isAuthenticated: true,
          error: null,
        });
        console.log('🧪 Mock authentication enabled for development');
      },
    }),
    {
      name: 'linkdao-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);