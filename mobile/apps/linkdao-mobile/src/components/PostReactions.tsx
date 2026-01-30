/**
 * Post Reactions Component
 * Quick reactions for posts with visual feedback
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { webSocketService } from '../services/webSocketService';
import { hapticFeedback } from '../utils/haptics';

export interface Reaction {
    type: 'fire' | 'rocket' | 'diamond';
    count: number;
}

interface PostReactionsProps {
    postId: string;
    reactions: Reaction[];
    userReaction?: string;
    onReact: (reactionType: string) => Promise<void>;
    compact?: boolean;
}

export default function PostReactions({
    postId,
    reactions,
    userReaction,
    onReact,
    compact = false,
}: PostReactionsProps) {
    const [localReactions, setLocalReactions] = useState(reactions);
    const [localUserReaction, setLocalUserReaction] = useState(userReaction);
    const [showPicker, setShowPicker] = useState(false);
    const [animating, setAnimating] = useState(false);
    const scaleAnim = useState(new Animated.Value(1))[0];

    // Subscribe to real-time reaction updates
    useEffect(() => {
        const unsubscribe = webSocketService.on('reaction:update', (data: any) => {
            if (data.postId === postId) {
                setLocalReactions(data.reactions);
                // Update user reaction if it's for current user
                if (data.userReaction !== undefined) {
                    setLocalUserReaction(data.userReaction);
                }
            }
        });

        return () => unsubscribe();
    }, [postId]);

    // Update local state when props change
    useEffect(() => {
        setLocalReactions(reactions);
    }, [reactions]);

    useEffect(() => {
        setLocalUserReaction(userReaction);
    }, [userReaction]);

    // Aligned with backend: 🔥 Fire, 🚀 Rocket, 💎 Diamond
    const reactionConfig = [
        { type: 'fire', icon: 'flame', emoji: '🔥', color: '#FF6B35', label: 'Fire' },
        { type: 'rocket', icon: 'rocket', emoji: '🚀', color: '#4ECDC4', label: 'Rocket' },
        { type: 'diamond', icon: 'diamond', emoji: '💎', color: '#95E1D3', label: 'Diamond' },
    ];

    const totalReactions = localReactions.reduce((sum, r) => sum + r.count, 0);

    const handleReaction = async (reactionType: string) => {
        // Optimistic update
        const newUserReaction = localUserReaction === reactionType ? undefined : reactionType;
        setLocalUserReaction(newUserReaction);

        // Haptic feedback
        hapticFeedback.medium();

        setShowPicker(false);
        setAnimating(true);

        // Animate reaction
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 1.3,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start(() => setAnimating(false));

        await onReact(reactionType);
    };

    const handleLongPress = () => {
        hapticFeedback.selection();
        setShowPicker(true);
    };

    const handleQuickReact = async () => {
        hapticFeedback.light();
        if (localUserReaction) {
            // Remove reaction
            await handleReaction(localUserReaction);
        } else {
            // Quick fire reaction
            await handleReaction('fire');
        }
    };

    const getUserReactionConfig = () => {
        if (!localUserReaction) return null;
        return reactionConfig.find(r => r.type === localUserReaction);
    };

    const currentReaction = getUserReactionConfig();

    if (compact) {
        return (
            <TouchableOpacity
                style={styles.compactContainer}
                onPress={handleQuickReact}
                onLongPress={handleLongPress}
                delayLongPress={500}
            >
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                    <Ionicons
                        name={currentReaction ? currentReaction.icon as any : 'heart-outline'}
                        size={20}
                        color={currentReaction ? currentReaction.color : '#8E8E93'}
                    />
                </Animated.View>
                {totalReactions > 0 && (
                    <Text style={styles.compactCount}>{totalReactions}</Text>
                )}
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.container}>
            {/* Main Reaction Button */}
            <TouchableOpacity
                style={styles.mainButton}
                onPress={handleQuickReact}
                onLongPress={handleLongPress}
                delayLongPress={500}
            >
                <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleAnim }] }]}>
                    <Ionicons
                        name={currentReaction ? currentReaction.icon as any : 'heart-outline'}
                        size={22}
                        color={currentReaction ? currentReaction.color : '#8E8E93'}
                    />
                </Animated.View>
                <Text style={[styles.buttonText, currentReaction && { color: currentReaction.color }]}>
                    {currentReaction ? currentReaction.label : 'React'}
                </Text>
            </TouchableOpacity>

            {/* Reaction Counts */}
            {totalReactions > 0 && (
                <View style={styles.countsContainer}>
                    {reactions
                        .filter(r => r.count > 0)
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 3)
                        .map(reaction => {
                            const config = reactionConfig.find(r => r.type === reaction.type);
                            return (
                                <View key={reaction.type} style={styles.reactionBadge}>
                                    <Ionicons
                                        name={config?.icon as any}
                                        size={14}
                                        color={config?.color}
                                    />
                                    <Text style={styles.badgeCount}>{reaction.count}</Text>
                                </View>
                            );
                        })}
                </View>
            )}

            {/* Reaction Picker Modal */}
            <Modal
                visible={showPicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowPicker(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowPicker(false)}
                >
                    <View style={styles.pickerContainer}>
                        {reactionConfig.map(reaction => (
                            <TouchableOpacity
                                key={reaction.type}
                                style={[
                                    styles.reactionOption,
                                    userReaction === reaction.type && styles.reactionOptionActive,
                                ]}
                                onPress={() => handleReaction(reaction.type)}
                            >
                                <Ionicons
                                    name={reaction.icon as any}
                                    size={32}
                                    color={reaction.color}
                                />
                                <Text style={styles.reactionLabel}>{reaction.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    compactContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
    },
    compactCount: {
        fontSize: 14,
        color: '#8E8E93',
        marginLeft: 4,
    },
    mainButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: '#F2F2F7',
    },
    iconContainer: {
        marginRight: 6,
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#8E8E93',
    },
    countsContainer: {
        flexDirection: 'row',
        marginLeft: 12,
    },
    reactionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginRight: 6,
    },
    badgeCount: {
        fontSize: 12,
        fontWeight: '600',
        color: '#000',
        marginLeft: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 30,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    reactionOption: {
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
    },
    reactionOptionActive: {
        backgroundColor: '#F2F2F7',
    },
    reactionLabel: {
        fontSize: 11,
        fontWeight: '500',
        color: '#8E8E93',
        marginTop: 4,
    },
});
