import { db } from './src/db';
import { communityMembers, communities, users } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function checkCommunityMembership() {
  try {
    const userAddress = '0xee034b53d4ccb101b2a4faec27708be507197350';
    
    // Find the user
    const user = await db.select()
      .from(users)
      .where(eq(users.walletAddress, userAddress))
      .limit(1);
    
    console.log('User:', user);
    
    if (user.length > 0) {
      // Check community memberships
      const memberships = await db.select()
        .from(communityMembers)
        .where(eq(communityMembers.userAddress, userAddress));
      
      console.log('Community memberships:', memberships);
      
      // Check all communities
      const allCommunities = await db.select().from(communities);
      console.log('All communities:', allCommunities);
      
      // Check if user is creator of any community
      const userCommunities = allCommunities.filter(c => c.creatorAddress === userAddress);
      console.log('Communities created by user:', userCommunities);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkCommunityMembership();