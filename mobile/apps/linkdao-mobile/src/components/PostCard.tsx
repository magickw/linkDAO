/**
 * Post Card Component
 * Enhanced post display with iOS 26 Liquid Glass styling
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { LiquidGlassTheme, createGlassStyle } from '../constants/liquidGlassTheme';
import { Post } from '../store/postsStore';
import TipButton from './TipButton';
import { OptimizedImage } from './OptimizedFlatList';

interface PostCardProps {
  post: Post;
  onLike: (id: string) => void;
  onComment?: (id: string) => void;
  onShare?: (id: string) => void;
  onPress?: (id: string) => void;
}

export const PostCard: React.FC<PostCardProps> = memo(({
  post,
  onLike,
  onComment,
  onShare,
  onPress,
}) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const glassStyle = createGlassStyle(
    {
      variant: 'regular' as any,
      shape: 'roundedRectangle' as any,
      opacity: 0.7,
      isInteractive: false,
      isEnabled: true,
    },
    false
  );

  return (
    <TouchableOpacity 
      activeOpacity={0.9}
      style={[styles.container, glassStyle]}
      onPress={() => onPress?.(post.id)}
    >
      {/* Liquid Glass Highlight */}
      <View style={styles.glassHighlight} />
      
      <View style={styles.cardContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.authorInfo}>
            <View style={styles.avatarContainer}>
              {post.authorAvatar ? (
                <OptimizedImage source={{ uri: post.authorAvatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>{post.authorName.charAt(0)}</Text>
                </View>
              )}
            </View>
            <View>
              <Text style={styles.authorName}>{post.authorName}</Text>
              <Text style={styles.handle}>@{post.authorHandle || post.authorId.slice(0, 8)}</Text>
            </View>
          </View>
          <Text style={styles.time}>{formatTime(post.createdAt)}</Text>
        </View>

        {/* Content */}
        <Text style={styles.content} numberOfLines={5}>
          {post.content}
        </Text>

        {/* Media / Bento Element (Placeholder for Bento Grid style) */}
        {post.attachments && post.attachments.length > 0 && (
          <View style={styles.mediaContainer}>
            <OptimizedImage 
              source={{ uri: post.attachments[0].url }} 
              style={styles.mediaImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Interaction Bar */}
        <View style={styles.footer}>
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.actionItem} 
              onPress={() => onLike(post.id)}
            >
              <Ionicons 
                name={post.isLiked ? "heart" : "heart-outline"} 
                size={20} 
                color={post.isLiked ? LiquidGlassTheme.colors.tints.error : LiquidGlassTheme.colors.text.secondary} 
              />
              <Text style={[styles.actionCount, post.isLiked && { color: LiquidGlassTheme.colors.tints.error }]}>
                {post.likes}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionItem}
              onPress={() => onComment?.(post.id)}
            >
              <Ionicons name="chatbubble-outline" size={18} color={LiquidGlassTheme.colors.text.secondary} />
              <Text style={styles.actionCount}>{post.comments}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionItem}
              onPress={() => onShare?.(post.id)}
            >
              <Ionicons name="share-outline" size={18} color={LiquidGlassTheme.colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <TipButton 
            recipientId={post.authorId}
            contentType="post"
            contentId={post.id}
            compact
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  glassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    pointerEvents: 'none',
  },
  cardContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: THEME.spacing.sm,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: THEME.spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: THEME.borderRadius.full,
  },
  avatarPlaceholder: {
    backgroundColor: LiquidGlassTheme.colors.tints.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: LiquidGlassTheme.colors.text.primary,
    fontWeight: 'bold',
    fontSize: 18,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '700',
    color: LiquidGlassTheme.colors.text.primary,
  },
  handle: {
    fontSize: 13,
    color: LiquidGlassTheme.colors.text.tertiary,
  },
  time: {
    fontSize: 12,
    color: LiquidGlassTheme.colors.text.tertiary,
  },
  content: {
    fontSize: 15,
    color: THEME.colors.text.primary,
    lineHeight: 22,
    marginBottom: THEME.spacing.md,
  },
  mediaContainer: {
    width: '100%',
    height: 200,
    borderRadius: THEME.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: THEME.spacing.md,
    backgroundColor: '#f3f4f6',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: THEME.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.lg,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.text.secondary,
  },
});
