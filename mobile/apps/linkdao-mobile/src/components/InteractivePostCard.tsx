/**
 * Interactive Post Card
 * Wraps PostCard with press animations
 */

import React, { useState } from 'react';
import { PostCard } from './PostCard';
import { Post } from '../store/postsStore';
import { Pressable, StyleSheet } from 'react-native';

interface InteractivePostCardProps {
  post: Post;
  onLike: (id: string) => void;
  onComment?: (id: string) => void;
  onShare?: (id: string) => void;
  onPress?: (id: string) => void;
}

export const InteractivePostCard: React.FC<InteractivePostCardProps> = (props) => {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      style={[styles.container, pressed && styles.pressed]}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={() => props.onPress?.(props.post.id)}
    >
      <PostCard {...props} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  pressed: {
    opacity: 0.9,
  },
});