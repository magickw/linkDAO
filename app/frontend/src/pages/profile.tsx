import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useReadProfileRegistryGetProfileByAddress, useWriteProfileRegistryCreateProfile, useWriteProfileRegistryUpdateProfile } from '@/generated';
import { useWeb3 } from '@/context/Web3Context';
import { useProfile, useCreateProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useFollowCount } from '@/hooks/useFollow';
import { useToast } from '@/context/ToastContext';
import { CreateUserProfileInput, UpdateUserProfileInput } from '../../../backend/src/models/UserProfile';
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
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Your Profile</h1>
            <p className="text-gray-600">Please connect your wallet to view and edit your profile.</p>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Your Profile</h1>
          
          {isLoading && (
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <p>Loading profile...</p>
            </div>
          )}
          
          {(backendProfileError || createBackendProfileError || updateBackendProfileError) && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              <p>Error: {backendProfileError || createBackendProfileError || updateBackendProfileError}</p>
            </div>
          )}
          
          {/* Profile Header */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img 
                  className="h-20 w-20 rounded-full" 
                  src={profile.avatar || 'https://via.placeholder.com/80'} 
                  alt={profile.handle} 
                />
              </div>
              <div className="ml-6">
                <h2 className="text-xl font-bold text-gray-900">{profile.handle}</h2>
                {profile.ens && (
                  <p className="text-gray-600">{profile.ens}</p>
                )}
                <div className="flex mt-2 space-x-4">
                  <button 
                    onClick={() => setActiveTab('posts')}
                    className={`px-3 py-1 text-sm font-medium rounded-md ${
                      activeTab === 'posts' 
                        ? 'bg-primary-100 text-primary-800' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Posts
                  </button>
                  <button 
                    onClick={() => setActiveTab('followers')}
                    className={`px-3 py-1 text-sm font-medium rounded-md ${
                      activeTab === 'followers' 
                        ? 'bg-primary-100 text-primary-800' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Followers {followCount?.followers ? `(${followCount.followers})` : ''}
                  </button>
                  <button 
                    onClick={() => setActiveTab('following')}
                    className={`px-3 py-1 text-sm font-medium rounded-md ${
                      activeTab === 'following' 
                        ? 'bg-primary-100 text-primary-800' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Following {followCount?.following ? `(${followCount.following})` : ''}
                  </button>
                </div>
              </div>
            </div>
            
            {profile.bio && (
              <p className="mt-4 text-gray-700">{profile.bio}</p>
            )}
          </div>
          
          {/* Tab Content */}
          <div>
            {activeTab === 'posts' && (
              <div className="bg-white shadow rounded-lg p-6">
                <form onSubmit={handleSubmit}>
                  <div className="mb-6">
                    <label htmlFor="handle" className="block text-sm font-medium text-gray-700 mb-1">
                      Handle
                    </label>
                    <input
                      type="text"
                      id="handle"
                      name="handle"
                      value={profile.handle}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="your-handle"
                      disabled={!!(backendProfile || (contractProfileData && contractProfileData.handle))}
                    />
                  </div>
                  
                  <div className="mb-6">
                    <label htmlFor="ens" className="block text-sm font-medium text-gray-700 mb-1">
                      ENS Name
                    </label>
                    <input
                      type="text"
                      id="ens"
                      name="ens"
                      value={profile.ens}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="yourname.eth"
                    />
                  </div>
                  
                  <div className="mb-6">
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                      Bio
                    </label>
                    <textarea
                      id="bio"
                      name="bio"
                      rows={4}
                      value={profile.bio}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Avatar
                    </label>
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                          {profile.avatar ? (
                            <img src={profile.avatar} alt="Avatar" className="h-16 w-16 rounded-full" />
                          ) : (
                            <span className="text-gray-500">Avatar</span>
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex text-sm text-gray-600">
                          <label
                            htmlFor="avatar-upload"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                          >
                            <span>Upload a file</span>
                            <input 
                              id="avatar-upload" 
                              name="avatar-upload" 
                              type="file" 
                              className="sr-only" 
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          PNG, JPG up to 10MB
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isCreatingProfile || isUpdatingProfile || isCreatingBackendProfile || isUpdatingBackendProfile}
                      className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                    >
                      {(isCreatingProfile || isUpdatingProfile || isCreatingBackendProfile || isUpdatingBackendProfile) ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </form>
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