/**
 * Auth Guard Component
 * Protects authenticated routes by checking authentication state
 */

import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../store';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // If not authenticated, redirect to auth
    if (!isAuthenticated) {
      router.replace('/auth');
    }
  }, [isAuthenticated]);

  // If not authenticated, don't render children
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}