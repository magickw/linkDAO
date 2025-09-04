import React, { useState } from 'react';
import { SellerProfile } from '../../../../types/seller';
import { Button } from '../../../../design-system';

interface ProfileSetupStepProps {
  onComplete: (data: any) => void;
  data?: any;
  profile?: SellerProfile | null;
}

export function ProfileSetupStep({ onComplete, data, profile }: ProfileSetupStepProps) {
  const [formData, setFormData] = useState({
    displayName: data?.displayName || profile?.displayName || '',
    storeName: data?.storeName || profile?.storeName || '',
    bio: data?.bio || profile?.bio || '',
    description: data?.description || profile?.description || '',
    profilePicture: data?.profilePicture || profile?.profilePicture || '',
    logo: data?.logo || profile?.logo || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    } else if (formData.displayName.length < 2) {
      newErrors.displayName = 'Display name must be at least 2 characters';
    } else if (formData.displayName.length > 50) {
      newErrors.displayName = 'Display name must be less than 50 characters';
    }

    if (!formData.storeName.trim()) {
      newErrors.storeName = 'Store name is required';
    } else if (formData.storeName.length < 2) {
      newErrors.storeName = 'Store name must be at least 2 characters';
    } else if (formData.storeName.length > 100) {
      newErrors.storeName = 'Store name must be less than 100 characters';
    }

    if (formData.bio && formData.bio.length > 500) {
      newErrors.bio = 'Bio must be less than 500 characters';
    }

    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onComplete(formData);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Display Name */}
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-2">
            Display Name *
          </label>
          <input
            type="text"
            id="displayName"
            value={formData.displayName}
            onChange={(e) => handleInputChange('displayName', e.target.value)}
            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
              errors.displayName ? 'border-red-500' : 'border-gray-600'
            }`}
            placeholder="Your name or username"
            maxLength={50}
          />
          {errors.displayName && (
            <p className="mt-1 text-sm text-red-400">{errors.displayName}</p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            This is how other users will see you on the marketplace
          </p>
        </div>

        {/* Store Name */}
        <div>
          <label htmlFor="storeName" className="block text-sm font-medium text-gray-300 mb-2">
            Store Name *
          </label>
          <input
            type="text"
            id="storeName"
            value={formData.storeName}
            onChange={(e) => handleInputChange('storeName', e.target.value)}
            className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
              errors.storeName ? 'border-red-500' : 'border-gray-600'
            }`}
            placeholder="Your store or business name"
            maxLength={100}
          />
          {errors.storeName && (
            <p className="mt-1 text-sm text-red-400">{errors.storeName}</p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            The name of your store or business on the marketplace
          </p>
        </div>
      </div>

      {/* Profile Picture URL */}
      <div>
        <label htmlFor="profilePicture" className="block text-sm font-medium text-gray-300 mb-2">
          Profile Picture URL
        </label>
        <input
          type="url"
          id="profilePicture"
          value={formData.profilePicture}
          onChange={(e) => handleInputChange('profilePicture', e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="https://example.com/your-profile-picture.jpg"
        />
        <p className="mt-1 text-xs text-gray-400">
          Optional: Add a profile picture to help buyers recognize you
        </p>
        {formData.profilePicture && (
          <div className="mt-2">
            <img
              src={formData.profilePicture}
              alt="Profile preview"
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-600"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
      </div>

      {/* Store Logo URL */}
      <div>
        <label htmlFor="logo" className="block text-sm font-medium text-gray-300 mb-2">
          Store Logo URL
        </label>
        <input
          type="url"
          id="logo"
          value={formData.logo}
          onChange={(e) => handleInputChange('logo', e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="https://example.com/your-store-logo.jpg"
        />
        <p className="mt-1 text-xs text-gray-400">
          Optional: Add a logo for your store branding
        </p>
        {formData.logo && (
          <div className="mt-2">
            <img
              src={formData.logo}
              alt="Logo preview"
              className="w-16 h-16 rounded-lg object-cover border-2 border-gray-600"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-2">
          Short Bio
        </label>
        <textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => handleInputChange('bio', e.target.value)}
          rows={3}
          className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none ${
            errors.bio ? 'border-red-500' : 'border-gray-600'
          }`}
          placeholder="Tell buyers a bit about yourself..."
          maxLength={500}
        />
        {errors.bio && (
          <p className="mt-1 text-sm text-red-400">{errors.bio}</p>
        )}
        <div className="flex justify-between mt-1">
          <p className="text-xs text-gray-400">
            Optional: A brief introduction about yourself
          </p>
          <p className="text-xs text-gray-400">
            {formData.bio.length}/500
          </p>
        </div>
      </div>

      {/* Store Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
          Store Description
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          rows={4}
          className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none ${
            errors.description ? 'border-red-500' : 'border-gray-600'
          }`}
          placeholder="Describe your store, what you sell, your values, etc..."
          maxLength={1000}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-400">{errors.description}</p>
        )}
        <div className="flex justify-between mt-1">
          <p className="text-xs text-gray-400">
            Optional: Detailed description of your store and products
          </p>
          <p className="text-xs text-gray-400">
            {formData.description.length}/1000
          </p>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-900 bg-opacity-50 rounded-lg p-4">
        <h4 className="text-blue-300 font-medium text-sm mb-2">💡 Profile Tips</h4>
        <ul className="text-blue-200 text-sm space-y-1">
          <li>• Use a clear, professional profile picture to build trust</li>
          <li>• Choose a memorable store name that reflects your brand</li>
          <li>• Write a compelling bio that highlights your expertise</li>
          <li>• Be authentic - buyers appreciate genuine sellers</li>
        </ul>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          className="min-w-32"
        >
          {isSubmitting ? (
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Saving...
            </div>
          ) : (
            'Save Profile'
          )}
        </Button>
      </div>
    </form>
  );
}