import { UserProfile } from '@/models/UserProfile';

export interface PublicProfileData {
  id: string;
  walletAddress: string;
  handle: string;
  displayName: string;
  ens: string;
  avatarCid: string;
  bioCid: string;
  createdAt: string;
  updatedAt: string;
}

export class PublicProfileService {
  private static readonly BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

  /**
   * Fetch public profile data for a user by wallet address
   * @param walletAddress - The wallet address of the user
   * @returns Public profile data or null if not found
   */
  static async getPublicProfile(walletAddress: string): Promise<PublicProfileData | null> {
    try {
      if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        throw new Error('Invalid Ethereum address');
      }

      const response = await fetch(`${this.BASE_URL}/api/profiles/public/${walletAddress}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.data) {
        throw new Error('Invalid response format');
      }

      return data.data as PublicProfileData;
    } catch (error) {
      console.error('Error fetching public profile:', error);
      throw error;
    }
  }

  /**
   * Check if a public profile exists for a given wallet address
   * @param walletAddress - The wallet address to check
   * @returns boolean indicating if profile exists
   */
  static async profileExists(walletAddress: string): Promise<boolean> {
    try {
      await this.getPublicProfile(walletAddress);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Transform public profile data to a format suitable for display
   * @param profileData - The raw public profile data
   * @returns Formatted profile data
   */
  static formatPublicProfile(profileData: PublicProfileData) {
    return {
      ...profileData,
      displayName: profileData.displayName || profileData.handle || 'Anonymous User',
      handle: profileData.handle || '',
      ens: profileData.ens || '',
      bio: profileData.bioCid || '',
      avatar: profileData.avatarCid || '',
      formattedAddress: this.formatAddress(profileData.walletAddress),
    };
  }

  /**
   * Format wallet address for display
   * @param address - The wallet address
   * @returns Formatted address (e.g., 0x1234...5678)
   */
  private static formatAddress(address: string): string {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
}