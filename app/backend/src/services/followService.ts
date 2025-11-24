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
      // Get user IDs from addresses
      let followerUser = await userProfileService.getProfileByAddress(followerAddress);
      if (!followerUser) {
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
        // Create user if they don't exist
        followingUser = await userProfileService.createProfile({
          walletAddress: followingAddress,
          handle: '',
          ens: '',
          avatarCid: '',
          bioCid: ''
        });
      }

      // Check if already following
      const isAlreadyFollowing = await this.isFollowing(followerAddress, followingAddress);
      if (isAlreadyFollowing) {
        return true; // Already following
      }

      // Add follow relationship to database
      await databaseService.followUser(followerUser.id, followingUser.id);

      return true;
    } catch (error) {
      console.error('Error in follow:', error);
      // Return false instead of throwing to prevent crashes
      return false;
    }
  }

  async unfollow(followerAddress: string, followingAddress: string): Promise<boolean> {
    try {
      // Get user IDs from addresses
      const followerUser = await userProfileService.getProfileByAddress(followerAddress);
      const followingUser = await userProfileService.getProfileByAddress(followingAddress);

      if (!followerUser || !followingUser) {
        return false; // One or both users don't exist
      }

      // Remove follow relationship from database
      await databaseService.unfollowUser(followerUser.id, followingUser.id);

      return true;
    } catch (error) {
      console.error('Error in unfollow:', error);
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
