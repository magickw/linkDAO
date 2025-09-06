import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSeller } from '../../../hooks/useSeller';
import { Button, GlassPanel, LoadingSkeleton } from '../../../design-system';

interface FormData {
  displayName: string;
  storeName: string;
  bio: string;
  description: string;
  email: string;
  phone: string;
}

export function SellerProfilePage() {
  const router = useRouter();
  const { profile, loading, error, updateProfile, walletAddress, isConnected } = useSeller();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    displayName: '',
    storeName: '',
    bio: '',
    description: '',
    email: '',
    phone: '',
  });

  // Debug logging
  console.log('SellerProfilePage - Wallet connected:', isConnected);
  console.log('SellerProfilePage - Wallet address:', walletAddress);
  console.log('SellerProfilePage - Profile:', profile);

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        storeName: profile.storeName || '',
        bio: profile.bio || '',
        description: profile.description || '',
        email: profile.email || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: FormData) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check wallet connection
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }
    
    // Add validation
    if (!formData.displayName.trim() && !formData.storeName.trim()) {
      alert('Please enter either a display name or store name');
      return;
    }
    
    setIsSaving(true);
    try {
      console.log('Updating profile with data:', formData);
      console.log('Using wallet address:', walletAddress);
      const result = await updateProfile(formData);
      console.log('Profile updated successfully:', result);
      setIsEditing(false);
      // Show success message
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Failed to update profile:', err);
      // Show error message to user
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-4xl mx-auto">
          <LoadingSkeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <LoadingSkeleton className="h-64" />
            <div className="md:col-span-2">
              <LoadingSkeleton className="h-64" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <GlassPanel className="max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Error Loading Profile</h1>
            <p className="text-gray-300 mb-6">
              {error}
            </p>
          </div>
          <Button onClick={() => router.push('/marketplace/seller/onboarding')} variant="primary">
            Go to Onboarding
          </Button>
        </GlassPanel>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <GlassPanel className="max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Seller Profile Not Found</h1>
            <p className="text-gray-300 mb-6">
              You need to complete the seller onboarding process to access your profile.
            </p>
          </div>
          <Button onClick={() => router.push('/marketplace/seller/onboarding')} variant="primary">
            Start Seller Onboarding
          </Button>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Seller Profile</h1>
            <p className="text-gray-400 mt-2">Manage your seller information and settings</p>
          </div>
          <div className="mt-4 md:mt-0">
            {isEditing ? (
              <div className="flex space-x-3">
                <Button onClick={() => setIsEditing(false)} variant="outline" disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" form="profile-form" variant="primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            ) : (
              <Button 
                onClick={() => {
                  if (!isConnected) {
                    alert('Please connect your wallet to edit your profile');
                    return;
                  }
                  setIsEditing(true);
                }} 
                variant="primary"
              >
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <GlassPanel className="p-6">
            <div className="text-center">
              {profile.profilePicture ? (
                <img
                  src={profile.profilePicture}
                  alt={profile.displayName}
                  className="w-24 h-24 rounded-full object-cover border-2 border-purple-500 mx-auto mb-4"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">
                    {profile.displayName?.charAt(0) || profile.storeName?.charAt(0) || 'S'}
                  </span>
                </div>
              )}
              <h2 className="text-xl font-bold text-white">{profile.storeName || profile.displayName}</h2>
              <p className="text-gray-400 mt-1">{profile.walletAddress}</p>
              
              <div className="mt-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  profile.tier === 'pro' ? 'bg-purple-600 text-white' :
                  profile.tier === 'verified' ? 'bg-blue-600 text-white' :
                  profile.tier === 'basic' ? 'bg-green-600 text-white' :
                  'bg-gray-600 text-white'
                }`}>
                  {profile.tier?.charAt(0).toUpperCase() + profile.tier?.slice(1)} Seller
                </span>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-700">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-400">Reputation Score</span>
                  <span className="text-white font-bold">{profile.stats?.reputationScore || 0}</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-400">Total Sales</span>
                  <span className="text-white font-bold">{profile.stats?.totalSales || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Active Listings</span>
                  <span className="text-white font-bold">{profile.stats?.activeListings || 0}</span>
                </div>
              </div>
            </div>
          </GlassPanel>

          {/* Profile Details */}
          <div className="md:col-span-2">
            {isEditing ? (
              <form id="profile-form" onSubmit={handleSubmit}>
                <GlassPanel className="p-6 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Profile Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Display Name</label>
                      <input
                        type="text"
                        name="displayName"
                        value={formData.displayName}
                        onChange={handleInputChange}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Store Name</label>
                      <input
                        type="text"
                        name="storeName"
                        value={formData.storeName}
                        onChange={handleInputChange}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Bio</label>
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Description</label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </GlassPanel>

                {/* Contact Information - Now part of the main form */}
                <GlassPanel className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      {profile.emailVerified ? (
                        <span className="text-green-400 text-sm mt-1 inline-block">Verified</span>
                      ) : (
                        <span className="text-yellow-400 text-sm mt-1 inline-block">Not verified</span>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      {profile.phoneVerified ? (
                        <span className="text-green-400 text-sm mt-1 inline-block">Verified</span>
                      ) : (
                        <span className="text-yellow-400 text-sm mt-1 inline-block">Not verified</span>
                      )}
                    </div>
                  </div>
                </GlassPanel>
              </form>
            ) : (
              <>
                <GlassPanel className="p-6 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Profile Information</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-400 text-sm">Display Name</p>
                      <p className="text-white">{profile.displayName || 'Not set'}</p>
                    </div>
                    
                    <div>
                      <p className="text-gray-400 text-sm">Store Name</p>
                      <p className="text-white">{profile.storeName || 'Not set'}</p>
                    </div>
                    
                    <div>
                      <p className="text-gray-400 text-sm">Bio</p>
                      <p className="text-white">{profile.bio || 'No bio provided'}</p>
                    </div>
                    
                    <div>
                      <p className="text-gray-400 text-sm">Description</p>
                      <p className="text-white">{profile.description || 'No description provided'}</p>
                    </div>
                  </div>
                </GlassPanel>

                {/* Contact Information */}
                <GlassPanel className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-400 text-sm">Email</p>
                      <p className="text-white">{profile.email || 'Not provided'}</p>
                      {profile.email && (
                        profile.emailVerified ? (
                          <span className="text-green-400 text-sm">Verified</span>
                        ) : (
                          <span className="text-yellow-400 text-sm">Not verified</span>
                        )
                      )}
                    </div>
                    
                    <div>
                      <p className="text-gray-400 text-sm">Phone</p>
                      <p className="text-white">{profile.phone || 'Not provided'}</p>
                      {profile.phone && (
                        profile.phoneVerified ? (
                          <span className="text-green-400 text-sm">Verified</span>
                        ) : (
                          <span className="text-yellow-400 text-sm">Not verified</span>
                        )
                      )}
                    </div>
                  </div>
                </GlassPanel>
              </>
            )}
          </div>
        </div>

        {/* Verification Status */}
        <GlassPanel className="p-6 mt-6">
          <h3 className="text-lg font-semibold text-white mb-4">Verification Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-700 rounded-lg p-4">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${profile.emailVerified ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                <span className="text-white">Email Verification</span>
              </div>
              <p className="text-gray-400 text-sm mt-2">
                {profile.emailVerified ? 'Verified' : 'Not verified'}
              </p>
            </div>
            
            <div className="border border-gray-700 rounded-lg p-4">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${profile.phoneVerified ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                <span className="text-white">Phone Verification</span>
              </div>
              <p className="text-gray-400 text-sm mt-2">
                {profile.phoneVerified ? 'Verified' : 'Not verified'}
              </p>
            </div>
            
            <div className="border border-gray-700 rounded-lg p-4">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${profile.kycStatus === 'approved' ? 'bg-green-500' : profile.kycStatus === 'pending' ? 'bg-yellow-500' : 'bg-gray-500'}`}></div>
                <span className="text-white">KYC Status</span>
              </div>
              <p className="text-gray-400 text-sm mt-2">
                {profile.kycStatus === 'approved' ? 'Approved' : 
                 profile.kycStatus === 'pending' ? 'Pending' : 'Not completed'}
              </p>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}