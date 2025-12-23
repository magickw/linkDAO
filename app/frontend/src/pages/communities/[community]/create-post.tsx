import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { ArrowLeft, Hash } from 'lucide-react';
import RichTextEditor from '@/components/EnhancedPostComposer/RichTextEditor';
import { CommunityService } from '@/services/communityService';
import { CommunityPostService } from '@/services/communityPostService';
import { useAccount } from 'wagmi';
import { useToast } from '@/context/ToastContext';

const CreateCommunityPostPage: React.FC = () => {
  const router = useRouter();
  const { community } = router.query;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [communityData, setCommunityData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const { address } = useAccount();
  const { addToast } = useToast();

  // Fetch community data
  useEffect(() => {
    const fetchCommunityData = async () => {
      if (community) {
        try {
          const data = await CommunityService.getCommunityBySlug(community as string);
          if (data) {
            setCommunityData(data);
          } else {
            addToast('Community not found', 'error');
            router.push('/communities');
          }
        } catch (error) {
          console.error('Error fetching community:', error);
          addToast('Error loading community', 'error');
          router.push('/communities');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchCommunityData();
  }, [community, router, addToast]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      addToast('Please fill in all required fields', 'error');
      return;
    }

    if (!address) {
      addToast('Please connect your wallet to create a post', 'error');
      return;
    }

    if (!communityData) {
      addToast('Community data not loaded', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const postData = {
        communityId: communityData.id,
        title: title.trim(),
        content: content.trim(),
        tags,
        author: address
      };

      await CommunityPostService.createCommunityPost(postData);

      addToast('Post created successfully!', 'success');
      router.push(`/communities/${encodeURIComponent(community ?? '')}`);
    } catch (error) {
      console.error('Error creating post:', error);
      addToast(error instanceof Error ? error.message : 'Failed to create post. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ErrorBoundary>
        <Layout title="Create Post - LinkDAO">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading community...</p>
            </div>
          </div>
        </Layout>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Layout title={`Create Post in ${communityData?.displayName || communityData?.name} - LinkDAO`}>
        <Head>
          <meta name="description" content={`Create a new post in ${communityData?.displayName || communityData?.name}`} />
        </Head>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.push(`/communities/${encodeURIComponent(community ?? '')}`)}
              className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to {communityData?.displayName || communityData?.name}
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Create a Post in {communityData?.displayName || communityData?.name}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Community Info (Read-only) */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Community
              </label>
              <div className="flex items-center space-x-3">
                <div className="text-2xl">
                  {communityData?.avatar || '🏛️'}
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {communityData?.displayName || communityData?.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {communityData?.memberCount?.toLocaleString() || 0} members
                  </div>
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a descriptive title"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                maxLength={300}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {title.length}/300 characters
              </p>
            </div>

            {/* Content */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Content *
              </label>
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Share your thoughts..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y min-h-[200px]"
              />
            </div>

            {/* Tags */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags (optional)
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="Add tags (press Enter)"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push(`/communities/${encodeURIComponent(community ?? '')}`)}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Posting...' : 'Create Post'}
              </button>
            </div>
          </form>
        </div>
      </Layout>
    </ErrorBoundary>
  );
};

export default CreateCommunityPostPage;