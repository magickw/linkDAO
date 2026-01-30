/**
 * NotificationPreferences Component
 * Settings panel for notification preferences and filtering
 * Implements requirements 6.4, 6.5 from the interconnected social platform spec
 */

import React, { useState } from 'react';
import { NotificationPreferences as NotificationPreferencesType } from '../../types/notifications';

interface NotificationPreferencesProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: NotificationPreferencesType;
  onUpdate: (preferences: NotificationPreferencesType) => void;
}

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  isOpen,
  onClose,
  preferences,
  onUpdate
}) => {
  const [localPreferences, setLocalPreferences] = useState<NotificationPreferencesType>(preferences);
  const [hasChanges, setHasChanges] = useState(false);

  const handlePreferenceChange = (path: string[], value: any) => {
    const newPreferences = { ...localPreferences };
    let current: any = newPreferences;

    // Navigate to the nested property
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }

    // Set the value
    current[path[path.length - 1]] = value;

    setLocalPreferences(newPreferences);
    setHasChanges(true);
  };

  const handleSave = () => {
    onUpdate(localPreferences);
    setHasChanges(false);
    onClose();
  };

  const handleReset = () => {
    setLocalPreferences(preferences);
    setHasChanges(false);
  };

  const categoryLabels = {
    direct_message: 'Direct Messages',
    post_reaction: 'Post Reactions',
    comment_mention: 'Mentions',
    community_invite: 'Community Invites',
    governance_proposal: 'Governance Proposals',
    system_alert: 'System Alerts',
    social_interaction: 'Social Interactions',
    financial: 'Financial',
    marketplace: 'Marketplace (Orders)'
  };

  const categoryDescriptions = {
    direct_message: 'New messages in your conversations',
    post_reaction: 'Likes, tips, and other reactions to your posts',
    comment_mention: 'When someone mentions you in a comment',
    community_invite: 'Invitations to join communities',
    governance_proposal: 'New proposals and voting reminders',
    system_alert: 'Important system updates and security alerts',
    social_interaction: 'Likes, replies, bookmarks, and new comments',
    financial: 'Tips and awards',
    marketplace: 'Order updates, sales, and shipping notifications'
  };

  // Enhanced preference options
  const advancedPreferenceOptions = {
    aggregation: {
      enabled: true,
      delay: 3000, // milliseconds
      minCount: 2
    },
    deduplication: {
      enabled: true,
      timeWindow: 5000, // milliseconds
      smartMatching: true
    },
    frequencyControl: {
      typingEvents: 3, // per second
      messageEvents: 10, // per second
      reactionEvents: 5 // per second
    },
    quietHours: {
      urgentOnly: true,
      customSchedule: false,
      schedule: [] as { day: string; start: string; end: string }[]
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Notification Preferences
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

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Global Settings */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Global Settings
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Push Notifications
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Send notifications to your device
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localPreferences.enablePush}
                    onChange={(e) => handlePreferenceChange(['enablePush'], e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sound Notifications
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Play sounds for notifications
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localPreferences.enableSound}
                    onChange={(e) => handlePreferenceChange(['enableSound'], e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Desktop Notifications
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Show browser notifications
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localPreferences.enableDesktop}
                    onChange={(e) => handlePreferenceChange(['enableDesktop'], e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Category Settings */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Notification Categories
            </h3>

            <div className="space-y-6">
              {Object.entries(localPreferences.categories).map(([category, settings]) => (
                <div key={category} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {categoryLabels[category as keyof typeof categoryLabels]}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {categoryDescriptions[category as keyof typeof categoryDescriptions]}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(settings as any).enabled}
                        onChange={(e) => handlePreferenceChange(['categories', category, 'enabled'], e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {(settings as any).enabled && (
                    <div className="grid grid-cols-2 gap-4 ml-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`${category}-push`}
                          checked={(settings as any).push}
                          onChange={(e) => handlePreferenceChange(['categories', category, 'push'], e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <label htmlFor={`${category}-push`} className="text-xs text-gray-700 dark:text-gray-300">
                          Push notifications
                        </label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`${category}-sound`}
                          checked={(settings as any).sound}
                          onChange={(e) => handlePreferenceChange(['categories', category, 'sound'], e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <label htmlFor={`${category}-sound`} className="text-xs text-gray-700 dark:text-gray-300">
                          Sound alerts
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Quiet Hours
            </h3>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable Quiet Hours
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Reduce notifications during specified hours (urgent notifications will still show)
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localPreferences.quietHours.enabled}
                    onChange={(e) => handlePreferenceChange(['quietHours', 'enabled'], e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {localPreferences.quietHours.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={localPreferences.quietHours.startTime}
                      onChange={(e) => handlePreferenceChange(['quietHours', 'startTime'], e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={localPreferences.quietHours.endTime}
                      onChange={(e) => handlePreferenceChange(['quietHours', 'endTime'], e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Advanced Settings
            </h3>

            <div className="space-y-6">
              {/* Notification Aggregation */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Notification Aggregation
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Group similar notifications together to reduce clutter
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-700 dark:text-gray-300">Enable aggregation</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={advancedPreferenceOptions.aggregation.enabled}
                        onChange={(e) => {
                          const newOptions = {...advancedPreferenceOptions};
                          newOptions.aggregation.enabled = e.target.checked;
                          // In a real implementation, this would be saved to state
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Aggregation delay (seconds)
                    </label>
                    <select 
                      value={advancedPreferenceOptions.aggregation.delay / 1000}
                      onChange={(e) => {
                        const newOptions = {...advancedPreferenceOptions};
                        newOptions.aggregation.delay = parseInt(e.target.value) * 1000;
                        // In a real implementation, this would be saved to state
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                    >
                      <option value="1">1 second</option>
                      <option value="2">2 seconds</option>
                      <option value="3">3 seconds</option>
                      <option value="5">5 seconds</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Deduplication Settings */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Deduplication
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Prevent duplicate notifications within a time window
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-700 dark:text-gray-300">Enable deduplication</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={advancedPreferenceOptions.deduplication.enabled}
                        onChange={(e) => {
                          const newOptions = {...advancedPreferenceOptions};
                          newOptions.deduplication.enabled = e.target.checked;
                          // In a real implementation, this would be saved to state
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Time window (seconds)
                    </label>
                    <select 
                      value={advancedPreferenceOptions.deduplication.timeWindow / 1000}
                      onChange={(e) => {
                        const newOptions = {...advancedPreferenceOptions};
                        newOptions.deduplication.timeWindow = parseInt(e.target.value) * 1000;
                        // In a real implementation, this would be saved to state
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                    >
                      <option value="2">2 seconds</option>
                      <option value="5">5 seconds</option>
                      <option value="10">10 seconds</option>
                      <option value="30">30 seconds</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Frequency Control */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Frequency Control
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Limit high-frequency notification events
                </p>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Typing events per second
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={advancedPreferenceOptions.frequencyControl.typingEvents}
                      onChange={(e) => {
                        const newOptions = {...advancedPreferenceOptions};
                        newOptions.frequencyControl.typingEvents = parseInt(e.target.value);
                        // In a real implementation, this would be saved to state
                      }}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {advancedPreferenceOptions.frequencyControl.typingEvents} events/sec
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Message events per second
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={advancedPreferenceOptions.frequencyControl.messageEvents}
                      onChange={(e) => {
                        const newOptions = {...advancedPreferenceOptions};
                        newOptions.frequencyControl.messageEvents = parseInt(e.target.value);
                        // In a real implementation, this would be saved to state
                      }}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {advancedPreferenceOptions.frequencyControl.messageEvents} events/sec
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset Changes
          </button>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferences;