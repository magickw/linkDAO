/**
 * Notification Permission Manager
 * Handles browser notification permissions and preferences
 */

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, X, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationPreferences {
  enabled: boolean;
  newMessages: boolean;
  mentions: boolean;
  reactions: boolean;
  channelUpdates: boolean;
  soundEnabled: boolean;
  desktopNotifications: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

interface NotificationPermissionProps {
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
  onPreferencesChanged?: (prefs: NotificationPreferences) => void;
}

export const NotificationPermissionBanner: React.FC<NotificationPermissionProps> = ({
  onPermissionGranted,
  onPermissionDenied
}) => {
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [showBanner, setShowBanner] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = () => {
    if ('Notification' in window) {
      const permission = Notification.permission;
      setPermissionState(permission);

      // Show banner if permission not yet decided
      const dismissed = localStorage.getItem('notification-banner-dismissed');
      setShowBanner(permission === 'default' && !dismissed);
    }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      console.error('This browser does not support notifications');
      return;
    }

    setRequesting(true);
    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);

      if (permission === 'granted') {
        onPermissionGranted?.();
        // Show test notification
        new Notification('Notifications Enabled!', {
          body: 'You will now receive message notifications',
          icon: '/logo.png',
          badge: '/badge.png'
        });
      } else {
        onPermissionDenied?.();
      }

      setShowBanner(false);
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setRequesting(false);
    }
  };

  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('notification-banner-dismissed', 'true');
  };

  if (!showBanner || permissionState !== 'default') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-lg shadow-lg"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <Bell size={24} className="mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-1">Enable Notifications</h3>
              <p className="text-sm text-white/90">
                Stay updated with real-time message notifications. You can customize your preferences anytime.
              </p>
              <div className="flex items-center space-x-2 mt-3">
                <button
                  onClick={requestPermission}
                  disabled={requesting}
                  className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {requesting ? 'Requesting...' : 'Enable Notifications'}
                </button>
                <button
                  onClick={dismissBanner}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={dismissBanner}
            className="ml-4 text-white/70 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <X size={20} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const NotificationSettings: React.FC<NotificationPermissionProps> = ({
  onPreferencesChanged
}) => {
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: true,
    newMessages: true,
    mentions: true,
    reactions: false,
    channelUpdates: true,
    soundEnabled: true,
    desktopNotifications: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00'
  });

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionState(Notification.permission);
    }

    // Load saved preferences
    const saved = localStorage.getItem('notification-preferences');
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load notification preferences:', error);
      }
    }
  }, []);

  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    localStorage.setItem('notification-preferences', JSON.stringify(updated));
    onPreferencesChanged?.(updated);
  };

  const requestPermissionAgain = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <Bell size={20} className="mr-2" />
        Notification Settings
      </h3>

      {/* Permission Status */}
      {permissionState === 'denied' && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 rounded-lg mb-4 flex items-start space-x-2">
          <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Notifications Blocked</p>
            <p className="text-sm mt-1">
              Notifications are blocked in your browser. Please enable them in your browser settings.
            </p>
          </div>
        </div>
      )}

      {permissionState === 'default' && (
        <div className="bg-blue-500/20 border border-blue-500/50 text-blue-400 p-3 rounded-lg mb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2">
              <Bell size={20} className="mt-0.5" />
              <div>
                <p className="font-medium">Enable Notifications</p>
                <p className="text-sm mt-1">Get notified about new messages and mentions</p>
              </div>
            </div>
            <button
              onClick={requestPermissionAgain}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
            >
              Enable
            </button>
          </div>
        </div>
      )}

      {permissionState === 'granted' && (
        <div className="bg-green-500/20 border border-green-500/50 text-green-400 p-3 rounded-lg mb-4 flex items-center space-x-2">
          <Check size={20} />
          <span className="font-medium">Notifications Enabled</span>
        </div>
      )}

      {/* Notification Preferences */}
      <div className="space-y-4">
        {/* Master Toggle */}
        <div className="flex items-center justify-between py-2 border-b border-gray-700">
          <div>
            <label className="text-white font-medium">Enable Notifications</label>
            <p className="text-sm text-gray-400">Master switch for all notifications</p>
          </div>
          <ToggleSwitch
            checked={preferences.enabled}
            onChange={(checked) => updatePreference('enabled', checked)}
            disabled={permissionState !== 'granted'}
          />
        </div>

        {/* Individual Settings */}
        <div className="space-y-3">
          <ToggleSetting
            label="New Messages"
            description="Get notified when you receive a direct message"
            checked={preferences.newMessages}
            onChange={(checked) => updatePreference('newMessages', checked)}
            disabled={!preferences.enabled || permissionState !== 'granted'}
          />

          <ToggleSetting
            label="Mentions"
            description="Get notified when someone @mentions you"
            checked={preferences.mentions}
            onChange={(checked) => updatePreference('mentions', checked)}
            disabled={!preferences.enabled || permissionState !== 'granted'}
          />

          <ToggleSetting
            label="Reactions"
            description="Get notified when someone reacts to your message"
            checked={preferences.reactions}
            onChange={(checked) => updatePreference('reactions', checked)}
            disabled={!preferences.enabled || permissionState !== 'granted'}
          />

          <ToggleSetting
            label="Channel Updates"
            description="Get notified about important channel announcements"
            checked={preferences.channelUpdates}
            onChange={(checked) => updatePreference('channelUpdates', checked)}
            disabled={!preferences.enabled || permissionState !== 'granted'}
          />

          <ToggleSetting
            label="Sound"
            description="Play a sound when receiving notifications"
            checked={preferences.soundEnabled}
            onChange={(checked) => updatePreference('soundEnabled', checked)}
            disabled={!preferences.enabled || permissionState !== 'granted'}
          />

          {/* Quiet Hours */}
          <div className="pt-3 border-t border-gray-700">
            <ToggleSetting
              label="Quiet Hours"
              description="Mute notifications during specific hours"
              checked={preferences.quietHoursEnabled}
              onChange={(checked) => updatePreference('quietHoursEnabled', checked)}
              disabled={!preferences.enabled || permissionState !== 'granted'}
            />

            {preferences.quietHoursEnabled && (
              <div className="mt-3 ml-6 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Start Time</label>
                  <input
                    type="time"
                    value={preferences.quietHoursStart}
                    onChange={(e) => updatePreference('quietHoursStart', e.target.value)}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">End Time</label>
                  <input
                    type="time"
                    value={preferences.quietHoursEnd}
                    onChange={(e) => updatePreference('quietHoursEnd', e.target.value)}
                    className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, disabled }) => {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-blue-600' : 'bg-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
};

interface ToggleSettingProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const ToggleSetting: React.FC<ToggleSettingProps> = ({
  label,
  description,
  checked,
  onChange,
  disabled
}) => {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1">
        <label className={`text-sm font-medium ${disabled ? 'text-gray-500' : 'text-white'}`}>
          {label}
        </label>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
};

export default {
  NotificationPermissionBanner,
  NotificationSettings
};
