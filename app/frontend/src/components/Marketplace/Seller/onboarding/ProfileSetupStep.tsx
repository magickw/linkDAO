import React, { useState, useCallback } from 'react';
import { SellerProfile } from '../../../../types/seller';
import { Button } from '../../../../design-system';
import { useToast } from '../../../../context/ToastContext';

interface ProfileSetupStepProps {
  onComplete: (data: any) => void;
  data?: any;
  profile?: SellerProfile | null;
}

// Drag and Drop Upload Component
interface DragDropUploadProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  description: string;
  previewClassName?: string;
  accept?: string;
}

const DragDropUpload: React.FC<DragDropUploadProps> = ({
  label,
  value,
  onChange,
  placeholder,
  description,
  previewClassName = "w-16 h-16 rounded-lg object-cover",
  accept = "image/*"
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(!!value);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      await handleFileUpload(imageFile);
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  }, []);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      // In a real application, you would upload to a service like IPFS or S3
      // For now, we'll create a local URL for preview
      const localUrl = URL.createObjectURL(file);
      onChange(localUrl);
      setShowUrlInput(true);
    } catch (error) {
      console.error('Upload failed:', error);
      // In a real app, you might want to show an error message to the user
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>
      
      {/* Drag and Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200
          ${isDragging 
            ? 'border-purple-400 bg-purple-500/10' 
            : 'border-gray-600 hover:border-gray-500'
          }
          ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
        `}
      >
        {isUploading ? (
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-gray-400 text-sm">Uploading...</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center">
              <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-gray-300 text-sm mb-1">
                Drag & drop an image here, or{' '}
                <span className="text-purple-400 underline">click to browse</span>
              </p>
              <p className="text-gray-500 text-xs">PNG, JPG, GIF up to 10MB</p>
            </div>
            
            <input
              type="file"
              accept={accept}
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </>
        )}
      </div>

      {/* URL Input Toggle */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-sm text-purple-400 hover:text-purple-300 underline"
        >
          {showUrlInput ? 'Hide URL input' : 'Or enter URL manually'}
        </button>
      </div>

      {/* URL Input */}
      {showUrlInput && (
        <div className="mt-3">
          <input
            type="url"
            value={value}
            onChange={handleUrlChange}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder={placeholder}
          />
        </div>
      )}

      <p className="mt-2 text-xs text-gray-400">{description}</p>

      {/* Preview */}
      {value && (
        <div className="mt-3 flex items-center space-x-3">
          <img
            src={value}
            alt="Preview"
            className={`${previewClassName} border-2 border-gray-600`}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-red-400 hover:text-red-300 text-sm underline"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
};

export function ProfileSetupStep({ onComplete, data, profile }: ProfileSetupStepProps) {
  const [formData, setFormData] = useState({
    displayName: data?.displayName || profile?.displayName || '',
    storeName: data?.storeName || profile?.storeName || '',
    bio: data?.bio || profile?.bio || '',
    description: data?.description || profile?.description || '',
    coverImage: data?.coverImage || data?.profilePicture || profile?.profilePicture || profile?.coverImage || '',
    logo: data?.logo || profile?.logo || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { addToast } = useToast();

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

    // Validate URLs if provided
    if (formData.coverImage && !isValidUrl(formData.coverImage) && !formData.coverImage.startsWith('blob:')) {
      newErrors.coverImage = 'Please enter a valid URL for the cover image';
    }

    if (formData.logo && !isValidUrl(formData.logo) && !formData.logo.startsWith('blob:')) {
      newErrors.logo = 'Please enter a valid URL for the store logo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      await onComplete(formData);
      addToast('Profile saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save profile. Please try again.';
      setSubmitError(errorMessage);
      addToast(errorMessage, 'error');
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

      {/* Cover Image - Updated from Profile Picture */}
      <DragDropUpload
        label="Cover Image"
        value={formData.coverImage}
        onChange={(value) => handleInputChange('coverImage', value)}
        placeholder="https://example.com/your-cover-image.jpg"
        description="Optional: Add a cover image for your seller profile (recommended: 1200x400px)"
        previewClassName="w-24 h-16 rounded-lg object-cover"
      />

      {/* Store Logo */}
      <DragDropUpload
        label="Store Logo"
        value={formData.logo}
        onChange={(value) => handleInputChange('logo', value)}
        placeholder="https://example.com/your-store-logo.jpg"
        description="Optional: Add a logo for your store branding (recommended: square format)"
        previewClassName="w-16 h-16 rounded-lg object-cover"
      />

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

      {/* Error Message */}
      {submitError && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h4 className="text-red-300 font-medium">Error</h4>
          </div>
          <p className="text-red-200 text-sm mt-2">{submitError}</p>
          <p className="text-red-200 text-sm mt-2">
            It seems there might be an issue with the backend service. Please try again later or contact support if the problem persists.
          </p>
        </div>
      )}

      {/* Tips */}
      <div className="bg-blue-900 bg-opacity-50 rounded-lg p-4">
        <h4 className="text-blue-300 font-medium text-sm mb-2">💡 Profile Tips</h4>
        <ul className="text-blue-200 text-sm space-y-1">
          <li>• Use a clear, professional cover image to make your profile stand out</li>
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