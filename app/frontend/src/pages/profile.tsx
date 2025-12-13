import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { getAccount } from '@wagmi/core';
import { config } from '@/lib/rainbowkit';
// import { useReadProfileRegistryGetProfileByAddress, useWriteProfileRegistryCreateProfile, useWriteProfileRegistryUpdateProfile } from '@/generated';
import { useWeb3 } from '@/context/Web3Context';
import { useProfile } from '@/hooks/useProfile';
import { useFollowCount } from '@/hooks/useFollow';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext';
import { countries } from '@/utils/countries';
import { UpdateUserProfileInput, CreateUserProfileInput } from '@/models/UserProfile';
import FollowerList from '@/components/FollowerList';
import FollowingList from '@/components/FollowingList';
import TipBar from '@/components/TipBar';
import { PaymentMethodsTab } from '@/components/PaymentMethodsTab';
import { useWalletDataReal } from '@/hooks/useWalletDataReal';
import { useReputationData } from '@/hooks/useReputationData';
import { useTipsData } from '@/hooks/useTipsData';
import { usePostsByAuthor } from '@/hooks/usePosts';
import { useFollow, useFollowStatus } from '@/hooks/useFollow';
import { unifiedImageService } from '@/services/unifiedImageService';
import Link from 'next/link';
import { ProfileService } from '@/services/profileService';

// Helper function to validate IPFS CID and construct proper URL
function getAvatarUrl(profileCid: string | undefined): string | undefined {
  if (!profileCid) return undefined;

  // Check if it's a valid IPFS CID
  if (profileCid.startsWith('Qm') || profileCid.startsWith('bafy')) {
    return `https://ipfs.io/ipfs/${profileCid}`;
  }

  // Check if it's already a full URL
  try {
    new URL(profileCid);
    return profileCid;
  } catch {
    // Not a valid URL, return undefined
    return undefined;
  }
}

export default function Profile() {
  const router = useRouter();
  const { address: currentUserAddress, isConnected } = useWeb3();
  const { isAuthenticated, login, recoverSession, ensureAuthenticated } = useAuth();
  const { addToast } = useToast();

  // Determine which user profile to display based on query parameter
  const targetUserAddress = typeof router.query.user === 'string' ? router.query.user : currentUserAddress;

  // Backend profile loading with error handling
  const { profile: backendProfile, isLoading: isBackendProfileLoading, error: backendProfileError, refetch, updateProfile: updateBackendProfile } = useProfile(targetUserAddress);
  const { data: followCount, isLoading: isFollowCountLoading } = useFollowCount(targetUserAddress);

  // Wallet data
  const { portfolio, tokens: rawTokens, isLoading: isWalletLoading } = useWalletDataReal({ address: targetUserAddress });
  const tokens = Array.isArray(rawTokens) ? rawTokens : [];

  // Reputation data
  const { reputation, events: rawReputationEvents, isLoading: isReputationLoading } = useReputationData({ userId: targetUserAddress || '' });
  const reputationEvents = Array.isArray(rawReputationEvents) ? rawReputationEvents : [];

  // Tips data
  const { earnings, isLoading: isTipsLoading } = useTipsData({ userId: targetUserAddress || '' });

  // Posts data
  const { posts: rawPosts, isLoading: isPostsLoading, error: postsError, refetch: refetchPosts } = usePostsByAuthor(targetUserAddress || '');
  const posts = Array.isArray(rawPosts) ? rawPosts : [];

  // Smart contract profile data - temporarily disabled due to webpack issues
  const contractProfileData: any = null;
  const isContractProfileLoading = false;

  // State for tracking operations
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);

  const [profile, setProfile] = useState({
    handle: '',
    displayName: '',
    ens: '',
    bio: '',
    avatar: '',
    banner: '',
    website: '',
    socialLinks: [] as { platform: string; url: string; username?: string }[],
  });
  const [activeTab, setActiveTab] = useState<'posts' | 'proposals' | 'activity' | 'wallet' | 'reputation' | 'tips' | 'followers' | 'following' | 'addresses' | 'payments' | 'edit' | 'social'>('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [addresses, setAddresses] = useState({
    billing: {
      firstName: '',
      lastName: '',
      company: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      phone: ''
    },
    shipping: {
      firstName: '',
      lastName: '',
      company: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      phone: '',
      sameAsBilling: true
    }
  });

  // Cache for post content to avoid repeated fetches
  const [postContentCache, setPostContentCache] = useState<Record<string, string>>({});

  // Follow/unfollow functionality
  const { follow, unfollow, isLoading: isFollowLoading } = useFollow();
  const { data: isFollowing, isLoading: isFollowStatusLoading, refetch: refetchFollowStatus } = useFollowStatus(
    currentUserAddress || '',
    targetUserAddress || ''
  );

  // Load profile data from backend first, fallback to contract data
  useEffect(() => {
    if (backendProfile) {
      setProfile({
        handle: backendProfile.handle,
        displayName: backendProfile.displayName || '', // Use actual displayName field
        ens: backendProfile.ens,
        bio: backendProfile.bioCid, // In a real app, we'd fetch the actual bio content from IPFS
        avatar: getAvatarUrl(backendProfile.avatarCid || backendProfile.profileCid), // Fallback to profileCid for backend compatibility
        banner: getAvatarUrl(backendProfile.bannerCid) || '',
        website: backendProfile.website || '',
        socialLinks: backendProfile.socialLinks || [],
      });
      setAvatarError(false); // Reset avatar error when loading new profile

      // Load addresses from backend profile
      setAddresses({
        billing: {
          firstName: backendProfile.billingFirstName || '',
          lastName: backendProfile.billingLastName || '',
          company: backendProfile.billingCompany || '',
          address1: backendProfile.billingAddress1 || '',
          address2: backendProfile.billingAddress2 || '',
          city: backendProfile.billingCity || '',
          state: backendProfile.billingState || '',
          zipCode: backendProfile.billingZipCode || '',
          country: backendProfile.billingCountry || '',
          phone: backendProfile.billingPhone || ''
        },
        shipping: {
          firstName: backendProfile.shippingFirstName || '',
          lastName: backendProfile.shippingLastName || '',
          company: backendProfile.shippingCompany || '',
          address1: backendProfile.shippingAddress1 || '',
          address2: backendProfile.shippingAddress2 || '',
          city: backendProfile.shippingCity || '',
          state: backendProfile.shippingState || '',
          zipCode: backendProfile.shippingZipCode || '',
          country: backendProfile.shippingCountry || '',
          phone: backendProfile.shippingPhone || '',
          sameAsBilling: backendProfile.shippingSameAsBilling ?? true // Use actual value from backend, default to true
        }
      });
    } else if (contractProfileData && contractProfileData.handle) {
      setProfile({
        handle: contractProfileData.handle,
        displayName: contractProfileData.displayName || '', // Use actual displayName field
        ens: contractProfileData.ens,
        bio: contractProfileData.bioCid, // In a real app, we'd fetch the actual bio content from IPFS
        avatar: getAvatarUrl(contractProfileData.avatarCid || contractProfileData.profileCid), // Validate avatar URL
        banner: '',
        website: '',
        socialLinks: [],
      });
      setAvatarError(false); // Reset avatar error when loading new profile
    }
  }, [backendProfile, contractProfileData]);

  // Handle follow/unfollow actions
  const handleFollow = async () => {
    if (!currentUserAddress || !targetUserAddress) {
      addToast('Please connect your wallet first', 'error');
      return;
    }

    if (!isAuthenticated) {
      addToast('Please authenticate with your wallet first', 'error');
      return;
    }

    if (currentUserAddress === targetUserAddress) {
      addToast('You cannot follow yourself', 'error');
      return;
    }

    try {
      await follow({ follower: currentUserAddress, following: targetUserAddress });
      refetchFollowStatus();
      addToast(`Successfully followed ${profile.handle || targetUserAddress}`, 'success');
    } catch (error) {
      console.error('Error following user:', error);
      addToast(`Failed to follow user: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  // Get post content preview by fetching from IPFS
  const getPostContentPreview = useCallback((post: any) => {
    // If we already have the content in cache, return it
    if (postContentCache[post.id]) {
      return postContentCache[post.id];
    }

    // If the post has direct content (not a CID), return it
    if (post.content && typeof post.content === 'string' && !post.content.startsWith('Qm') && !post.content.startsWith('baf')) {
      return post.content;
    }

    // If no content CID or CID is not valid IPFS format, use direct content
    if (!post.contentCid || (!post.contentCid.startsWith('Qm') && !post.contentCid.startsWith('baf'))) {
      // Try to use post.content if available
      if (post.content) {
        return post.content;
      }
      return '';
    }

    // If it looks like a valid IPFS CID, fetch the content
    if (post.contentCid.startsWith('Qm') || post.contentCid.startsWith('baf')) {
      // Fetch content from backend API that proxies IPFS
      fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000'}/api/feed/content/${post.contentCid}`)
        .then(async response => {
          if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              return response.json();
            } else {
              // Handle text response
              const text = await response.text();
              return { content: text };
            }
          }
          throw new Error('Failed to fetch content');
        })
        .then(data => {
          const content = data.data?.content || data.content || 'Content not available';
          // Cache the content
          setPostContentCache(prev => ({ ...prev, [post.id]: content }));
          // Force a re-render by updating state
          setPostContentCache(currentCache => ({ ...currentCache }));
          return content;
        })
        .catch(error => {
          console.error('Error fetching post content:', error);
          // Cache the error state to prevent repeated fetches
          setPostContentCache(prev => ({ ...prev, [post.id]: 'Content not available' }));
          return 'Content not available';
        });

      // Return loading state while fetching
      return 'Loading content...';
    }

    // If it's already content (not a CID), return as is
    return post.contentCid || post.content || '';
  }, [postContentCache]);

  const handleUnfollow = async () => {
    if (!currentUserAddress || !targetUserAddress) {
      addToast('Please connect your wallet first', 'error');
      return;
    }

    if (!isAuthenticated) {
      addToast('Please authenticate with your wallet first', 'error');
      return;
    }

    if (currentUserAddress === targetUserAddress) {
      addToast('You cannot unfollow yourself', 'error');
      return;
    }

    try {
      await unfollow({ follower: currentUserAddress, following: targetUserAddress });
      refetchFollowStatus();
      addToast(`Successfully unfollowed ${profile.handle || targetUserAddress}`, 'success');
    } catch (error) {
      console.error('Error unfollowing user:', error);
      addToast(`Failed to unfollow user: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  // Handle post editing
  const handleEditPost = async (post: any) => {
    if (!currentUserAddress || currentUserAddress !== targetUserAddress) {
      addToast('You can only edit your own posts', 'error');
      return;
    }

    // Navigate to the edit post page
    router.push({
      pathname: `/edit-post/${post.id}`,
      query: {
        title: post.title,
        content: post.contentCid,
        tags: post.tags ? post.tags.join(',') : '',
        communityId: post.communityId || ''
      }
    });
  };

  // Handle post deletion
  const handleDeletePost = async (postId: string) => {
    if (!currentUserAddress || currentUserAddress !== targetUserAddress) {
      addToast('You can only delete your own posts', 'error');
      return;
    }

    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      // Import PostService dynamically to avoid SSR issues
      const { PostService } = await import('@/services/postService');

      await PostService.deletePost(postId);

      // Refresh the posts list
      if (refetchPosts) {
        refetchPosts();
      }

      addToast('Post deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting post:', error);
      addToast(`Failed to delete post: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  // Check for edit query parameter (only for current user's profile)
  useEffect(() => {
    if (router.query.edit === 'true' && (!router.query.user || router.query.user === currentUserAddress)) {
      setIsEditing(true);
      // Clean up the URL after entering edit mode
      const newQuery = { ...router.query };
      delete newQuery.edit;
      router.replace({
        pathname: router.pathname,
        query: newQuery
      }, undefined, { shallow: true });
    }
  }, [router.query.edit, router.query.user, currentUserAddress, router]);

  // Reset avatar error when viewing a different user's profile
  useEffect(() => {
    setAvatarError(false);
  }, [targetUserAddress]);

  // Listen for post creation events to refresh the posts list
  useEffect(() => {
    const handlePostCreated = () => {
      console.log('Post created event received, refetching posts...');
      if (refetchPosts) {
        refetchPosts();
      }
    };

    window.addEventListener('postCreated', handlePostCreated);

    return () => {
      window.removeEventListener('postCreated', handlePostCreated);
    };
  }, [refetchPosts]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const [section, field] = name.split('.');

    if (section === 'billing' || section === 'shipping') {
      setAddresses(prev => ({
        ...prev,
        [section]: {
          ...prev[section as keyof typeof prev],
          [field]: value
        }
      }));
    }
  };

  const handleSameAsBillingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setAddresses(prev => ({
      ...prev,
      shipping: {
        ...prev.shipping,
        sameAsBilling: checked
      }
    }));

    if (checked) {
      // Copy billing address to shipping when same as billing is checked
      setAddresses(prev => ({
        ...prev,
        shipping: {
          ...prev.billing,
          sameAsBilling: true
        }
      }));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      try {
        // Show loading state
        setIsUpdating(true);
        setUpdateError(null);

        // Upload the image using the unified image service
        const uploadResult = await unifiedImageService.uploadImage(file, 'profile');

        // Update the profile state with the new avatar URL
        setProfile(prev => ({ ...prev, avatar: uploadResult.cdnUrl }));
        setAvatarError(false); // Reset avatar error after successful upload

        addToast('Avatar uploaded successfully!', 'success');

        // Automatically save the updated avatar to the backend
        if (backendProfile) {
          try {
            // Prepare update data with only the avatar change
            const updateData: UpdateUserProfileInput = {
              avatarCid: uploadResult.cdnUrl
            };

            // Update the backend profile
            await updateBackendProfile(updateData);

            // Refresh the backend profile to ensure the changes are reflected
            await refetch();

            addToast('Avatar saved to profile!', 'success');
          } catch (saveError) {
            console.error('Failed to save avatar to backend:', saveError);
            addToast('Avatar uploaded but failed to save. Please save your profile manually.', 'warning');
          }
        }
      } catch (error) {
        console.error('Error uploading avatar:', error);
        setUpdateError(error instanceof Error ? error.message : 'Failed to upload avatar');
        addToast(`Failed to upload avatar: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      } finally {
        setIsUpdating(false);
        // Reset the file input
        e.target.value = '';
      }
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      try {
        // Show loading state
        setIsUpdating(true);
        setUpdateError(null);

        // Upload the image using the unified image service
        const uploadResult = await unifiedImageService.uploadImage(file, 'cover');

        // Update the profile state with the new banner URL
        setProfile(prev => ({ ...prev, banner: uploadResult.cdnUrl }));

        addToast('Banner uploaded successfully!', 'success');

        // Automatically save the updated banner to the backend
        if (backendProfile) {
          try {
            // Prepare update data with only the banner change
            const updateData: UpdateUserProfileInput = {
              bannerCid: uploadResult.cdnUrl
            };

            // Update the backend profile
            await updateBackendProfile(updateData);

            // Refresh the backend profile to ensure the changes are reflected
            await refetch();

            addToast('Banner saved to profile!', 'success');
          } catch (saveError) {
            console.error('Failed to save banner to backend:', saveError);
            addToast('Banner uploaded but failed to save. Please save your profile manually.', 'warning');
          }
        }
      } catch (error) {
        console.error('Error uploading banner:', error);
        setUpdateError(error instanceof Error ? error.message : 'Failed to upload banner');
        addToast(`Failed to upload banner: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      } finally {
        setIsUpdating(false);
        // Reset the file input
        e.target.value = '';
      }
    }
  };

  // Add a new social link
  const handleAddSocialLink = () => {
    setProfile(prev => ({
      ...prev,
      socialLinks: [...prev.socialLinks, { platform: '', url: '', username: '' }]
    }));
  };

  // Remove a social link
  const handleRemoveSocialLink = (index: number) => {
    setProfile(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, i) => i !== index)
    }));
  };

  // Update a social link
  const handleSocialLinkChange = (index: number, field: 'platform' | 'url' | 'username', value: string) => {
    setProfile(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.map((link, i) =>
        i === index ? { ...link, [field]: value } : link
      )
    }));
  };

  // Save profile
  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !currentUserAddress) {
      addToast('Please connect your wallet first', 'error');
      return;
    }

    // Check authentication and trigger login if needed
    const authResult = await ensureAuthenticated();
    if (!authResult.success) {
      addToast(authResult.error || 'Authentication failed', 'error');
      return;
    }

    try {
      setIsUpdating(true);
      setUpdateError(null);

      // Save to backend database
      if (backendProfile) {
        // Update existing profile
        const updateData: UpdateUserProfileInput = {
          handle: profile.handle,
          displayName: profile.displayName,
          ens: profile.ens,
          avatarCid: profile.avatar,
          bioCid: profile.bio,
          socialLinks: profile.socialLinks,
          website: profile.website,
        };
        await updateBackendProfile(updateData);

        // Update localStorage cache to persist changes across page refreshes
        try {
          const storedUserData = localStorage.getItem('linkdao_user_data');
          if (storedUserData) {
            const userData = JSON.parse(storedUserData);
            const updatedUserData = {
              ...userData,
              handle: profile.handle,
              ens: profile.ens,
            };
            localStorage.setItem('linkdao_user_data', JSON.stringify(updatedUserData));
            console.log('✅ Updated localStorage cache with new profile data');
          }
        } catch (error) {
          console.warn('Failed to update localStorage cache:', error);
          // Non-critical error, continue with success flow
        }
      } else {
        // Profile doesn't exist, need to create one first
        addToast('Please create your profile first by filling out all required fields.', 'error');
        return;
      }

      addToast('Profile updated successfully!', 'success');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save profile. Please try again.';
      setUpdateError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!backendProfile) {
      addToast('No profile to update', 'error');
      return;
    }

    // Check authentication
    const authResult = await ensureAuthenticated();
    if (!authResult.success) {
      addToast(authResult.error || 'Authentication failed', 'error');
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);

    try {
      // Prepare update data - map frontend fields to backend fields
      const updateData = {
        handle: profile.handle,
        displayName: profile.displayName, // This will be handled by the backend
        ens: profile.ens,
        bioCid: profile.bio,
        avatarCid: profile.avatar,
        bannerCid: profile.banner,
        website: profile.website,
        socialLinks: profile.socialLinks,
        // Billing address
        billingFirstName: addresses.billing.firstName,
        billingLastName: addresses.billing.lastName,
        billingCompany: addresses.billing.company,
        billingAddress1: addresses.billing.address1,
        billingAddress2: addresses.billing.address2,
        billingCity: addresses.billing.city,
        billingState: addresses.billing.state,
        billingZipCode: addresses.billing.zipCode,
        billingCountry: addresses.billing.country,
        billingPhone: addresses.billing.phone,
        // Shipping address
        shippingFirstName: addresses.shipping.firstName,
        shippingLastName: addresses.shipping.lastName,
        shippingCompany: addresses.shipping.company,
        shippingAddress1: addresses.shipping.address1,
        shippingAddress2: addresses.shipping.address2,
        shippingCity: addresses.shipping.city,
        shippingState: addresses.shipping.state,
        shippingZipCode: addresses.shipping.zipCode,
        shippingCountry: addresses.shipping.country,
        shippingPhone: addresses.shipping.phone,
      };

      await updateBackendProfile(updateData);
      setIsEditing(false);
      addToast('Profile updated successfully', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      // Better error handling to avoid [object Object] display
      let errorMessage = 'Failed to update profile';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        if ('message' in error && typeof (error as any).message === 'string') {
          errorMessage = (error as any).message;
        } else if ('error' in error && typeof (error as any).error === 'string') {
          errorMessage = (error as any).error;
        } else {
          errorMessage = JSON.stringify(error);
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      setUpdateError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Format wallet address for display
  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // Copy address to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Address copied to clipboard!', 'success');
  };

  // Retry loading profile data
  const retryLoadProfile = () => {
    // This would trigger a refetch in a real implementation
    window.location.reload();
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!isConnected || !currentUserAddress) {
      addToast('Please connect your wallet first', 'error');
      return;
    }

    // Check authentication and trigger login if needed
    const authResult = await ensureAuthenticated();
    if (!authResult.success) {
      addToast(authResult.error || 'Authentication failed', 'error');
      return;
    }

    // Validate required fields for billing address
    if (!addresses.billing.firstName.trim() || !addresses.billing.lastName.trim() ||
      !addresses.billing.address1.trim() || !addresses.billing.city.trim() ||
      !addresses.billing.state.trim() || !addresses.billing.zipCode.trim() ||
      !addresses.billing.country.trim()) {
      addToast('Please fill in all required billing address fields', 'error');
      return;
    }

    // Validate shipping address if it's different from billing
    if (!addresses.shipping.sameAsBilling) {
      if (!addresses.shipping.firstName.trim() || !addresses.shipping.lastName.trim() ||
        !addresses.shipping.address1.trim() || !addresses.shipping.city.trim() ||
        !addresses.shipping.state.trim() || !addresses.shipping.zipCode.trim() ||
        !addresses.shipping.country.trim()) {
        addToast('Please fill in all required shipping address fields', 'error');
        return;
      }
    }

    try {
      setIsUpdating(true);
      setUpdateError(null);

      // Save addresses to backend database
      if (backendProfile) {
        // If shipping address is same as billing, copy the billing address to shipping
        let shippingData = {
          shippingFirstName: addresses.shipping.firstName,
          shippingLastName: addresses.shipping.lastName,
          shippingCompany: addresses.shipping.company,
          shippingAddress1: addresses.shipping.address1,
          shippingAddress2: addresses.shipping.address2,
          shippingCity: addresses.shipping.city,
          shippingState: addresses.shipping.state,
          shippingZipCode: addresses.shipping.zipCode,
          shippingCountry: addresses.shipping.country,
          shippingPhone: addresses.shipping.phone,
        };

        // If same as billing is checked, copy billing address to shipping
        if (addresses.shipping.sameAsBilling) {
          shippingData = {
            shippingFirstName: addresses.billing.firstName,
            shippingLastName: addresses.billing.lastName,
            shippingCompany: addresses.billing.company,
            shippingAddress1: addresses.billing.address1,
            shippingAddress2: addresses.billing.address2,
            shippingCity: addresses.billing.city,
            shippingState: addresses.billing.state,
            shippingZipCode: addresses.billing.zipCode,
            shippingCountry: addresses.billing.country,
            shippingPhone: addresses.billing.phone,
          };
        }

        // Update existing profile with address information
        const updateData: UpdateUserProfileInput = {
          // Billing Address
          billingFirstName: addresses.billing.firstName,
          billingLastName: addresses.billing.lastName,
          billingCompany: addresses.billing.company,
          billingAddress1: addresses.billing.address1,
          billingAddress2: addresses.billing.address2,
          billingCity: addresses.billing.city,
          billingState: addresses.billing.state,
          billingZipCode: addresses.billing.zipCode,
          billingCountry: addresses.billing.country,
          billingPhone: addresses.billing.phone,
          // Shipping Address
          ...shippingData,
          shippingSameAsBilling: addresses.shipping.sameAsBilling,
        };

        await updateBackendProfile(updateData);
        setIsEditing(false);
        addToast('Profile updated successfully', 'success');
      } else {
        // If no backend profile exists, create one
        const createData: CreateUserProfileInput = {
          walletAddress: currentUserAddress,
          handle: profile.handle,
          displayName: profile.displayName,
          ens: profile.ens,
          avatarCid: profile.avatar,
          bioCid: profile.bio,
          // Billing Address
          billingFirstName: addresses.billing.firstName,
          billingLastName: addresses.billing.lastName,
          billingCompany: addresses.billing.company,
          billingAddress1: addresses.billing.address1,
          billingAddress2: addresses.billing.address2,
          billingCity: addresses.billing.city,
          billingState: addresses.billing.state,
          billingZipCode: addresses.billing.zipCode,
          billingCountry: addresses.billing.country,
          billingPhone: addresses.billing.phone,
          // Shipping Address
          shippingFirstName: addresses.shipping.firstName,
          shippingLastName: addresses.shipping.lastName,
          shippingCompany: addresses.shipping.company,
          shippingAddress1: addresses.shipping.address1,
          shippingAddress2: addresses.shipping.address2,
          shippingCity: addresses.shipping.city,
          shippingState: addresses.shipping.state,
          shippingZipCode: addresses.shipping.zipCode,
          shippingCountry: addresses.shipping.country,
          shippingPhone: addresses.shipping.phone,
          shippingSameAsBilling: addresses.shipping.sameAsBilling,
        };

        // Create profile
        await ProfileService.createProfile(createData);
        setIsEditing(false);
        addToast('Profile created successfully', 'success');

        // Refresh the page to load the new profile
        router.reload();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      let errorMessage = 'Failed to update profile';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        if ('message' in error && typeof (error as any).message === 'string') {
          errorMessage = (error as any).message;
        } else if ('error' in error && typeof (error as any).error === 'string') {
          errorMessage = (error as any).error;
        } else {
          errorMessage = JSON.stringify(error);
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      addToast(errorMessage, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isConnected) {
    return (
      <Layout title="Profile - LinkDAO" fullWidth={true}>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Profile</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-8">Please connect your wallet to view your profile.</p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const isLoading = isBackendProfileLoading || isContractProfileLoading || isFollowCountLoading;
  const hasError = backendProfileError || updateError;

  // Default avatar component
  const DefaultAvatar = () => (
    <div className="bg-gray-200 dark:bg-gray-700 border-2 border-dashed rounded-xl w-full h-full flex items-center justify-center">
      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
      </svg>
    </div>
  );

  return (
    <Layout title="Profile - LinkDAO" fullWidth={true}>
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Your Profile</h1>

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 shadow rounded-2xl p-6 mb-6 animate-pulse">
                <div className="flex flex-col md:flex-row items-center md:items-start">
                  <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-6">
                    <div className="h-24 w-24 md:h-32 md:w-32 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                  </div>
                  <div className="flex-1 w-full">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {hasError && !isLoading && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error loading profile</h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    <p>We encountered an issue while loading your profile information.</p>
                    {backendProfileError && <p>Backend Error: {backendProfileError}</p>}
                    {updateError && <p>Update Error: {updateError}</p>}
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={retryLoadProfile}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:text-red-200 dark:bg-red-800/30 dark:hover:bg-red-800/50"
                    >
                      <svg className="mr-2 -ml-0.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Authentication Status */}
          {isConnected && !isAuthenticated && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-yellow-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-yellow-800 dark:text-yellow-200">Wallet connected but not authenticated</span>
                </div>
                <button
                  onClick={async () => {
                    const result = await login(currentUserAddress, null, 'connected');
                    if (result.success) {
                      addToast('Authentication successful!', 'success');
                    } else {
                      addToast(result.error || 'Authentication failed', 'error');
                    }
                  }}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  Authenticate Now
                </button>
              </div>
            </div>
          )}

          {/* Profile Header with Glassmorphism Effect */}
          {!isLoading && !hasError && (
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-900/30 dark:to-purple-900/30 backdrop-blur-lg rounded-2xl shadow-xl border border-white/30 dark:border-gray-700/50 overflow-hidden mb-6">
              {/* Banner Image */}
              {profile.banner && (
                <div className="w-full h-48 md:h-64 overflow-hidden relative">
                  <img
                    src={profile.banner}
                    alt="Profile Banner"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20"></div>
                </div>
              )}

              <div className={`flex flex-col lg:flex-row items-center lg:items-start p-6 ${profile.banner ? '-mt-16' : ''}`}>
                <div className="flex-shrink-0 mb-6 lg:mb-0 lg:mr-8">
                  <div className="relative">
                    <div className={`h-32 w-32 md:h-40 md:w-40 rounded-full border-4 ${profile.banner ? 'border-white dark:border-gray-800' : 'border-white dark:border-gray-700'} shadow-xl overflow-hidden ${profile.banner ? 'ring-4 ring-white/20' : ''}`}>
                      {(profile.avatar && !avatarError && typeof profile.avatar === 'string' && profile.avatar.startsWith('http')) ? (
                        <img
                          className="h-full w-full object-cover"
                          src={profile.avatar}
                          alt={profile.handle}
                          onError={() => {
                            console.error('Avatar image failed to load:', profile.avatar);
                            setAvatarError(true);
                          }}
                          onLoad={() => {
                            // Reset avatar error when image loads successfully
                            if (avatarError) {
                              setAvatarError(false);
                            }
                          }}
                        />
                      ) : (
                        <DefaultAvatar />
                      )}
                    </div>
                    <div className="absolute bottom-2 right-2 bg-primary-500 rounded-full p-2 shadow-lg">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="text-center lg:text-left flex-1 w-full">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{profile.displayName || profile.handle || 'Anonymous User'}</h2>
                      {profile.handle && profile.displayName && (
                        <p className="text-xl text-gray-600 dark:text-gray-300 mt-1">@{profile.handle}</p>
                      )}
                      {profile.ens && !profile.displayName && (
                        <p className="text-xl text-gray-600 dark:text-gray-300 mt-1">{profile.ens}</p>
                      )}
                    </div>
                    <div className="mt-4 lg:mt-0 flex flex-col sm:flex-row items-center gap-3">
                      {reputation && reputation.totalScore > 0 && (
                        <span className="inline-flex items-center px-4 py-2 rounded-full text-base font-bold bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-lg transform hover:scale-105 transition-transform">
                          <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          {reputation.totalScore} Reputation
                        </span>
                      )}
                      {backendProfile && (
                        <span className="inline-flex items-center px-4 py-2 rounded-full text-base font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg transform hover:scale-105 transition-transform">
                          <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Verified
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Wallet Address with Copy Button */}
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                    <span className="text-base font-mono text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 px-4 py-2.5 rounded-xl flex items-center shadow-sm">
                      <span className="font-medium">{formatAddress(targetUserAddress || '')}</span>
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard(targetUserAddress || '')}
                        className="p-2.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm"
                        title="Copy address"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          const profileUrl = `${window.location.origin}/u/${targetUserAddress}`;
                          if (navigator.share) {
                            navigator.share({
                              title: `${profile.displayName || profile.handle || 'User'} on LinkDAO`,
                              text: `Check out ${profile.displayName || profile.handle || 'this user'}'s profile on LinkDAO`,
                              url: profileUrl,
                            }).catch(err => console.log('Error sharing:', err));
                          } else {
                            copyToClipboard(profileUrl);
                            addToast('Profile link copied to clipboard!', 'success');
                          }
                        }}
                        className="p-2.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm"
                        title="Share profile"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* User Stats */}
                  <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div
                      className="flex flex-col items-center bg-white/50 dark:bg-black/20 rounded-xl p-4 transition-all hover:shadow-lg cursor-pointer"
                      onClick={() => setActiveTab('followers')}
                    >
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{followCount?.followers || 0}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Followers</p>
                    </div>
                    <div
                      className="flex flex-col items-center bg-white/50 dark:bg-black/20 rounded-xl p-4 transition-all hover:shadow-lg cursor-pointer"
                      onClick={() => setActiveTab('following')}
                    >
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{followCount?.following || 0}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Following</p>
                    </div>
                    <div className="flex flex-col items-center bg-white/50 dark:bg-black/20 rounded-xl p-4 transition-all hover:shadow-lg">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {earnings ? `${(parseFloat(earnings.totalEarned) / 1e18).toFixed(2)}` : '0.00'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Tips Earned (ETH)</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 lg:mt-0 flex flex-col sm:flex-row lg:flex-col gap-3">
                  {/* Show Edit Profile button only for current user's profile */}
                  {currentUserAddress && targetUserAddress === currentUserAddress && (
                    <button
                      onClick={() => {
                        if (activeTab === 'edit') {
                          setActiveTab('posts');
                          setIsEditing(false);
                        } else {
                          setActiveTab('edit');
                          setIsEditing(true);
                        }
                      }}
                      className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-xl shadow-lg text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-all transform hover:scale-105"
                    >
                      <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      {activeTab === 'edit' ? 'Cancel Editing' : 'Edit Profile'}
                    </button>
                  )}

                  {/* Show Follow/Unfollow button when viewing another user's profile */}
                  {currentUserAddress && targetUserAddress && targetUserAddress !== currentUserAddress && (
                    <button
                      onClick={isFollowing ? handleUnfollow : handleFollow}
                      disabled={isFollowLoading || isFollowStatusLoading}
                      className={`inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all transform hover:scale-105 ${isFollowing
                        ? 'text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-primary-500'
                        : 'text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 focus:ring-blue-500'
                        }`}
                    >
                      {isFollowLoading || isFollowStatusLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {isFollowing ? 'Unfollowing...' : 'Following...'}
                        </>
                      ) : isFollowing ? (
                        <>
                          <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Following
                        </>
                      ) : (
                        <>
                          <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Follow
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {profile.bio && !isEditing && (
                <p className="mt-8 text-lg text-gray-700 dark:text-gray-300 text-center lg:text-left">{profile.bio}</p>
              )}

              {/* Tip Creator Section */}
              <div className="mt-8">
                <TipBar postId="user-profile" creatorAddress={targetUserAddress || ''} />
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          {!isLoading && !hasError && (
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <nav className="-mb-px flex space-x-6 overflow-x-auto pb-2">
                <button
                  onClick={() => setActiveTab('posts')}
                  className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm flex items-center ${activeTab === 'posts'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Posts
                </button>

                <button
                  onClick={() => setActiveTab('proposals')}
                  className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm flex items-center ${activeTab === 'proposals'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  Proposals
                </button>
                <button
                  onClick={() => setActiveTab('wallet')}
                  className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm flex items-center ${activeTab === 'wallet'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Wallet
                </button>
                <button
                  onClick={() => setActiveTab('reputation')}
                  className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm flex items-center ${activeTab === 'reputation'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Reputation
                </button>
                <button
                  onClick={() => setActiveTab('tips')}
                  className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm flex items-center ${activeTab === 'tips'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Tips & Rewards
                </button>
                <button
                  onClick={() => setActiveTab('followers')}
                  className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm flex items-center ${activeTab === 'followers'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Followers
                </button>
                <button
                  onClick={() => setActiveTab('following')}
                  className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm flex items-center ${activeTab === 'following'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Following
                </button>

                {/* Social Tab - Only for own profile */}
                {currentUserAddress && targetUserAddress === currentUserAddress && (
                  <button
                    onClick={() => setActiveTab('social')}
                    className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm flex items-center ${activeTab === 'social'
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Social
                  </button>
                )}

                {/* Edit Profile Tab - Visible only when editing */}
                {(activeTab === 'edit' || isEditing) && (
                  <button
                    onClick={() => setActiveTab('edit')}
                    className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm flex items-center ${activeTab === 'edit'
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Profile
                  </button>
                )}

                {(activeTab === 'edit' || isEditing) && (
                  <button
                    onClick={() => setActiveTab('addresses')}
                    className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm flex items-center ${activeTab === 'addresses'
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Addresses
                    <svg className="ml-1 h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </button>
                )}
                {(activeTab === 'edit' || isEditing) && (
                  <button
                    onClick={() => setActiveTab('payments')}
                    className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm flex items-center ${activeTab === 'payments'
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Payment Methods
                    <svg className="ml-1 h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </button>
                )}
              </nav>
            </div>
          )}

          {/* Tab Content */}
          {!isLoading && !hasError && (
            <div>
              {activeTab === 'edit' && (
                <div className={`bg-white dark:bg-gray-800 shadow rounded-lg p-6 ${currentUserAddress && targetUserAddress === currentUserAddress ? '' : 'hidden'}`}>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Edit Profile</h3>
                  <form onSubmit={saveProfile}>
                    <div className="mb-6">
                      <label htmlFor="handle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Handle
                      </label>
                      <input
                        type="text"
                        id="handle"
                        name="handle"
                        value={profile.handle}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                        placeholder="your-handle"
                        disabled={!!(contractProfileData && contractProfileData.handle)}
                      />
                    </div>

                    <div className="mb-6">
                      <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        id="displayName"
                        name="displayName"
                        value={profile.displayName}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Your display name"
                      />
                    </div>

                    <div className="mb-6">
                      <label htmlFor="ens" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        ENS Name
                      </label>
                      <input
                        type="text"
                        id="ens"
                        name="ens"
                        value={profile.ens}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                        placeholder="yourname.eth"
                      />
                    </div>

                    <div className="mb-6">
                      <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Bio
                      </label>
                      <textarea
                        id="bio"
                        name="bio"
                        rows={4}
                        value={profile.bio}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Tell us about yourself..."
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Avatar
                      </label>
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                            {profile.avatar && typeof profile.avatar === 'string' && profile.avatar.startsWith('http') ? (
                              <img
                                src={profile.avatar}
                                alt="Avatar"
                                className="h-16 w-16 object-cover"
                                onError={() => {
                                  console.error('Avatar image failed to load:', profile.avatar);
                                  setAvatarError(true);
                                }}
                                onLoad={() => {
                                  // Reset avatar error when image loads successfully
                                  if (avatarError) {
                                    setAvatarError(false);
                                  }
                                }}
                              />
                            ) : (
                              <DefaultAvatar />
                            )}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="flex text-sm text-gray-600 dark:text-gray-400">
                            <label
                              htmlFor="avatar-upload"
                              className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500 dark:focus:ring-offset-gray-800"
                            >
                              <span>Upload a file</span>
                              <input
                                id="avatar-upload"
                                name="avatar-upload"
                                type="file"
                                className="sr-only"
                                onChange={handleFileChange}
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            PNG, JPG up to 10MB
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Banner Image
                      </label>
                      {profile.banner && (
                        <div className="mb-3">
                          <img
                            src={profile.banner}
                            alt="Banner"
                            className="w-full h-32 object-cover rounded-lg"
                          />
                        </div>
                      )}
                      <div className="flex items-center">
                        <label
                          htmlFor="banner-upload"
                          className="cursor-pointer bg-white dark:bg-gray-700 rounded-md px-4 py-2 border border-gray-300 dark:border-gray-600 font-medium text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500 dark:focus:ring-offset-gray-800"
                        >
                          <span>Upload Banner</span>
                          <input
                            id="banner-upload"
                            name="banner-upload"
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={handleBannerChange}
                          />
                        </label>
                        <p className="ml-3 text-xs text-gray-500 dark:text-gray-400">
                          PNG, JPG up to 10MB. Recommended: 1500x500px
                        </p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <label htmlFor="website" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Website
                      </label>
                      <input
                        type="url"
                        id="website"
                        name="website"
                        value={profile.website}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                        placeholder="https://yourwebsite.com"
                      />
                    </div>

                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Social Links
                        </label>
                        <button
                          type="button"
                          onClick={handleAddSocialLink}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-primary-600 bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-400 dark:hover:bg-primary-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Link
                        </button>
                      </div>
                      {profile.socialLinks.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                          No social links added yet. Click "Add Link" to get started.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {profile.socialLinks.map((link, index) => (
                            <div key={index} className="flex gap-2">
                              <select
                                value={link.platform}
                                onChange={(e) => handleSocialLinkChange(index, 'platform', e.target.value)}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                              >
                                <option value="">Select Platform</option>
                                <option value="twitter">Twitter/X</option>
                                <option value="linkedin">LinkedIn</option>
                                <option value="github">GitHub</option>
                                <option value="instagram">Instagram</option>
                                <option value="facebook">Facebook</option>
                                <option value="youtube">YouTube</option>
                                <option value="discord">Discord</option>
                                <option value="telegram">Telegram</option>
                                <option value="tiktok">TikTok</option>
                                <option value="medium">Medium</option>
                                <option value="reddit">Reddit</option>
                                <option value="website">Website</option>
                                <option value="other">Other</option>
                              </select>
                              <input
                                type="url"
                                value={link.url}
                                onChange={(e) => handleSocialLinkChange(index, 'url', e.target.value)}
                                placeholder="https://..."
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                              />
                              <input
                                type="text"
                                value={link.username || ''}
                                onChange={(e) => handleSocialLinkChange(index, 'username', e.target.value)}
                                placeholder="Username (optional)"
                                className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveSocialLink(index)}
                                className="px-3 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isUpdating}
                        className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 dark:focus:ring-offset-gray-800 transition-all"
                      >
                        {isUpdating ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                          </>
                        ) : 'Save Profile'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'social' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Social Links & Website</h3>

                  {/* Website Section */}
                  {profile.website && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Website</h4>
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg text-primary-700 dark:text-primary-300 hover:from-primary-100 hover:to-secondary-100 dark:hover:from-primary-900/30 dark:hover:to-secondary-900/30 transition-colors"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        {profile.website}
                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  )}

                  {/* Social Links Section */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Social Profiles</h4>
                    {profile.socialLinks.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No social links added yet</p>
                        <button
                          onClick={() => setActiveTab('edit')}
                          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-600 bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-400 dark:hover:bg-primary-900/30"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Social Links
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {profile.socialLinks.map((link, index) => {
                          const getPlatformIcon = (platform: string) => {
                            const icons: Record<string, string> = {
                              twitter: 'M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z',
                              github: 'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22',
                              linkedin: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z',
                              instagram: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
                            };
                            return icons[platform.toLowerCase()] || '';
                          };

                          const getPlatformColor = (platform: string) => {
                            const colors: Record<string, string> = {
                              twitter: 'from-blue-400 to-blue-600',
                              github: 'from-gray-700 to-gray-900',
                              linkedin: 'from-blue-600 to-blue-800',
                              instagram: 'from-pink-500 to-purple-600',
                              facebook: 'from-blue-600 to-blue-700',
                              youtube: 'from-red-600 to-red-700',
                              discord: 'from-indigo-500 to-indigo-700',
                              telegram: 'from-blue-400 to-blue-500',
                              tiktok: 'from-black to-gray-900',
                              medium: 'from-green-600 to-green-700',
                              reddit: 'from-orange-500 to-orange-600',
                            };
                            return colors[platform.toLowerCase()] || 'from-gray-500 to-gray-700';
                          };

                          return (
                            <a
                              key={index}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center justify-between p-4 bg-gradient-to-r ${getPlatformColor(link.platform)} text-white rounded-lg hover:shadow-lg transition-all transform hover:scale-105`}
                            >
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d={getPlatformIcon(link.platform)} />
                                  </svg>
                                </div>
                                <div>
                                  <p className="font-medium capitalize">{link.platform}</p>
                                  {link.username && (
                                    <p className="text-xs text-white/80">@{link.username}</p>
                                  )}
                                </div>
                              </div>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Edit Button */}
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setActiveTab('edit')}
                      className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800 transition-all"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Social Links
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'posts' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Posts</h3>
                  {isPostsLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : postsError ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                      <p>Error loading posts: {postsError}</p>
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                      <p>No posts yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {posts.map((post) => (
                        <Link key={post.id} href={post.communityId ? `/communities/${post.communityId}/posts/${post.id}` : `/post/${post.id}`}>
                          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <div className="flex justify-between items-start">
                              <Link href={post.communityId ? `/communities/${post.communityId}/posts/${post.id}` : `/post/${post.id}`} className="flex-grow">
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 hover:text-blue-600 dark:hover:text-blue-400">
                                  {post.title || 'Untitled Post'}
                                </h4>
                                <p className="text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                                  {getPostContentPreview(post)}
                                </p>
                              </Link>
                              {targetUserAddress === currentUserAddress && (
                                <div className="flex space-x-2 ml-4">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleEditPost(post);
                                    }}
                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                    title="Edit post"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleDeletePost(post.id);
                                    }}
                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                    title="Delete post"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-2">
                              {post.communityId && (
                                <>
                                  <span>
                                    in{' '}
                                    <Link 
                                      href={`/communities/${post.communityId}`}
                                      className="text-blue-600 dark:text-blue-400 hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {post.communityName || post.communityId}
                                    </Link>
                                  </span>
                                  <span className="mx-2">•</span>
                                </>
                              )}
                              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                              <span className="mx-2">•</span>
                              <span>{post.comments || 0} comments</span>
                              <span className="mx-2">•</span>
                              <span>{post.reactions?.length || 0} reactions</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'proposals' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Proposals</h3>
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    <p className="mt-2">No proposals yet</p>
                    <p className="text-sm mt-1">Proposals you create will appear here</p>
                  </div>
                </div>
              )}

              {activeTab === 'reputation' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Reputation</h3>
                  {isReputationLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-gray-700 dark:text-gray-300">Reputation Score</p>
                        <p className="text-gray-900 dark:text-white">{reputation?.totalScore || 0}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-gray-700 dark:text-gray-300">Events</p>
                        <p className="text-gray-900 dark:text-white">{reputationEvents.length}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'wallet' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Wallet Portfolio</h3>
                  {isWalletLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-4">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500 dark:text-gray-400">Total Balance</span>
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">
                              {portfolio ? `$${portfolio.totalValueUSD.toFixed(2)}` : '$0.00'}
                            </span>
                          </div>
                          <div className="mt-2 flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">
                              {portfolio ? `$${(portfolio.totalValueUSD * (1 + portfolio.change24hPercent / 100)).toFixed(2)}` : '$0.00'} USD
                            </span>
                            <span className={portfolio && portfolio.change24hPercent >= 0 ? "text-green-500" : "text-red-500"}>
                              {portfolio ? `${portfolio.change24hPercent >= 0 ? '+' : ''}${portfolio.change24hPercent.toFixed(2)}%` : '0.00%'}
                            </span>
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/30 dark:to-teal-900/30 rounded-xl p-4">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500 dark:text-gray-400">LDAO Tokens</span>
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">
                              {tokens.find(t => t.symbol === 'LDAO') ? tokens.find(t => t.symbol === 'LDAO')?.balanceFormatted.split(' ')[0] : '0'}
                            </span>
                          </div>
                          <div className="mt-2 flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">
                              {tokens.find(t => t.symbol === 'LDAO') ? `$${tokens.find(t => t.symbol === 'LDAO')?.valueUSD.toFixed(2)}` : '$0.00'} USD
                            </span>
                            <span className={tokens.find(t => t.symbol === 'LDAO')?.change24h >= 0 ? "text-green-500" : "text-red-500"}>
                              {tokens.find(t => t.symbol === 'LDAO') ? `${tokens.find(t => t.symbol === 'LDAO')?.change24h >= 0 ? '+' : ''}${tokens.find(t => t.symbol === 'LDAO')?.change24h.toFixed(2)}%` : '0.00%'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Token Balances</h4>
                        <div className="space-y-3">
                          {tokens.map((token, index) => (
                            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <div className="flex items-center">
                                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center mr-3">
                                  <span className="text-xs font-medium">{token.symbol.substring(0, 3)}</span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">{token.symbol}</p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">{token.symbol}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-gray-900 dark:text-white">{token.balanceFormatted.split(' ')[0]}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">${token.valueUSD.toFixed(2)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'tips' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Tips & Rewards</h3>
                  {isTipsLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-4">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500 dark:text-gray-400">Total Balance</span>
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">
                              {portfolio ? `$${portfolio.totalValueUSD.toFixed(2)}` : '$0.00'}
                            </span>
                          </div>
                          <div className="mt-2 flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">
                              {portfolio ? `$${(portfolio.totalValueUSD * (1 + portfolio.change24hPercent / 100)).toFixed(2)}` : '$0.00'} USD
                            </span>
                            <span className={portfolio && portfolio.change24hPercent >= 0 ? "text-green-500" : "text-red-500"}>
                              {portfolio ? `${portfolio.change24hPercent >= 0 ? '+' : ''}${portfolio.change24hPercent.toFixed(2)}%` : '0.00%'}
                            </span>
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/30 dark:to-teal-900/30 rounded-xl p-4">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500 dark:text-gray-400">LDAO Tokens</span>
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">
                              {tokens.find(t => t.symbol === 'LDAO') ? tokens.find(t => t.symbol === 'LDAO')?.balanceFormatted.split(' ')[0] : '0'}
                            </span>
                          </div>
                          <div className="mt-2 flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">
                              {tokens.find(t => t.symbol === 'LDAO') ? `$${tokens.find(t => t.symbol === 'LDAO')?.valueUSD.toFixed(2)}` : '$0.00'} USD
                            </span>
                            <span className={tokens.find(t => t.symbol === 'LDAO')?.change24h >= 0 ? "text-green-500" : "text-red-500"}>
                              {tokens.find(t => t.symbol === 'LDAO') ? `${tokens.find(t => t.symbol === 'LDAO')?.change24h >= 0 ? '+' : ''}${tokens.find(t => t.symbol === 'LDAO')?.change24h.toFixed(2)}%` : '0.00%'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Token Balances</h4>
                        <div className="space-y-3">
                          {tokens.map((token, index) => (
                            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <div className="flex items-center">
                                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center mr-3">
                                  <span className="text-xs font-medium">{token.symbol.substring(0, 3)}</span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">{token.symbol}</p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">{token.symbol}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-gray-900 dark:text-white">{token.balanceFormatted.split(' ')[0]}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">${token.valueUSD.toFixed(2)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'addresses' && isEditing && currentUserAddress && targetUserAddress === currentUserAddress && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Address Information</h3>

                  <form onSubmit={handleAddressSubmit} className="space-y-8">
                    {/* Billing Address Section */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Billing Address</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="billing.firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            First Name
                          </label>
                          <input
                            type="text"
                            id="billing.firstName"
                            name="billing.firstName"
                            value={addresses.billing.firstName}
                            onChange={handleAddressChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>

                        <div>
                          <label htmlFor="billing.lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Last Name
                          </label>
                          <input
                            type="text"
                            id="billing.lastName"
                            name="billing.lastName"
                            value={addresses.billing.lastName}
                            onChange={handleAddressChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label htmlFor="billing.company" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Company (Optional)
                          </label>
                          <input
                            type="text"
                            id="billing.company"
                            name="billing.company"
                            value={addresses.billing.company}
                            onChange={handleAddressChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label htmlFor="billing.address1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Address Line 1
                          </label>
                          <input
                            type="text"
                            id="billing.address1"
                            name="billing.address1"
                            value={addresses.billing.address1}
                            onChange={handleAddressChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label htmlFor="billing.address2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Address Line 2 (Optional)
                          </label>
                          <input
                            type="text"
                            id="billing.address2"
                            name="billing.address2"
                            value={addresses.billing.address2}
                            onChange={handleAddressChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>

                        <div>
                          <label htmlFor="billing.city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            City
                          </label>
                          <input
                            type="text"
                            id="billing.city"
                            name="billing.city"
                            value={addresses.billing.city}
                            onChange={handleAddressChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>

                        <div>
                          <label htmlFor="billing.state" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            State/Province
                          </label>
                          <input
                            type="text"
                            id="billing.state"
                            name="billing.state"
                            value={addresses.billing.state}
                            onChange={handleAddressChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>

                        <div>
                          <label htmlFor="billing.zipCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            ZIP/Postal Code
                          </label>
                          <input
                            type="text"
                            id="billing.zipCode"
                            name="billing.zipCode"
                            value={addresses.billing.zipCode}
                            onChange={handleAddressChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>

                        <div>
                          <label htmlFor="billing.country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Country
                          </label>
                          <select
                            id="billing.country"
                            name="billing.country"
                            value={addresses.billing.country}
                            onChange={handleAddressChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">Select a country</option>
                            {countries.map((country) => (
                              <option key={country.code} value={country.code}>
                                {country.flag} {country.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label htmlFor="billing.phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            id="billing.phone"
                            name="billing.phone"
                            value={addresses.billing.phone}
                            onChange={handleAddressChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Shipping Address Section */}
                    <div>
                      <div className="flex items-center mb-4">
                        <input
                          id="shipping.sameAsBilling"
                          name="shipping.sameAsBilling"
                          type="checkbox"
                          checked={addresses.shipping.sameAsBilling}
                          onChange={handleSameAsBillingChange}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="shipping.sameAsBilling" className="ml-2 block text-sm text-gray-900 dark:text-white">
                          Shipping address same as billing
                        </label>
                      </div>

                      {!addresses.shipping.sameAsBilling && (
                        <>
                          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Shipping Address</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="shipping.firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                First Name
                              </label>
                              <input
                                type="text"
                                id="shipping.firstName"
                                name="shipping.firstName"
                                value={addresses.shipping.firstName}
                                onChange={handleAddressChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                              />
                            </div>

                            <div>
                              <label htmlFor="shipping.lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Last Name
                              </label>
                              <input
                                type="text"
                                id="shipping.lastName"
                                name="shipping.lastName"
                                value={addresses.shipping.lastName}
                                onChange={handleAddressChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label htmlFor="shipping.company" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Company (Optional)
                              </label>
                              <input
                                type="text"
                                id="shipping.company"
                                name="shipping.company"
                                value={addresses.shipping.company}
                                onChange={handleAddressChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label htmlFor="shipping.address1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Address Line 1
                              </label>
                              <input
                                type="text"
                                id="shipping.address1"
                                name="shipping.address1"
                                value={addresses.shipping.address1}
                                onChange={handleAddressChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label htmlFor="shipping.address2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Address Line 2 (Optional)
                              </label>
                              <input
                                type="text"
                                id="shipping.address2"
                                name="shipping.address2"
                                value={addresses.shipping.address2}
                                onChange={handleAddressChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                              />
                            </div>

                            <div>
                              <label htmlFor="shipping.city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                City
                              </label>
                              <input
                                type="text"
                                id="shipping.city"
                                name="shipping.city"
                                value={addresses.shipping.city}
                                onChange={handleAddressChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                              />
                            </div>

                            <div>
                              <label htmlFor="shipping.state" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                State/Province
                              </label>
                              <input
                                type="text"
                                id="shipping.state"
                                name="shipping.state"
                                value={addresses.shipping.state}
                                onChange={handleAddressChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                              />
                            </div>

                            <div>
                              <label htmlFor="shipping.zipCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                ZIP/Postal Code
                              </label>
                              <input
                                type="text"
                                id="shipping.zipCode"
                                name="shipping.zipCode"
                                value={addresses.shipping.zipCode}
                                onChange={handleAddressChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                              />
                            </div>

                            <div>
                              <label htmlFor="shipping.country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Country
                              </label>
                              <select
                                id="shipping.country"
                                name="shipping.country"
                                value={addresses.shipping.country}
                                onChange={handleAddressChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                              >
                                <option value="">Select a country</option>
                                {countries.map((country) => (
                                  <option key={country.code} value={country.code}>
                                    {country.flag} {country.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="md:col-span-2">
                              <label htmlFor="shipping.phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Phone Number
                              </label>
                              <input
                                type="tel"
                                id="shipping.phone"
                                name="shipping.phone"
                                value={addresses.shipping.phone}
                                onChange={handleAddressChange}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isUpdating}
                        className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 dark:focus:ring-offset-gray-800 transition-all"
                      >
                        {isUpdating ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                          </>
                        ) : 'Save Addresses'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'followers' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Followers</h3>
                  <FollowerList userAddress={targetUserAddress || ''} />
                </div>
              )}

              {activeTab === 'following' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Following</h3>
                  <FollowingList userAddress={targetUserAddress || ''} />
                </div>
              )}

              {activeTab === 'payments' && isEditing && currentUserAddress && targetUserAddress === currentUserAddress && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Payment Methods</h3>
                  <PaymentMethodsTab />
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
