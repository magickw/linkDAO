/**
 * Liquid Glass Tab Bar Component
 * 
 * A translucent, dynamic tab bar with glass effect.
 * 
 * Features:
 * - Materialization animation
 * - Active tab indicator
 * - Icon and label support
 * - Badge support
 * - Smooth transitions
 */

import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Animated,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { createGlassStyle } from '../../constants/liquidGlassTheme';

export interface LiquidGlassTabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export interface LiquidGlassTabBarProps {
  tabs: LiquidGlassTabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  isDarkMode?: boolean;
  style?: ViewStyle;
  showLabels?: boolean;
}

const LiquidGlassTabBar: React.FC<LiquidGlassTabBarProps> = ({
  tabs,
  activeTab,
  onTabChange,
  isDarkMode = false,
  style,
  showLabels = true,
}) => {
  const animatedIndicator = useRef(new Animated.Value(0)).current;
  const animatedOpacity = useRef(new Animated.Value(0)).current;

  const activeIndex = tabs.findIndex(tab => tab.id === activeTab);

  React.useEffect(() => {
    const tabWidth = 1 / tabs.length;
    const targetPosition = activeIndex * tabWidth;

    Animated.parallel([
      Animated.timing(animatedIndicator, {
        toValue: targetPosition,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(animatedOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeTab, tabs.length, animatedIndicator, animatedOpacity]);

  const glassStyle = createGlassStyle(
    {
      variant: 'regular' as any,
      shape: 'roundedRectangle' as any,
      opacity: 0.8,
      isInteractive: false,
      isEnabled: true,
    },
    isDarkMode
  );

  const indicatorWidth = animatedIndicator.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100],
  });

  const indicatorTranslateX = animatedIndicator.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0],
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.tabBar,
          glassStyle,
          {
            opacity: animatedOpacity,
          },
        ]}
      >
        {/* Tab Items */}
        <View style={styles.tabsContainer}>
          {tabs.map((tab, index) => {
            const isActive = tab.id === activeTab;
            const tabWidth = 100 / tabs.length;

            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, { width: `${tabWidth}%` }]}
                onPress={() => onTabChange(tab.id)}
                activeOpacity={0.7}
              >
                <View style={styles.tabContent}>
                  {/* Icon */}
                  <Animated.View
                    style={[
                      styles.iconContainer,
                      {
                        opacity: isActive ? 1 : 0.6,
                        transform: [
                          {
                            scale: isActive ? 1 : 0.9,
                          },
                        ],
                      },
                    ]}
                  >
                    {tab.icon}
                  </Animated.View>

                  {/* Badge */}
                  {tab.badge && tab.badge > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {tab.badge > 99 ? '99+' : tab.badge}
                      </Text>
                    </View>
                  )}

                  {/* Label */}
                  {showLabels && (
                    <Text
                      style={[
                        styles.label,
                        {
                          opacity: isActive ? 1 : 0.6,
                          color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.8)',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {tab.label}
                    </Text>
                  )}

                  {/* Active Indicator Dot */}
                  {isActive && (
                    <View style={styles.activeDot} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom Gradient */}
        <View style={styles.bottomGradient} pointerEvents="none">
          <LinearGradient
            colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.linearGradient}
          />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tabsContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconContainer: {
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  activeDot: {
    position: 'absolute',
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
  bottomGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  linearGradient: {
    flex: 1,
  },
});

export default LiquidGlassTabBar;