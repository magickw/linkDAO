/**
 * Blog Screen
 * Mobile-optimized blog listing page
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { format } from 'date-fns';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  author: string;
  tags: string[];
  slug: string;
  imageUrl?: string;
}

export default function BlogScreen() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const categories = [
    { id: 'all', name: 'All Posts' },
    { id: 'announcement', name: 'Announcements' },
    { id: 'tutorial', name: 'Tutorials' },
    { id: 'token', name: 'Token Economics' },
    { id: 'community', name: 'Community' },
    { id: 'governance', name: 'Governance' },
    { id: 'marketplace', name: 'Marketplace' },
  ];

  useEffect(() => {
    loadPosts();
  }, [selectedCategory]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const url = selectedCategory === 'all' 
        ? `${API_BASE_URL}/api/blog/posts`
        : `${API_BASE_URL}/api/blog/posts?category=${selectedCategory}`;
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        setPosts(result.data || []);
      } else {
        // Use mock data if API fails
        setPosts(getMockPosts());
      }
    } catch (error) {
      console.error('Failed to load blog posts:', error);
      // Use mock data on error
      setPosts(getMockPosts());
    } finally {
      setLoading(false);
    }
  };

  const getMockPosts = (): BlogPost[] => [
    {
      id: '1',
      title: 'Welcome to LinkDAO Blog',
      excerpt: 'Learn about the latest updates and features in the LinkDAO ecosystem.',
      content: '# Welcome to LinkDAO Blog\n\nWelcome to our new blog! This is where we\'ll be sharing updates, tutorials, and insights about the LinkDAO ecosystem.',
      date: '2024-01-15',
      author: 'LinkDAO Team',
      tags: ['announcement', 'community'],
      slug: 'welcome-to-linkdao-blog',
      imageUrl: 'https://via.placeholder.com/600x400/3b82f6/ffffff?text=LinkDAO+Blog',
    },
    {
      id: '2',
      title: 'How to Get Started with LinkDAO',
      excerpt: 'A step-by-step guide for new users to join our decentralized community.',
      content: '# How to Get Started with LinkDAO\n\nGetting started with LinkDAO is easy! Follow this step-by-step guide.',
      date: '2024-01-10',
      author: 'Community Team',
      tags: ['tutorial', 'getting-started'],
      slug: 'how-to-get-started-with-linkdao',
      imageUrl: 'https://via.placeholder.com/600x400/10b981/ffffff?text=Getting+Started',
    },
    {
      id: '3',
      title: 'Understanding LDAO Token Economics',
      excerpt: 'Deep dive into the tokenomics and utility of the LDAO token.',
      content: '# Understanding LDAO Token Economics\n\nLearn about the tokenomics and utility.',
      date: '2024-01-05',
      author: 'Economics Team',
      tags: ['token', 'economics'],
      slug: 'understanding-ldao-token-economics',
      imageUrl: 'https://via.placeholder.com/600x400/8b5cf6/ffffff?text=Token+Economics',
    },
  ];

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const renderPostCard = (post: BlogPost) => (
    <TouchableOpacity
      key={post.id}
      style={styles.postCard}
      onPress={() => router.push(`/blog/${post.slug}`)}
      activeOpacity={0.7}
    >
      <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
      <View style={styles.postContent}>
        <View style={styles.tagsContainer}>
          {post.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
        
        <Text style={styles.postTitle} numberOfLines={2}>{post.title}</Text>
        <Text style={styles.postExcerpt} numberOfLines={2}>{post.excerpt}</Text>
        
        <View style={styles.postMeta}>
          <View style={styles.authorInfo}>
            <View style={styles.authorAvatar}>
              <Text style={styles.authorInitial}>{post.author.charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.authorName}>{post.author}</Text>
              <Text style={styles.postDate}>
                {format(new Date(post.date), 'MMM d, yyyy')}
              </Text>
            </View>
          </View>
          
          <Ionicons name="arrow-forward" size={20} color="#3b82f6" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Blog</Text>
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategory === category.id && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text style={[
              styles.categoryText,
              selectedCategory === category.id && styles.categoryTextActive,
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Posts */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <ActivityIndicator refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading posts...</Text>
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptySubtitle}>Check back soon for new content</Text>
          </View>
        ) : (
          <View style={styles.postsContainer}>
            {posts.map(renderPostCard)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  categoriesScroll: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  categoryChipActive: {
    backgroundColor: '#3b82f6',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  categoryTextActive: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  postsContainer: {
    padding: 16,
    gap: 16,
  },
  postCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  postContent: {
    padding: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1e40af',
  },
  postTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    lineHeight: 24,
  },
  postExcerpt: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  authorInitial: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  postDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
});