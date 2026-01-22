/**
 * Liquid Glass Button Component
 * 
 * A translucent, dynamic button with interactive behaviors including:
 * - Scaling on press
 * - Bouncing animation
 * - Shimmering effect
 * - Touch-point illumination
 * - Response to tap and drag gestures
 * 
 * Supports semantic tinting for call-to-action buttons.
 */

import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  TouchableOpacityProps,
  Text,
  GestureResponderEvent,
  PanResponder,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { LiquidGlassTheme, GlassVariant, GlassTint, createGlassStyle } from '../../constants/liquidGlassTheme';

export interface LiquidGlassButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  title?: string;
  variant?: GlassVariant;
  tint?: GlassTint;
  isInteractive?: boolean;
  isDarkMode?: boolean;
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: any;
}

const LiquidGlassButton: React.FC<LiquidGlassButtonProps> = ({
  title,
  variant = GlassVariant.REGULAR,
  tint,
  isInteractive = true,
  isDarkMode = false,
  size = 'medium',
  fullWidth = false,
  icon,
  iconPosition = 'left',
  style,
  children,
  onPress,
  ...props
}) => {
  const animatedScale = useRef(new Animated.Value(1)).current;
  const animatedBounce = useRef(new Animated.Value(0)).current;
  const animatedShimmer = useRef(new Animated.Value(0)).current;
  const animatedGlow = useRef(new Animated.Value(0)).current;

  const [touchPosition, setTouchPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Shimmer animation
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedShimmer, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedShimmer, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    shimmerAnimation.start();
    return () => shimmerAnimation.stop();
  }, [animatedShimmer]);

  const handlePressIn = (event: GestureResponderEvent) => {
    if (!isInteractive) return;

    // Scale down on press
    Animated.spring(animatedScale, {
      toValue: 0.92,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // Bounce effect
    Animated.spring(animatedBounce, {
      toValue: 1,
      friction: 3,
      tension: 100,
      useNativeDriver: true,
    }).start();

    // Glow effect at touch point
    const { locationX, locationY } = event.nativeEvent;
    setTouchPosition({ x: locationX, y: locationY });
    Animated.timing(animatedGlow, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (!isInteractive) return;

    // Scale back up
    Animated.spring(animatedScale, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // Reset bounce
    Animated.spring(animatedBounce, {
      toValue: 0,
      friction: 3,
      tension: 100,
      useNativeDriver: true,
    }).start();

    // Fade out glow
    Animated.timing(animatedGlow, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isInteractive,
      onMoveShouldSetPanResponder: () => isInteractive,
      onPanResponderMove: (event) => {
        if (isInteractive) {
          const { locationX, locationY } = event.nativeEvent;
          setTouchPosition({ x: locationX, y: locationY });
        }
      },
    })
  ).current;

  const glassStyle = createGlassStyle(
    {
      variant,
      shape: 'capsule' as any,
      opacity: 0.7,
      tint: tint as any,
      tintOpacity: 0.6,
      isInteractive,
      isEnabled: true,
    },
    isDarkMode
  );

  const sizeStyles = {
    small: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      fontSize: 14,
    },
    medium: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      fontSize: 16,
    },
    large: {
      paddingHorizontal: 32,
      paddingVertical: 16,
      fontSize: 18,
    },
  };

  const shimmerOpacity = animatedShimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.4, 0],
  });

  const glowOpacity = animatedGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });

  const glowRadius = animatedGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 80],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { width: fullWidth ? '100%' : 'auto' },
        style,
      ]}
    >
      <TouchableOpacity
        {...props}
        {...panResponder.panHandlers}
        style={[
          styles.button,
          glassStyle,
          sizeStyles[size],
          {
            transform: [{ scale: animatedScale }],
          },
        ]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        activeOpacity={1}
      >
        <Animated.View style={styles.content}>
          {/* Shimmer effect */}
          <Animated.View
            style={[
              styles.shimmer,
              {
                opacity: shimmerOpacity,
              },
            ]}
            pointerEvents="none"
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shimmerGradient}
            />
          </Animated.View>

          {/* Touch point glow */}
          <Animated.View
            style={[
              styles.glow,
              {
                left: touchPosition.x,
                top: touchPosition.y,
                opacity: glowOpacity,
                width: glowRadius,
                height: glowRadius,
                borderRadius: glowRadius,
              },
            ]}
            pointerEvents="none"
          />

          {/* Highlight */}
          <View style={styles.highlight} pointerEvents="none" />

          {/* Button content */}
          <View style={styles.buttonContent}>
            {icon && iconPosition === 'left' && (
              <View style={styles.iconLeft}>{icon}</View>
            )}
            {title && (
              <Text
                style={[
                  styles.title,
                  { fontSize: sizeStyles[size].fontSize },
                  tint && { color: tint },
                ]}
              >
                {title}
              </Text>
            )}
            {children}
            {icon && iconPosition === 'right' && (
              <View style={styles.iconRight}>{icon}</View>
            )}
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
  },
  content: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  shimmerGradient: {
    flex: 1,
    width: '200%',
  },
  glow: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    transform: [{ translateX: -40 }, { translateY: -40 }],
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    position: 'relative',
    zIndex: 1,
  },
  iconLeft: {
    marginRight: 4,
  },
  iconRight: {
    marginLeft: 4,
  },
  title: {
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default LiquidGlassButton;