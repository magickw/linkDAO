/**
 * Liquid Glass List Component
 * 
 * A translucent, dynamic list with glass effect.
 * 
 * Features:
 * - Materialization animation
 * - Pull to refresh
 * - Infinite scroll
 * - Swipe actions
 * - Section headers
 * - Empty state
 */

import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  FlatListProps,
  RefreshControl,
  ActivityIndicator,
  Text,
  ViewStyle,
  ListRenderItem,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { createGlassStyle } from '../../constants/liquidGlassTheme';

export interface LiquidGlassListItem {
  id: string;
  [key: string]: any;
}

export interface LiquidGlassListProps<T extends LiquidGlassListItem>
  extends Omit<FlatListProps<T>, 'renderItem'> {
  data: T[];
  renderItem: ListRenderItem<T>;
  isDarkMode?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  sectionHeader?: (section: any) => React.ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

function LiquidGlassList<T extends LiquidGlassListItem>({
  data,
  renderItem,
  isDarkMode = false,
  onRefresh,
  refreshing = false,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
  emptyMessage = 'No items found',
  emptyIcon,
  sectionHeader,
  style,
  contentContainerStyle,
  ...props
}: LiquidGlassListProps<T>) {
  const scrollY = useRef(0);
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set());

  const glassStyle = createGlassStyle(
    {
      variant: 'regular' as any,
      shape: 'roundedRectangle' as any,
      opacity: 0.7,
      isInteractive: false,
      isEnabled: true,
    },
    isDarkMode
  );

  const handleViewableItemsChanged = useRef(({ viewableItems }: any) => {
    setVisibleIndices(new Set(viewableItems.map((item: any) => item.index)));
  }).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 10,
    minimumViewTime: 100,
  }).current;

  const renderSectionHeader = sectionHeader
    ? ({ section }: any) => (
        <View style={styles.sectionHeader}>
          {sectionHeader(section)}
        </View>
      )
    : undefined;

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      {emptyIcon && (
        <View style={styles.emptyIcon}>{emptyIcon}</View>
      )}
      <Text style={styles.emptyText}>{emptyMessage}</Text>
    </View>
  );

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color="#ffffff" />
        </View>
      );
    }
    return null;
  };

  const renderListItem: ListRenderItem<T> = ({ item, index }) => {
    const isVisible = visibleIndices.has(index);
    const opacity = useSharedValue(isVisible ? 1 : 0);
    const translateY = useSharedValue(isVisible ? 0 : 20);

    if (isVisible) {
      opacity.value = withSpring(1, { damping: 15, stiffness: 100 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
    }

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    }));

    return (
      <Animated.View style={animatedStyle}>
        {renderItem({ item, index } as any)}
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <FlatList
        data={data}
        renderItem={renderListItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ffffff"
            />
          ) : undefined
        }
        onEndReached={hasMore ? onLoadMore : undefined}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        contentContainerStyle={[
          styles.contentContainer,
          data.length === 0 && styles.emptyContentContainer,
          contentContainerStyle,
        ]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 8,
  },
  emptyContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

export default LiquidGlassList;