import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { ArrowLeft, Hash, Users } from 'lucide-react';
import RichTextEditor from '@/components/EnhancedPostComposer/RichTextEditor';
import { CommunityService } from '@/services/communityService';
import { PostService } from '@/services/postService';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';

const CreatePostPage: React.FC = () => {
  const router = useRouter();
  const { community } = router.query;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [userCommunities, setUserCommunities] = useState<any[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();

  // Fetch user's communities
  useEffect(() => {
    const fetchUserCommunities = async () => {
      if (isConnected && address) {
        try {
          // Get all user's communities by paging through results
          const allUserCommunities = [];
          let page = 1;
          const pageSize = 50; // Reasonable page size for API calls
          let hasMore = true;
          
          while (hasMore) {
            try {
              const { communities, pagination } = await CommunityService.getMyCommunities(page, pageSize);
              allUserCommunities.push(...communities);
              
              // Check if there are more pages
              if (pagination && pagination.page && pagination.totalPages) {
                hasMore = page < pagination.totalPages;
              } else {
                // Fallback: if no pagination info, assume no more pages if we got fewer results than page size
                hasMore = communities.length === pageSize;
              }
              
              page++;
            } catch (pageError) {
              console.error(`Error fetching page ${page} of user communities:`, pageError);
              // Stop fetching more pages if we encounter an error
              hasMore = false;
              // But continue with whatever communities we've already fetched
            }
          }
          
          setUserCommunities(allUserCommunities);
          
          // If there's a community parameter in the URL, select it
          if (community && typeof community === 'string') {
            // First try to match by id or slug
            let foundCommunity = userCommunities.find((c: any) => 
              c.id === community || c.slug === community
            );
            
            // If no match found, try strict name matching (normalized)
            if (!foundCommunity) {
              const normalizedCommunity = community.trim().toLowerCase();
              const nameMatches = userCommunities.filter((c: any) => 
                c.name && c.name.trim().toLowerCase() === normalizedCommunity
              );
              
              // Only accept name match if it's unique
              if (nameMatches.length === 1) {
                foundCommunity = nameMatches[0];
              }
            }
            
            if (foundCommunity) {
              setSelectedCommunity(foundCommunity.id);
            }
          }
        } catch (error) {
          console.error('Error fetching user communities:', error);
          addToast('Error loading your communities', 'error');
        } finally {
          setLoadingCommunities(false);
        }
      } else {
        setLoadingCommunities(false);
      }
    };

    fetchUserCommunities();
  }, [isConnected, address, community, addToast]);

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

    if (!isConnected || !address) {
      addToast('Please connect your wallet to create a post', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const postData: any = {
        title: title.trim(),
        content: content.trim(),
        tags,
        author: address
      };

      // Add community ID if selected
      if (selectedCommunity) {
        postData.communityId = selectedCommunity;
      }

      await PostService.createPost(postData);

      addToast('Post created successfully!', 'success');
      
      // Redirect based on whether it was a community post or global post
      if (selectedCommunity) {
        const communityData = userCommunities.find(c => c.id === selectedCommunity);
        if (communityData) {
          router.push(`/communities/${communityData.slug || communityData.name || communityData.id}`);
        } else {
          router.push('/communities');
        }
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      addToast(error instanceof Error ? error.message : 'Failed to create post. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ErrorBoundary>
      <Layout title="Create Post - LinkDAO">
        <Head>
          <meta name="description" content="Create a new post on LinkDAO" />
        </Head>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.history.length > 1) {
                  router.back();
                } else {
                  router.push('/');
                }
              }}
              className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Create a Post
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Community Selection */}
            {userCommunities.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Community (optional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Global post option */}
                  <button
                    type="button"
                    onClick={() => setSelectedCommunity(null)}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${
                      selectedCommunity === null
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className="text-lg">🌐</div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Global Post</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Share with everyone</div>
                      </div>
                    </div>
                  </button>
                  
                  {/* User communities */}
                  {userCommunities.map(community => (
                    <button
                      key={community.id}
                      type="button"
                      onClick={() => setSelectedCommunity(community.id)}
                      className={`p-4 rounded-lg border-2 text-left transition-colors ${
                        selectedCommunity === community.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="text-lg">{community.avatar || '🏛️'}</div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {community.displayName || community.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                            <Users className="w-3 h-3 mr-1" />
                            {community.memberCount?.toLocaleString() || 0} members
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                onClick={() => {
                  if (typeof window !== 'undefined' && window.history.length > 1) {
                    router.back();
                  } else {
                    router.push('/');
                  }
                }}
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

export default CreatePostPage;