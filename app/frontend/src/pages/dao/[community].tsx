import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import DAOTreasuryHeader from '@/components/DAOTreasuryHeader';
import Web3SocialNav from '@/components/Web3SocialNav';
import Web3SocialPostCard from '@/components/Web3SocialPostCard';
import Web3SocialSidebar from '@/components/Web3SocialSidebar';
import PostCreationModal from '@/components/PostCreationModal';
import { useToast } from '@/context/ToastContext';
import { useWeb3 } from '@/context/Web3Context';
import { useCreatePost } from '@/hooks/usePosts';
import { CreatePostInput } from '@/models/Post';

// Mock data
const mockProfiles: Record<string, any> = {
  '0x1234567890123456789012345678901234567890': {
    handle: 'alexj',
    ens: 'alex.eth',
    avatarCid: 'https://placehold.co/40',
  },
  '0x2345678901234567890123456789012345678901': {
    handle: 'samc',
    ens: 'sam.eth',
    avatarCid: 'https://placehold.co/40',
  },
  '0x3456789012345678901234567890123456789012': {
    handle: 'taylorr',
    ens: 'taylor.eth',
    avatarCid: 'https://placehold.co/40',
  },
};

const mockPosts = [
  {
    id: '1',
    author: '0x1234567890123456789012345678901234567890',
    parentId: null,
    contentCid: 'Just deployed a new yield farming strategy on Arbitrum. Got 15% APY so far! What do you think about the risk profile?',
    mediaCids: [],
    tags: ['yieldfarming', 'arbitrum', 'defi'],
    createdAt: new Date(Date.now() - 3600000),
    onchainRef: '0x1234...5678',
    voteCount: 42
  },
  {
    id: '2',
    author: '0x2345678901234567890123456789012345678901',
    parentId: null,
    contentCid: 'Check out my latest NFT collection drop! Each piece represents a different DeFi protocol. Feedback welcome.',
    mediaCids: ['https://placehold.co/300'],
    tags: ['nft', 'art', 'defi'],
    createdAt: new Date(Date.now() - 7200000),
    onchainRef: '0x2345...6789',
    voteCount: 28
  },
  {
    id: '3',
    author: '0x3456789012345678901234567890123456789012',
    parentId: null,
    contentCid: 'Proposal for a new governance mechanism: Quadratic Voting for smaller proposals to increase participation. Thoughts?',
    mediaCids: [],
    tags: ['governance', 'quadraticvoting', 'dao', 'proposal'],
    createdAt: new Date(Date.now() - 10800000),
    onchainRef: '0x3456...7890',
    voteCount: 156
  },
];

// Mock DAO data
const mockDAOData = {
  name: 'Ethereum Builders',
  token: 'ETHB',
  treasuryBalance: '125.4K',
  tokenPrice: '$2.35',
  members: 125000,
  online: 1247,
  description: 'A community for Ethereum developers, builders, and researchers. Share your projects, ask questions, and collaborate on the future of Ethereum.',
  governanceToken: {
    name: 'Ethereum Builders Token',
    symbol: 'ETHB',
    totalSupply: '10M',
    circulatingSupply: '6.5M',
    marketCap: '$15.2M'
  },
  treasury: {
    totalValue: '$294.7K',
    assets: [
      { token: 'WETH', amount: '89.2', value: '$245.3K' },
      { token: 'USDC', amount: '28.4K', value: '$28.4K' },
      { token: 'DAI', amount: '21.0K', value: '$21.0K' }
    ]
  }
};

export default function CommunityPage() {
  const router = useRouter();
  const { community } = router.query;
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  const { createPost, isLoading: isCreatingPost, error: createPostError, success: createPostSuccess } = useCreatePost();
  const [userJoined, setUserJoined] = useState(false);
  const [activeTab, setActiveTab] = useState<'hot' | 'new' | 'top' | 'rising'>('hot');
  const [timeFilter, setTimeFilter] = useState<'hour' | 'day' | 'week' | 'month' | 'year' | 'all'>('day');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Redirect to new dashboard structure if user is connected
  useEffect(() => {
    if (isConnected && typeof community === 'string') {
      router.push(`/?community=${community}`);
    }
  }, [isConnected, community, router]);

  const handleJoinToggle = () => {
    setUserJoined(!userJoined);
    addToast(
      userJoined 
        ? 'Left the community' 
        : 'Joined the community successfully!', 
      'success'
    );
  };

  const handlePostSubmit = async (data: CreatePostInput) => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to post', 'error');
      return;
    }
    
    try {
      // Add the author address and parent ID (community) to the post data
      const postData: CreatePostInput = {
        ...data,
        author: address,
        parentId: 'ethereum-builders', // This would be the community ID in a real implementation
      };
      
      await createPost(postData);
      setIsModalOpen(false);
      addToast('Post created successfully!', 'success');
    } catch (error) {
      console.error('Error creating post:', error);
      addToast('Failed to create post. Please try again.', 'error');
    }
  };

  // Handle tokenized voting
  const handleVote = async (postId: string, voteType: 'up' | 'down', amount: number) => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to vote', 'error');
      return;
    }
    
    try {
      // In a real implementation, this would call the backend API to process the vote
      // and handle the microtransaction of tokens
      console.log(`Voting ${voteType} on post ${postId} with ${amount} tokens`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      addToast(`${voteType === 'up' ? 'Upvoted' : 'Downvoted'} successfully!`, 'success');
    } catch (error) {
      console.error('Error voting:', error);
      addToast(`Failed to ${voteType} vote. Please try again.`, 'error');
    }
  };

  // Handle tipping
  const handleTip = async (postId: string, amount: string, token: string) => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to tip', 'error');
      return;
    }
    
    try {
      // In a real implementation, this would call the backend API to process the tip
      // and handle the token transfer
      console.log(`Tipping ${amount} ${token} on post ${postId}`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      addToast(`Successfully tipped ${amount} ${token}!`, 'success');
    } catch (error) {
      console.error('Error tipping:', error);
      addToast('Failed to send tip. Please try again.', 'error');
    }
  };

  return (
    <Layout title={`${mockDAOData.name} - LinkDAO`}>
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-7xl mx-auto">
          {/* Community Header */}
          <DAOTreasuryHeader 
            communityName={mockDAOData.name.toLowerCase().replace(/\s+/g, '-')}
            members={mockDAOData.members}
            online={mockDAOData.online}
            description={mockDAOData.description}
            userJoined={userJoined}
            onJoinToggle={handleJoinToggle}
          />
          
          {/* Community Stats Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4 p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockDAOData.treasury.totalValue}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Treasury Value</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockDAOData.governanceToken.symbol}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Governance Token</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{mockDAOData.members.toLocaleString()}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Members</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">{mockDAOData.tokenPrice}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Token Price</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main Content */}
            <div className="lg:w-3/4">
              {/* Web3 Social Navigation */}
              <Web3SocialNav 
                activeTab={activeTab} 
                onTabChange={setActiveTab} 
                timeFilter={timeFilter} 
                onTimeFilterChange={setTimeFilter} 
              />
              
              {/* Create Post Button */}
              {isConnected && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4">
                  <div 
                    onClick={() => setIsModalOpen(true)}
                    className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center">
                      <div className="bg-gray-200 border-2 border-dashed rounded-xl w-10 h-10" />
                      <div className="ml-3 text-gray-500 dark:text-gray-400">
                        Share something with the community...
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Posts Feed */}
              <div className="space-y-4">
                {mockPosts.map((post) => {
                  const authorProfile = mockProfiles[post.author] || { 
                    handle: 'Unknown', 
                    ens: '', 
                    avatarCid: 'https://placehold.co/40' 
                  };
                  
                  return (
                    <Web3SocialPostCard 
                      key={post.id} 
                      post={post} 
                      profile={authorProfile} 
                      onTip={handleTip}
                    />
                  );
                })}
              </div>
            </div>
            
            {/* Sidebar */}
            <div className="lg:w-1/4">
              {/* Treasury Information */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4 p-4">
                <h3 className="font-bold text-gray-900 dark:text-white mb-3">Treasury</h3>
                <div className="space-y-3">
                  {mockDAOData.treasury.assets.map((asset, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{asset.token}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{asset.amount}</p>
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white">{asset.value}</p>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-4 bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-md text-sm font-medium">
                  View Treasury Details
                </button>
              </div>
              
              {/* Governance Token Info */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4 p-4">
                <h3 className="font-bold text-gray-900 dark:text-white mb-3">
                  {mockDAOData.governanceToken.symbol} Token
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Total Supply</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {mockDAOData.governanceToken.totalSupply}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Circulating</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {mockDAOData.governanceToken.circulatingSupply}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Market Cap</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {mockDAOData.governanceToken.marketCap}
                    </span>
                  </div>
                </div>
                <button className="w-full mt-4 bg-secondary-600 hover:bg-secondary-700 text-white py-2 px-4 rounded-md text-sm font-medium">
                  Get Tokens
                </button>
              </div>
              
              <Web3SocialSidebar />
            </div>
          </div>
        </div>
      </div>
      
      {/* Post Creation Modal */}
      <PostCreationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handlePostSubmit}
        isLoading={isCreatingPost}
      />
    </Layout>
  );
}