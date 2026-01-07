import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { X, Upload, Coins, Users, Shield, Info, AlertCircle } from 'lucide-react';

interface CreateCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (communityData: CommunityCreationData) => Promise<void>;
  isLoading?: boolean;
}

interface CommunityCreationData {
  name: string;
  description: string;
  icon?: File;
  banner?: File;
  category: string;
  isPrivate: boolean;
  slug?: string;
  slugManuallyEdited?: boolean;
  tokenRequirement?: {
    tokenAddress: string;
    minimumBalance: number;
    tokenSymbol: string;
  };
  governanceSettings?: {
    enableGovernance: boolean;
    votingThreshold: number;
    proposalDelay: number;
  };
}

/**
 * CreateCommunityModal Component
 * 
 * Modal for creating new Web3-native communities with token requirements
 * and governance settings.
 * 
 * Requirements: 1.3 (Create Community functionality)
 */
export const CreateCommunityModal: React.FC<CreateCommunityModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<CommunityCreationData>({
    name: '',
    description: '',
    category: 'general',
    isPrivate: false,
    tokenRequirement: undefined,
    governanceSettings: {
      enableGovernance: false,
      votingThreshold: 1000,
      proposalDelay: 24
    }
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [iconPreview, setIconPreview] = useState<string>('');
  const [bannerPreview, setBannerPreview] = useState<string>('');

  const categories = [
    { value: 'general', label: 'General Discussion' },
    { value: 'defi', label: 'DeFi & Finance' },
    { value: 'nft', label: 'NFTs & Art' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'dao', label: 'DAO Governance' },
    { value: 'development', label: 'Development' },
    { value: 'trading', label: 'Trading' },
    { value: 'other', label: 'Other' }
  ];

  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: value
      };
      
      // Generate slug from name if slug hasn't been manually edited
      if (field === 'name' && !prev.slugManuallyEdited) {
        updated.slug = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }
      
      // Mark slug as manually edited if user changes it directly
      if (field === 'slug') {
        updated.slugManuallyEdited = true;
      }
      
      return updated;
    });
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  }, [errors]);

  const handleTokenRequirementChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      tokenRequirement: prev.tokenRequirement ? {
        ...prev.tokenRequirement,
        [field]: value
      } : {
        tokenAddress: '',
        minimumBalance: 0,
        tokenSymbol: '',
        [field]: value
      }
    }));
  }, []);

  const handleGovernanceChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      governanceSettings: {
        ...prev.governanceSettings!,
        [field]: value
      }
    }));
  }, []);

  const handleFileUpload = useCallback((field: 'icon' | 'banner', file: File) => {
    setFormData(prev => ({
      ...prev,
      [field]: file
    }));

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (field === 'icon') {
        setIconPreview(e.target?.result as string);
      } else {
        setBannerPreview(e.target?.result as string);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const validateStep = useCallback((step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.name.trim()) {
        newErrors.name = 'Community name is required';
      } else if (formData.name.length < 3) {
        newErrors.name = 'Community name must be at least 3 characters';
      }

      if (!formData.slug?.trim()) {
        newErrors.slug = 'URL slug is required';
      } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
        newErrors.slug = 'URL slug can only contain lowercase letters, numbers, and hyphens';
      } else if (formData.slug.length < 3) {
        newErrors.slug = 'URL slug must be at least 3 characters';
      } else if (/^-|-$/.test(formData.slug)) {
        newErrors.slug = 'URL slug cannot start or end with a hyphen';
      }

      if (!formData.description.trim()) {
        newErrors.description = 'Description is required';
      } else if (formData.description.length < 10) {
        newErrors.description = 'Description must be at least 10 characters';
      }

      if (!formData.category) {
        newErrors.category = 'Please select a category';
      }
    }

    if (step === 2 && formData.tokenRequirement) {
      if (!formData.tokenRequirement.tokenAddress) {
        newErrors.tokenAddress = 'Token address is required';
      }
      if (!formData.tokenRequirement.tokenSymbol) {
        newErrors.tokenSymbol = 'Token symbol is required';
      }
      if (formData.tokenRequirement.minimumBalance <= 0) {
        newErrors.minimumBalance = 'Minimum balance must be greater than 0';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, validateStep]);

  const handlePrevious = useCallback(() => {
    setCurrentStep(prev => prev - 1);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (validateStep(currentStep)) {
      try {
        // Upload files to IPFS if provided
        let iconUrl: string | undefined;
        let bannerUrl: string | undefined;

        if (formData.icon) {
          const iconFormData = new FormData();
          iconFormData.append('file', formData.icon);
          const iconResponse = await fetch('/api/support/upload', {
            method: 'POST',
            body: iconFormData,
          });
          const iconResult = await iconResponse.json();
          if (iconResult.success) {
            iconUrl = iconResult.data.url;
          }
        }

        if (formData.banner) {
          const bannerFormData = new FormData();
          bannerFormData.append('file', formData.banner);
          const bannerResponse = await fetch('/api/support/upload', {
            method: 'POST',
            body: bannerFormData,
          });
          const bannerResult = await bannerResponse.json();
          if (bannerResult.success) {
            bannerUrl = bannerResult.data.url;
          }
        }

        // Transform formData to match backend's expected format
        const transformedData = {
          name: formData.name,
          slug: formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
          displayName: formData.name, // Use name as displayName
          description: formData.description,
          category: formData.category,
          tags: [],
          isPublic: !formData.isPrivate,
          iconUrl,
          bannerUrl,
          rules: [],
          governanceEnabled: formData.governanceSettings?.enableGovernance || false,
          stakingRequired: !!formData.tokenRequirement,
          minimumStake: formData.tokenRequirement?.minimumBalance || 0
        };

        await onSubmit(transformedData);
        onClose();
      } catch (error: any) {
        console.error('Failed to create community:', error);

        // Extract validation errors from the response
        let errorMessage = 'Failed to create community';
        if (error.message) {
          errorMessage = error.message;
        }

        // Check if it's a validation error with details
        if (error.details && Array.isArray(error.details)) {
          errorMessage = error.details.join(', ');
        }

        // Show error to user
        alert(`Error: ${errorMessage}`);
      }
    }
  }, [currentStep, validateStep, formData, onSubmit, onClose]);

  if (!isOpen) return null;

  // Ensure we're in a browser environment before using portal
  if (typeof window === 'undefined') return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Create New Community
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-12 h-1 mx-2 ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Step {currentStep} of 3: {
              currentStep === 1 ? 'Basic Information' :
              currentStep === 2 ? 'Token Requirements' :
              'Governance Settings'
            }
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Community Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Community Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name 
                      ? 'border-red-300 dark:border-red-600' 
                      : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                  placeholder="Enter community name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                )}
              </div>

              {/* URL Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL Slug *
                </label>
                <input
                  type="text"
                  value={formData.slug || ''}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.slug 
                      ? 'border-red-300 dark:border-red-600' 
                      : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                  placeholder="community-url-slug"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Only lowercase letters, numbers, and hyphens allowed
                </p>
                {errors.slug && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.slug}</p>
                )}
              </div>

              {/* URL Preview */}
              {formData.name ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    URL Preview
                  </label>
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      /communities/{formData.slug || 'community-name'}
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.description 
                      ? 'border-red-300 dark:border-red-600' 
                      : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                  placeholder="Describe your community's purpose and goals"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Privacy Setting */}
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.isPrivate}
                    onChange={(e) => handleInputChange('isPrivate', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Make this community private (invite-only)
                  </span>
                </label>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Token Requirements (Optional)
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Set token requirements for joining your community. Members will need to hold the specified amount of tokens.
                    </p>
                  </div>
                </div>
              </div>

              {/* Enable Token Requirements */}
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={!!formData.tokenRequirement}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({
                          ...prev,
                          tokenRequirement: {
                            tokenAddress: '',
                            minimumBalance: 100,
                            tokenSymbol: ''
                          }
                        }));
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          tokenRequirement: undefined
                        }));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Require token ownership for membership
                  </span>
                </label>
              </div>

              {formData.tokenRequirement && (
                <div className="space-y-4 pl-7">
                  {/* Token Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Token Contract Address *
                    </label>
                    <input
                      type="text"
                      value={formData.tokenRequirement.tokenAddress}
                      onChange={(e) => handleTokenRequirementChange('tokenAddress', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.tokenAddress 
                          ? 'border-red-300 dark:border-red-600' 
                          : 'border-gray-300 dark:border-gray-600'
                        } bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm`}
                      placeholder="0x..."
                    />
                    {errors.tokenAddress && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.tokenAddress}</p>
                    )}
                  </div>

                  {/* Token Symbol */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Token Symbol *
                    </label>
                    <input
                      type="text"
                      value={formData.tokenRequirement.tokenSymbol}
                      onChange={(e) => handleTokenRequirementChange('tokenSymbol', e.target.value.toUpperCase())}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.tokenSymbol 
                          ? 'border-red-300 dark:border-red-600' 
                          : 'border-gray-300 dark:border-gray-600'
                        } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                      placeholder="e.g., USDC, ETH, LINK"
                    />
                    {errors.tokenSymbol && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.tokenSymbol}</p>
                    )}
                  </div>

                  {/* Minimum Balance */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Minimum Balance Required *
                    </label>
                    <input
                      type="number"
                      value={formData.tokenRequirement.minimumBalance}
                      onChange={(e) => handleTokenRequirementChange('minimumBalance', parseFloat(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.minimumBalance 
                          ? 'border-red-300 dark:border-red-600' 
                          : 'border-gray-300 dark:border-gray-600'
                        } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                      placeholder="100"
                      min="0"
                      step="0.01"
                    />
                    {errors.minimumBalance && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.minimumBalance}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-purple-800 dark:text-purple-200">
                      Governance Settings (Optional)
                    </h3>
                    <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                      Enable on-chain governance for your community. Members can create and vote on proposals.
                    </p>
                  </div>
                </div>
              </div>

              {/* Enable Governance */}
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.governanceSettings?.enableGovernance || false}
                    onChange={(e) => handleGovernanceChange('enableGovernance', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable on-chain governance
                  </span>
                </label>
              </div>

              {formData.governanceSettings?.enableGovernance && (
                <div className="space-y-4 pl-7">
                  {/* Voting Threshold */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Minimum Tokens Required to Create Proposals
                    </label>
                    <input
                      type="number"
                      value={formData.governanceSettings.votingThreshold}
                      onChange={(e) => handleGovernanceChange('votingThreshold', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      min="1"
                    />
                  </div>

                  {/* Proposal Delay */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Proposal Voting Period (hours)
                    </label>
                    <input
                      type="number"
                      value={formData.governanceSettings.proposalDelay}
                      onChange={(e) => handleGovernanceChange('proposalDelay', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      min="1"
                    />
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Community Summary
                </h3>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div><strong>Name:</strong> {formData.name}</div>
                  <div><strong>Category:</strong> {categories.find(c => c.value === formData.category)?.label}</div>
                  <div><strong>Privacy:</strong> {formData.isPrivate ? 'Private' : 'Public'}</div>
                  {formData.tokenRequirement && (
                    <div><strong>Token Requirement:</strong> {formData.tokenRequirement.minimumBalance} {formData.tokenRequirement.tokenSymbol}</div>
                  )}
                  {formData.governanceSettings?.enableGovernance && (
                    <div><strong>Governance:</strong> Enabled</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={currentStep === 1 ? onClose : handlePrevious}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 
                     transition-colors"
            disabled={isLoading}
          >
            {currentStep === 1 ? 'Cancel' : 'Previous'}
          </button>

          <div className="flex space-x-3">
            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg 
                         transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                disabled={isLoading}
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg 
                         transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating...' : 'Create Community'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CreateCommunityModal;