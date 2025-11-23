import { ENV_CONFIG } from '@/config/environment';

const API_URL = ENV_CONFIG.BACKEND_URL || 'http://localhost:10000';

export const track = async (event: string, data: any = {}) => {
    try {
        const token = typeof window !== 'undefined' ?
            (localStorage.getItem('linkdao_access_token') || localStorage.getItem('token')) : null;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Fire and forget - don't await if not needed, but for cleaner code we await
        // Use fetch with keepalive if supported for better reliability on page unload
        await fetch(`${API_URL}/api/track`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                event,
                data,
                timestamp: Date.now(),
                path: typeof window !== 'undefined' ? window.location.pathname : undefined
            }),
            keepalive: true
        });
    } catch (error) {
        // Silent fail for analytics to not disrupt user experience
        console.error('Tracking error:', error);
    }
};

export const trackWallet = async (walletAddress: string, activityType: string, metadata: any = {}) => {
    try {
        const token = typeof window !== 'undefined' ?
            (localStorage.getItem('linkdao_access_token') || localStorage.getItem('token')) : null;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        await fetch(`${API_URL}/api/track/wallet`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                walletAddress,
                activityType,
                metadata,
                timestamp: Date.now(),
            }),
            keepalive: true
        });
    } catch (error) {
        console.error('Wallet tracking error:', error);
    }
};
