import { useEffect } from 'react';
import { useRouter } from 'next/router';

export const NavigationFixer = () => {
    const router = useRouter();

    useEffect(() => {
        // Debug logging for route changes
        const handleStart = (url: string) => {
            console.log(`[NavFixer] Route starting: ${url}`);
        };

        const handleComplete = (url: string) => {
            console.log(`[NavFixer] Route complete: ${url}`);
            // Force scroll to top on route change to ensure user sees new content
            window.scrollTo(0, 0);
        };

        const handleError = (err: any, url: string) => {
            console.error(`[NavFixer] Route error for ${url}:`, err);
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
