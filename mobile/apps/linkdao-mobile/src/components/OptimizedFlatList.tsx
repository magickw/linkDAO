/**
 * Optimized FlatList Component
 * Provides optimized list rendering with memoization and performance optimizations
 */

import React, { memo, useCallback, useRef, useState } from 'react';
import {
  FlatList as RNFlatList,
  FlatListProps as RNFlatListProps,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  ViewToken,
} from 'react-native';
import FastImage from 'react-native-fast-image';

export interface OptimizedFlatListProps<T> extends Omit<RNFlatListProps<T>, 'renderItem'> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  onEndReachedThreshold?: number;
  onEndReached?: () => void;
  refreshControl?: React.ReactNode;
  ListHeaderComponent?: React.ReactNode;
  ListFooterComponent?: React.ReactNode;
  estimatedItemSize?: number;
  initialNumToRender?: number;
  maxToRenderPerBatch?: number;
  windowSize?: number;
  removeClippedSubviews?: boolean;
}

/**
 * Optimized FlatList with performance enhancements
 */
export function OptimizedFlatList<T>({
  data,
  renderItem,
  keyExtractor,
  loading = false,
  loadingComponent,
  emptyComponent,
  onEndReachedThreshold = 0.5,
  onEndReached,
  refreshControl,
  ListHeaderComponent,
  ListFooterComponent,
  estimatedItemSize = 100,
  initialNumToRender = 10,
  maxToRenderPerBatch = 10,
  windowSize = 10,
  removeClippedSubviews = true,
  ...props
}: OptimizedFlatListProps<T>) {
  const [viewableItems, setViewableItems] = useState<Map<string, boolean>>(new Map());
  const flatListRef = useRef<RNFlatList<T>>(null);

  // Memoized render item to prevent unnecessary re-renders
  const memoizedRenderItem = useCallback(
    ({ item, index }: { item: T; index: number }) => {
      return renderItem(item, index);
    },
    [renderItem]
  );

  // Handle viewable items for lazy loading
  const handleViewableItemsChanged = useCallback(
    ({ changed }: { changed: ViewToken[] }) => {
      const newViewableItems = new Map(viewableItems);

      changed.forEach((change) => {
        newViewableItems.set(change.key, change.isViewable);
      });

      setViewableItems(newViewableItems);
    },
    [viewableItems]
  );

  // Default loading component
  const DefaultLoadingComponent = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#3b82f6" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );

  // Default empty component
  const DefaultEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No items found</Text>
    </View>
  );

  return (
    <RNFlatList
      ref={flatListRef}
      data={data}
      renderItem={memoizedRenderItem}
      keyExtractor={keyExtractor}
      ListEmptyComponent={loading ? DefaultLoadingComponent : emptyComponent || DefaultEmptyComponent}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={loading && data.length > 0 ? loadingComponent || DefaultLoadingComponent : ListFooterComponent}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      onViewableItemsChanged={handleViewableItemsChanged}
      viewabilityConfig={{
        itemVisiblePercentThreshold: 50,
        minimumViewTime: 300,
      }}
      refreshControl={refreshControl}
      removeClippedSubviews={removeClippedSubviews}
      maxToRenderPerBatch={maxToRenderPerBatch}
      updateCellsBatchingPeriod={50}
      initialNumToRender={initialNumToRender}
      windowSize={windowSize}
      getItemLayout={(data, index) => ({
        length: estimatedItemSize,
        offset: estimatedItemSize * index,
        index,
      })}
      {...props}
    />
  );
}

/**
 * Optimized Image Component
 * Uses FastImage for better performance with caching
 */
export const OptimizedImage = memo(
  ({
    source,
    style,
    resizeMode = 'cover',
    fallback,
    ...props
  }: any) => {
    return (
      <FastImage
        source={source}
        style={style}
        resizeMode={FastImage.resizeMode[resizeMode]}
        fallback={fallback}
        {...props}
      />
    );
  }
);

/**
 * Optimized List Item Component
 * Provides memoization for list items
 */
export const OptimizedListItem = memo(
  ({
    children,
    testID,
    accessibilityLabel,
    ...props
  }: any) => {
    return (
      <View
        testID={testID}
        accessible={true}
        accessibilityLabel={accessibilityLabel}
        {...props}
      >
        {children}
      </View>
    );
  }
);

/**
 * Optimized Text Component
 * Prevents re-renders when text hasn't changed
 */
export const OptimizedText = memo(({ children, ...props }: any) => {
  return <Text {...props}>{children}</Text>;
});

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
  },
});