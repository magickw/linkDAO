import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { useWeb3 } from '@/context/Web3Context';

// Mock data for posts
const mockPosts = [
  {
    id: '1',
    author: {
      name: 'Alex Johnson',
      handle: 'alexj',
      avatar: 'https://via.placeholder.com/40',
    },
    content: 'Just deployed my first smart contract on Base! The future of decentralized applications is here. #Web3 #Base',
    timestamp: '2 hours ago',
    likes: 24,
    comments: 5,
    shares: 3,
  },
  {
    id: '2',
    author: {
      name: 'Sam Chen',
      handle: 'samc',
      avatar: 'https://via.placeholder.com/40',
    },
    content: 'Excited to announce that our DAO has reached 1000 members! Governance participation is at an all-time high.',
    timestamp: '5 hours ago',
    likes: 142,
    comments: 28,
    shares: 15,
  },
  {
    id: '3',
    author: {
      name: 'Taylor Reed',
      handle: 'taylorr',
      avatar: 'https://via.placeholder.com/40',
    },
    content: 'The new yield farming opportunities on LinkDAO are incredible. Just earned my first LDAO rewards!',
    timestamp: '1 day ago',
    likes: 87,
    comments: 12,
    shares: 7,
  },
];

export default function SocialFeed() {
  const { address, isConnected } = useWeb3();
  const [newPost, setNewPost] = useState('');

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPost.trim() === '') return;
    
    // In a real implementation, this would call the backend API to create a post
    alert('Post submitted! In a real implementation, this would be saved to the blockchain.');
    setNewPost('');
  };

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
                  />
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    {280 - newPost.length} characters remaining
                  </div>
                  <button
                    type="submit"
                    disabled={newPost.trim() === ''}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    Post
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {/* Posts Feed */}
          <div className="space-y-6">
            {mockPosts.map((post) => (
              <div key={post.id} className="bg-white shadow rounded-lg p-6">
                <div className="flex">
                  <div className="flex-shrink-0 mr-4">
                    <img className="h-10 w-10 rounded-full" src={post.author.avatar} alt={post.author.name} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-sm font-medium text-gray-900">{post.author.name}</h3>
                      <span className="ml-2 text-sm text-gray-500">@{post.author.handle}</span>
                      <span className="mx-1 text-gray-300">·</span>
                      <span className="text-sm text-gray-500">{post.timestamp}</span>
                    </div>
                    <p className="mt-2 text-gray-700">{post.content}</p>
                    
                    <div className="mt-4 flex space-x-6">
                      <button className="flex items-center text-gray-500 hover:text-primary-600">
                        <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span>{post.likes}</span>
                      </button>
                      <button className="flex items-center text-gray-500 hover:text-primary-600">
                        <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>{post.comments}</span>
                      </button>
                      <button className="flex items-center text-gray-500 hover:text-primary-600">
                        <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        <span>{post.shares}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}