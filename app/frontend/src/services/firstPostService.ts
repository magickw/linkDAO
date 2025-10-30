/**
 * First Post Service
 * Handles creation of the initial greeting post for new communities
 */

import { CommunityPostService } from './communityPostService';

/**
 * Create the first greeting post for a new community
 * @param communityId - The ID of the community
 * @param authorAddress - The wallet address of the author (default: deployer address)
 * @returns The created post or null if failed
 */
export async function createFirstGreetingPost(
  communityId: string,
  authorAddress: string = '0xEe034b53D4cCb101b2a4faec27708be507197350'
): Promise<any | null> {
  try {
    const greetingPost = {
      author: authorAddress,
      communityId: communityId,
      content: `Welcome to LinkDAO! 🎉

This is the beginning of our decentralized community built on Ethereum. Here, you can:

✨ Engage in meaningful discussions
🏛️ Participate in governance proposals
💰 Earn rewards through contributions
🤝 Connect with like-minded individuals

As one of our first members, you're helping to shape the future of decentralized social platforms. Feel free to introduce yourself, share your ideas, and help build our community!

Let's create something amazing together! 🚀`,
      tags: ['welcome', 'introduction', 'community'],
      flair: 'announcement'
    };

    const post = await CommunityPostService.createCommunityPost(greetingPost);
    return post;
  } catch (error) {
    console.error('Failed to create first greeting post:', error);
    return null;
  }
}