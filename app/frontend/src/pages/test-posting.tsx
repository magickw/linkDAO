import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { useWeb3 } from '@/context/Web3Context';
import { useCreatePost } from '@/hooks/usePosts';
import { useToast } from '@/context/ToastContext';
import { CreatePostInput } from '@/models/Post';

export default function TestPosting() {
  const { address, isConnected } = useWeb3();
  const { createPost, isLoading, error, success } = useCreatePost();
  const { addToast } = useToast();
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      addToast('Please connect your wallet first', 'error');
      return;
    }

    if (!content.trim()) {
      addToast('Please enter some content', 'error');
      return;
    }

    try {
      const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      
      const postData: CreatePostInput = {
        author: address,
        content: content.trim(),
        tags: tagArray,
      };

      console.log('Creating post with data:', postData);
      await createPost(postData);
      
      if (success) {
        addToast('Post created successfully!', 'success');
        setContent('');
        setTags('');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      addToast('Failed to create post', 'error');
    }
  };

  return (
    <Layout title="Test Posting - LinkDAO">
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Test Post Creation</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          {/* Connection Status */}
          <div className="mb-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
            <h3 className="font-semibold mb-2">Connection Status</h3>
            <p>Wallet Connected: {isConnected ? '✅ Yes' : '❌ No'}</p>
            {address && <p>Address: {address}</p>}
          </div>

          {/* Post Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="content" className="block text-sm font-medium mb-2">
                Post Content
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's happening in Web3?"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                rows={4}
                required
              />
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-medium mb-2">
                Tags (comma separated)
              </label>
              <input
                type="text"
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="test, web3, defi"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={!isConnected || isLoading || !content.trim()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Post...' : 'Create Post'}
            </button>
          </form>

          {/* Status Messages */}
          {error && (
            <div className="mt-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg">
              Error: {error}
            </div>
          )}

          {success && (
            <div className="mt-4 p-4 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded-lg">
              Post created successfully!
            </div>
          )}

          {/* Debug Info */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="font-semibold mb-2">Debug Information</h3>
            <div className="text-sm space-y-1">
              <p>Backend URL: {process.env.NEXT_PUBLIC_BACKEND_URL || 'Not set'}</p>
              <p>Backend URL: {process.env.NEXT_PUBLIC_BACKEND_URL || 'Not set'}</p>
              <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
              <p>Error: {error || 'None'}</p>
              <p>Success: {success ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}