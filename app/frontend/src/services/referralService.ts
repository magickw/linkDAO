/**
 * Referral Service - lightweight frontend implementation for demo & UI
 * Provides methods used by UI components. In production these should call
 * backend APIs; here we keep simple mock/fetch-based implementations.
 */

// Lightweight fallback utilities to avoid adding heavy dependencies in the frontend demo
const randomHex = (length = 40) => {
  // generate pseudo-random hex (not cryptographically secure) for demo purposes
  return Array.from({ length }).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
};

export interface ReferralInfo {
  referrer: string;
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  totalRewards: number;
  pendingRewards: number;
}

export interface ReferralReward {
  id: string;
  referrer: string;
  referredUser: string;
  amount: number;
  timestamp: number;
  status: 'pending' | 'claimed' | 'expired';
  transactionHash?: string;
}

export class FrontendReferralService {
  private static instance: FrontendReferralService;
  private apiBase: string;
  private readonly DEFAULT_TIMEOUT: number = 8000; // 8 seconds default timeout

  private constructor() {
    this.apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';
  }

  static getInstance(): FrontendReferralService {
    if (!FrontendReferralService.instance) FrontendReferralService.instance = new FrontendReferralService();
    return FrontendReferralService.instance;
  }

  async generateReferralCode(userAddress: string): Promise<{ success: boolean; referralCode?: string; referralLink?: string; error?: string }> {
    const code = randomHex(8);
    const link = typeof window !== 'undefined' ? `${window.location.origin}/token?ref=${code}` : `/token?ref=${code}`;
    return { success: true, referralCode: code, referralLink: link };
  }

  async getReferralInfo(userAddress: string): Promise<ReferralInfo | null> {
    const codeRes = await this.generateReferralCode(userAddress);
    if (!codeRes.success) return null;
    return {
      referrer: userAddress,
      referralCode: codeRes.referralCode!,
      referralLink: codeRes.referralLink!,
      totalReferrals: Math.floor(Math.random() * 10),
      totalRewards: parseFloat((Math.random() * 500).toFixed(2)),
      pendingRewards: parseFloat((Math.random() * 100).toFixed(2))
    };
  }

  async getReferralRewards(userAddress: string): Promise<ReferralReward[]> {
    // Try to fetch from backend if available, otherwise return empty array
    try {
      const res = await fetch(`${this.apiBase}/ldao/referral/rewards?address=${userAddress}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.rewards) ? data.rewards : [];
    } catch (err) {
      return [];
    }
  }

  async recordReferral(referralCode: string, referredUserAddress: string): Promise<{ success: boolean; rewardAmount?: number; error?: string }> {
    try {
      const res = await fetch(`${this.apiBase}/ldao/referral/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralCode, referredUserAddress })
      });
      if (!res.ok) return { success: false, error: 'Failed to record referral' };
      const data = await res.json().catch(() => ({}));
      return { success: true, rewardAmount: data.rewardAmount };
    } catch (err) {
      return { success: false, error: 'Failed to record referral' };
    }
  }

  async claimRewards(userAddress: string): Promise<{ success: boolean; totalAmount?: number; transactionHash?: string; error?: string }> {
    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.DEFAULT_TIMEOUT);
    
    try {
      // Get token with client-side check to prevent SSR errors
      let authToken = null;
      if (typeof window !== 'undefined') {
        authToken = localStorage.getItem('linkdao_access_token') || localStorage.getItem('token');
      }
      
      // Call the backend API to claim rewards with timeout
      const res = await fetch(`${this.apiBase}/api/referral/claim-rewards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        },
        signal: controller.signal
        // Removed userAddress from body as it should be derived from the auth token
      });
      
      // Clear timeout on response
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to claim rewards' }));
        return { success: false, error: errorData.error || `Failed to claim rewards (${res.status})` };
      }
      
      const data = await res.json();
      
      if (data.success) {
        return {
          success: true,
          totalAmount: data.totalAmount || data.amount,
          transactionHash: data.transactionHash || data.txHash
        };
      } else {
        return { success: false, error: data.error || 'Failed to claim rewards' };
      }
    } catch (err) {
      // Clear timeout on error
      clearTimeout(timeoutId);
      
      // Handle timeout errors specifically
      if (err instanceof Error && err.name === 'AbortError') {
        console.error('Referral rewards claim timed out after', this.DEFAULT_TIMEOUT, 'milliseconds');
        return { success: false, error: 'Request timed out. Please try again.' };
      }
      
      console.error('Error claiming rewards:', err);
      return { success: false, error: 'Network error while claiming rewards' };
    }
  }

  async getReferralLeaderboard(limit = 10): Promise<Array<{ user: string; referrals: number; rewards: number }>> {
    const list: Array<{ user: string; referrals: number; rewards: number }> = [];
    for (let i = 0; i < Math.min(limit, 10); i++) {
      list.push({ user: `0x${Math.random().toString(16).substr(2, 40)}`, referrals: Math.floor(Math.random() * 50), rewards: parseFloat((Math.random() * 500).toFixed(2)) });
    }
    return list.sort((a, b) => b.referrals - a.referrals);
  }

  async validateReferralCode(referralCode: string): Promise<{ isValid: boolean; referrer?: string; error?: string }> {
    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.DEFAULT_TIMEOUT); // 8 second timeout
    
    try {
      // Call the backend API to validate the referral code with timeout
      const res = await fetch(`${this.apiBase}/api/referral/validate?code=${encodeURIComponent(referralCode)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      // Clear timeout on response (success or error)
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to validate referral code' }));
        return { isValid: false, error: errorData.error || `Validation failed (${res.status})` };
      }

      const data = await res.json();

      if (data.success && data.valid) {
        return {
          isValid: true,
          referrer: data.referrerId || data.referrer
        };
      } else {
        return {
          isValid: false,
          error: data.message || data.error || 'Invalid referral code'
        };
      }
    } catch (err) {
      // Handle timeout errors specifically
      if (err instanceof Error && err.name === 'AbortError') {
        console.error('Referral code validation timed out after 8 seconds');
        return { isValid: false, error: 'Request timed out. Please try again.' };
      }
      
      console.error('Error validating referral code:', err);
      return { isValid: false, error: 'Network error while validating referral code' };
    }
  }
}

export const referralService = FrontendReferralService.getInstance();
