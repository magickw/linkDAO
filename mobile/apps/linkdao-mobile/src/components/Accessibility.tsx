/**
 * Accessibility Helper Functions and Components
 * Provides utilities for improving screen reader support and accessibility
 */

import React, { memo } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, AccessibilityInfo, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Accessibility Roles
 */
export const AccessibilityRoles = {
  BUTTON: 'button',
  LINK: 'link',
  HEADER: 'header',
  TEXT: 'text',
  IMAGE: 'image',
  ADJUSTABLE: 'adjustable',
  ALERT: 'alert',
  SUMMARY: 'summary',
  NONE: 'none',
} as const;

/**
 * Accessibility States
 */
export const AccessibilityStates = {
  SELECTED: 'selected',
  DISABLED: 'disabled',
  BUSY: 'busy',
  CHECKED: 'checked',
  UNCHECKED: 'unchecked',
  EXPANDED: 'expanded',
  COLLAPSED: 'collapsed',
} as const;

/**
 * Check if screen reader is enabled
 */
export async function isScreenReaderEnabled(): Promise<boolean> {
  try {
    return await AccessibilityInfo.isScreenReaderEnabled();
  } catch (error) {
    console.error('Error checking screen reader status:', error);
    return false;
  }
}

/**
 * Add screen reader change listener
 */
export function addScreenReaderChangeListener(callback: (enabled: boolean) => void): () => void {
  const subscription = AccessibilityInfo.addEventListener(
    'screenReaderChanged',
    callback
  );

  return () => {
    if (subscription && subscription.remove) {
      subscription.remove();
    }
  };
}

/**
 * Generate accessible label for numeric values
 */
export function formatNumberForAccessibility(value: number, context?: string): string {
  if (context) {
    return `${value} ${context}`;
  }
  return value.toString();
}

/**
 * Generate accessible label for dates
 */
export function formatDateForAccessibility(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  };

  return date.toLocaleDateString(undefined, options);
}

/**
 * Accessible Button Component
 */
export const AccessibleButton = memo(({
  children,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  onPress,
  disabled = false,
  style,
  ...props
}: any) => {
  return (
    <TouchableOpacity
      style={style}
      onPress={onPress}
      disabled={disabled}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole || AccessibilityRoles.BUTTON}
      accessibilityState={{ disabled }}
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
});

/**
 * Accessible Text Component
 */
export const AccessibleText = memo(({
  children,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  style,
  ...props
}: any) => {
  return (
    <Text
      style={style}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole || AccessibilityRoles.TEXT}
      {...props}
    >
      {children}
    </Text>
  );
});

/**
 * Accessible Icon Component
 */
export const AccessibleIcon = memo(({
  name,
  size,
  color,
  accessibilityLabel,
  style,
  ...props
}: any) => {
  return (
    <Ionicons
      name={name}
      size={size}
      color={color}
      style={style}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={AccessibilityRoles.IMAGE}
      {...props}
    />
  );
});

/**
 * Accessible Input Component
 */
export const AccessibleInput = memo(({
  accessibilityLabel,
  accessibilityHint,
  placeholder,
  onChangeText,
  value,
  keyboardType,
  secureTextEntry = false,
  style,
  ...props
}: any) => {
  return (
    <TextInput
      style={style}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={AccessibilityRoles.TEXT}
      accessibilityState={secureTextEntry ? { checked: true } : undefined}
      {...props}
    />
  );
});

/**
 * Accessible Card Component
 */
export const AccessibleCard = memo(({
  children,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  onPress,
  style,
  ...props
}: any) => {
  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      style={style}
      onPress={onPress}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
      {...props}
    >
      {children}
    </Component>
  );
});

/**
 * Accessible Header Component
 */
export const AccessibleHeader = memo(({
  children,
  level = 1,
  accessibilityLabel,
  style,
  ...props
}: any) => {
  return (
    <Text
      style={style}
      accessible={true}
      accessibilityRole={AccessibilityRoles.HEADER}
      accessibilityLabel={accessibilityLabel}
      accessibilityLevel={level}
      {...props}
    >
      {children}
    </Text>
  );
});

/**
 * Accessible Image Component
 */
export const AccessibleImage = memo(({
  source,
  accessibilityLabel,
  accessibilityHint,
  style,
  ...props
}: any) => {
  return (
    <View
      style={style}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={AccessibilityRoles.IMAGE}
      {...props}
    >
      {/* Image component would go here */}
    </View>
  );
});

/**
 * Accessible Switch/Toggle Component
 */
export const AccessibleSwitch = memo(({
  value,
  onValueChange,
  accessibilityLabel,
  accessibilityHint,
  style,
  ...props
}: any) => {
  return (
    <TouchableOpacity
      style={style}
      onPress={() => onValueChange(!value)}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={AccessibilityRoles.BUTTON}
      accessibilityState={{
        checked: value,
      }}
      {...props}
    >
      <View
        style={[
          styles.switchTrack,
          value && styles.switchTrackOn,
        ]}
      >
        <View
          style={[
            styles.switchThumb,
            value && styles.switchThumbOn,
          ]}
        />
      </View>
    </TouchableOpacity>
  );
});

/**
 * Accessible Tab Component
 */
export const AccessibleTab = memo(({
  selected = false,
  label,
  icon,
  onPress,
  style,
  ...props
}: any) => {
  return (
    <TouchableOpacity
      style={style}
      onPress={onPress}
      accessible={true}
      accessibilityLabel={label}
      accessibilityHint={selected ? 'Selected tab' : 'Double tap to select'}
      accessibilityRole={AccessibilityRoles.BUTTON}
      accessibilityState={{ selected }}
      {...props}
    >
      {icon && (
        <AccessibleIcon
          name={icon}
          size={24}
          color={selected ? '#3b82f6' : '#6b7280'}
          accessibilityLabel={`${label} icon`}
        />
      )}
      <AccessibleText
        style={[
          styles.tabLabel,
          selected && styles.tabLabelSelected,
        ]}
      >
        {label}
      </AccessibleText>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#d1d5db',
    padding: 2,
    justifyContent: 'center',
  },
  switchTrackOn: {
    backgroundColor: '#3b82f6',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    transform: [{ translateX: 0 }],
  },
  switchThumbOn: {
    transform: [{ translateX: 20 }],
  },
  tabLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  tabLabelSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
});