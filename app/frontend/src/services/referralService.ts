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
    try {
  const totalAmount = parseFloat((Math.random() * 100).toFixed(2));
  const tx = `0x${randomHex(64)}`;
  return { success: true, totalAmount, transactionHash: tx };
    } catch (err) {
      return { success: false, error: 'Failed to claim rewards' };
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
    return { isValid: Math.random() > 0.5, referrer: `0x${Math.random().toString(16).substr(2, 40)}` };
  }
}

export const referralService = FrontendReferralService.getInstance();
