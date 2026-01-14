import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { ArrowLeft, ChevronDown, Plus, X } from 'lucide-react';
import RichTextEditor from '@/components/EnhancedPostComposer/RichTextEditor';
import { CommunityService } from '@/services/communityService';
import { PostService } from '@/services/postService';
import { enhancedAuthService } from '@/services/enhancedAuthService';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import CommunityAvatar from '@/components/Community/CommunityAvatar';

// Helper function to get emoji for dropdown (URLs can't be displayed in <option>)
function getAvatarEmoji(avatar?: string): string {
  if (!avatar) return '🏛️';
  // If it's a URL, return default emoji
  if (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('/')) {
    return '🏛️';
  }
  // If it's a short string (emoji), return it
  if (avatar.length <= 4) {
    return avatar;
  }
  return '🏛️';
}

const CreatePostPage: React.FC = () => {
  const router = useRouter();
  const { community } = router.query;
  const { address, isConnected } = useWeb3();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [userCommunities, setUserCommunities] = useState<any[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [showCreateCommunityModal, setShowCreateCommunityModal] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityDescription, setNewCommunityDescription] = useState('');
  const [isCreatingCommunity, setIsCreatingCommunity] = useState(false);

  // Social sharing state
  const [shareToSocialMedia, setShareToSocialMedia] = useState({
    twitter: false,
    facebook: false,
    linkedin: false,
    threads: false,
  });

  const { addToast } = useToast();

  // Fetch user's communities (both memberships and created)
  useEffect(() => {
    const fetchUserCommunities = async () => {
      // Check both wallet connection and backend authentication to avoid 401 errors
      const isBackendAuthenticated = enhancedAuthService.isAuthenticated();
      if (isConnected && address && isBackendAuthenticated) {
        try {
          const allUserCommunities = [];
          let page = 1;
          const pageSize = 50;
          let hasMore = true;

          // Fetch communities where user is a member
          while (hasMore) {
            try {
              const { communities, pagination } = await CommunityService.getMyCommunities(page, pageSize);
              allUserCommunities.push(...communities);

              if (pagination && pagination.page && pagination.totalPages) {
                hasMore = page < pagination.totalPages;
              } else {
                hasMore = communities.length === pageSize;
              }

              page++;
            } catch (pageError) {
              console.error(`Error fetching page ${page} of user communities:`, pageError);
              hasMore = false;
            }
          }

          // Also fetch communities created by the user (in case they're not auto-added as members)
          try {
            const { communities: createdCommunities } = await CommunityService.getMyCreatedCommunities(1, 100);

            // Merge and deduplicate using a Map
            const communityMap = new Map();
            [...allUserCommunities, ...createdCommunities].forEach(c => {
              if (c && c.id) {
                communityMap.set(c.id, c);
              }
            });

            const mergedCommunities = Array.from(communityMap.values());
            setUserCommunities(mergedCommunities);

            if (community && typeof community === 'string') {
              let foundCommunity = mergedCommunities.find((c: any) =>
                c.id === community || c.slug === community
              );

              if (!foundCommunity) {
                const normalizedCommunity = community.trim().toLowerCase();
                const nameMatches = mergedCommunities.filter((c: any) =>
                  c.name && c.name.trim().toLowerCase() === normalizedCommunity
                );

                if (nameMatches.length === 1) {
                  foundCommunity = nameMatches[0];
                }
              }

              if (foundCommunity) {
                setSelectedCommunity(foundCommunity.id);
              } else {
                addToast('You must be a member of this community to post', 'error');
              }
            }
          } catch (createdError) {
            console.error('Error fetching created communities:', createdError);
            // Continue with just membership communities if created fetch fails
            setUserCommunities(allUserCommunities);
          }
        } catch (error) {
          console.error('Error fetching user communities:', error);
          addToast('Error loading your communities.', 'error');
        } finally {
          setLoadingCommunities(false);
        }
      } else {
        setLoadingCommunities(false);
      }
    };

    fetchUserCommunities();
  }, [isConnected, address, community, addToast]);

  // Add a refresh function for manual refetch
  const refreshCommunities = async () => {
    if (isConnected && address) {
      setLoadingCommunities(true);
      try {
        const { communities: memberCommunities } = await CommunityService.getMyCommunities(1, 100);
        const { communities: createdCommunities } = await CommunityService.getMyCreatedCommunities(1, 100);

        // Merge and deduplicate using a Map
        const communityMap = new Map();
        [...memberCommunities, ...createdCommunities].forEach(c => {
          if (c && c.id) {
            communityMap.set(c.id, c);
          }
        });

        const mergedCommunities = Array.from(communityMap.values());
        setUserCommunities(mergedCommunities);
      } catch (error) {
        console.error('Error refreshing communities:', error);
        addToast('Error refreshing communities.', 'error');
      } finally {
        setLoadingCommunities(false);
      }
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleCreateCommunity = async () => {
    if (!newCommunityName.trim()) {
      addToast('Please enter a community name', 'error');
      return;
    }

    setIsCreatingCommunity(true);
    try {
      // Generate slug from name (lowercase, replace spaces with hyphens)
      const slug = newCommunityName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      const newCommunity = await CommunityService.createCommunity({
        name: newCommunityName.trim(),
        slug: slug,
        displayName: newCommunityName.trim(),
        description: newCommunityDescription.trim() || `Welcome to ${newCommunityName.trim()}`,
        category: 'general', // Default category
        isPublic: true,
      });

      addToast('Community created successfully!', 'success');

      // Refetch communities to get fresh membership data
      try {
        const { communities: memberCommunities } = await CommunityService.getMyCommunities(1, 100);
        const { communities: createdCommunities } = await CommunityService.getMyCreatedCommunities(1, 100);

        // Merge and deduplicate using a Map
        const communityMap = new Map();
        [...memberCommunities, ...createdCommunities].forEach(c => {
          if (c && c.id) {
            communityMap.set(c.id, c);
          }
        });

        const mergedCommunities = Array.from(communityMap.values());
        setUserCommunities(mergedCommunities);

        // Select the newly created community
        const createdCommunity = mergedCommunities.find(c => c.id === newCommunity.id);
        if (createdCommunity) {
          setSelectedCommunity(createdCommunity.id);
        }
      } catch (refetchError) {
        console.error('Error refetching communities after creation:', refetchError);
        // Fallback to adding the new community to existing list
        setUserCommunities([...userCommunities, newCommunity]);
        setSelectedCommunity(newCommunity.id);
      }

      // Close modal and reset form
      setShowCreateCommunityModal(false);
      setNewCommunityName('');
      setNewCommunityDescription('');
    } catch (error) {
      console.error('Error creating community:', error);
      addToast(error instanceof Error ? error.message : 'Failed to create community', 'error');
    } finally {
      setIsCreatingCommunity(false);
    }
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

    if (!selectedCommunity) {
      addToast('Please select a community to post in', 'error');
      return;
    }

    const isMember = userCommunities.some((c: any) => c.id === selectedCommunity);
    if (!isMember) {
      addToast('You must be a member of the selected community to post', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const postData: any = {
        title: title.trim(),
        content: content.trim(),
        tags,
        author: address,
        communityId: selectedCommunity,
        shareToSocialMedia
      };

      await PostService.createPost(postData);

      addToast('Post created successfully!', 'success');

      const communityData = userCommunities.find(c => c.id === selectedCommunity);
      if (communityData) {
        router.push(`/communities/${encodeURIComponent(communityData.slug ?? communityData.id ?? communityData.name ?? '')}`);
      } else {
        router.push('/communities');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      addToast(error instanceof Error ? error.message : 'Failed to create post. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCommunityData = userCommunities.find(c => c.id === selectedCommunity);

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
              className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Create a Post
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Share your thoughts with the community
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Community Selection Dropdown */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Community <span className="text-red-500">*</span>
              </label>

              {loadingCommunities ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">Loading communities...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Dropdown with refresh button */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select
                        value={selectedCommunity || ''}
                        onChange={(e) => setSelectedCommunity(e.target.value || null)}
                        className="w-full px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
                        required
                      >
                        <option value="">Choose a community...</option>
                        {userCommunities.map(community => (
                          <option key={community.id} value={community.id}>
                            {getAvatarEmoji(community.avatar)} {community.displayName || community.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                    <button
                      type="button"
                      onClick={refreshCommunities}
                      disabled={loadingCommunities}
                      className="px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title="Refresh communities"
                    >
                      <svg className={`w-5 h-5 ${loadingCommunities ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>

                  {/* Selected Community Preview */}
                  {selectedCommunityData && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CommunityAvatar
                          avatar={selectedCommunityData.avatar}
                          name={selectedCommunityData.displayName || selectedCommunityData.name}
                          size="md"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {selectedCommunityData.displayName || selectedCommunityData.name}
                          </div>
                          {selectedCommunityData.description && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                              {selectedCommunityData.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Create New Community Button */}
                  <button
                    type="button"
                    onClick={() => setShowCreateCommunityModal(true)}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Create New Community</span>
                  </button>
                </div>
              )}
            </div>

            {/* Title */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a descriptive title"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                Content <span className="text-red-500">*</span>
              </label>
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Share your thoughts..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y min-h-[200px]"
                shareToSocialMedia={shareToSocialMedia}
                onShareToSocialMediaChange={setShareToSocialMedia}
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
                disabled={isSubmitting || !selectedCommunity}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Posting...' : 'Create Post'}
              </button>
            </div>
          </form>
        </div>

        {/* Create Community Modal */}
        {showCreateCommunityModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Create New Community
                </h2>
                <button
                  onClick={() => {
                    setShowCreateCommunityModal(false);
                    setNewCommunityName('');
                    setNewCommunityDescription('');
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Community Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newCommunityName}
                    onChange={(e) => setNewCommunityName(e.target.value)}
                    placeholder="Enter community name"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={newCommunityDescription}
                    onChange={(e) => setNewCommunityDescription(e.target.value)}
                    placeholder="Describe your community"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    maxLength={500}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowCreateCommunityModal(false);
                      setNewCommunityName('');
                      setNewCommunityDescription('');
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateCommunity}
                    disabled={isCreatingCommunity || !newCommunityName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingCommunity ? 'Creating...' : 'Create Community'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </ErrorBoundary>
  );
};

export default CreatePostPage;