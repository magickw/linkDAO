import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSeller } from '../../../hooks/useSeller';
import { Button, GlassPanel, LoadingSkeleton } from '../../../design-system';

interface FormData {
  displayName: string;
  storeName: string;
  bio: string;
  description: string;
  sellerStory: string;
  location: string;
  email: string;
  phone: string;
  coverImage: string;
  // Enhanced fields
  ensHandle: string;
  websiteUrl: string;
  socialLinks: {
    twitter: string;
    discord: string;
    telegram: string;
    linkedin: string;
    website: string;
  };
}

interface ENSValidationState {
  isValidating: boolean;
  isValid: boolean | null;
  isAvailable: boolean | null;
  isOwned: boolean | null;
  errors: string[];
  suggestions: string[];
}

interface ImageUploadState {
  profileImage: File | null;
  coverImage: File | null;
  profileImagePreview: string | null;
  coverImagePreview: string | null;
  isUploading: boolean;
}

export function SellerProfilePage() {
  const router = useRouter();
  const { profile, loading, error, updateProfile, walletAddress, isConnected } = useSeller();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [ensValidation, setEnsValidation] = useState<ENSValidationState>({
    isValidating: false,
    isValid: null,
    isAvailable: null,
    isOwned: null,
    errors: [],
    suggestions: [],
  });
  const [imageUpload, setImageUpload] = useState<ImageUploadState>({
    profileImage: null,
    coverImage: null,
    profileImagePreview: null,
    coverImagePreview: null,
    isUploading: false,
  });
  const [profileCompleteness, setProfileCompleteness] = useState<{
    score: number;
    missingFields: string[];
    recommendations: Array<{ action: string; description: string; impact: number }>;
  } | null>(null);
  const [formData, setFormData] = useState<FormData>({
    displayName: '',
    storeName: '',
    bio: '',
    description: '',
    sellerStory: '',
    location: '',
    email: '',
    phone: '',
    coverImage: '',
    ensHandle: '',
    websiteUrl: '',
    socialLinks: {
      twitter: '',
      discord: '',
      telegram: '',
      linkedin: '',
      website: ''
    }
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
        sellerStory: profile.sellerStory || '',
        location: profile.location || '',
        email: profile.email || '',
        phone: profile.phone || '',
        coverImage: profile.coverImage || '',
        ensHandle: profile.ensHandle || '',
        websiteUrl: profile.websiteUrl || '',
        socialLinks: {
          twitter: profile.socialLinks?.twitter || '',
          discord: profile.socialLinks?.discord || '',
          telegram: profile.socialLinks?.telegram || '',
          linkedin: profile.socialLinks?.linkedin || '',
          website: profile.socialLinks?.website || ''
        }
      });
      
      // Calculate profile completeness
      if (profile.profileCompleteness) {
        setProfileCompleteness(profile.profileCompleteness);
      }
    }
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('socialLinks.')) {
      const field = name.split('.')[1];
      setFormData((prev: FormData) => ({
        ...prev,
        socialLinks: {
          ...prev.socialLinks,
          [field]: value
        }
      }));
    } else {
      setFormData((prev: FormData) => ({
        ...prev,
        [name]: value
      }));
    }

    // Handle ENS validation
    if (name === 'ensHandle' && value.trim()) {
      validateENSHandle(value.trim());
    } else if (name === 'ensHandle' && !value.trim()) {
      setEnsValidation({
        isValidating: false,
        isValid: null,
        isAvailable: null,
        isOwned: null,
        errors: [],
        suggestions: [],
      });
    }
  };

  const validateENSHandle = async (ensHandle: string) => {
    if (!ensHandle.endsWith('.eth')) {
      setEnsValidation({
        isValidating: false,
        isValid: false,
        isAvailable: false,
        isOwned: false,
        errors: ['ENS handle must end with .eth'],
        suggestions: [`${ensHandle}.eth`],
      });
      return;
    }

    setEnsValidation(prev => ({ ...prev, isValidating: true }));

    try {
      // Call ENS validation service
      const response = await fetch('/api/sellers/ens/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ensHandle }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setEnsValidation({
            isValidating: false,
            isValid: result.data.isValid,
            isAvailable: result.data.isAvailable,
            isOwned: result.data.isOwned,
            errors: result.data.errors || [],
            suggestions: result.data.suggestions || [],
          });
        } else {
          setEnsValidation({
            isValidating: false,
            isValid: false,
            isAvailable: false,
            isOwned: false,
            errors: [result.message || 'ENS validation failed'],
            suggestions: [],
          });
        }
      } else {
        throw new Error('ENS validation request failed');
      }
    } catch (error) {
      console.error('ENS validation error:', error);
      setEnsValidation({
        isValidating: false,
        isValid: false,
        isAvailable: false,
        isOwned: false,
        errors: ['Failed to validate ENS handle'],
        suggestions: [],
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      setImageUpload(prev => ({
        ...prev,
        [type === 'profile' ? 'profileImage' : 'coverImage']: file,
        [type === 'profile' ? 'profileImagePreview' : 'coverImagePreview']: preview,
      }));
    };
    reader.readAsDataURL(file);
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

    // Validate ENS handle if provided
    if (formData.ensHandle && (!ensValidation.isValid || !ensValidation.isOwned)) {
      alert('Please provide a valid ENS handle that you own, or leave it empty');
      return;
    }
    
    setIsSaving(true);
    setImageUpload(prev => ({ ...prev, isUploading: true }));
    
    try {
      console.log('Updating profile with data:', formData);
      console.log('Using wallet address:', walletAddress);
      
      // Use enhanced update method if images are being uploaded
      if (imageUpload.profileImage || imageUpload.coverImage) {
        const formDataWithImages = new FormData();
        
        // Add text fields
        Object.entries(formData).forEach(([key, value]) => {
          if (key === 'socialLinks') {
            formDataWithImages.append(key, JSON.stringify(value));
          } else if (value) {
            formDataWithImages.append(key, value.toString());
          }
        });
        
        // Add image files
        if (imageUpload.profileImage) {
          formDataWithImages.append('profileImage', imageUpload.profileImage);
        }
        if (imageUpload.coverImage) {
          formDataWithImages.append('coverImage', imageUpload.coverImage);
        }
        
        // Call enhanced update endpoint
        const response = await fetch(`/api/sellers/profile/${walletAddress}/enhanced`, {
          method: 'PUT',
          body: formDataWithImages,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update profile');
        }
        
        const result = await response.json();
        console.log('Profile updated successfully:', result);
        
        // Update profile completeness if returned
        if (result.data.completenessUpdate) {
          setProfileCompleteness(result.data.completenessUpdate);
        }
      } else {
        // Use regular update method
        const result = await updateProfile(formData);
        console.log('Profile updated successfully:', result);
      }
      
      setIsEditing(false);
      // Reset image upload state
      setImageUpload({
        profileImage: null,
        coverImage: null,
        profileImagePreview: null,
        coverImagePreview: null,
        isUploading: false,
      });
      
      // Show success message
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Failed to update profile:', err);
      // Show error message to user
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsSaving(false);
      setImageUpload(prev => ({ ...prev, isUploading: false }));
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
          <div className="mt-4 md:mt-0 flex gap-3">
            <Button
              onClick={() => router.push(`/marketplace/seller/store/${profile.walletAddress}`)}
              variant="outline"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Store Page
            </Button>
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

          {/* Profile Completeness */}
          {profileCompleteness && (
            <GlassPanel className="p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Profile Completeness</h3>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Completion Score</span>
                  <span className="text-white font-bold">{profileCompleteness.score}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      profileCompleteness.score >= 80 ? 'bg-green-500' :
                      profileCompleteness.score >= 60 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${profileCompleteness.score}%` }}
                  ></div>
                </div>
              </div>
              
              {profileCompleteness.recommendations.length > 0 && (
                <div>
                  <h4 className="text-white font-medium mb-2">Recommendations</h4>
                  <div className="space-y-2">
                    {profileCompleteness.recommendations.slice(0, 3).map((rec, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <p className="text-white text-sm font-medium">{rec.action}</p>
                          <p className="text-gray-400 text-xs">{rec.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </GlassPanel>
          )}

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
                        rows={3}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Seller Story</label>
                      <textarea
                        name="sellerStory"
                        value={formData.sellerStory}
                        onChange={handleInputChange}
                        rows={4}
                        placeholder="Tell customers about your background, mission, and what makes you unique..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Location</label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        placeholder="e.g., San Francisco, CA"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-1">
                        ENS Handle <span className="text-gray-500">(optional)</span>
                      </label>
                      <input
                        type="text"
                        name="ensHandle"
                        value={formData.ensHandle}
                        onChange={handleInputChange}
                        placeholder="yourname.eth"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      {ensValidation.isValidating && (
                        <p className="text-blue-400 text-sm mt-1">Validating ENS handle...</p>
                      )}
                      {ensValidation.isValid === true && ensValidation.isOwned && (
                        <p className="text-green-400 text-sm mt-1">✓ Valid ENS handle owned by your wallet</p>
                      )}
                      {ensValidation.isValid === true && ensValidation.isOwned === false && (
                        <p className="text-red-400 text-sm mt-1">✗ ENS handle not owned by your wallet</p>
                      )}
                      {ensValidation.errors.length > 0 && (
                        <div className="mt-1">
                          {ensValidation.errors.map((error, index) => (
                            <p key={index} className="text-red-400 text-sm">✗ {error}</p>
                          ))}
                        </div>
                      )}
                      {ensValidation.suggestions.length > 0 && (
                        <div className="mt-1">
                          <p className="text-gray-400 text-sm">Suggestions:</p>
                          {ensValidation.suggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, ensHandle: suggestion }));
                                validateENSHandle(suggestion);
                              }}
                              className="text-purple-400 text-sm hover:text-purple-300 mr-2"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Website URL</label>
                      <input
                        type="url"
                        name="websiteUrl"
                        value={formData.websiteUrl}
                        onChange={handleInputChange}
                        placeholder="https://yourwebsite.com"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Profile Image</label>
                      <div className="flex items-center space-x-4">
                        {imageUpload.profileImagePreview ? (
                          <img
                            src={imageUpload.profileImagePreview}
                            alt="Profile preview"
                            className="w-16 h-16 rounded-full object-cover border-2 border-purple-500"
                          />
                        ) : profile?.profilePicture ? (
                          <img
                            src={profile.profilePicture}
                            alt="Current profile"
                            className="w-16 h-16 rounded-full object-cover border-2 border-gray-600"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'profile')}
                          className="hidden"
                          id="profile-image-upload"
                        />
                        <label
                          htmlFor="profile-image-upload"
                          className="cursor-pointer bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                        >
                          Upload Image
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Cover Image</label>
                      <div className="space-y-2">
                        {imageUpload.coverImagePreview ? (
                          <img
                            src={imageUpload.coverImagePreview}
                            alt="Cover preview"
                            className="w-full h-32 object-cover rounded-lg border-2 border-purple-500"
                          />
                        ) : profile?.coverImage ? (
                          <img
                            src={profile.coverImage}
                            alt="Current cover"
                            className="w-full h-32 object-cover rounded-lg border-2 border-gray-600"
                          />
                        ) : (
                          <div className="w-full h-32 bg-gray-700 rounded-lg flex items-center justify-center">
                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'cover')}
                          className="hidden"
                          id="cover-image-upload"
                        />
                        <label
                          htmlFor="cover-image-upload"
                          className="cursor-pointer bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors inline-block"
                        >
                          Upload Cover Image
                        </label>
                      </div>
                    </div>
                  </div>
                </GlassPanel>

                {/* Social Links */}
                <GlassPanel className="p-6 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Social Links</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Twitter</label>
                      <input
                        type="text"
                        name="socialLinks.twitter"
                        value={formData.socialLinks.twitter}
                        onChange={handleInputChange}
                        placeholder="@username or https://twitter.com/username"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Discord</label>
                      <input
                        type="text"
                        name="socialLinks.discord"
                        value={formData.socialLinks.discord}
                        onChange={handleInputChange}
                        placeholder="username#1234 or username"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Telegram</label>
                      <input
                        type="text"
                        name="socialLinks.telegram"
                        value={formData.socialLinks.telegram}
                        onChange={handleInputChange}
                        placeholder="@username"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">LinkedIn</label>
                      <input
                        type="url"
                        name="socialLinks.linkedin"
                        value={formData.socialLinks.linkedin}
                        onChange={handleInputChange}
                        placeholder="https://linkedin.com/in/username"
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
                    
                    <div>
                      <p className="text-gray-400 text-sm">Seller Story</p>
                      <p className="text-white">{profile.sellerStory || 'No seller story provided'}</p>
                    </div>
                    
                    <div>
                      <p className="text-gray-400 text-sm">Location</p>
                      <p className="text-white">{profile.location || 'Not specified'}</p>
                    </div>
                    
                    <div>
                      <p className="text-gray-400 text-sm">ENS Handle</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-white">{profile.ensHandle || 'Not set'}</p>
                        {profile.ensHandle && profile.ensVerified && (
                          <span className="text-green-400 text-sm">✓ Verified</span>
                        )}
                        {profile.ensHandle && !profile.ensVerified && (
                          <span className="text-yellow-400 text-sm">⚠ Not verified</span>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-gray-400 text-sm">Website</p>
                      {profile.websiteUrl ? (
                        <a 
                          href={profile.websiteUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300"
                        >
                          {profile.websiteUrl}
                        </a>
                      ) : (
                        <p className="text-white">Not provided</p>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-gray-400 text-sm">Profile Image</p>
                      <p className="text-white">{profile.profileImageCdn ? 'Set' : 'Not set'}</p>
                    </div>
                    
                    <div>
                      <p className="text-gray-400 text-sm">Cover Image</p>
                      <p className="text-white">{profile.coverImageCdn ? 'Set' : 'Not set'}</p>
                    </div>
                  </div>
                </GlassPanel>

                {/* Social Links */}
                <GlassPanel className="p-6 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Social Links</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-400 text-sm">Twitter</p>
                      {profile.socialLinks?.twitter ? (
                        <a 
                          href={profile.socialLinks.twitter.startsWith('http') ? profile.socialLinks.twitter : `https://twitter.com/${profile.socialLinks.twitter.replace('@', '')}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300"
                        >
                          {profile.socialLinks.twitter}
                        </a>
                      ) : (
                        <p className="text-white">Not provided</p>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-gray-400 text-sm">Discord</p>
                      <p className="text-white">{profile.socialLinks?.discord || 'Not provided'}</p>
                    </div>
                    
                    <div>
                      <p className="text-gray-400 text-sm">Telegram</p>
                      {profile.socialLinks?.telegram ? (
                        <a 
                          href={`https://t.me/${profile.socialLinks.telegram.replace('@', '')}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300"
                        >
                          {profile.socialLinks.telegram}
                        </a>
                      ) : (
                        <p className="text-white">Not provided</p>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-gray-400 text-sm">LinkedIn</p>
                      {profile.socialLinks?.linkedin ? (
                        <a 
                          href={profile.socialLinks.linkedin}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300"
                        >
                          {profile.socialLinks.linkedin}
                        </a>
                      ) : (
                        <p className="text-white">Not provided</p>
                      )}
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <div className={`w-3 h-3 rounded-full mr-3 ${profile.ensVerified ? 'bg-green-500' : profile.ensHandle ? 'bg-yellow-500' : 'bg-gray-500'}`}></div>
                <span className="text-white">ENS Verification</span>
              </div>
              <p className="text-gray-400 text-sm mt-2">
                {profile.ensVerified ? 'Verified' : 
                 profile.ensHandle ? 'Not verified' : 'No ENS handle'}
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