import React, { useState, useEffect } from 'react';
import { Community, UpdateCommunityInput, PostType } from '@/models/Community';
import { CommunityService } from '@/services/communityService';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import { unifiedImageService } from '@/services/unifiedImageService';

interface CommunitySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  community: Community;
  onUpdate: (updatedCommunity: Community) => void;
}

const CATEGORIES = [
  'Technology', 'Gaming', 'Art', 'Music', 'Sports', 'Education',
  'Business', 'Science', 'Politics', 'Entertainment', 'Lifestyle', 'Other'
];

export default function CommunitySettingsModal({
  isOpen,
  onClose,
  community,
  onUpdate
}: CommunitySettingsModalProps) {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();

  const [formData, setFormData] = useState<UpdateCommunityInput>({});
  const [currentTag, setCurrentTag] = useState('');
  const [currentRule, setCurrentRule] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'rules' | 'permissions' | 'moderation'>('general');

  // Initialize form data when community changes
  useEffect(() => {
    if (community) {
      setFormData({
        displayName: community.displayName,
        description: community.description,
        category: community.category,
        tags: [...community.tags],
        isPublic: community.isPublic,
        rules: [...community.rules],
        avatar: community.avatar,
        banner: community.banner,
        treasuryAddress: community.treasuryAddress,
        governanceToken: community.governanceToken,
        settings: {
          ...community.settings,
          allowedPostTypes: [...community.settings.allowedPostTypes]
        }
      });
    }
  }, [community]);

  // Check if user is moderator or admin (case-insensitive)
  const canModerate = isConnected && address && community.moderators.some(
    mod => mod.toLowerCase() === address.toLowerCase()
  );

  const handleInputChange = (field: keyof UpdateCommunityInput, value: any) => {
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      const result = await unifiedImageService.uploadImage(file, 'profile');
      handleInputChange('avatar', result.cdnUrl);
      addToast('Avatar uploaded successfully!', 'success');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      addToast(error instanceof Error ? error.message : 'Failed to upload avatar', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingBanner(true);
      const result = await unifiedImageService.uploadImage(file, 'cover');
      handleInputChange('banner', result.cdnUrl);
      addToast('Banner uploaded successfully!', 'success');
    } catch (error) {
      console.error('Error uploading banner:', error);
      addToast(error instanceof Error ? error.message : 'Failed to upload banner', 'error');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSubmit = async () => {
    if (!canModerate) {
      addToast('You do not have permission to modify this community', 'error');
      return;
    }

    try {
      setLoading(true);
      const updatedCommunity = await CommunityService.updateCommunity(community.id, formData);
      addToast('Community settings updated successfully!', 'success');
      onUpdate(updatedCommunity);
      onClose();
    } catch (error) {
      console.error('Error updating community:', error);
      addToast(error instanceof Error ? error.message : 'Failed to update community', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (!canModerate) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 mb-4">
              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Access Denied
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              You need moderator permissions to access community settings.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Community Settings - dao/{community.name}
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

        <div className="flex h-[calc(90vh-140px)]">
          {/* Sidebar Navigation */}
          <div className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4">
            <nav className="space-y-2">
              {[
                { id: 'general', label: 'General', icon: '⚙️' },
                { id: 'rules', label: 'Rules & Guidelines', icon: '📋' },
                { id: 'permissions', label: 'Permissions', icon: '🔒' },
                { id: 'moderation', label: 'Moderation', icon: '🛡️' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors ${activeTab === tab.id
                    ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                >
                  <span>{tab.icon}</span>
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Basic Information
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={formData.displayName || ''}
                        onChange={(e) => handleInputChange('displayName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        URL Slug
                      </label>
                      <input
                        type="text"
                        value={formData.slug || community?.slug || ''}
                        onChange={(e) => handleInputChange('slug', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Only lowercase letters, numbers, and hyphens allowed
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Current URL: /communities/{formData.slug || community?.slug}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description
                      </label>
                      <textarea
                        value={formData.description || ''}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Category
                      </label>
                      <select
                        value={formData.category || ''}
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

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isPublic"
                        checked={formData.isPublic ?? true}
                        onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        Public community (anyone can join)
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Community Avatar
                      </label>
                      <div className="flex items-center space-x-4">
                        {formData.avatar && (
                          <div className="flex-shrink-0">
                            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-3xl">
                              {formData.avatar.startsWith('http') ? (
                                <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                <span>{formData.avatar}</span>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex space-x-2">
                            <label className="cursor-pointer px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 inline-flex items-center">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                                disabled={uploadingAvatar}
                                className="hidden"
                              />
                              {uploadingAvatar ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Uploading...
                                </>
                              ) : (
                                'Upload Image'
                              )}
                            </label>
                            <input
                              type="text"
                              value={formData.avatar || ''}
                              onChange={(e) => handleInputChange('avatar', e.target.value)}
                              placeholder="Or paste emoji/URL"
                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Upload an image or use an emoji
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Community Banner
                      </label>
                      <div className="space-y-3">
                        {formData.banner && (
                          <div className="w-full h-32 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                            <img src={formData.banner} alt="Banner" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex space-x-2">
                          <label className="cursor-pointer px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 inline-flex items-center">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleBannerUpload}
                              disabled={uploadingBanner}
                              className="hidden"
                            />
                            {uploadingBanner ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Uploading...
                              </>
                            ) : (
                              'Upload Banner'
                            )}
                          </label>
                          <input
                            type="text"
                            value={formData.banner || ''}
                            onChange={(e) => handleInputChange('banner', e.target.value)}
                            placeholder="Or paste image URL"
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Recommended size: 1200x400px
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'rules' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Community Rules
                  </h3>

                  <div className="space-y-2 mb-4">
                    {formData.rules?.map((rule, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 rounded-full flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </span>
                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                          {rule}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeRule(index)}
                          className="flex-shrink-0 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
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

            {activeTab === 'permissions' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Post Permissions
                  </h3>

                  <div className="space-y-3">
                    {formData.settings?.allowedPostTypes?.map((postType) => (
                      <div key={postType.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{postType.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{postType.description}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => togglePostType(postType.id)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${postType.enabled ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'
                            }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${postType.enabled ? 'translate-x-6' : 'translate-x-1'
                              }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Posting Requirements
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Require Approval</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Posts need moderator approval before being visible</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSettingsChange('requireApproval', !formData.settings?.requireApproval)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.settings?.requireApproval ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'
                          }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.settings?.requireApproval ? 'translate-x-6' : 'translate-x-1'
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
                </div>
              </div>
            )}

            {activeTab === 'moderation' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Moderation Tools
                  </h3>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                          Advanced Moderation Features Coming Soon
                        </h3>
                        <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                          <p>Advanced moderation tools including automated content filtering, user management, and detailed analytics will be available in a future update.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Current Moderators</h4>
                      <div className="space-y-2">
                        {community.moderators.map((moderator) => (
                          <div key={moderator} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                            <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                              {moderator.slice(0, 6)}...{moderator.slice(-4)}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Moderator</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}