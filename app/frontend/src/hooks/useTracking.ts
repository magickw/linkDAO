import { useCallback } from 'react';
import { track, trackWallet } from '@/utils/analytics';

export const useTracking = () => {
    const trackEvent = useCallback((event: string, data?: any) => {
        track(event, data);
    }, []);

    const trackWalletActivity = useCallback((walletAddress: string, activityType: string, metadata?: any) => {
        trackWallet(walletAddress, activityType, metadata);
    }, []);

    return {
        trackEvent,
        trackWalletActivity
    };
};
