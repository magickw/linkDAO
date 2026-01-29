/**
 * Enhanced Comments Component
 * Comments with reactions, threading, and rich interactions
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Alert,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { webSocketService } from '../services/webSocketService';

interface Comment {
    id: string;
    author: {
        id: string;
        displayName: string;
        username: string;
        avatar?: string;
    };
    content: string;
    createdAt: string;
    reactions: {
        like: number;
        love: number;
        laugh: number;
        wow: number;
    };
    userReaction?: 'like' | 'love' | 'laugh' | 'wow';
    replyCount: number;
    replies?: Comment[];
    parentId?: string;
}

interface EnhancedCommentsProps {
    postId: string;
    comments: Comment[];
    onAddComment: (content: string, parentId?: string) => Promise<void>;
    onReact: (commentId: string, reaction: string) => Promise<void>;
    onTip: (commentId: string, amount: number) => Promise<void>;
}

export default function EnhancedComments({
    postId,
    comments,
    onAddComment,
    onReact,
    onTip,
}: EnhancedCommentsProps) {
    const [localComments, setLocalComments] = useState(comments);
    const [commentText, setCommentText] = useState('');
    const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
    const [showReactions, setShowReactions] = useState<string | null>(null);
    const [showTipModal, setShowTipModal] = useState<Comment | null>(null);
    const [tipAmount, setTipAmount] = useState('');

    // Subscribe to real-time comment updates
    useEffect(() => {
        const unsubscribe = webSocketService.on('new_comment', (data: any) => {
            if (data.postId === postId) {
                setLocalComments(prev => [...prev, data.comment]);
            }
        });

        return () => unsubscribe();
    }, [postId]);

    // Update local state when props change
    useEffect(() => {
        setLocalComments(comments);
    }, [comments]);

    const reactions = [
        { type: 'like', icon: 'thumbs-up', color: '#007AFF' },
        { type: 'love', icon: 'heart', color: '#FF3B30' },
        { type: 'laugh', icon: 'happy', color: '#FFD60A' },
        { type: 'wow', icon: 'flame', color: '#FF9500' },
    ];

    const handleSubmitComment = async () => {
        if (!commentText.trim()) return;

        try {
            await onAddComment(commentText, replyingTo?.id);
            setCommentText('');
            setReplyingTo(null);
        } catch (error) {
            Alert.alert('Error', 'Failed to post comment');
        }
    };

    const handleReaction = async (commentId: string, reaction: string) => {
        try {
            await onReact(commentId, reaction);
            setShowReactions(null);
        } catch (error) {
            Alert.alert('Error', 'Failed to add reaction');
        }
    };

    const handleTip = async () => {
        if (!showTipModal || !tipAmount) return;

        const amount = parseFloat(tipAmount);
        if (isNaN(amount) || amount <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid tip amount');
            return;
        }

        try {
            await onTip(showTipModal.id, amount);
            setShowTipModal(null);
            setTipAmount('');
            Alert.alert('Success', `Tipped ${amount} tokens!`);
        } catch (error) {
            Alert.alert('Error', 'Failed to send tip');
        }
    };

    const renderComment = ({ item, isReply = false }: { item: Comment; isReply?: boolean }) => {
        const totalReactions = Object.values(item.reactions).reduce((a, b) => a + b, 0);

        return (
            <View style={[styles.commentContainer, isReply && styles.replyContainer]}>
                {/* Avatar */}
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {item.author.displayName.charAt(0).toUpperCase()}
                    </Text>
                </View>

                <View style={styles.commentContent}>
                    {/* Author & Time */}
                    <View style={styles.commentHeader}>
                        <Text style={styles.authorName}>{item.author.displayName}</Text>
                        <Text style={styles.username}>@{item.author.handle}</Text>
                        <Text style={styles.timestamp}>
                            {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                    </View>

                    {/* Content */}
                    <Text style={styles.commentText}>{item.content}</Text>

                    {/* Reactions Bar */}
                    {totalReactions > 0 && (
                        <View style={styles.reactionsBar}>
                            {Object.entries(item.reactions).map(([type, count]) => {
                                if (count === 0) return null;
                                const reaction = reactions.find(r => r.type === type);
                                return (
                                    <View key={type} style={styles.reactionCount}>
                                        <Ionicons
                                            name={reaction?.icon as any}
                                            size={14}
                                            color={reaction?.color}
                                        />
                                        <Text style={styles.reactionCountText}>{count}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => setShowReactions(showReactions === item.id ? null : item.id)}
                        >
                            <Ionicons
                                name={item.userReaction ? 'heart' : 'heart-outline'}
                                size={16}
                                color={item.userReaction ? '#FF3B30' : '#8E8E93'}
                            />
                            <Text style={styles.actionText}>React</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => setReplyingTo(item)}
                        >
                            <Ionicons name="chatbubble-outline" size={16} color="#8E8E93" />
                            <Text style={styles.actionText}>Reply</Text>
                            {item.replyCount > 0 && (
                                <Text style={styles.replyCount}>({item.replyCount})</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => setShowTipModal(item)}
                        >
                            <Ionicons name="gift-outline" size={16} color="#FFD60A" />
                            <Text style={styles.actionText}>Tip</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Reaction Picker */}
                    {showReactions === item.id && (
                        <View style={styles.reactionPicker}>
                            {reactions.map(reaction => (
                                <TouchableOpacity
                                    key={reaction.type}
                                    style={styles.reactionOption}
                                    onPress={() => handleReaction(item.id, reaction.type)}
                                >
                                    <Ionicons
                                        name={reaction.icon as any}
                                        size={24}
                                        color={reaction.color}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Replies */}
                    {item.replies && item.replies.length > 0 && (
                        <View style={styles.repliesContainer}>
                            {item.replies.map(reply => (
                                <View key={reply.id}>
                                    {renderComment({ item: reply, isReply: true })}
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Comments List */}
            <FlatList
                data={localComments.filter(c => !c.parentId)}
                renderItem={renderComment}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="chatbubbles-outline" size={48} color="#C7C7CC" />
                        <Text style={styles.emptyText}>No comments yet</Text>
                        <Text style={styles.emptySubtext}>Be the first to comment!</Text>
                    </View>
                }
            />

            {/* Reply Indicator */}
            {replyingTo && (
                <View style={styles.replyIndicator}>
                    <Text style={styles.replyingText}>
                        Replying to @{replyingTo.author.handle}
                    </Text>
                    <TouchableOpacity onPress={() => setReplyingTo(null)}>
                        <Ionicons name="close" size={20} color="#8E8E93" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Comment Input */}
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Add a comment..."
                    value={commentText}
                    onChangeText={setCommentText}
                    multiline
                    maxLength={500}
                />
                <TouchableOpacity
                    style={[styles.sendButton, !commentText.trim() && styles.sendButtonDisabled]}
                    onPress={handleSubmitComment}
                    disabled={!commentText.trim()}
                >
                    <Ionicons
                        name="send"
                        size={20}
                        color={commentText.trim() ? '#007AFF' : '#C7C7CC'}
                    />
                </TouchableOpacity>
            </View>

            {/* Tip Modal */}
            <Modal
                visible={!!showTipModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowTipModal(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Send Tip</Text>
                            <TouchableOpacity onPress={() => setShowTipModal(null)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>
                            Tip @{showTipModal?.author.handle} for their comment
                        </Text>

                        <TextInput
                            style={styles.tipInput}
                            placeholder="Amount (tokens)"
                            value={tipAmount}
                            onChangeText={setTipAmount}
                            keyboardType="decimal-pad"
                        />

                        <View style={styles.quickTipButtons}>
                            {[1, 5, 10, 25].map(amount => (
                                <TouchableOpacity
                                    key={amount}
                                    style={styles.quickTipButton}
                                    onPress={() => setTipAmount(amount.toString())}
                                >
                                    <Text style={styles.quickTipText}>{amount}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[styles.tipButton, !tipAmount && styles.tipButtonDisabled]}
                            onPress={handleTip}
                            disabled={!tipAmount}
                        >
                            <Text style={styles.tipButtonText}>Send Tip</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    commentContainer: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    replyContainer: {
        marginLeft: 40,
        paddingTop: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    commentContent: {
        flex: 1,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    authorName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
        marginRight: 6,
    },
    username: {
        fontSize: 14,
        color: '#8E8E93',
        marginRight: 6,
    },
    timestamp: {
        fontSize: 12,
        color: '#C7C7CC',
    },
    commentText: {
        fontSize: 15,
        color: '#000',
        lineHeight: 20,
        marginBottom: 8,
    },
    reactionsBar: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    reactionCount: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    reactionCountText: {
        fontSize: 13,
        color: '#8E8E93',
        marginLeft: 4,
    },
    actions: {
        flexDirection: 'row',
        marginTop: 4,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    actionText: {
        fontSize: 13,
        color: '#8E8E93',
        marginLeft: 4,
    },
    replyCount: {
        fontSize: 13,
        color: '#8E8E93',
        marginLeft: 2,
    },
    reactionPicker: {
        flexDirection: 'row',
        backgroundColor: '#F2F2F7',
        borderRadius: 20,
        padding: 8,
        marginTop: 8,
        alignSelf: 'flex-start',
    },
    reactionOption: {
        padding: 8,
    },
    repliesContainer: {
        marginTop: 12,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#8E8E93',
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#C7C7CC',
        marginTop: 4,
    },
    replyIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F2F2F7',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA',
    },
    replyingText: {
        fontSize: 14,
        color: '#007AFF',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA',
        backgroundColor: '#fff',
    },
    input: {
        flex: 1,
        backgroundColor: '#F2F2F7',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        fontSize: 15,
        maxHeight: 100,
        marginRight: 8,
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E3F2FD',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#F2F2F7',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 34,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#8E8E93',
        padding: 16,
        paddingTop: 8,
    },
    tipInput: {
        backgroundColor: '#F2F2F7',
        borderRadius: 10,
        padding: 16,
        fontSize: 16,
        marginHorizontal: 16,
        marginBottom: 16,
    },
    quickTipButtons: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    quickTipButton: {
        flex: 1,
        backgroundColor: '#F2F2F7',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        marginRight: 8,
    },
    quickTipText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#007AFF',
    },
    tipButton: {
        backgroundColor: '#007AFF',
        borderRadius: 10,
        padding: 16,
        alignItems: 'center',
        marginHorizontal: 16,
    },
    tipButtonDisabled: {
        backgroundColor: '#C7C7CC',
    },
    tipButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});
