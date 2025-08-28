import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { useWeb3 } from '@/context/Web3Context';
import { useFeed, useCreatePost } from '@/hooks/usePosts';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/context/ToastContext';
import { CreatePostInput } from '@/models/Post';
import PostCard from '@/components/PostCard';

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
  const { addToast } = useToast();
  const { feed, isLoading: isFeedLoading, error: feedError } = useFeed(address);
  const { createPost, isLoading: isCreatingPost, error: createPostError, success: createPostSuccess } = useCreatePost();
  const [newPost, setNewPost] = useState('');
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Show success toast when post is created
  useEffect(() => {
    if (createPostSuccess) {
      addToast('Post created successfully!', 'success');
      setNewPost('');
    }
  }, [createPostSuccess, addToast]);

  // Show error toast when post creation fails
  useEffect(() => {
    if (createPostError) {
      addToast(`Error creating post: ${createPostError}`, 'error');
    }
  }, [createPostError, addToast]);

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

  // Simulate infinite scrolling
  const loadMore = useCallback(() => {
    if (!isFeedLoading && hasMore) {
      setPage(prevPage => prevPage + 1);
      // In a real implementation, we would fetch more posts from the backend
      // For now, we'll just simulate reaching the end
      setHasMore(false);
    }
  }, [isFeedLoading, hasMore]);

  // Handle scroll event for infinite scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop !== document.documentElement.offsetHeight || !hasMore) {
        return;
      }
      loadMore();
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore, hasMore]);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPost.trim() === '') {
      addToast('Please enter some content for your post', 'error');
      return;
    }
    
    if (!isConnected || !address) {
      addToast('Please connect your wallet to post', 'error');
      return;
    }
    
    try {
      const postData: CreatePostInput = {
        author: address,
        content: newPost,
        tags: [], // In a real implementation, we would extract tags from the content
      };
      
      await createPost(postData);
    } catch (error) {
      console.error('Error creating post:', error);
      addToast('Failed to create post. Please try again.', 'error');
    }
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
              </form>
            </div>
          )}
          
          {/* Posts Feed */}
          <div className="space-y-6">
            {isFeedLoading && page === 1 ? (
              <div className="bg-white shadow rounded-lg p-6">
                <p>Loading feed...</p>
              </div>
            ) : feedError ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <p>Error loading feed: {feedError}</p>
              </div>
            ) : feed.length === 0 ? (
              <div className="bg-white shadow rounded-lg p-6 text-center">
                <p className="text-gray-500">No posts yet. Be the first to post!</p>
              </div>
            ) : (
              <>
                {feed.map((post) => {
                  const authorProfile = profiles[post.author] || { 
                    handle: 'Unknown', 
                    ens: '', 
                    avatarCid: 'https://via.placeholder.com/40' 
                  };
                  
                  return (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      profile={authorProfile} 
                    />
                  );
                })}
                
                {isFeedLoading && page > 1 && (
                  <div className="bg-white shadow rounded-lg p-6 text-center">
                    <p>Loading more posts...</p>
                  </div>
                )}
                
                {!hasMore && feed.length > 0 && (
                  <div className="bg-white shadow rounded-lg p-6 text-center">
                    <p className="text-gray-500">You've reached the end of the feed</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}