/**
 * Settings Store
 * Manages user preferences and app settings
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Security Settings Types
export interface SecuritySettings {
  twoFactorEnabled: boolean;
  twoFactorMethod: 'totp' | 'email' | 'none';
  newDeviceAlerts: boolean;
  suspiciousActivityAlerts: boolean;
  largeTransactionAlerts: boolean;
  securityChangeAlerts: boolean;
  transactionThreshold: string;
}

// Privacy Settings Types
export interface PrivacySettings {
  publicProfile: boolean;
  showWalletBalance: boolean;
  hideTransactionHistory: boolean;
  anonymousMode: boolean;
  showOnlineStatus: boolean;
  allowDirectMessages: boolean;
}

// Email Preferences Types
export interface EmailPreferences {
  emailNotificationsEnabled: boolean;
  emailFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'off';
  digestTime: string;
  newDeviceAlerts: boolean;
  suspiciousActivityAlerts: boolean;
  largeTransactionAlerts: boolean;
  securityChangeAlerts: boolean;
}

// Profile Stats Types
export interface ProfileStats {
  posts: number;
  comments: number;
  followers: number;
  following: number;
}

interface SettingsState {
  // Notification settings
  notificationsEnabled: boolean;

  // Appearance settings
  darkMode: boolean;
  autoPlayVideos: boolean;
  theme: 'light' | 'dark' | 'system';

  // Privacy settings
  saveDataUsage: boolean;
  privacySettings: PrivacySettings;

  // Security settings
  biometricEnabled: boolean;
  securitySettings: SecuritySettings;

  // Email preferences
  emailPreferences: EmailPreferences;

  // Profile stats
  profileStats: ProfileStats;

  // Actions
  setNotificationsEnabled: (enabled: boolean) => void;
  setDarkMode: (enabled: boolean) => void;
  setAutoPlayVideos: (enabled: boolean) => void;
  setSaveDataUsage: (enabled: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setPrivacySettings: (settings: Partial<PrivacySettings>) => void;
  setSecuritySettings: (settings: Partial<SecuritySettings>) => void;
  setBiometricEnabled: (enabled: boolean) => void;
  setEmailPreferences: (preferences: Partial<EmailPreferences>) => void;
  setProfileStats: (stats: Partial<ProfileStats>) => void;

  // Reset all settings
  resetSettings: () => void;
}

const defaultPrivacySettings: PrivacySettings = {
  publicProfile: true,
  showWalletBalance: false,
  hideTransactionHistory: false,
  anonymousMode: false,
  showOnlineStatus: true,
  allowDirectMessages: true,
};

const defaultSecuritySettings: SecuritySettings = {
  twoFactorEnabled: false,
  twoFactorMethod: 'none',
  newDeviceAlerts: true,
  suspiciousActivityAlerts: true,
  largeTransactionAlerts: false,
  securityChangeAlerts: true,
  transactionThreshold: '1000.00',
};

const defaultEmailPreferences: EmailPreferences = {
  emailNotificationsEnabled: true,
  emailFrequency: 'immediate',
  digestTime: '09:00',
  newDeviceAlerts: true,
  suspiciousActivityAlerts: true,
  largeTransactionAlerts: false,
  securityChangeAlerts: true,
};

const defaultProfileStats: ProfileStats = {
  posts: 0,
  comments: 0,
  followers: 0,
  following: 0,
};

const defaultSettings = {
  notificationsEnabled: true,
  darkMode: false,
  autoPlayVideos: true,
  saveDataUsage: false,
  theme: 'system' as const,
  privacySettings: defaultPrivacySettings,
  securitySettings: defaultSecuritySettings,
  biometricEnabled: false,
  emailPreferences: defaultEmailPreferences,
  profileStats: defaultProfileStats,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setNotificationsEnabled: (enabled: boolean) =>
        set({ notificationsEnabled: enabled }),

      setDarkMode: (enabled: boolean) =>
        set({ darkMode: enabled }),

      setAutoPlayVideos: (enabled: boolean) =>
        set({ autoPlayVideos: enabled }),

      setSaveDataUsage: (enabled: boolean) =>
        set({ saveDataUsage: enabled }),

      setTheme: (theme: 'light' | 'dark' | 'system') =>
        set({ theme }),

      setPrivacySettings: (settings: Partial<PrivacySettings>) =>
        set((state) => ({
          privacySettings: { ...state.privacySettings, ...settings },
        })),

      setSecuritySettings: (settings: Partial<SecuritySettings>) =>
        set((state) => ({
          securitySettings: { ...state.securitySettings, ...settings },
        })),

      setBiometricEnabled: (enabled: boolean) =>
        set({ biometricEnabled: enabled }),

      setEmailPreferences: (preferences: Partial<EmailPreferences>) =>
        set((state) => ({
          emailPreferences: { ...state.emailPreferences, ...preferences },
        })),

      setProfileStats: (stats: Partial<ProfileStats>) =>
        set((state) => ({
          profileStats: { ...state.profileStats, ...stats },
        })),

      resetSettings: () =>
        set(defaultSettings),
    }),
    {
      name: 'linkdao-settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
