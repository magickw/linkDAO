import React, { useState } from 'react';
import { useNotificationPreferences } from '@/hooks/useNotifications';
import type { NotificationPreferences, CommunityNotificationPreferences } from '@/types/notifications';

interface NotificationPreferencesProps {
  onClose?: () => void;
}

export default function NotificationPreferences({ onClose }: NotificationPreferencesProps) {
  const { preferences, loading, updatePreferences } = useNotificationPreferences();
  const [localPreferences, setLocalPreferences] = useState<NotificationPreferences | null>(preferences);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences);
    }
  }, [preferences]);

  const handleSave = async () => {
    if (!localPreferences) return;
    
    setSaving(true);
    try {
      await updatePreferences(localPreferences);
      onClose?.();
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (
    category: keyof NotificationPreferences,
    value: boolean
  ) => {
    if (!localPreferences) return;
    
    setLocalPreferences({
      ...localPreferences,
      [category]: value
    });
  };

  const updateCommunityPreference = (
    communityId: string,
    type: keyof CommunityNotificationPreferences,
    value: boolean
  ) => {
    if (!localPreferences) return;
    
    setLocalPreferences({
      ...localPreferences,
      communityPreferences: {
        ...localPreferences.communityPreferences,
        [communityId]: {
          ...localPreferences.communityPreferences[communityId],
          [type]: value
        }
      }
    });
  };

  if (loading || !localPreferences) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Notification Preferences
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-8">
        {/* Email Notifications */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Email Notifications
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  Enable Email Notifications
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Receive notifications via email
                </p>
              </div>
              <input
                type="checkbox"
                checked={localPreferences.email}
                onChange={(e) => updatePreference('email', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </div>
            
            {localPreferences.email && (
              <>
                <div className="flex items-center justify-between pl-4">
                  <label className="text-sm text-gray-700 dark:text-gray-300">
                    Social notifications (follows, likes, comments)
                  </label>
                  <input
                    type="checkbox"
                    checked={localPreferences.follows}
                    onChange={(e) => updatePreference('follows', e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </div>
                <div className="flex items-center justify-between pl-4">
                  <label className="text-sm text-gray-700 dark:text-gray-300">
                    Community notifications
                  </label>
                  <input
                    type="checkbox"
                    checked={localPreferences.communityPosts}
                    onChange={(e) => updatePreference('communityPosts', e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </div>
                <div className="flex items-center justify-between pl-4">
                  <label className="text-sm text-gray-700 dark:text-gray-300">
                    Web3 notifications (tips, governance, transactions)
                  </label>
                  <input
                    type="checkbox"
                    checked={localPreferences.governanceProposals}
                    onChange={(e) => updatePreference('governanceProposals', e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Push Notifications */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Push Notifications
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  Enable Push Notifications
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Browser push notifications
                </p>
              </div>
              <input
                type="checkbox"
                checked={localPreferences.push}
                onChange={(e) => updatePreference('push', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </div>
            
            {localPreferences.push && (
              <>
                <div className="flex items-center justify-between pl-4">
                  <label className="text-sm text-gray-700 dark:text-gray-300">
                    Social notifications
                  </label>
                  <input
                    type="checkbox"
                    checked={localPreferences.likes}
                    onChange={(e) => updatePreference('likes', e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </div>
                <div className="flex items-center justify-between pl-4">
                  <label className="text-sm text-gray-700 dark:text-gray-300">
                    Community notifications
                  </label>
                  <input
                    type="checkbox"
                    checked={localPreferences.communityReplies}
                    onChange={(e) => updatePreference('communityReplies', e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </div>
                <div className="flex items-center justify-between pl-4">
                  <label className="text-sm text-gray-700 dark:text-gray-300">
                    Web3 notifications
                  </label>
                  <input
                    type="checkbox"
                    checked={localPreferences.governanceVotes}
                    onChange={(e) => updatePreference('governanceVotes', e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* In-App Notifications */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            In-App Notifications
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  Enable In-App Notifications
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Show notifications within the app
                </p>
              </div>
              <input
                type="checkbox"
                checked={localPreferences.inApp}
                onChange={(e) => updatePreference('inApp', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </div>
            
            {localPreferences.inApp && (
              <>
                <div className="flex items-center justify-between pl-4">
                  <label className="text-sm text-gray-700 dark:text-gray-300">
                    Social notifications
                  </label>
                  <input
                    type="checkbox"
                    checked={localPreferences.comments}
                    onChange={(e) => updatePreference('comments', e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </div>
                <div className="flex items-center justify-between pl-4">
                  <label className="text-sm text-gray-700 dark:text-gray-300">
                    Community notifications
                  </label>
                  <input
                    type="checkbox"
                    checked={localPreferences.communityMentions}
                    onChange={(e) => updatePreference('communityMentions', e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </div>
                <div className="flex items-center justify-between pl-4">
                  <label className="text-sm text-gray-700 dark:text-gray-300">
                    Web3 notifications
                  </label>
                  <input
                    type="checkbox"
                    checked={localPreferences.governanceResults}
                    onChange={(e) => updatePreference('governanceResults', e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Community-Specific Preferences */}
        {Object.keys(localPreferences.communityPreferences).length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Community-Specific Settings
            </h3>
            <div className="space-y-4">
              {Object.entries(localPreferences.communityPreferences).map(([communityId, settings]) => (
                <div key={communityId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3 capitalize">
                    {communityId.replace('-', ' ')}
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-700 dark:text-gray-300">
                        New posts
                      </label>
                      <input
                        type="checkbox"
                        checked={settings.newPosts}
                        onChange={(e) => updateCommunityPreference(communityId, 'newPosts', e.target.checked)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-700 dark:text-gray-300">
                        Comments on your posts
                      </label>
                      <input
                        type="checkbox"
                        checked={settings.replies}
                        onChange={(e) => updateCommunityPreference(communityId, 'replies', e.target.checked)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-700 dark:text-gray-300">
                        Mentions
                      </label>
                      <input
                        type="checkbox"
                        checked={settings.mentions}
                        onChange={(e) => updateCommunityPreference(communityId, 'mentions', e.target.checked)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-700 dark:text-gray-300">
                        Moderation actions
                      </label>
                      <input
                        type="checkbox"
                        checked={settings.moderation}
                        onChange={(e) => updateCommunityPreference(communityId, 'moderation', e.target.checked)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end space-x-3">
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}