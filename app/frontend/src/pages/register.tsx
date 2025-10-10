import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { useWriteProfileRegistryCreateProfile } from '@/generated';
import { useWeb3 } from '@/context/Web3Context';
import { useRouter } from 'next/router';

export default function Register() {
  const router = useRouter();
  const { address, isConnected } = useWeb3();
  const { 
    writeContract: createProfile, 
    isPending: isCreatingProfile, 
    isSuccess: isProfileCreated,
    error: createProfileError
  } = useWriteProfileRegistryCreateProfile();
  
  const [profile, setProfile] = useState({
    handle: '',
    ens: '',
    bio: '',
    avatar: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile.handle) {
      alert('Please enter a handle');
      return;
    }
    
    if (!isConnected || !address) {
      alert('Please connect your wallet first');
      return;
    }
    
    // Create new profile
    createProfile({
      args: [profile.handle, profile.ens, profile.avatar, profile.bio],
    });
  };

  // Redirect to profile page if profile is created successfully
  if (isProfileCreated) {
    setTimeout(() => {
      router.push('/profile');
    }, 2000);
  }

  if (!isConnected) {
    return (
      <Layout title="Register - LinkDAO" fullWidth={true}>
        <div className="px-4 py-6 sm:px-0">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Create Your Profile</h1>
            <p className="text-gray-600">Please connect your wallet to register.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Register - LinkDAO" fullWidth={true}>
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Create Your Profile</h1>
          
          <div className="bg-white shadow rounded-lg p-6">
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label htmlFor="handle" className="block text-sm font-medium text-gray-700 mb-1">
                  Handle *
                </label>
                <input
                  type="text"
                  id="handle"
                  name="handle"
                  value={profile.handle}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="your-handle"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">This will be your public username</p>
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
                  disabled={isCreatingProfile}
                  className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {isCreatingProfile ? 'Creating Profile...' : 'Create Profile'}
                </button>
              </div>
              
              {isProfileCreated && (
                <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-md">
                  Profile created successfully! Redirecting to your profile...
                </div>
              )}
              
              {createProfileError && (
                <div className="mt-4 p-4 bg-red-100 text-red-800 rounded-md">
                  Error creating profile: {createProfileError.message}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}