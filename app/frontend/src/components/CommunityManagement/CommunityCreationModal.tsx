import React, { useState } from 'react';
import { CreateCommunityInput, PostType, StakingRequirement } from '@/models/Community';
import { CommunityService } from '@/services/communityService';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';

interface CommunityCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (community: any) => void;
}

const CATEGORIES = [
  'Technology', 'Gaming', 'Art', 'Music', 'Sports', 'Education', 
  'Business', 'Science', 'Politics', 'Entertainment', 'Lifestyle', 'Other'
];

const DEFAULT_POST_TYPES: PostType[] = [
  { id: 'text', name: 'Text Post', description: 'Standard text-based posts', enabled: true },
  { id: 'image', name: 'Image Post', description: 'Posts with images', enabled: true },
  { id: 'link', name: 'Link Post', description: 'Posts with external links', enabled: true },
  { id: 'poll', name: 'Poll', description: 'Community polls and voting', enabled: false },
  { id: 'nft', name: 'NFT Showcase', description: 'NFT display posts', enabled: true },
  { id: 'defi', name: 'DeFi Discussion', description: 'DeFi protocol discussions', enabled: false }
];

export default function CommunityCreationModal({ isOpen, onClose, onSuccess }: CommunityCreationModalProps) {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState<CreateCommunityInput>({
    name: '',
    displayName: '',
    description: '',
    category: 'Technology',
    tags: [],
    isPublic: true,
    rules: ['Be respectful to other members', 'No spam or self-promotion', 'Stay on topic'],
    settings: {
      allowedPostTypes: DEFAULT_POST_TYPES,
      requireApproval: false,
      minimumReputation: 0,
      stakingRequirements: []
    },
    slug: ''
  });
  
  const [currentTag, setCurrentTag] = useState('');
  const [currentRule, setCurrentRule] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleInputChange = (field: keyof CreateCommunityInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSettingsChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: { ...prev.settings, [field]: value }
    }));
  };

  const addTag = () => {
    if (currentTag.trim() && !formData.tags?.includes(currentTag.trim())) {
      const newTags = [...(formData.tags || []), currentTag.trim()];
      handleInputChange('tags', newTags);
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = formData.tags?.filter(tag => tag !== tagToRemove) || [];
    handleInputChange('tags', newTags);
  };

  const addRule = () => {
    if (currentRule.trim()) {
      const newRules = [...(formData.rules || []), currentRule.trim()];
      handleInputChange('rules', newRules);
      setCurrentRule('');
    }
  };

  const removeRule = (index: number) => {
    const newRules = formData.rules?.filter((_, i) => i !== index) || [];
    handleInputChange('rules', newRules);
  };

  const togglePostType = (postTypeId: string) => {
    const updatedPostTypes = formData.settings?.allowedPostTypes?.map(pt => 
      pt.id === postTypeId ? { ...pt, enabled: !pt.enabled } : pt
    ) || [];
    handleSettingsChange('allowedPostTypes', updatedPostTypes);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      addToast('Community name is required', 'error');
      return false;
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(formData.name)) {
      addToast('Community name can only contain letters, numbers, underscores, and hyphens', 'error');
      return false;
    }
    
    if (!formData.displayName.trim()) {
      addToast('Display name is required', 'error');
      return false;
    }
    
    if (!formData.description.trim()) {
      addToast('Description is required', 'error');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet', 'error');
      return;
    }

    if (!validateForm()) return;

    try {
      setLoading(true);
      const community = await CommunityService.createCommunity(formData);
      addToast('Community created successfully!', 'success');
      onSuccess(community);
      onClose();
      
      // Reset form
      setFormData({
        name: '',
        displayName: '',
        description: '',
        category: 'Technology',
        tags: [],
        isPublic: true,
        rules: ['Be respectful to other members', 'No spam or self-promotion', 'Stay on topic'],
        settings: {
          allowedPostTypes: DEFAULT_POST_TYPES,
          requireApproval: false,
          minimumReputation: 0,
          stakingRequirements: []
        },
        slug: ''
      });
      setStep(1);
    } catch (error) {
      console.error('Error creating community:', error);
      addToast(error instanceof Error ? error.message : 'Failed to create community', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Create Community
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= stepNum 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div className={`w-12 h-1 mx-2 ${
                    step > stepNum ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {step === 1 && 'Basic Information'}
            {step === 2 && 'Rules & Guidelines'}
            {step === 3 && 'Settings & Permissions'}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Community Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., web3gaming"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  This will be your community's unique identifier (r/{formData.name})
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  placeholder="e.g., Web3 Gaming Community"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe what your community is about..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tags
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add a tag..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                  className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="isPublic" className="flex-1">
                  <div className="block text-sm font-medium text-gray-900 dark:text-white">
                    Public Community (Recommended)
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {formData.isPublic
                      ? '✓ Your community will be visible on the communities page and anyone can join'
                      : '⚠️ WARNING: Your community will be private and won\'t appear in public listings'}
                  </p>
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Community Rules
                </label>
                <div className="space-y-2 mb-4">
                  {formData.rules?.map((rule, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                        {index + 1}. {rule}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeRule(index)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={currentRule}
                    onChange={(e) => setCurrentRule(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRule())}
                    placeholder="Add a community rule..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={addRule}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    Add Rule
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Allowed Post Types
                </label>
                <div className="space-y-2">
                  {formData.settings?.allowedPostTypes?.map((postType) => (
                    <div key={postType.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{postType.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{postType.description}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => togglePostType(postType.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          postType.enabled ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            postType.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Require Approval</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Posts need moderator approval before being visible</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSettingsChange('requireApproval', !formData.settings?.requireApproval)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.settings?.requireApproval ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.settings?.requireApproval ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Minimum Reputation to Post
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.settings?.minimumReputation || 0}
                  onChange={(e) => handleSettingsChange('minimumReputation', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Users need this much reputation to create posts (0 = no requirement)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                Previous
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Community'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}