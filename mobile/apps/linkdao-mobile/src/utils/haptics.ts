import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptic Feedback Utility
 * Provides a standardized way to trigger haptic feedback across the app
 */
export const hapticFeedback = {
  /**
   * Light impact - for standard button presses or small interactions
   */
  light: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.warn('Haptics not available', e);
    }
  },

  /**
   * Medium impact - for toggle changes or more significant interactions
   */
  medium: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.warn('Haptics not available', e);
    }
  },

  /**
   * Heavy impact - for deletions or critical actions
   */
  heavy: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {
      console.warn('Haptics not available', e);
    }
  },

  /**
   * Success notification - for completed transactions or successful saves
   */
  success: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.warn('Haptics not available', e);
    }
  },

  /**
   * Warning notification - for warnings or non-critical issues
   */
  warning: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {
      console.warn('Haptics not available', e);
    }
  },

  /**
   * Error notification - for failed transactions or critical errors
   */
  error: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (e) {
      console.warn('Haptics not available', e);
    }
  },

  /**
   * Selection change - for scrolling through lists or picker changes
   */
  selection: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.selectionAsync();
    } catch (e) {
      console.warn('Haptics not available', e);
    }
  }
};

export default hapticFeedback;
