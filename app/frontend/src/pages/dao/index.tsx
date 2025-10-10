import React, { useState } from 'react';
import Layout from '@/components/Layout';
import Link from 'next/link';
import { useWeb3 } from '@/context/Web3Context';

interface Community {
  id: string;
  name: string;
  description: string;
  members: number;
  online: number;
  icon: string;
  bannerColor: string;
  token?: string;
  tokenPrice?: string;
  treasuryBalance?: string;
}

export default function CommunitiesPage() {
  const { isConnected } = useWeb3();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Mock data for communities
  const communities: Community[] = [
    {
      id: 'ethereum-builders',
      name: 'Ethereum Builders',
      description: 'A community for Ethereum developers, builders, and researchers. Share your projects, ask questions, and collaborate on the future of Ethereum.',
      members: 125000,
      online: 1247,
      icon: '🔗',
      bannerColor: 'from-blue-500 to-purple-600',
      token: 'ETHB',
      tokenPrice: '$2.35',
      treasuryBalance: '$294.7K'
    },
    {
      id: 'defi-traders',
      name: 'DeFi Traders',
      description: 'Discuss trading strategies, new protocols, and market analysis in the decentralized finance space.',
      members: 89000,
      online: 892,
      icon: '💱',
      bannerColor: 'from-green-500 to-teal-600',
      token: 'DEFI',
      tokenPrice: '$1.85',
      treasuryBalance: '$165.3K'
    },
    {
      id: 'nft-collectors',
      name: 'NFT Collectors',
      description: 'Showcase your collections, discover new artists, and discuss the latest trends in the NFT space.',
      members: 67000,
      online: 543,
      icon: '🎨',
      bannerColor: 'from-pink-500 to-rose-600',
      token: 'NFTC',
      tokenPrice: '$0.42',
      treasuryBalance: '$28.1K'
    },
    {
      id: 'dao-governance',
      name: 'DAO Governance',
      description: 'Explore governance mechanisms, voting systems, and community decision-making in decentralized organizations.',
      members: 45000,
      online: 321,
      icon: '🏛️',
      bannerColor: 'from-indigo-500 to-blue-600',
      token: 'GOV',
      tokenPrice: '$3.75',
      treasuryBalance: '$169.8K'
    },
    {
      id: 'web3-developers',
      name: 'Web3 Developers',
      description: 'A place for developers building the decentralized web. Share resources, tools, and collaborate on projects.',
      members: 38000,
      online: 427,
      icon: '💻',
      bannerColor: 'from-gray-500 to-slate-600',
      token: 'DEV',
      tokenPrice: '$0.95',
      treasuryBalance: '$36.2K'
    },
    {
      id: 'layer2-enthusiasts',
      name: 'Layer 2 Enthusiasts',
      description: 'Discuss scaling solutions, rollups, and the latest developments in Layer 2 technologies.',
      members: 31000,
      online: 289,
      icon: '⚡',
      bannerColor: 'from-yellow-500 to-orange-600',
      token: 'L2X',
      tokenPrice: '$0.25',
      treasuryBalance: '$7.8K'
    },
  ];

  // Filter communities based on search term
  const filteredCommunities = communities.filter(community => 
    community.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    community.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout title="Communities - LinkDAO" fullWidth={true}>
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Web3 Communities</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Join communities that match your interests and expertise in the Web3 ecosystem.
          </p>
          
          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative max-w-xl">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search communities..."
                className="w-full px-4 py-3 pl-12 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Stats Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{communities.length}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Communities</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {communities.reduce((sum, community) => sum + community.members, 0).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Members</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {communities.filter(c => c.token).length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tokenized DAOs</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${communities.reduce((sum, community) => {
                    if (community.treasuryBalance) {
                      const value = parseFloat(community.treasuryBalance.replace(/[^0-9.-]+/g,""));
                      return sum + (isNaN(value) ? 0 : value);
                    }
                    return sum;
                  }, 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}K
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Treasury</p>
              </div>
            </div>
          </div>
          
          {/* Communities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCommunities.map((community) => (
              <Link 
                key={community.id} 
                href={isConnected ? `/dashboard/community/${community.id}` : `/dao/${community.id}`}
                className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow duration-200 overflow-hidden"
              >
                <div className={`h-20 bg-gradient-to-r ${community.bannerColor}`}></div>
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start">
                      <div className="text-2xl mr-3">{community.icon}</div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{community.name}</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 line-clamp-2">
                          {community.description}
                        </p>
                      </div>
                    </div>
                    {community.token && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                        {community.token}
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-4 flex text-sm text-gray-500 dark:text-gray-400">
                    <span className="mr-4">
                      <span className="font-medium text-gray-900 dark:text-white">{community.members.toLocaleString()}</span>
                      <span className="ml-1">members</span>
                    </span>
                    <span>
                      <span className="font-medium text-gray-900 dark:text-white">{community.online.toLocaleString()}</span>
                      <span className="ml-1">online</span>
                    </span>
                  </div>
                  
                  {community.token && community.tokenPrice && (
                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Token Price</p>
                        <p className="font-medium text-gray-900 dark:text-white">{community.tokenPrice}</p>
                      </div>
                      {community.treasuryBalance && (
                        <div className="text-right">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Treasury</p>
                          <p className="font-medium text-gray-900 dark:text-white">{community.treasuryBalance}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
          
          {filteredCommunities.length === 0 && searchTerm && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No communities found</h3>
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                No communities match your search for "{searchTerm}"
              </p>
              <button 
                onClick={() => setSearchTerm('')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Clear search
              </button>
            </div>
          )}
          
          {/* Create Community Section */}
          <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Create Your Own Community</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start your own Web3 community with custom governance tokens, proposal systems, and member management.
            </p>
            
            {isConnected ? (
              <button className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-6 rounded-lg transition-colors">
                Create Community
              </button>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Connect your wallet to create a community
                </p>
                <button className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-6 rounded-lg transition-colors">
                  Connect Wallet
                </button>
              </div>
            )}
            
            {/* Features List */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-6 w-6 rounded-md bg-primary-500 text-white">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Governance Tokens</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Create and distribute your own governance tokens
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-6 w-6 rounded-md bg-primary-500 text-white">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Treasury Management</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Manage community funds with transparent treasury
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-6 w-6 rounded-md bg-primary-500 text-white">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Proposal System</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    On-chain voting and decision making
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-6 w-6 rounded-md bg-primary-500 text-white">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">Reputation System</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Track and reward valuable contributions
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}