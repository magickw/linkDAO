import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import { ProfileService } from '@/services/profileService';
import { UserProfile, UpdateUserProfileInput } from '@/models/UserProfile';
import { useToast } from '@/hooks/useToast';
import { ProfileUpdateSuccess } from '@/components/UserFeedback';

const ProfilePage: React.FC = () => {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { addToast } = useToast();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<UpdateUserProfileInput>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isConnected || !address) {
      router.push('/connect');
      return;
    }
    
    loadProfile();
  }, [address, isConnected]);

  const loadProfile = async () => {
    if (!address) return;
    
    try {
      setIsLoading(true);
      const userProfile = await ProfileService.getProfileByAddress(address);
      setProfile(userProfile);
      
      if (userProfile) {
        setFormData({
          handle: userProfile.handle,
          ens: userProfile.ens,
          avatarCid: userProfile.avatarCid,
          bioCid: userProfile.bioCid,
          email: userProfile.email,
          billingFirstName: userProfile.billingFirstName,
          billingLastName: userProfile.billingLastName,
          billingCompany: userProfile.billingCompany,
          billingAddress1: userProfile.billingAddress1,
          billingAddress2: userProfile.billingAddress2,
          billingCity: userProfile.billingCity,
          billingState: userProfile.billingState,
          billingZipCode: userProfile.billingZipCode,
          billingCountry: userProfile.billingCountry,
          billingPhone: userProfile.billingPhone,
          shippingFirstName: userProfile.shippingFirstName,
          shippingLastName: userProfile.shippingLastName,
          shippingCompany: userProfile.shippingCompany,
          shippingAddress1: userProfile.shippingAddress1,
          shippingAddress2: userProfile.shippingAddress2,
          shippingCity: userProfile.shippingCity,
          shippingState: userProfile.shippingState,
          shippingZipCode: userProfile.shippingZipCode,
          shippingCountry: userProfile.shippingCountry,
          shippingPhone: userProfile.shippingPhone,
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load profile data'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.handle || formData.handle.trim().length < 3) {
      newErrors.handle = 'Handle must be at least 3 characters';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !profile) return;
    
    try {
      setIsUpdating(true);
      
      const updatedProfile = await ProfileService.updateProfile(profile.id, formData);
      setProfile(updatedProfile);
      
      setShowSuccess(true);
      addToast({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your profile has been updated successfully'
      });
      
      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);
      
    } catch (error) {
      console.error('Failed to update profile:', error);
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: error instanceof Error ? error.message : 'Failed to update profile'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h1>
          <p className="text-gray-600 mb-6">You need to create a profile first.</p>
          <button
            onClick={() => router.push('/create-profile')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium"
          >
            Create Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-blue-500 px-6 py-4">
          <h1 className="text-2xl font-bold text-white">Edit Profile</h1>
          <p className="text-blue-100 mt-1">Update your profile information</p>
        </div>

        {showSuccess && <ProfileUpdateSuccess />}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="handle" className="block text-sm font-medium text-gray-700 mb-1">
                  Handle *
                </label>
                <input
                  type="text"
                  id="handle"
                  name="handle"
                  value={formData.handle || ''}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.handle ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Your username"
                />
                {errors.handle && <p className="text-red-500 text-sm mt-1">{errors.handle}</p>}
              </div>

              <div>
                <label htmlFor="ens" className="block text-sm font-medium text-gray-700 mb-1">
                  ENS Name
                </label>
                <input
                  type="text"
                  id="ens"
                  name="ens"
                  value={formData.ens || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="yourname.eth"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email || ''}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="your.email@example.com"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="avatarCid" className="block text-sm font-medium text-gray-700 mb-1">
                Avatar CID
              </label>
              <input
                type="text"
                id="avatarCid"
                name="avatarCid"
                value={formData.avatarCid || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="IPFS CID for your avatar"
              />
            </div>

            <div>
              <label htmlFor="bioCid" className="block text-sm font-medium text-gray-700 mb-1">
                Bio CID
              </label>
              <input
                type="text"
                id="bioCid"
                name="bioCid"
                value={formData.bioCid || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="IPFS CID for your bio"
              />
            </div>
          </div>

          {/* Billing Address */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Billing Address</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="billingFirstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  id="billingFirstName"
                  name="billingFirstName"
                  value={formData.billingFirstName || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="First name"
                />
              </div>

              <div>
                <label htmlFor="billingLastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  id="billingLastName"
                  name="billingLastName"
                  value={formData.billingLastName || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="billingCompany" className="block text-sm font-medium text-gray-700 mb-1">
                Company
              </label>
              <input
                type="text"
                id="billingCompany"
                name="billingCompany"
                value={formData.billingCompany || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Company name"
              />
            </div>

            <div>
              <label htmlFor="billingAddress1" className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 1
              </label>
              <input
                type="text"
                id="billingAddress1"
                name="billingAddress1"
                value={formData.billingAddress1 || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Street address"
              />
            </div>

            <div>
              <label htmlFor="billingAddress2" className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 2
              </label>
              <input
                type="text"
                id="billingAddress2"
                name="billingAddress2"
                value={formData.billingAddress2 || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Apartment, suite, etc."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="billingCity" className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  id="billingCity"
                  name="billingCity"
                  value={formData.billingCity || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="City"
                />
              </div>

              <div>
                <label htmlFor="billingState" className="block text-sm font-medium text-gray-700 mb-1">
                  State/Province
                </label>
                <input
                  type="text"
                  id="billingState"
                  name="billingState"
                  value={formData.billingState || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="State"
                />
              </div>

              <div>
                <label htmlFor="billingZipCode" className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP/Postal Code
                </label>
                <input
                  type="text"
                  id="billingZipCode"
                  name="billingZipCode"
                  value={formData.billingZipCode || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ZIP code"
                />
              </div>
            </div>

            <div>
              <label htmlFor="billingCountry" className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <input
                type="text"
                id="billingCountry"
                name="billingCountry"
                value={formData.billingCountry || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Country"
              />
            </div>

            <div>
              <label htmlFor="billingPhone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                id="billingPhone"
                name="billingPhone"
                value={formData.billingPhone || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Phone number"
              />
            </div>
          </div>

          {/* Shipping Address */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Shipping Address</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="shippingFirstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  id="shippingFirstName"
                  name="shippingFirstName"
                  value={formData.shippingFirstName || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="First name"
                />
              </div>

              <div>
                <label htmlFor="shippingLastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  id="shippingLastName"
                  name="shippingLastName"
                  value={formData.shippingLastName || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="shippingCompany" className="block text-sm font-medium text-gray-700 mb-1">
                Company
              </label>
              <input
                type="text"
                id="shippingCompany"
                name="shippingCompany"
                value={formData.shippingCompany || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Company name"
              />
            </div>

            <div>
              <label htmlFor="shippingAddress1" className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 1
              </label>
              <input
                type="text"
                id="shippingAddress1"
                name="shippingAddress1"
                value={formData.shippingAddress1 || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Street address"
              />
            </div>

            <div>
              <label htmlFor="shippingAddress2" className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 2
              </label>
              <input
                type="text"
                id="shippingAddress2"
                name="shippingAddress2"
                value={formData.shippingAddress2 || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Apartment, suite, etc."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="shippingCity" className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  id="shippingCity"
                  name="shippingCity"
                  value={formData.shippingCity || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="City"
                />
              </div>

              <div>
                <label htmlFor="shippingState" className="block text-sm font-medium text-gray-700 mb-1">
                  State/Province
                </label>
                <input
                  type="text"
                  id="shippingState"
                  name="shippingState"
                  value={formData.shippingState || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="State"
                />
              </div>

              <div>
                <label htmlFor="shippingZipCode" className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP/Postal Code
                </label>
                <input
                  type="text"
                  id="shippingZipCode"
                  name="shippingZipCode"
                  value={formData.shippingZipCode || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ZIP code"
                />
              </div>
            </div>

            <div>
              <label htmlFor="shippingCountry" className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <input
                type="text"
                id="shippingCountry"
                name="shippingCountry"
                value={formData.shippingCountry || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Country"
              />
            </div>

            <div>
              <label htmlFor="shippingPhone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                id="shippingPhone"
                name="shippingPhone"
                value={formData.shippingPhone || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Phone number"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {isUpdating ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;