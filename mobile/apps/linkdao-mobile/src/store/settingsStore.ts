/**
 * Settings Store
 * Manages user preferences and app settings
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
    // Notification settings
    notificationsEnabled: boolean;

    // Appearance settings
    darkMode: boolean;
    autoPlayVideos: boolean;

    // Privacy settings
    saveDataUsage: boolean;

    // Actions
    setNotificationsEnabled: (enabled: boolean) => void;
    setDarkMode: (enabled: boolean) => void;
    setAutoPlayVideos: (enabled: boolean) => void;
    setSaveDataUsage: (enabled: boolean) => void;

    // Reset all settings
    resetSettings: () => void;
}

const defaultSettings = {
    notificationsEnabled: true,
    darkMode: false,
    autoPlayVideos: true,
    saveDataUsage: false,
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

            resetSettings: () =>
                set(defaultSettings),
        }),
        {
            name: 'linkdao-settings-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
