/**
 * Post Detail Screen
 * Displays full post with reactions, comments, and tipping
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Image,
    Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';


import EnhancedComments from '../../../../src/components/EnhancedComments';
import PostReactions from '../../../../src/components/PostReactions';
import TipButton from '../../../../src/components/TipButton';


interface Post {
    id: string;
    content: string;
    author: {
        id: string;
        handle: string;
        displayName?: string;
        avatar?: string;
    };
    createdAt: string;
    reactions: any[];
    userReaction?: string;
    media?: {
        type: 'image' | 'video';
        url: string;
    }[];
}

export default function CommunityPostDetailScreen() {
    const { id: communityId, postId } = useLocalSearchParams<{ id: string; postId: string }>();
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchPost();
    }, [postId]);

    const fetchPost = async () => {
        try {
            setLoading(true);
            // TODO: Replace with actual API call
            // const data = await postsService.getPost(postId);

            // Mock data for now
            const mockPost: Post = {
                id: postId || '1',
                content: 'This is a sample post with reactions and comments. Long press the reaction button to see all available reactions!',
                author: {
                    id: 'user-1',
                    handle: 'johndoe',
                    displayName: 'John Doe',
                },
                createdAt: new Date().toISOString(),
                reactions: [
                    { type: 'fire', count: 5 },
                    { type: 'rocket', count: 3 },
                    { type: 'diamond', count: 2 },
                ],
                userReaction: undefined,
            };

            setPost(mockPost);
        } catch (error) {
            console.error('Error fetching post:', error);
            Alert.alert('Error', 'Failed to load post');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleReact = async (reactionType: string) => {
        try {
            // TODO: Replace with actual API call
            // await postsService.reactToPost(postId, reactionType);
            console.log('Reacted with:', reactionType);

            // Update local state
            setPost(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    userReaction: prev.userReaction === reactionType ? undefined : reactionType,
                };
            });
        } catch (error) {
            console.error('Error reacting to post:', error);
            Alert.alert('Error', 'Failed to react to post');
        }
    };

    const handleAddComment = async (content: string, parentId?: string) => {
        try {
            // TODO: Replace with actual API call
            // await commentsService.addComment(postId, content, parentId);
            console.log('Add comment:', content, parentId);
            Alert.alert('Success', 'Comment added!');
        } catch (error) {
            console.error('Error adding comment:', error);
            Alert.alert('Error', 'Failed to add comment');
        }
    };

    const handleReactToComment = async (commentId: string, reaction: string) => {
        try {
            // TODO: Replace with actual API call
            console.log('React to comment:', commentId, reaction);
        } catch (error) {
            console.error('Error reacting to comment:', error);
            Alert.alert('Error', 'Failed to react');
        }
    };

    const handleTipComment = async (commentId: string, amount: number) => {
        try {
            // TODO: Replace with actual API call
            console.log('Tip comment:', commentId, amount);
            Alert.alert('Success', `Tipped ${amount} LDAO!`);
        } catch (error) {
            console.error('Error tipping comment:', error);
            Alert.alert('Error', 'Failed to send tip');
        }
    };

    // Mock comments data
    const mockComments = [
        {
            id: '1',
            author: {
                id: 'user-2',
                displayName: 'Jane Smith',
                handle: 'janesmith',
            },
            content: 'Great post! Really insightful.',
            createdAt: new Date().toISOString(),
            reactions: { like: 5, love: 2, laugh: 0, wow: 1 },
            replyCount: 1,
            replies: [
                {
                    id: '2',
                    author: {
                        id: 'user-1',
                        displayName: 'John Doe',
                        handle: 'johndoe',
                    },
                    content: 'Thanks! Glad you found it helpful.',
                    createdAt: new Date().toISOString(),
                    reactions: { like: 2, love: 0, laugh: 0, wow: 0 },
                    replyCount: 0,
                    parentId: '1',
                },
            ],
        },
    ];

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>Loading post...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!post) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={64} color="#8E8E93" />
                    <Text style={styles.errorTitle}>Post Not Found</Text>
                    <Text style={styles.errorText}>This post may have been deleted</Text>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Post</Text>
                <TouchableOpacity style={styles.headerButton}>
                    <Ionicons name="ellipsis-horizontal" size={24} color="#000" />
                </TouchableOpacity>
            </View>

            <ScrollView>
                {/* Post Content */}
                <View style={styles.postContainer}>
                    {/* Author Info */}
                    <View style={styles.authorContainer}>
                        <View style={styles.avatar}>
                            {post.author.avatar ? (
                                <Image source={{ uri: post.author.avatar }} style={styles.avatarImage} />
                            ) : (
                                <Text style={styles.avatarText}>
                                    {post.author.displayName?.charAt(0) || post.author.handle.charAt(0).toUpperCase()}
                                </Text>
                            )}
                        </View>
                        <View style={styles.authorInfo}>
                            <Text style={styles.authorName}>
                                {post.author.displayName || post.author.handle}
                            </Text>
                            <Text style={styles.authorUsername}>@{post.author.handle}</Text>
                        </View>
                    </View>

                    {/* Post Content */}
                    <Text style={styles.postContent}>{post.content}</Text>

                    {/* Media */}
                    {post.media && post.media.length > 0 && (
                        <View style={styles.mediaContainer}>
                            {post.media.map((item, index) => (
                                <Image
                                    key={index}
                                    source={{ uri: item.url }}
                                    style={styles.mediaImage}
                                    resizeMode="cover"
                                />
                            ))}
                        </View>
                    )}

                    {/* Timestamp */}
                    <Text style={styles.timestamp}>
                        {new Date(post.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                        })}
                    </Text>

                    {/* Actions */}
                    <View style={styles.actionsContainer}>
                        <PostReactions
                            postId={post.id}
                            reactions={post.reactions}
                            userReaction={post.userReaction}
                            onReact={handleReact}
                        />
                        <TipButton
                            recipientId={post.author.id}
                            contentType="post"
                            contentId={post.id}
                            onTipSent={() => Alert.alert('Success', 'Tip sent!')}
                        />
                    </View>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Comments Section */}
                <EnhancedComments
                    postId={post.id}
                    comments={mockComments}
                    onAddComment={handleAddComment}
                    onReact={handleReactToComment}
                    onTip={handleTipComment}
                />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    headerButton: {
        padding: 4,
        width: 40,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#000',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    loadingText: {
        fontSize: 16,
        color: '#8E8E93',
        marginTop: 16,
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#000',
        marginTop: 16,
    },
    errorText: {
        fontSize: 14,
        color: '#8E8E93',
        marginTop: 8,
        textAlign: 'center',
    },
    backButton: {
        marginTop: 24,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#007AFF',
        borderRadius: 8,
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    postContainer: {
        backgroundColor: '#fff',
        padding: 16,
    },
    authorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
    },
    authorInfo: {
        marginLeft: 12,
        flex: 1,
    },
    authorName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    authorUsername: {
        fontSize: 14,
        color: '#8E8E93',
        marginTop: 2,
    },
    postContent: {
        fontSize: 17,
        color: '#000',
        lineHeight: 24,
        marginBottom: 16,
    },
    mediaContainer: {
        marginBottom: 16,
    },
    mediaImage: {
        width: '100%',
        height: 300,
        borderRadius: 12,
        marginBottom: 8,
    },
    timestamp: {
        fontSize: 14,
        color: '#8E8E93',
        marginBottom: 16,
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    divider: {
        height: 8,
        backgroundColor: '#F2F2F7',
    },
});
