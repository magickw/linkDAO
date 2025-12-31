import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

export const NavigationFixer = () => {
    const router = useRouter();
    const navigationStartTimeRef = useRef<number>(0);
    const isNavigatingRef = useRef(false);

    useEffect(() => {
        // Debug logging for route changes
        const handleStart = (url: string) => {
            if (isNavigatingRef.current) {
                console.warn(`[NavFixer] ⚠️ Navigation already in progress! New request to: ${url}`);
            }

            isNavigatingRef.current = true;
            navigationStartTimeRef.current = performance.now();

            console.log(`[NavFixer] 🚀 Route starting: ${url}`);
            console.log(`[NavFixer] Current pathname: ${router.pathname}`);
            console.log(`[NavFixer] Timestamp: ${new Date().toISOString()}`);

            // Check if wallet is connected
            if (typeof window !== 'undefined') {
                const walletConnected = localStorage.getItem('linkdao_wallet_connected');
                const walletAddress = localStorage.getItem('linkdao_wallet_address');
                console.log(`[NavFixer] Wallet connected: ${walletConnected}`);
                console.log(`[NavFixer] Wallet address: ${walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'N/A'}`);

                // Check for any pending operations
                const sessionData = localStorage.getItem('linkdao_session_data');
                console.log(`[NavFixer] Session exists: ${!!sessionData}`);
            }
        };

        const handleComplete = (url: string) => {
            const navigationDuration = performance.now() - navigationStartTimeRef.current;
            isNavigatingRef.current = false;

            console.log(`[NavFixer] ✅ Route complete: ${url}`);
            console.log(`[NavFixer] Navigation duration: ${navigationDuration.toFixed(2)}ms`);

            if (navigationDuration > 1000) {
                console.warn(`[NavFixer] ⚠️ Slow navigation detected: ${navigationDuration.toFixed(2)}ms`);
            }

            // Force scroll to top on route change to ensure user sees new content
            window.scrollTo(0, 0);
        };

        const handleError = (err: any, url: string) => {
            isNavigatingRef.current = false;
            const navigationDuration = performance.now() - navigationStartTimeRef.current;

            console.error(`[NavFixer] ❌ Route error for ${url}:`, err);
            console.error(`[NavFixer] Error occurred after: ${navigationDuration.toFixed(2)}ms`);
        };

        router.events.on('routeChangeStart', handleStart);
        router.events.on('routeChangeComplete', handleComplete);
        router.events.on('routeChangeError', handleError);

        return () => {
            router.events.off('routeChangeStart', handleStart);
            router.events.off('routeChangeComplete', handleComplete);
            router.events.off('routeChangeError', handleError);
        };
    }, [router]);

    return null;
};
