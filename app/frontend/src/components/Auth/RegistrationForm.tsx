import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useAuth } from '@/context/AuthContext';

interface RegistrationFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  onSuccess,
  onError,
  className = ''
}) => {
  const [formData, setFormData] = useState({
    handle: '',
    ens: '',
    email: '',
    agreeToTerms: false,
    preferences: {
      notifications: {
        email: false,
        push: true,
        inApp: true
      },
      privacy: {
        showEmail: false,
        showTransactions: false,
        allowDirectMessages: true
      },
      trading: {
        autoApproveSmallAmounts: false,
        defaultSlippage: 0.5,
        preferredCurrency: 'USDC'
      }
    },
    privacySettings: {
      profileVisibility: 'public' as const,
      activityVisibility: 'public' as const,
      contactVisibility: 'friends' as const
    }
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { address: walletAddress } = useAccount();
  const { register } = useAuth();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.handle.trim()) {
      newErrors.handle = 'Handle is required';
    } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(formData.handle)) {
      newErrors.handle = 'Handle must be 3-20 characters and contain only letters, numbers, and underscores';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.agreeToTerms) {
      newErrors.terms = 'You must agree to the terms and conditions';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  if (!walletAddress) {
      setErrors({ ...errors, submit: 'Wallet not connected. Please connect your wallet first.' });
      return;
    }

    // Call the registration function with the form data and connected wallet address
    register({
      ...formData,
      address: walletAddress,
      profileCid: JSON.stringify(profileData)
    });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleNestedChange = (section: string, field: string, value: any) => {
    setFormData(prev => {
      const sectionData = prev[section as keyof typeof prev];
      return {
        ...prev,
        [section]: {
          ...(typeof sectionData === 'object' && sectionData !== null ? sectionData : {}),
          [field]: value
        }
      };
    });
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Create Your Profile</h2>
        <p className="text-gray-600">Set up your marketplace profile to get started</p>
      </div>

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
        
        <div>
          <label htmlFor="handle" className="block text-sm font-medium text-gray-700 mb-1">
            Username *
          </label>
          <input
            type="text"
            id="handle"
            value={formData.handle}
            onChange={(e) => handleInputChange('handle', e.target.value)}
            placeholder="Enter your username"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.handle ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.handle && <p className="text-red-500 text-sm mt-1">{errors.handle}</p>}
        </div>

        <div>
          <label htmlFor="ens" className="block text-sm font-medium text-gray-700 mb-1">
            ENS Name (Optional)
          </label>
          <input
            type="text"
            id="ens"
            value={formData.ens}
            onChange={(e) => handleInputChange('ens', e.target.value)}
            placeholder="yourname.eth"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address (Optional)
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="your@email.com"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
        
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.preferences.notifications.email}
              onChange={(e) => handleNestedChange('preferences', 'notifications', {
                ...formData.preferences.notifications,
                email: e.target.checked
              })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Email notifications</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.preferences.notifications.push}
              onChange={(e) => handleNestedChange('preferences', 'notifications', {
                ...formData.preferences.notifications,
                push: e.target.checked
              })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Push notifications</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.preferences.notifications.inApp}
              onChange={(e) => handleNestedChange('preferences', 'notifications', {
                ...formData.preferences.notifications,
                inApp: e.target.checked
              })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">In-app notifications</span>
          </label>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Privacy Settings</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Profile Visibility
          </label>
          <select
            value={formData.privacySettings.profileVisibility}
            onChange={(e) => handleNestedChange('privacySettings', 'profileVisibility', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="public">Public</option>
            <option value="friends">Friends Only</option>
            <option value="private">Private</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Activity Visibility
          </label>
          <select
            value={formData.privacySettings.activityVisibility}
            onChange={(e) => handleNestedChange('privacySettings', 'activityVisibility', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="public">Public</option>
            <option value="friends">Friends Only</option>
            <option value="private">Private</option>
          </select>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div>
        <label className="flex items-start">
          <input
            type="checkbox"
            checked={formData.agreeToTerms}
            onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
            className={`mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
              errors.terms ? 'border-red-500' : ''
            }`}
          />
          <span className="ml-2 text-sm text-gray-700">
            I agree to the{' '}
            <a href="/terms" target="_blank" className="text-blue-600 hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" target="_blank" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>
          </span>
        </label>
        {errors.terms && <p className="text-red-500 text-sm mt-1">{errors.terms}</p>}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? 'Creating Profile...' : 'Create Profile'}
      </button>
    </form>
  );
};