/**
 * Interactive Post Card
 * Wraps PostCard with Reanimated transitions for a premium feel
 */

import React from 'react';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  withTiming,
  interpolate
} from 'react-native-reanimated';
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
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
    opacity.value = withTiming(0.9);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
    opacity.value = withTiming(1);
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => props.onPress?.(props.post.id)}
      >
        <PostCard {...props} />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
