import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
// import { useReadProfileRegistryGetProfileByAddress, useWriteProfileRegistryCreateProfile, useWriteProfileRegistryUpdateProfile } from '@/generated';
import { useWeb3 } from '@/context/Web3Context';
import { useProfile, useCreateProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useFollowCount } from '@/hooks/useFollow';
import { useToast } from '@/context/ToastContext';
import { countries } from '@/utils/countries';
import { CreateUserProfileInput, UpdateUserProfileInput } from '@/models/UserProfile';
import FollowerList from '@/components/FollowerList';
import FollowingList from '@/components/FollowingList';
import TipBar from '@/components/TipBar';
import { PaymentMethodsTab } from '@/components/PaymentMethodsTab';

// Mock DAO data
const mockDAOs = [
  { id: '1', name: 'Ethereum Builders', badge: '🏛️', color: 'bg-blue-500' },
  { id: '2', name: 'DeFi Traders', badge: '💱', color: 'bg-green-500' },
  { id: '3', name: 'NFT Collectors', badge: '🎨', color: 'bg-purple-500' }
];

export default function Profile() {
  const router = useRouter();
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  // Backend profile loading with error handling
  const { data: backendProfile, isLoading: isBackendProfileLoading, error: backendProfileError } = useProfile(address);
  const { data: followCount, isLoading: isFollowCountLoading } = useFollowCount(address);

  // Smart contract profile data - temporarily disabled due to webpack issues
  const contractProfileData: any = null;
  const isContractProfileLoading = false;
  const createProfile = () => {};
  const isCreatingProfile = false;
  const isProfileCreated = false;
  const updateProfile = () => {};
  const isUpdatingProfile = false;
  const isProfileUpdated = false;

  // Backend profile mutations
  const { mutate: createBackendProfile, isPending: isCreatingBackendProfile, error: createBackendProfileError } = useCreateProfile();
  const { mutate: updateBackendProfile, isPending: isUpdatingBackendProfile, error: updateBackendProfileError } = useUpdateProfile();

  const [profile, setProfile] = useState({
    handle: '',
    ens: '',
    bio: '',
    avatar: '',
  });
  const [activeTab, setActiveTab] = useState<'posts' | 'activity' | 'wallet' | 'reputation' | 'tips' | 'followers' | 'following' | 'addresses' | 'payments'>('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [featuredNFT, setFeaturedNFT] = useState<any>(null);
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

  // Load profile data from backend first, fallback to contract data
  useEffect(() => {
    if (backendProfile) {
      setProfile({
        handle: backendProfile.handle,
        ens: backendProfile.ens,
        bio: backendProfile.bioCid, // In a real app, we'd fetch the actual bio content from IPFS
        avatar: backendProfile.avatarCid, // In a real app, we'd fetch the actual avatar from IPFS
      });
    } else if (contractProfileData && contractProfileData.handle) {
      setProfile({
        handle: contractProfileData.handle,
        ens: contractProfileData.ens,
        bio: contractProfileData.bioCid, // In a real app, we'd fetch the actual bio content from IPFS
        avatar: contractProfileData.avatarCid, // In a real app, we'd fetch the actual avatar from IPFS
      });
    }
  }, [backendProfile, contractProfileData]);

  // Check for edit query parameter
  useEffect(() => {
    if (router.query.edit === 'true') {
      setIsEditing(true);
      // Clean up the URL after entering edit mode
      const newQuery = { ...router.query };
      delete newQuery.edit;
      router.replace({
        pathname: router.pathname,
        query: newQuery
      }, undefined, { shallow: true });
    }
  }, [router.query.edit, router]);

  // Show success toast when profile is created or updated
  useEffect(() => {
    if (isProfileCreated) {
      addToast('Profile created successfully on-chain!', 'success');
    }

    if (isProfileUpdated) {
      addToast('Profile updated successfully on-chain!', 'success');
    }
  }, [isProfileCreated, isProfileUpdated, addToast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      // In a real app, you would upload the file to IPFS or a similar service
      // and get a CID. For now, we'll just use the file name as a placeholder.
      setProfile(prev => ({ ...prev, avatar: file.name }));
      addToast(`Selected file: ${file.name}`, 'info');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile.handle) {
      addToast('Please enter a handle', 'error');
      return;
    }

    if (!isConnected || !address) {
      addToast('Please connect your wallet first', 'error');
      return;
    }

    try {
      // Save to backend database
      if (backendProfile) {
        // Update existing profile
        const updateData: UpdateUserProfileInput = {
          handle: profile.handle,
          ens: profile.ens,
          avatarCid: profile.avatar,
          bioCid: profile.bio,
        };
        updateBackendProfile({ id: backendProfile.id, data: updateData });
      } else {
        // Create new profile
        const createData: CreateUserProfileInput = {
          walletAddress: address,
          handle: profile.handle,
          ens: profile.ens,
          avatarCid: profile.avatar,
          bioCid: profile.bio,
        };
        createBackendProfile(createData);
      }
      
      addToast('Profile updated successfully!', 'success');

      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      addToast('Failed to save profile. Please try again.', 'error');
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

  if (!isConnected) {
    return (
      <Layout title="Profile - LinkDAO" fullWidth={true}>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Profile</h1>
            <p className="text-gray-600 dark:text-gray-300">Please connect your wallet to view your profile.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const isLoading = isBackendProfileLoading || isContractProfileLoading || isFollowCountLoading;
  const hasError = backendProfileError || createBackendProfileError || updateBackendProfileError;

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
                    {backendProfileError && <p>Backend Error: {backendProfileError.message || backendProfileError.toString()}</p>}
                    {createBackendProfileError && <p>Create Error: {createBackendProfileError.message || createBackendProfileError.toString()}</p>}
                    {updateBackendProfileError && <p>Update Error: {updateBackendProfileError.message || updateBackendProfileError.toString()}</p>}
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

          {/* Profile Header with Glassmorphism Effect */}
          {!isLoading && !hasError && (
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-900/30 dark:to-purple-900/30 backdrop-blur-lg rounded-2xl shadow-xl border border-white/30 dark:border-gray-700/50 p-6 mb-6">
              <div className="flex flex-col lg:flex-row items-center lg:items-start">
                <div className="flex-shrink-0 mb-6 lg:mb-0 lg:mr-8">
                  <div className="relative">
                    <div className="h-32 w-32 md:h-40 md:w-40 rounded-full border-4 border-white dark:border-gray-700 shadow-xl overflow-hidden">
                      {profile.avatar ? (
                        <img
                          className="h-full w-full object-cover"
                          src={profile.avatar}
                          alt={profile.handle}
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
                      <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{profile.handle || 'Anonymous User'}</h2>
                      {profile.ens && (
                        <p className="text-xl text-gray-600 dark:text-gray-300 mt-1">{profile.ens}</p>
                      )}
                    </div>
                    <div className="mt-4 lg:mt-0 flex flex-col sm:flex-row items-center gap-3">
                      <span className="inline-flex items-center px-4 py-2 rounded-full text-base font-bold bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-lg transform hover:scale-105 transition-transform">
                        <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        95 Reputation
                      </span>
                      <span className="inline-flex items-center px-4 py-2 rounded-full text-base font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg transform hover:scale-105 transition-transform">
                        <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Verified
                      </span>
                    </div>
                  </div>

                  {/* Wallet Address with Copy Button */}
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                    <span className="text-base font-mono text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 px-4 py-2.5 rounded-xl flex items-center shadow-sm">
                      <span className="font-medium">{formatAddress(address || '')}</span>
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard(address || '')}
                        className="p-2.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm"
                        title="Copy address"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
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
                  <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="flex flex-col items-center bg-white/50 dark:bg-black/20 rounded-xl p-4 transition-all hover:shadow-lg">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{followCount?.followers || 0}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Followers</p>
                    </div>
                    <div className="flex flex-col items-center bg-white/50 dark:bg-black/20 rounded-xl p-4 transition-all hover:shadow-lg">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{followCount?.following || 0}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Following</p>
                    </div>
                    <div className="flex flex-col items-center bg-white/50 dark:bg-black/20 rounded-xl p-4 transition-all hover:shadow-lg">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">127</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Posts</p>
                    </div>
                    <div className="flex flex-col items-center bg-white/50 dark:bg-black/20 rounded-xl p-4 transition-all hover:shadow-lg">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">24.5K</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Tips Earned</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 lg:mt-0 flex flex-col sm:flex-row lg:flex-col gap-3">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-xl shadow-lg text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-all transform hover:scale-105"
                  >
                    <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {isEditing ? 'Cancel Editing' : 'Edit Profile'}
                  </button>
                  <button className="inline-flex items-center justify-center px-5 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-xl shadow-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800 transition-all transform hover:scale-105">
                    <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Message
                  </button>
                </div>
              </div>

              {profile.bio && !isEditing && (
                <p className="mt-8 text-lg text-gray-700 dark:text-gray-300 text-center lg:text-left">{profile.bio}</p>
              )}

              {/* Tip Creator Section */}
              <div className="mt-8">
                <TipBar postId="user-profile" creatorAddress={address || ''} />
              </div>

              {/* DAO Badges */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  DAO Memberships
                </h3>
                <div className="flex flex-wrap gap-3">
                  {mockDAOs.map((dao) => (
                    <span
                      key={dao.id}
                      className={`${dao.color} text-white px-4 py-2.5 rounded-xl text-base font-semibold flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 cursor-pointer`}
                    >
                      <span className="mr-2 text-lg">{dao.badge}</span>
                      {dao.name}
                    </span>
                  ))}
                </div>
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
                  onClick={() => setActiveTab('activity')}
                  className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-sm flex items-center ${activeTab === 'activity'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                  <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8h.01M12 12h.01M12 16h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Activity
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
              </nav>
            </div>
          )}

          {/* Tab Content */}
          {!isLoading && !hasError && (
            <div>
              {activeTab === 'posts' && (
                <div className={`bg-white dark:bg-gray-800 shadow rounded-lg p-6 ${isEditing ? '' : 'hidden'}`}>
                  <form onSubmit={handleSubmit}>
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
                            {profile.avatar ? (
                              <img src={profile.avatar} alt="Avatar" className="h-16 w-16 object-cover" />
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

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isCreatingBackendProfile || isUpdatingBackendProfile}
                        className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 dark:focus:ring-offset-gray-800 transition-all"
                      >
                        {(isCreatingBackendProfile || isUpdatingBackendProfile) ? (
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

              {activeTab === 'posts' && !isEditing && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Activity</h3>
                  <div className="space-y-4">
                    <div className="border-l-4 border-primary-500 pl-4 py-1">
                      <p className="text-gray-700 dark:text-gray-300">Posted a new update about DeFi strategies</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">2 hours ago</p>
                    </div>
                    <div className="border-l-4 border-secondary-500 pl-4 py-1">
                      <p className="text-gray-700 dark:text-gray-300">Voted on governance proposal #42</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">1 day ago</p>
                    </div>
                    <div className="border-l-4 border-accent-500 pl-4 py-1">
                      <p className="text-gray-700 dark:text-gray-300">Completed a marketplace transaction</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">3 days ago</p>
                    </div>
                  </div>
                  <div className="mt-6">
                    <button className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-medium">
                      View all activity →
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Activity History</h3>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-medium">You</span> voted on governance proposal #42
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">2 hours ago</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                          <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-medium">You</span> received a tip of 50 LDAO
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">1 day ago</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                          <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-medium">You</span> joined the DeFi Traders DAO
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">3 days ago</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'wallet' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Wallet Portfolio</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 dark:text-gray-400">Total Balance</span>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                          0.0000 ETH
                        </span>
                      </div>
                      <div className="mt-2 flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">$2,450.75 USD</span>
                        <span className="text-green-500">+2.3%</span>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/30 dark:to-teal-900/30 rounded-xl p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 dark:text-gray-400">LDAO Tokens</span>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">1,250</span>
                      </div>
                      <div className="mt-2 flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">$1,250.00 USD</span>
                        <span className="text-green-500">+5.2%</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Token Balances</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center mr-3">
                            <span className="text-xs font-medium">ETH</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Ethereum</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">ETH</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900 dark:text-white">2.45</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">$4,165.00</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-200 dark:bg-blue-900 flex items-center justify-center mr-3">
                            <span className="text-xs font-medium">LDAO</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">LinkDAO Token</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">LDAO</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900 dark:text-white">1,250</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">$1,250.00</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'reputation' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Reputation History</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-gray-900 dark:text-white">DAO Participation</h4>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          95/100
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Active participation in DAO governance with 12 proposals voted on
                      </p>
                      <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                      </div>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-gray-900 dark:text-white">Marketplace Trust</h4>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          88/100
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        24 successful transactions with no disputes
                      </p>
                      <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '88%' }}></div>
                      </div>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-gray-900 dark:text-white">Community Engagement</h4>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          92/100
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Active in community discussions with 142 posts and comments
                      </p>
                      <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'tips' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Tips & Rewards</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                            <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Tips Received</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">24.5K LDAO</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                            <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Claimable Rewards</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">1.2K LDAO</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Top Supporters</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center">
                          <img className="h-10 w-10 rounded-full" src="https://placehold.co/40" alt="Supporter" />
                          <div className="ml-3">
                            <p className="font-medium text-gray-900 dark:text-white">@defiwhale</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">5.2K LDAO</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Top Supporter
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center">
                          <img className="h-10 w-10 rounded-full" src="https://placehold.co/40" alt="Supporter" />
                          <div className="ml-3">
                            <p className="font-medium text-gray-900 dark:text-white">@nftartist</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">3.8K LDAO</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          Regular Supporter
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <button className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500">
                      Claim Rewards
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'followers' && address && (
                <FollowerList userAddress={address} />
              )}

              {activeTab === 'following' && address && (
                <FollowingList userAddress={address} />
              )}

              {activeTab === 'payments' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Payment Methods</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Manage your secure payment methods for marketplace purchases.</p>
                  <PaymentMethodsTab />
                </div>
              )}

              {activeTab === 'addresses' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Billing & Shipping Addresses</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">This information is private and only used for marketplace transactions.</p>
                  
                  <form className="space-y-8">
                    {/* Billing Address */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Billing Address</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                          <input
                            type="text"
                            value={addresses.billing.firstName}
                            onChange={(e) => setAddresses(prev => ({ ...prev, billing: { ...prev.billing, firstName: e.target.value } }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                          <input
                            type="text"
                            value={addresses.billing.lastName}
                            onChange={(e) => setAddresses(prev => ({ ...prev, billing: { ...prev.billing, lastName: e.target.value } }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company (Optional)</label>
                          <input
                            type="text"
                            value={addresses.billing.company}
                            onChange={(e) => setAddresses(prev => ({ ...prev, billing: { ...prev.billing, company: e.target.value } }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address Line 1</label>
                          <input
                            type="text"
                            value={addresses.billing.address1}
                            onChange={(e) => setAddresses(prev => ({ ...prev, billing: { ...prev.billing, address1: e.target.value } }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address Line 2 (Optional)</label>
                          <input
                            type="text"
                            value={addresses.billing.address2}
                            onChange={(e) => setAddresses(prev => ({ ...prev, billing: { ...prev.billing, address2: e.target.value } }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                          <input
                            type="text"
                            value={addresses.billing.city}
                            onChange={(e) => setAddresses(prev => ({ ...prev, billing: { ...prev.billing, city: e.target.value } }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State/Province</label>
                          <input
                            type="text"
                            value={addresses.billing.state}
                            onChange={(e) => setAddresses(prev => ({ ...prev, billing: { ...prev.billing, state: e.target.value } }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ZIP/Postal Code</label>
                          <input
                            type="text"
                            value={addresses.billing.zipCode}
                            onChange={(e) => setAddresses(prev => ({ ...prev, billing: { ...prev.billing, zipCode: e.target.value } }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
                          <select
                            value={addresses.billing.country}
                            onChange={(e) => setAddresses(prev => ({ ...prev, billing: { ...prev.billing, country: e.target.value } }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">Select Country</option>
                            {countries.map((country) => (
                              <option key={country.code} value={country.code}>
                                {country.flag} {country.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                          <input
                            type="tel"
                            value={addresses.billing.phone}
                            onChange={(e) => setAddresses(prev => ({ ...prev, billing: { ...prev.billing, phone: e.target.value } }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Shipping Address */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-md font-medium text-gray-900 dark:text-white">Shipping Address</h4>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={addresses.shipping.sameAsBilling}
                            onChange={(e) => {
                              const sameAsBilling = e.target.checked;
                              setAddresses(prev => ({
                                ...prev,
                                shipping: {
                                  ...prev.shipping,
                                  sameAsBilling,
                                  ...(sameAsBilling ? {
                                    firstName: prev.billing.firstName,
                                    lastName: prev.billing.lastName,
                                    company: prev.billing.company,
                                    address1: prev.billing.address1,
                                    address2: prev.billing.address2,
                                    city: prev.billing.city,
                                    state: prev.billing.state,
                                    zipCode: prev.billing.zipCode,
                                    country: prev.billing.country,
                                    phone: prev.billing.phone
                                  } : {})
                                }
                              }));
                            }}
                            className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Same as billing address</span>
                        </label>
                      </div>
                      
                      {!addresses.shipping.sameAsBilling && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                            <input
                              type="text"
                              value={addresses.shipping.firstName}
                              onChange={(e) => setAddresses(prev => ({ ...prev, shipping: { ...prev.shipping, firstName: e.target.value } }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                            <input
                              type="text"
                              value={addresses.shipping.lastName}
                              onChange={(e) => setAddresses(prev => ({ ...prev, shipping: { ...prev.shipping, lastName: e.target.value } }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company (Optional)</label>
                            <input
                              type="text"
                              value={addresses.shipping.company}
                              onChange={(e) => setAddresses(prev => ({ ...prev, shipping: { ...prev.shipping, company: e.target.value } }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address Line 1</label>
                            <input
                              type="text"
                              value={addresses.shipping.address1}
                              onChange={(e) => setAddresses(prev => ({ ...prev, shipping: { ...prev.shipping, address1: e.target.value } }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address Line 2 (Optional)</label>
                            <input
                              type="text"
                              value={addresses.shipping.address2}
                              onChange={(e) => setAddresses(prev => ({ ...prev, shipping: { ...prev.shipping, address2: e.target.value } }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                            <input
                              type="text"
                              value={addresses.shipping.city}
                              onChange={(e) => setAddresses(prev => ({ ...prev, shipping: { ...prev.shipping, city: e.target.value } }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State/Province</label>
                            <input
                              type="text"
                              value={addresses.shipping.state}
                              onChange={(e) => setAddresses(prev => ({ ...prev, shipping: { ...prev.shipping, state: e.target.value } }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ZIP/Postal Code</label>
                            <input
                              type="text"
                              value={addresses.shipping.zipCode}
                              onChange={(e) => setAddresses(prev => ({ ...prev, shipping: { ...prev.shipping, zipCode: e.target.value } }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
                            <select
                              value={addresses.shipping.country}
                              onChange={(e) => setAddresses(prev => ({ ...prev, shipping: { ...prev.shipping, country: e.target.value } }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                            >
                              <option value="">Select Country</option>
                              {countries.map((country) => (
                                <option key={country.code} value={country.code}>
                                  {country.flag} {country.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                            <input
                              type="tel"
                              value={addresses.shipping.phone}
                              onChange={(e) => setAddresses(prev => ({ ...prev, shipping: { ...prev.shipping, phone: e.target.value } }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        onClick={(e) => {
                          e.preventDefault();
                          addToast('Addresses saved successfully!', 'success');
                        }}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
                      >
                        Save Addresses
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}