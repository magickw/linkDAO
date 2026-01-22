/**
 * Liquid Glass Card Component
 * 
 * A translucent, dynamic card that reflects and refracts surrounding content
 * while providing a container for user content.
 * 
 * Features:
 * - Lensing effect (simulated with gradients and shadows)
 * - Materialization animation on mount
 * - Fluid touch responsiveness
 * - Adaptive to light/dark mode
 * - Interactive behaviors (scale, bounce, shimmer)
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { LiquidGlassTheme, GlassVariant, GlassShape, createGlassStyle } from '../../constants/liquidGlassTheme';

export interface LiquidGlassCardProps extends TouchableOpacityProps {
  variant?: GlassVariant;
  shape?: GlassShape;
  opacity?: number;
  tint?: string;
  isInteractive?: boolean;
  isDarkMode?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
  animationDelay?: number;
}

const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
  variant = GlassVariant.REGULAR,
  shape = GlassShape.ROUNDED_RECTANGLE,
  opacity = 0.7,
  tint,
  isInteractive = false,
  isDarkMode = false,
  children,
  style,
  animationDelay = 0,
  ...props
}) => {
  const animatedOpacity = useRef(new Animated.Value(0)).current;
  const animatedScale = useRef(new Animated.Value(0.95)).current;
  const animatedShimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Materialization animation on mount
    Animated.sequence([
      Animated.timing(animatedOpacity, {
        toValue: 1,
        duration: 300,
        delay: animationDelay,
        useNativeDriver: true,
      }),
      Animated.spring(animatedScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Shimmer effect for interactive elements
    if (isInteractive) {
      const shimmerAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedShimmer, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(animatedShimmer, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      shimmerAnimation.start();
      return () => shimmerAnimation.stop();
    }
  }, [animatedOpacity, animatedScale, animatedShimmer, animationDelay, isInteractive]);

  const handlePressIn = () => {
    if (isInteractive) {
      Animated.spring(animatedScale, {
        toValue: 0.95,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (isInteractive) {
      Animated.spring(animatedScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  };

  const glassStyle = createGlassStyle(
    {
      variant,
      shape,
      opacity: opacity as any,
      tint: tint as any,
      isInteractive,
      isEnabled: true,
    },
    isDarkMode
  );

  const shimmerOpacity = animatedShimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.3, 0],
  });

  const CardComponent = isInteractive ? TouchableOpacity : View;

  return (
    <CardComponent
      {...props}
      style={[styles.container, glassStyle, style]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={isInteractive ? 0.8 : 1}
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: animatedOpacity,
            transform: [{ scale: animatedScale }],
          },
        ]}
      >
        {/* Shimmer effect for interactive elements */}
        {isInteractive && (
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
              colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shimmerGradient}
            />
          </Animated.View>
        )}

        {/* Highlight effect */}
        <View style={styles.highlight} pointerEvents="none" />

        {/* Content */}
        <View style={styles.childrenContainer}>{children}</View>
      </Animated.View>
    </CardComponent>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  content: {
    position: 'relative',
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
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  childrenContainer: {
    position: 'relative',
    zIndex: 1,
  },
});

export default LiquidGlassCard;