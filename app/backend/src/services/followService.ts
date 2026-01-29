import { DatabaseService } from './databaseService';
import { databaseService } from './databaseService'; // Import the singleton instance
import { UserProfileService } from './userProfileService';
import { eq, and } from "drizzle-orm";
import { follows } from '../db/schema';
import { db } from '../db';

// Use the singleton instance instead of creating a new one
// const databaseService = new DatabaseService();
const userProfileService = new UserProfileService();

export class FollowService {
  async follow(followerAddress: string, followingAddress: string): Promise<boolean> {
    try {
      // Set timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Follow operation timed out after 5 seconds')), 5000)
      );

      // Get user IDs from addresses
      let followerUser = await Promise.race([
        userProfileService.getProfileByAddress(followerAddress),
        timeoutPromise as Promise<any>
      ]);
      if (!followerUser) {
        // Create user if they don't exist
        followerUser = await Promise.race([
          userProfileService.createProfile({
            walletAddress: followerAddress,
            handle: '',
            ens: '',
            avatarCid: '',
            bioCid: ''
          }),
          timeoutPromise as Promise<any>
        ]);
      }

      let followingUser = await Promise.race([
        userProfileService.getProfileByAddress(followingAddress),
        timeoutPromise as Promise<any>
      ]);
      if (!followingUser) {
        // Create user if they don't exist
        followingUser = await Promise.race([
          userProfileService.createProfile({
            walletAddress: followingAddress,
            handle: '',
            ens: '',
            avatarCid: '',
            bioCid: ''
          }),
          timeoutPromise as Promise<any>
        ]);
      }

      // Validate user IDs
      if (!followerUser?.id || !followingUser?.id) {
        console.warn('[FollowService] User IDs are invalid', { followerId: followerUser?.id, followingId: followingUser?.id });
        return false;
      }

      // Check if already following
      const isAlreadyFollowing = await Promise.race([
        this.isFollowing(followerAddress, followingAddress),
        timeoutPromise as Promise<any>
      ]);
      if (isAlreadyFollowing) {
        return true; // Already following
      }

      // Add follow relationship to database
      const followResult = await Promise.race([
        databaseService.followUser(followerUser.id, followingUser.id),
        timeoutPromise as Promise<any>
      ]);
      if (!followResult) {
        console.warn('[FollowService] Failed to create follow relationship');
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('[FollowService] Error in follow:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        errorString: String(error)
      });
      // Return false instead of throwing to prevent crashes
      return false;
    }
  }

  async unfollow(followerAddress: string, followingAddress: string): Promise<boolean> {
    try {
      console.log(`[FollowService] Unfollow attempt: ${followerAddress} -> ${followingAddress}`);

      // Set timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Unfollow operation timed out after 5 seconds')), 5000)
      );

      // Get user IDs from addresses with timeout
      console.log('[FollowService] Fetching follower profile...');
      const followerUserPromise = userProfileService.getProfileByAddress(followerAddress);
      const followerUser = await Promise.race([
        followerUserPromise,
        timeoutPromise as Promise<any>
      ]);
      console.log('[FollowService] Follower profile found:', !!followerUser);

      console.log('[FollowService] Fetching following profile...');
      const followingUserPromise = userProfileService.getProfileByAddress(followingAddress);
      const followingUser = await Promise.race([
        followingUserPromise,
        timeoutPromise as Promise<any>
      ]);
      console.log('[FollowService] Following profile found:', !!followingUser);

      if (!followerUser || !followingUser) {
        console.warn('[FollowService] One or both users do not exist');
        return false; // One or both users don't exist
      }

      if (!followerUser.id || !followingUser.id) {
        console.warn('[FollowService] User IDs are invalid', { followerId: followerUser.id, followingId: followingUser.id });
        return false; // Invalid user IDs
      }

      // Remove follow relationship from database
      console.log(`[FollowService] Removing follow record: ${followerUser.id} -> ${followingUser.id}`);
      const resultPromise = databaseService.unfollowUser(followerUser.id, followingUser.id);
      const result = await Promise.race([
        resultPromise,
        timeoutPromise as Promise<any>
      ]);
      console.log('[FollowService] databaseService.unfollowUser completed with result:', result);

      return result;
    } catch (error: any) {
      console.error('[FollowService] Error in unfollow:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        errorString: String(error)
      });
      // Return false instead of throwing to prevent crashes
      return false;
    }
  }

  async getFollowers(address: string): Promise<any[]> {
    try {
      // Get user ID from address
      const user = await userProfileService.getProfileByAddress(address);
      if (!user) {
        return [];
      }

      // Get followers from database with wallet addresses
      const dbFollowers = await databaseService.getFollowers(user.id);

      // Get wallet addresses for all follower IDs
      const followerAddresses = await Promise.all(
        dbFollowers.map(async (f: any) => {
          const followerProfile = await userProfileService.getProfileById(f.followerId);
          return followerProfile?.walletAddress || null;
        })
      );

      // Filter out null values and return wallet addresses
      return followerAddresses.filter((addr): addr is string => addr !== null);
    } catch (error) {
      console.error('Error in getFollowers:', error);
      // Return empty array instead of throwing to prevent crashes
      return [];
    }
  }

  async getFollowing(address: string): Promise<any[]> {
    try {
      // Get user ID from address
      const user = await userProfileService.getProfileByAddress(address);
      if (!user) {
        return [];
      }

      // Get following from database with wallet addresses
      const dbFollowing = await databaseService.getFollowing(user.id);

      // Get wallet addresses for all following IDs
      const followingAddresses = await Promise.all(
        dbFollowing.map(async (f: any) => {
          const followingProfile = await userProfileService.getProfileById(f.followingId);
          return followingProfile?.walletAddress || null;
        })
      );

      // Filter out null values and return wallet addresses
      return followingAddresses.filter((addr): addr is string => addr !== null);
    } catch (error) {
      console.error('Error in getFollowing:', error);
      // Return empty array instead of throwing to prevent crashes
      return [];
    }
  }

  async isFollowing(followerAddress: string, followingAddress: string): Promise<boolean> {
    try {
      // Get user IDs from addresses
      const followerUser = await userProfileService.getProfileByAddress(followerAddress);
      const followingUser = await userProfileService.getProfileByAddress(followingAddress);

      if (!followerUser || !followingUser) {
        return false;
      }

      // Check the database for the follow relationship
      const result = await db.select().from(follows).where(
        and(
          eq(follows.followerId, followerUser.id),
          eq(follows.followingId, followingUser.id)
        )
      );

      return result.length > 0;
    } catch (error) {
      console.error('Error in isFollowing:', error);
      // Return false instead of throwing to prevent crashes
      return false;
    }
  }

  async getFollowCount(address: string): Promise<{ followers: number; following: number }> {
    try {
      // Get user ID from address
      const user = await userProfileService.getProfileByAddress(address);
      if (!user) {
        return { followers: 0, following: 0 };
      }

      // Get counts from database
      const followers = (await databaseService.getFollowers(user.id)).length;
      const following = (await databaseService.getFollowing(user.id)).length;

      return { followers, following };
    } catch (error) {
      console.error('Error in getFollowCount:', error);
      // Return default values if there's an error instead of crashing
      return { followers: 0, following: 0 };
    }
  }
}
