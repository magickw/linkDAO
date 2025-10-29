import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import Link from 'next/link';
import { useWeb3 } from '@/context/Web3Context';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';

interface Community {
  id: string;
  name: string;
  displayName: string;
  description: string;
  memberCount: number;
  postCount: number;
  avatar?: string;
  banner?: string;
  category: string;
  tags: string[];
  governanceToken?: string;
  treasuryAddress?: string;
  trendingScore?: number;
  growthRate?: number;
}

export default function CommunitiesPage() {
  const { isConnected } = useWeb3();
  const { isMobile } = useMobileOptimization();
  const [searchTerm, setSearchTerm] = useState('');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchCommunities();
  }, []);

  const fetchCommunities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/communities?page=1&limit=20&sort=members`);
      if (!response.ok) throw new Error('Failed to fetch communities');
      const data = await response.json();
      setCommunities(data.communities || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load communities');
    } finally {
      setLoading(false);
    }
  };

  const filteredCommunities = communities.filter(community => 
    community.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    community.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'technology': 'from-blue-500 to-purple-600',
      'finance': 'from-green-500 to-teal-600',
      'art': 'from-pink-500 to-rose-600',
      'governance': 'from-indigo-500 to-blue-600',
      'development': 'from-gray-500 to-slate-600',
      'gaming': 'from-yellow-500 to-orange-600'
    };
    return colors[category] || 'from-gray-500 to-gray-600';
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'technology': '🔗',
      'finance': '💱',
      'art': '🎨',
      'governance': '🏛️',
      'development': '💻',
      'gaming': '⚡'
    };
    return icons[category] || '🌐';
  };

  return (
    <Layout title="Communities - LinkDAO" fullWidth={isMobile}>
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
          {!loading && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{communities.length}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Communities</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {communities.reduce((sum, c) => sum + c.memberCount, 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Members</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {communities.filter(c => c.governanceToken).length}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Tokenized DAOs</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {communities.reduce((sum, c) => sum + c.postCount, 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Posts</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-4">Loading communities...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
              <p className="text-red-800 dark:text-red-200">{error}</p>
              <button 
                onClick={fetchCommunities}
                className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Communities Grid */}
          {!loading && !error && (
            <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
              {filteredCommunities.map((community) => (
                <Link 
                  key={community.id} 
                  href={`/dao/${community.id}`}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow duration-200 overflow-hidden"
                >
                  {community.banner ? (
                    <div className="h-20" style={{ backgroundImage: `url(${community.banner})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                  ) : (
                    <div className={`h-20 bg-gradient-to-r ${getCategoryColor(community.category)}`}></div>
                  )}
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        {community.avatar ? (
                          <img src={community.avatar} alt={community.displayName} className="w-8 h-8 rounded-full mr-3" />
                        ) : (
                          <div className="text-2xl mr-3">{getCategoryIcon(community.category)}</div>
                        )}
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{community.displayName}</h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 line-clamp-2">
                            {community.description}
                          </p>
                        </div>
                      </div>
                      {community.governanceToken && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                          {community.governanceToken}
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-4 flex text-sm text-gray-500 dark:text-gray-400">
                      <span className="mr-4">
                        <span className="font-medium text-gray-900 dark:text-white">{community.memberCount.toLocaleString()}</span>
                        <span className="ml-1">members</span>
                      </span>
                      <span>
                        <span className="font-medium text-gray-900 dark:text-white">{community.postCount.toLocaleString()}</span>
                        <span className="ml-1">posts</span>
                      </span>
                    </div>
                    
                    {community.tags && community.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {community.tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
          
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