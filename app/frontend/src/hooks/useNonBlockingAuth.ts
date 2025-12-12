/**
 * useNonBlockingAuth Hook
 * Provides a non-blocking version of the auth context using React 18's useDeferredValue
 * This prevents authentication state changes from blocking navigation
 */

import { useDeferredValue } from 'react';
import { useAuth } from '@/context/AuthContext';

/**
 * Custom hook that wraps useAuth with deferred values to prevent blocking navigation
 * Use this hook in components where authentication state updates should not block UI
 */
export function useNonBlockingAuth() {
    const auth = useAuth();

    // Defer authentication state to prevent blocking navigation
    const deferredIsAuthenticated = useDeferredValue(auth.isAuthenticated);
    const deferredUser = useDeferredValue(auth.user);
    const deferredIsLoading = useDeferredValue(auth.isLoading);

    return {
        ...auth,
        // Override with deferred values
        isAuthenticated: deferredIsAuthenticated,
        user: deferredUser,
        isLoading: deferredIsLoading,
    };
}

export default useNonBlockingAuth;
