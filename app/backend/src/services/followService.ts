import { DatabaseService } from './databaseService';
import { databaseService } from './databaseService'; // Import the singleton instance
import { UserProfileService } from './userProfileService';
import { enhancedNotificationService } from './enhancedNotificationService';
import { eq, and } from "drizzle-orm";
import { follows } from '../db/schema';
import { db } from '../db';

// Use the singleton instance instead of creating a new one
// const databaseService = new DatabaseService();
const userProfileService = new UserProfileService();

export class FollowService {
  async follow(followerAddress: string, followingAddress: string): Promise<boolean> {
    try {
      console.log('[FollowService] follow() called with:', { followerAddress, followingAddress });

      // Get user IDs from addresses
      let followerUser = await userProfileService.getProfileByAddress(followerAddress);
      if (!followerUser) {
        console.log('[FollowService] Follower not found, creating profile');
        // Create user if they don't exist
        followerUser = await userProfileService.createProfile({
          walletAddress: followerAddress,
          handle: '',
          ens: '',
          avatarCid: '',
          bioCid: ''
        });
      }

      let followingUser = await userProfileService.getProfileByAddress(followingAddress);
      if (!followingUser) {
        console.log('[FollowService] Following user not found, creating profile');
        // Create user if they don't exist
        followingUser = await userProfileService.createProfile({
          walletAddress: followingAddress,
          handle: '',
          ens: '',
          avatarCid: '',
          bioCid: ''
        });
      }

      // Validate user IDs
      if (!followerUser?.id || !followingUser?.id) {
        console.warn('[FollowService] User IDs are invalid', { followerId: followerUser?.id, followingId: followingUser?.id });
        return false;
      }

      // Check if already following
      const isAlreadyFollowing = await this.isFollowing(followerAddress, followingAddress);
      if (isAlreadyFollowing) {
        console.log('[FollowService] Already following');
        return true; // Already following
      }

      // Add follow relationship to database
      console.log('[FollowService] Adding follow relationship');
      const followResult = await databaseService.followUser(followerUser.id, followingUser.id);
      if (!followResult) {
        console.warn('[FollowService] Failed to create follow relationship');
        return false;
      }

      // Send notification to the user being followed
      try {
        await enhancedNotificationService.createSocialNotification({
          userId: followingAddress, // The person being followed receives the notification
          type: 'follow',
          priority: 'normal',
          title: 'New Follower',
          message: `${followerUser.handle || followerUser.ens || 'Someone'} started following you`,
          actionUrl: `/profile/${followerAddress}`,
          actorId: followerAddress,
          actorHandle: followerUser.handle || followerUser.ens || followerAddress.substring(0, 10),
          actorAvatar: followerUser.avatarUrl || undefined
        });
        console.log('[FollowService] Follow notification sent');
      } catch (notifError) {
        console.error('[FollowService] Failed to send follow notification:', notifError);
        // Don't fail the follow operation if notification fails
      }

      console.log('[FollowService] Follow succeeded');
      return true;
    } catch (error: any) {
      console.error('[FollowService] Error in follow:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        errorString: String(error),
        stack: error?.stack
      });
      // Return false instead of throwing to prevent crashes
      return false;
    }
  }

  async unfollow(followerAddress: string, followingAddress: string): Promise<boolean> {
    try {
      console.log(`[FollowService] Unfollow attempt: ${followerAddress} -> ${followingAddress}`);

      // Get user IDs from addresses
      console.log('[FollowService] Fetching follower profile...');
      const followerUser = await userProfileService.getProfileByAddress(followerAddress);
      console.log('[FollowService] Follower profile found:', !!followerUser);

      console.log('[FollowService] Fetching following profile...');
      const followingUser = await userProfileService.getProfileByAddress(followingAddress);
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
      const result = await databaseService.unfollowUser(followerUser.id, followingUser.id);
      console.log('[FollowService] databaseService.unfollowUser completed with result:', result);

      return result;
    } catch (error: any) {
      console.error('[FollowService] Error in unfollow:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        errorString: String(error),
        stack: error?.stack
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
