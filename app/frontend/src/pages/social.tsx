import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useWeb3 } from '@/context/Web3Context';
import { useFeed, useCreatePost } from '@/hooks/usePosts';
import { useProfile } from '@/hooks/useProfile';
import { CreatePostInput } from '../../../backend/src/models/Post';

// Mock data for posts (fallback if API is not available)
const mockPosts = [
  {
    id: '1',
    author: '0x1234567890123456789012345678901234567890',
    parentId: null,
    contentCid: 'Just deployed my first smart contract on Base! The future of decentralized applications is here. #Web3 #Base',
    mediaCids: [],
    tags: ['Web3', 'Base'],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    onchainRef: '',
  },
  {
    id: '2',
    author: '0x2345678901234567890123456789012345678901',
    parentId: null,
    contentCid: 'Excited to announce that our DAO has reached 1000 members! Governance participation is at an all-time high.',
    mediaCids: [],
    tags: ['DAO', 'Governance'],
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    onchainRef: '',
  },
  {
    id: '3',
    author: '0x3456789012345678901234567890123456789012',
    parentId: null,
    contentCid: 'The new yield farming opportunities on LinkDAO are incredible. Just earned my first LDAO rewards!',
    mediaCids: [],
    tags: ['DeFi', 'YieldFarming'],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    onchainRef: '',
  },
];

// Mock profile data
const mockProfiles: Record<string, any> = {
  '0x1234567890123456789012345678901234567890': {
    handle: 'alexj',
    ens: 'alex.eth',
    avatarCid: 'https://via.placeholder.com/40',
  },
  '0x2345678901234567890123456789012345678901': {
    handle: 'samc',
    ens: 'sam.eth',
    avatarCid: 'https://via.placeholder.com/40',
  },
  '0x3456789012345678901234567890123456789012': {
    handle: 'taylorr',
    ens: 'taylor.eth',
    avatarCid: 'https://via.placeholder.com/40',
  },
};

export default function SocialFeed() {
  const { address, isConnected } = useWeb3();
  const { feed, isLoading: isFeedLoading, error: feedError } = useFeed(address);
  const { createPost, isLoading: isCreatingPost, error: createPostError, success: createPostSuccess } = useCreatePost();
  const [newPost, setNewPost] = useState('');
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  // Load profiles for posts
  useEffect(() => {
    const loadProfiles = async () => {
      // In a real implementation, we would fetch profiles from the backend
      // For now, we'll use mock data
      setProfiles(mockProfiles);
    };

    if (feed.length > 0) {
      loadProfiles();
    }
  }, [feed]);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPost.trim() === '') return;
    
    if (!isConnected || !address) {
      alert('Please connect your wallet to post');
      return;
    }
    
    try {
      const postData: CreatePostInput = {
        author: address,
        content: newPost,
        tags: [], // In a real implementation, we would extract tags from the content
      };
      
      await createPost(postData);
      setNewPost('');
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  // Use real feed data if available, otherwise use mock data
  const displayPosts = feed.length > 0 ? feed : mockPosts;

  return (
    <Layout title="Social Feed - LinkDAO">
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Social Feed</h1>
          
          {/* Create Post */}
          {isConnected && (
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <form onSubmit={handlePostSubmit}>
                <div className="mb-4">
                  <textarea
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder="What's happening?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    rows={3}
                    disabled={isCreatingPost}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    {280 - newPost.length} characters remaining
                  </div>
                  <button
                    type="submit"
                    disabled={newPost.trim() === '' || isCreatingPost}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {isCreatingPost ? 'Posting...' : 'Post'}
                  </button>
                </div>
                {createPostError && (
                  <div className="mt-2 text-red-600 text-sm">
                    Error: {createPostError}
                  </div>
                )}
                {createPostSuccess && (
                  <div className="mt-2 text-green-600 text-sm">
                    Post created successfully!
                  </div>
                )}
              </form>
            </div>
          )}
          
          {/* Posts Feed */}
          <div className="space-y-6">
            {isFeedLoading ? (
              <div className="bg-white shadow rounded-lg p-6">
                <p>Loading feed...</p>
              </div>
            ) : feedError ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <p>Error loading feed: {feedError}</p>
              </div>
            ) : (
              displayPosts.map((post) => {
                const authorProfile = profiles[post.author] || { handle: 'Unknown', ens: '', avatarCid: 'https://via.placeholder.com/40' };
                const timestamp = post.createdAt instanceof Date ? 
                  `${Math.floor((Date.now() - post.createdAt.getTime()) / (1000 * 60))} minutes ago` : 
                  'Unknown time';
                
                return (
                  <div key={post.id} className="bg-white shadow rounded-lg p-6">
                    <div className="flex">
                      <div className="flex-shrink-0 mr-4">
                        <img className="h-10 w-10 rounded-full" src={authorProfile.avatarCid} alt={authorProfile.handle} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h3 className="text-sm font-medium text-gray-900">{authorProfile.handle}</h3>
                          {authorProfile.ens && (
                            <span className="ml-2 text-sm text-gray-500">({authorProfile.ens})</span>
                          )}
                          <span className="mx-1 text-gray-300">·</span>
                          <span className="text-sm text-gray-500">{timestamp}</span>
                        </div>
                        <p className="mt-2 text-gray-700">{post.contentCid}</p>
                        
                        {post.tags && post.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {post.tags.map((tag, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <div className="mt-4 flex space-x-6">
                          <button className="flex items-center text-gray-500 hover:text-primary-600">
                            <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            <span>0</span>
                          </button>
                          <button className="flex items-center text-gray-500 hover:text-primary-600">
                            <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span>0</span>
                          </button>
                          <button className="flex items-center text-gray-500 hover:text-primary-600">
                            <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            <span>0</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}