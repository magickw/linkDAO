/**
 * Liquid Glass Input Component
 * 
 * A translucent, dynamic input field with glass effect.
 * 
 * Features:
 * - Materialization animation on focus
 * - Floating label
 * - Validation states
 * - Icon support
 * - Clear button
 * - Password visibility toggle
 */

import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TextInputProps,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { createGlassStyle } from '../../constants/liquidGlassTheme';

export interface LiquidGlassInputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isDarkMode?: boolean;
  onRightIconPress?: () => void;
  showClearButton?: boolean;
  onClear?: () => void;
  variant?: 'default' | 'filled' | 'outlined';
}

const LiquidGlassInput: React.FC<LiquidGlassInputProps> = ({
  label,
  error,
  icon,
  rightIcon,
  isDarkMode = false,
  onRightIconPress,
  showClearButton = false,
  onClear,
  variant = 'default',
  value,
  onChangeText,
  onFocus,
  onBlur,
  secureTextEntry,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedLabel = useRef(new Animated.Value(0)).current;
  const animatedBorder = useRef(new Animated.Value(0)).current;

  const hasValue = value && value.length > 0;

  useEffect(() => {
    Animated.timing(animatedLabel, {
      toValue: (isFocused || hasValue) ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isFocused, hasValue, animatedLabel]);

  useEffect(() => {
    Animated.timing(animatedBorder, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isFocused, animatedBorder]);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleClear = () => {
    onChangeText?.('');
    onClear?.();
  };

  const glassStyle = createGlassStyle(
    {
      variant: 'regular' as any,
      shape: 'roundedRectangle' as any,
      opacity: 0.7,
      isInteractive: true,
      isEnabled: true,
    },
    isDarkMode
  );

  const variantStyles = {
    default: {
      backgroundColor: 'transparent',
    },
    filled: {
      backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.3)',
    },
    outlined: {
      backgroundColor: 'transparent',
      borderWidth: 2,
    },
  };

  const labelTranslateY = animatedLabel.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const labelScale = animatedLabel.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.8],
  });

  const borderColor = animatedBorder.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.3)',
      error ? 'rgba(239, 68, 68, 1)' : 'rgba(255, 255, 255, 0.6)',
    ],
  });

  return (
    <View style={styles.container}>
      {/* Label */}
      {label && (
        <Animated.View
          style={[
            styles.labelContainer,
            {
              transform: [
                { translateY: labelTranslateY },
                { scale: labelScale },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Text
            style={[
              styles.label,
              {
                color: error
                  ? '#ef4444'
                  : isFocused
                  ? '#ffffff'
                  : 'rgba(255, 255, 255, 0.7)',
              },
            ]}
          >
            {label}
          </Text>
        </Animated.View>
      )}

      {/* Input Container */}
      <Animated.View
        style={[
          styles.inputContainer,
          glassStyle,
          variantStyles[variant],
          {
            borderColor,
          },
        ]}
      >
        {/* Left Icon */}
        {icon && <View style={styles.leftIcon}>{icon}</View>}

        {/* Text Input */}
        <TextInput
          style={[
            styles.input,
            {
              color: '#ffffff',
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={secureTextEntry}
          placeholder={label && !isFocused && !hasValue ? '' : props.placeholder}
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
          {...props}
        />

        {/* Clear Button */}
        {showClearButton && hasValue && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}

        {/* Right Icon */}
        {rightIcon && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {rightIcon}
          </TouchableOpacity>
        )}

        {/* Highlight */}
        <View style={styles.highlight} pointerEvents="none" />
      </Animated.View>

      {/* Error Message */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    position: 'absolute',
    left: 16,
    top: 16,
    zIndex: 1,
  },
  label: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  leftIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  clearButtonText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  rightIcon: {
    marginLeft: 8,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    pointerEvents: 'none',
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: '#ef4444',
  },
});

export default LiquidGlassInput;