/**
 * Post Detail Screen
 * Shows full post content, media, and comments
 */

import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { THEME } from '../../src/constants/theme';
import { PostCard } from '../../src/components/PostCard';
import { postsService } from '../../src/services';
import { Post } from '../../src/store/postsStore';
import EnhancedComments from '../../src/components/EnhancedComments';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadPost();
    }
  }, [id]);

  const loadPost = async () => {
    try {
      setLoading(true);
      const data = await postsService.getPost(id as string);
      setPost(data);
    } catch (error) {
      console.error('Error loading post:', error);
      Alert.alert('Error', 'Failed to load post details');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!post) return;
    try {
      await postsService.likePost(post.id);
      setPost({
        ...post,
        isLiked: !post.isLiked,
        likes: post.isLiked ? post.likes - 1 : post.likes + 1
      });
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Post not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color={THEME.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="share-social-outline" size={24} color={THEME.colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.postContainer}>
          <PostCard 
            post={post} 
            onLike={handleLike}
            onComment={() => {}} // Already on detail page
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.commentsSection}>
          <Text style={styles.sectionTitle}>Comments</Text>
          <EnhancedComments 
            postId={post.id} 
            postType={post.communityId ? 'community' : 'feed'}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background.light,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    backgroundColor: THEME.colors.background.cardLight,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text.primary,
  },
  iconButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  postContainer: {
    padding: THEME.spacing.md,
  },
  divider: {
    height: 8,
    backgroundColor: '#f3f4f6',
  },
  commentsSection: {
    padding: THEME.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text.primary,
    marginBottom: THEME.spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.background.light,
  },
  errorText: {
    fontSize: 16,
    color: THEME.colors.text.secondary,
    marginBottom: THEME.spacing.md,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.md,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
