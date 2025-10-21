import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button, GlassPanel, LoadingSkeleton } from '../../../design-system';
import { useToast } from '@/context/ToastContext';
import { sellerService } from '@/services/sellerService';
import { useUnifiedSeller } from '@/hooks/useUnifiedSeller';
import { withSellerErrorBoundary } from './ErrorHandling';
import { TierProvider } from '../../../contexts/TierContext';
import TierInfoCard from './TierSystem/TierInfoCard';
import { useTier } from '../../../contexts/TierContext';
import { UnifiedSellerProfile } from '@/types/unifiedSeller';

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

function SellerProfilePageComponent() {
  const router = useRouter();
  const { profile, loading, error, updateProfile, address: walletAddress } = useUnifiedSeller();
  const typedProfile = profile as UnifiedSellerProfile | null;
  const isConnected = !!walletAddress;
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
    missingFields: Array<{ field: string; label: string; weight: number; required: boolean }>;
    recommendations: Array<{ action: string; description: string; impact: number }>;
    lastCalculated: string;
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

  const { addToast } = useToast();



  // Initialize form data when profile loads
  useEffect(() => {
    if (typedProfile) {
      setFormData({
        displayName: typedProfile.displayName || '',
        storeName: typedProfile.storeName || '',
        bio: typedProfile.bio || '',
        description: typedProfile.description || '',
        sellerStory: typedProfile.sellerStory || '',
        location: typedProfile.location || '',
        email: typedProfile.email || '',
        phone: typedProfile.phone || '',
        coverImage: typedProfile.coverImage || '',
        ensHandle: typedProfile.ensHandle || '',
        websiteUrl: typedProfile.websiteUrl || '',
        socialLinks: {
          twitter: typedProfile.socialLinks?.twitter || '',
          discord: typedProfile.socialLinks?.discord || '',
          telegram: typedProfile.socialLinks?.telegram || '',
          linkedin: typedProfile.socialLinks?.linkedin || '',
          website: typedProfile.socialLinks?.website || ''
        }
      });
      
      // Calculate profile completeness
      if (typedProfile?.profileCompleteness) {
        // Transform string recommendations to object format if needed
        const completeness = {
          ...typedProfile.profileCompleteness,
          recommendations: Array.isArray(typedProfile.profileCompleteness.recommendations) 
            ? typedProfile.profileCompleteness.recommendations.map((rec: any) => 
                typeof rec === 'string' 
                  ? { action: rec, description: rec, impact: 1 }
                  : rec
              )
            : []
        };
        setProfileCompleteness(completeness);
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
      // Use the seller service for ENS validation
      const result = await sellerService.validateENSHandle(ensHandle);
      
      setEnsValidation({
        isValidating: false,
        isValid: result.isValid,
        isAvailable: result.isAvailable,
        isOwned: result.isOwned,
        errors: result.errors || [],
        suggestions: result.suggestions || [],
      });
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
      addToast('Please select an image file', 'error');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      addToast('Image size must be less than 10MB', 'error');
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
      addToast('Please connect your wallet first', 'error');
      return;
    }
    
    // Add validation
    if (!formData.displayName.trim() && !formData.storeName.trim()) {
      addToast('Please enter either a display name or store name', 'error');
      return;
    }

    // Validate ENS handle if provided
    if (formData.ensHandle && (!ensValidation.isValid || !ensValidation.isOwned)) {
      addToast('Please provide a valid ENS handle that you own, or leave it empty', 'error');
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
        
        // Use enhanced seller service for profile update with images
        if (!walletAddress) {
          throw new Error('Wallet not connected');
        }
        
        // Build the update request with proper types
        const profileUpdateData: any = {
          ...formData,
        };
        
        // Only include image files if they exist (and are not null)
        if (imageUpload.profileImage) {
          profileUpdateData.profileImage = imageUpload.profileImage;
        }
        if (imageUpload.coverImage) {
          profileUpdateData.coverImage = imageUpload.coverImage;
        }
        
        const result = await sellerService.updateSellerProfileEnhanced(walletAddress, profileUpdateData);
        console.log('Profile updated successfully:', result);
        
        // Update profile completeness if returned
        if (result.completenessUpdate) {
          // Use the completeness data as-is since it should already match our structure
          setProfileCompleteness({
            ...result.completenessUpdate,
            lastCalculated: result.completenessUpdate.lastCalculated || new Date().toISOString()
          });
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
  addToast('Profile updated successfully!', 'success');
      
      // Trigger store page refresh by setting a flag in localStorage
      localStorage.setItem(`seller_profile_updated_${walletAddress}`, Date.now().toString());
      
      // Also dispatch a custom event for same-tab updates
      window.dispatchEvent(new CustomEvent('sellerProfileUpdated', { 
        detail: { walletAddress, profile: formData } 
      }));
    } catch (err) {
      console.error('Failed to update profile:', err);
      // Show error message to user
  const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
  addToast(`Error: ${errorMessage}`, 'error');
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
    // Type guard to safely access error.message
    const errorMessage = error instanceof Error ? error.message : String(error);
    
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
              {errorMessage}
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
    <TierProvider walletAddress={walletAddress!}>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Seller Profile</h1>
            <p className="text-gray-400 mt-2">Manage your seller information and settings</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-3">
            <Button
              onClick={() => window.open(`/seller/${typedProfile?.walletAddress}`, '_blank')}
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
                    addToast('Please connect your wallet to edit your profile', 'error');
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <GlassPanel className="p-6">
            <div className="text-center">
              {typedProfile?.coverImage ? (
                <img
                  src={typedProfile?.coverImage}
                  alt={typedProfile?.displayName}
                  className="w-24 h-24 rounded-full object-cover border-2 border-purple-500 mx-auto mb-4"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold">
                    {typedProfile?.displayName?.charAt(0) || typedProfile?.storeName?.charAt(0) || 'S'}
                  </span>
                </div>
              )}
              <h2 className="text-xl font-bold text-white">{typedProfile?.storeName || typedProfile?.displayName}</h2>
              <p className="text-gray-400 mt-1">{typedProfile?.walletAddress}</p>
              
              <div className="mt-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  typedProfile?.tier?.id === 'pro' ? 'bg-purple-600 text-white' :
                  typedProfile?.tier?.id === 'verified' ? 'bg-blue-600 text-white' :
                  typedProfile?.tier?.id === 'basic' ? 'bg-green-600 text-white' :
                  'bg-gray-600 text-white'
                }`}>
                  {typedProfile?.tier?.id ? typedProfile.tier.id.charAt(0).toUpperCase() + typedProfile.tier.id.slice(1) : 'Unknown'} Seller
                </span>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-700">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-400">Reputation Score</span>
                  <span className="text-white font-bold">{typedProfile?.stats?.reputationScore || 0}</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-400">Total Sales</span>
                  <span className="text-white font-bold">{typedProfile?.stats?.totalSales || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Active Listings</span>
                  <span className="text-white font-bold">{typedProfile?.stats?.activeListings || 0}</span>
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

          {/* Tier Information */}
          <TierInfoCard className="mb-6" />

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
                  </div>
                </GlassPanel>
              </form>
            ) : (
              <GlassPanel className="p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Profile Information</h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-gray-400 text-sm">Display Name</span>
                    <p className="text-white">{typedProfile?.displayName || 'Not set'}</p>
                  </div>
                  
                  <div>
                    <span className="text-gray-400 text-sm">Store Name</span>
                    <p className="text-white">{typedProfile?.storeName || 'Not set'}</p>
                  </div>
                  
                  <div>
                    <span className="text-gray-400 text-sm">Bio</span>
                    <p className="text-white">{typedProfile?.bio || 'Not set'}</p>
                  </div>
                  
                  <div>
                    <span className="text-gray-400 text-sm">Description</span>
                    <p className="text-white">{typedProfile?.description || 'Not set'}</p>
                  </div>
                  
                  <div>
                    <span className="text-gray-400 text-sm">Seller Story</span>
                    <p className="text-white">{typedProfile?.sellerStory || 'Not set'}</p>
                  </div>
                </div>
              </GlassPanel>
            )}
          </div>
        </div>
      </div>
    </TierProvider>
  );
}

// Wrap with error boundary
export const SellerProfilePage = withSellerErrorBoundary(SellerProfilePageComponent, {
  context: 'SellerProfilePage',
  enableRecovery: true,
});
