/**
 * Loading Skeleton Component
 * Displays placeholder UI while content is loading
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
        },
        style,
      ]}
    />
  );
};

/**
 * Post Card Skeleton
 * Skeleton for feed post cards
 */
export const PostCardSkeleton: React.FC = () => {
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={styles.headerInfo}>
          <Skeleton width={120} height={16} />
          <Skeleton width={80} height={12} />
        </View>
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        <Skeleton width="100%" height={16} />
        <Skeleton width="90%" height={16} />
        <Skeleton width="70%" height={16} />
      </View>

      {/* Image */}
      <Skeleton width="100%" height={200} borderRadius={8} style={styles.cardImage} />

      {/* Actions */}
      <View style={styles.cardActions}>
        <Skeleton width={60} height={20} />
        <Skeleton width={60} height={20} />
        <Skeleton width={60} height={20} />
      </View>
    </View>
  );
};

/**
 * Product Card Skeleton
 * Skeleton for marketplace product cards
 */
export const ProductCardSkeleton: React.FC = () => {
  return (
    <View style={styles.card}>
      <Skeleton width="100%" height={150} borderRadius={8} />
      <View style={styles.cardContent}>
        <Skeleton width="80%" height={16} />
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={18} style={styles.price} />
      </View>
    </View>
  );
};

/**
 * Community Card Skeleton
 * Skeleton for community cards
 */
export const CommunityCardSkeleton: React.FC = () => {
  return (
    <View style={styles.card}>
      <Skeleton width="100%" height={120} borderRadius={12} />
      <View style={styles.cardContent}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="50%" height={14} />
        <View style={styles.stats}>
          <Skeleton width={40} height={14} />
          <Skeleton width={40} height={14} />
        </View>
      </View>
    </View>
  );
};

/**
 * Message Skeleton
 * Skeleton for chat messages
 */
export const MessageSkeleton: React.FC<{ isOwn?: boolean }> = ({ isOwn = false }) => {
  return (
    <View style={[styles.messageContainer, isOwn && styles.messageContainerOwn]}>
      <View style={[styles.messageBubble, isOwn && styles.messageBubbleOwn]}>
        <Skeleton width={150} height={14} />
        <Skeleton width={100} height={12} />
      </View>
    </View>
  );
};

/**
 * List Skeleton
 * Skeleton for generic list items
 */
export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.listItem}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <View style={styles.listItemContent}>
            <Skeleton width={120} height={16} />
            <Skeleton width={200} height={14} />
          </View>
        </View>
      ))}
    </>
  );
};

/**
 * Profile Header Skeleton
 * Skeleton for profile header
 */
export const ProfileHeaderSkeleton: React.FC = () => {
  return (
    <View style={styles.profileHeader}>
      <Skeleton width={80} height={80} borderRadius={40} />
      <View style={styles.profileInfo}>
        <Skeleton width={150} height={20} />
        <Skeleton width={100} height={14} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardContent: {
    marginBottom: 12,
  },
  cardImage: {
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  price: {
    marginTop: 8,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  messageContainer: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  messageContainerOwn: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    backgroundColor: '#f3f4f6',
    borderRadius: 18,
    padding: 12,
    maxWidth: '75%',
  },
  messageBubbleOwn: {
    backgroundColor: '#3b82f6',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
});