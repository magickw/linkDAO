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
  }

  async unfollow(followerAddress: string, followingAddress: string): Promise<boolean> {
    // Get user IDs from addresses
    const followerUser = await userProfileService.getProfileByAddress(followerAddress);
    const followingUser = await userProfileService.getProfileByAddress(followingAddress);
    
    if (!followerUser || !followingUser) {
      return false; // One or both users don't exist
    }
    
    // Remove follow relationship from database
    await databaseService.unfollowUser(followerUser.id, followingUser.id);
    
    return true;
  }

  async getFollowers(address: string): Promise<any[]> {
    // Get user ID from address
    const user = await userProfileService.getProfileByAddress(address);
    if (!user) {
      return [];
    }
    
    // Get followers from database
    const dbFollowers = await databaseService.getFollowers(user.id);
    
    // Convert to expected format
    return dbFollowers.map((f: any) => ({
      follower: f.followerId,
      following: f.followingId,
      createdAt: f.createdAt
    }));
  }

  async getFollowing(address: string): Promise<any[]> {
    // Get user ID from address
    const user = await userProfileService.getProfileByAddress(address);
    if (!user) {
      return [];
    }
    
    // Get following from database
    const dbFollowing = await databaseService.getFollowing(user.id);
    
    // Convert to expected format
    return dbFollowing.map((f: any) => ({
      follower: f.followerId,
      following: f.followingId,
      createdAt: f.createdAt
    }));
  }

  async isFollowing(followerAddress: string, followingAddress: string): Promise<boolean> {
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
  }

  async getFollowCount(address: string): Promise<{ followers: number; following: number }> {
    // Get user ID from address
    const user = await userProfileService.getProfileByAddress(address);
    if (!user) {
      return { followers: 0, following: 0 };
    }
    
    // Get counts from database
    const followers = (await databaseService.getFollowers(user.id)).length;
    const following = (await databaseService.getFollowing(user.id)).length;
    
    return { followers, following };
  }
}
