/**
 * Auth Guard Component
 * Protects authenticated routes by checking authentication state
 */

import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../store';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated } = useAuthStore();
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    
    // Only navigate after component is mounted
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