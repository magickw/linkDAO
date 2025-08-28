import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useReadProfileRegistryGetProfileByAddress, useWriteProfileRegistryCreateProfile, useWriteProfileRegistryUpdateProfile } from '@/generated';
import { useWeb3 } from '@/context/Web3Context';
import { useProfile, useCreateProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useFollowCount } from '@/hooks/useFollow';
import { useToast } from '@/context/ToastContext';
import { CreateUserProfileInput, UpdateUserProfileInput } from '@/models/UserProfile';
import FollowerList from '@/components/FollowerList';
import FollowingList from '@/components/FollowingList';

export default function Profile() {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  const { profile: backendProfile, isLoading: isBackendProfileLoading, error: backendProfileError } = useProfile(address);
  const { followCount, isLoading: isFollowCountLoading } = useFollowCount(address);
  
  // Smart contract profile data
  const { data: contractProfileData, isLoading: isContractProfileLoading } = useReadProfileRegistryGetProfileByAddress({
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
  
  const { 
    writeContract: createProfile, 
    isPending: isCreatingProfile, 
    isSuccess: isProfileCreated 
  } = useWriteProfileRegistryCreateProfile();
  
  const { 
    writeContract: updateProfile, 
    isPending: isUpdatingProfile, 
    isSuccess: isProfileUpdated 
  } = useWriteProfileRegistryUpdateProfile();
  
  const { createProfile: createBackendProfile, isLoading: isCreatingBackendProfile, error: createBackendProfileError } = useCreateProfile();
  const { updateProfile: updateBackendProfile, isLoading: isUpdatingBackendProfile, error: updateBackendProfileError } = useUpdateProfile();
  
  const [profile, setProfile] = useState({
    handle: '',
    ens: '',
    bio: '',
    avatar: '',
  });
  const [activeTab, setActiveTab] = useState<'posts' | 'followers' | 'following'>('posts');
  const [isEditing, setIsEditing] = useState(false);

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
      // If profile exists in backend, update it
      if (backendProfile) {
        const updateData: UpdateUserProfileInput = {
          handle: profile.handle,
          ens: profile.ens,
          avatarCid: profile.avatar,
          bioCid: profile.bio,
        };
        
        await updateBackendProfile(backendProfile.id, updateData);
        addToast('Profile updated successfully!', 'success');
        
        // Also update on-chain if needed
        if (contractProfileData && contractProfileData.handle) {
          updateProfile({
            args: [1n, profile.avatar, profile.bio],
          });
        }
      } 
      // If profile exists on-chain but not in backend, create in backend
      else if (contractProfileData && contractProfileData.handle) {
        const createData: CreateUserProfileInput = {
          address: address,
          handle: profile.handle,
          ens: profile.ens,
          avatarCid: profile.avatar,
          bioCid: profile.bio,
        };
        
        await createBackendProfile(createData);
        addToast('Profile created successfully!', 'success');
        
        // Update on-chain if needed
        updateProfile({
          args: [1n, profile.avatar, profile.bio],
        });
      } 
      // If no profile exists anywhere, create both
      else {
        // Create on-chain first
        createProfile({
          args: [profile.handle, profile.ens, profile.avatar, profile.bio],
        });
        
        // Create in backend
        const createData: CreateUserProfileInput = {
          address: address,
          handle: profile.handle,
          ens: profile.ens,
          avatarCid: profile.avatar,
          bioCid: profile.bio,
        };
        
        await createBackendProfile(createData);
        addToast('Profile created successfully!', 'success');
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      addToast('Failed to save profile. Please try again.', 'error');
    }
  };

  if (!isConnected) {
    return (
      <Layout title="Profile - LinkDAO">
        <div className="px-4 py-6 sm:px-0">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Your Profile</h1>
            <p className="text-gray-600 dark:text-gray-300">Please connect your wallet to view and edit your profile.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const isLoading = isBackendProfileLoading || isContractProfileLoading || isFollowCountLoading;

  return (
    <Layout title="Profile - LinkDAO">
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Your Profile</h1>
          
          {isLoading && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
              <p className="text-gray-600 dark:text-gray-300">Loading profile...</p>
            </div>
          )}
          
          {(backendProfileError || createBackendProfileError || updateBackendProfileError) && (
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-6">
              <p>Error: {backendProfileError || createBackendProfileError || updateBackendProfileError}</p>
            </div>
          )}
          
          {/* Profile Header */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
            <div className="flex flex-col md:flex-row items-center md:items-start">
              <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-6">
                <div className="relative">
                  <img 
                    className="h-24 w-24 md:h-32 md:w-32 rounded-full border-4 border-white dark:border-gray-700 shadow" 
                    src={profile.avatar || 'https://placehold.co/128'} 
                    alt={profile.handle} 
                  />
                  <div className="absolute bottom-0 right-0 bg-primary-500 rounded-full p-1">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="text-center md:text-left flex-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{profile.handle}</h2>
                {profile.ens && (
                  <p className="text-gray-600 dark:text-gray-300">{profile.ens}</p>
                )}
                <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                    <svg className="mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Reputation: 95
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <svg className="mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Verified
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{followCount?.followers || 0}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Followers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{followCount?.following || 0}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Following</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">127</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Posts</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 md:mt-0">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800"
                >
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>
            </div>
            
            {profile.bio && !isEditing && (
              <p className="mt-6 text-gray-700 dark:text-gray-300">{profile.bio}</p>
            )}
          </div>
          
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              <button
                onClick={() => setActiveTab('posts')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'posts'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Posts
              </button>
              <button
                onClick={() => setActiveTab('followers')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'followers'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Followers
              </button>
              <button
                onClick={() => setActiveTab('following')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'following'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Following
              </button>
            </nav>
          </div>
          
          {/* Tab Content */}
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
                      disabled={!!(backendProfile || (contractProfileData && contractProfileData.handle))}
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
                        <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                          {profile.avatar ? (
                            <img src={profile.avatar} alt="Avatar" className="h-16 w-16 rounded-full" />
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">Avatar</span>
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
                      disabled={isCreatingProfile || isUpdatingProfile || isCreatingBackendProfile || isUpdatingBackendProfile}
                      className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 dark:focus:ring-offset-gray-800"
                    >
                      {(isCreatingProfile || isUpdatingProfile || isCreatingBackendProfile || isUpdatingBackendProfile) ? 'Saving...' : 'Save Profile'}
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
            
            {activeTab === 'followers' && address && (
              <FollowerList userAddress={address} />
            )}
            
            {activeTab === 'following' && address && (
              <FollowingList userAddress={address} />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}