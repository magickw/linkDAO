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
    try {
      // Get token with client-side check to prevent SSR errors
      let authToken = null;
      if (typeof window !== 'undefined') {
        authToken = localStorage.getItem('linkdao_access_token') || localStorage.getItem('token');
      }

      const res = await fetch(`${this.apiBase}/api/referrals/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to get referral stats' }));
        console.error('Error getting referral stats:', errorData);
        return null;
      }

      const data = await res.json();
      if (!data.success || !data.data) {
        return null;
      }

      const stats = data.data;
      const codeRes = await this.generateReferralCode(userAddress);
      if (!codeRes.success) return null;

      return {
        referrer: userAddress,
        referralCode: codeRes.referralCode!,
        referralLink: codeRes.referralLink!,
        totalReferrals: stats.totalReferrals || 0,
        totalRewards: stats.totalEarned || 0,
        pendingRewards: stats.pendingRewards || 0
      };
    } catch (err) {
      console.error('Error getting referral info:', err);
      return null;
    }
  }

  async getReferralRewards(userAddress: string): Promise<ReferralReward[]> {
    try {
      // Get token with client-side check to prevent SSR errors
      let authToken = null;
      if (typeof window !== 'undefined') {
        authToken = localStorage.getItem('linkdao_access_token') || localStorage.getItem('token');
      }

      const res = await fetch(`${this.apiBase}/api/referrals/history`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to get referral rewards' }));
        console.error('Error getting referral rewards:', errorData);
        return [];
      }

      const data = await res.json();
      if (!data.success || !data.data) {
        return [];
      }

      // Transform the backend response format to match ReferralReward interface
      const referrals = data.data.referrals || [];
      const rewards: ReferralReward[] = [];

      for (const referral of referrals) {
        // If the referral has reward data, add it to the rewards list
        if (referral.id && referral.refereeId && referral.tokensEarned !== undefined) {
          rewards.push({
            id: referral.id,
            referrer: referral.referrerId || userAddress,
            referredUser: referral.refereeId,
            amount: referral.tokensEarned || referral.amount || 0,
            timestamp: new Date(referral.createdAt || Date.now()).getTime(),
            status: referral.status || 'claimed', // Default status to claimed if not specified
            transactionHash: referral.transactionHash || referral.txHash
          });
        }
      }

      return rewards;
    } catch (err) {
      console.error('Error getting referral rewards:', err);
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
    try {
      const res = await fetch(`${this.apiBase}/api/referrals/leaderboard?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to get referral leaderboard' }));
        console.error('Error getting referral leaderboard:', errorData);
        return [];
      }

      const data = await res.json();
      if (!data.success || !data.data) {
        return [];
      }

      // Transform the backend response format to match the expected format
      const leaderboard = data.data.leaderboard || [];
      return leaderboard.map((item: any) => ({
        user: item.userId || item.user || item.referrerId || item.walletAddress || item.userAddress,
        referrals: item.totalReferrals || item.referralCount || 0,
        rewards: item.totalEarned || item.totalRewards || item.totalTokensEarned || 0
      }));
    } catch (err) {
      console.error('Error getting referral leaderboard:', err);
      return [];
    }
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
