/**
 * Enhanced PostComposer Component
 * Facebook-style mobile post composer with emoji picker, location tagging,
 * link previews, hashtag extraction, and social media sharing
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import EmojiSelector from 'react-native-emoji-selector';
import { THEME } from '../constants/theme';

interface PostComposerProps {
    onSubmit: (data: CreatePostData) => Promise<void>;
    handle?: string;
    placeholder?: string;
}

export interface CreatePostData {
    content: string;
    attachments?: Array<{
        type: 'image' | 'video';
        url: string;
    }>;
    tags?: string[];
    location?: string;
    shareToSocialMedia?: {
        twitter?: boolean;
        facebook?: boolean;
        linkedin?: boolean;
        threads?: boolean;
    };
}

interface LinkPreview {
    url: string;
    title?: string;
    description?: string;
    image?: string;
}

export function PostComposer({
    onSubmit,
    handle = 'User',
    placeholder = "What's on your mind?",
}: PostComposerProps) {
    // Content state
    const [content, setContent] = useState('');
    const [imageUri, setImageUri] = useState<string | undefined>();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // Enhanced features state
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<{ name: string; address?: string } | null>(null);
    const [gettingLocation, setGettingLocation] = useState(false);

    // Link previews
    const [linkPreviews, setLinkPreviews] = useState<LinkPreview[]>([]);

    // Social sharing toggles
    const [shareToTwitter, setShareToTwitter] = useState(false);
    const [shareToFacebook, setShareToFacebook] = useState(false);
    const [shareToLinkedIn, setShareToLinkedIn] = useState(false);
    const [shareToThreads, setShareToThreads] = useState(false);

    const MAX_CHARACTERS = 280;
    const characterCount = content.length;
    const isOverLimit = characterCount > MAX_CHARACTERS;
    const canSubmit = content.trim().length > 0 && !isOverLimit && !isSubmitting;

    // Extract hashtags from content
    const extractHashtags = useCallback((text: string): string[] => {
        const hashtagRegex = /#(\w+)/g;
        const matches = text.match(hashtagRegex);
        return matches ? matches.map(tag => tag.slice(1)) : [];
    }, []);

    const hashtags = extractHashtags(content);

    // Detect links in content
    const detectLinks = useCallback((text: string): string[] => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.match(urlRegex) || [];
    }, []);

    // Auto-detect and preview links
    useEffect(() => {
        const urls = detectLinks(content);
        const newUrls = urls.filter(url => !linkPreviews.some(p => p.url === url));

        if (newUrls.length > 0) {
            // Simple preview - in production, fetch from backend
            newUrls.forEach(url => {
                setLinkPreviews(prev => [...prev, {
                    url,
                    title: 'Link Preview',
                    description: url,
                }]);
            });
        }
    }, [content]);

    // Emoji picker handler
    const handleEmojiSelect = (emoji: string) => {
        setContent(prev => prev + emoji);
        setShowEmojiPicker(false);
    };

    // Location handlers
    const handleGetCurrentLocation = async () => {
        setGettingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Please grant location permissions to tag your location.'
                );
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            const address = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });

            if (address[0]) {
                setSelectedLocation({
                    name: address[0].city || address[0].region || 'Current Location',
                    address: address[0].street,
                });
            }
            setShowLocationPicker(false);
        } catch (error) {
            console.error('Error getting location:', error);
            Alert.alert('Error', 'Failed to get current location');
        } finally {
            setGettingLocation(false);
        }
    };

    // Image picker handler
    const handlePickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Please grant camera roll permissions to attach images.'
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setImageUri(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const handleRemoveImage = () => {
        setImageUri(undefined);
    };

    const handleRemoveLinkPreview = (url: string) => {
        setLinkPreviews(prev => prev.filter(p => p.url !== url));
    };

    // Submit handler
    const handleSubmit = async () => {
        if (!canSubmit) return;

        setIsSubmitting(true);
        try {
            const postData: CreatePostData = {
                content,
                tags: hashtags,
                location: selectedLocation?.name,
                shareToSocialMedia: {
                    twitter: shareToTwitter,
                    facebook: shareToFacebook,
                    linkedin: shareToLinkedIn,
                    threads: shareToThreads,
                },
            };

            if (imageUri) {
                postData.attachments = [{
                    type: 'image',
                    url: imageUri,
                }];
            }

            await onSubmit(postData);

            // Clear form on success
            setContent('');
            setImageUri(undefined);
            setSelectedLocation(null);
            setLinkPreviews([]);
            setShareToTwitter(false);
            setShareToFacebook(false);
            setShareToLinkedIn(false);
            setShareToThreads(false);
            setIsFocused(false);
        } catch (error) {
            console.error('Error submitting post:', error);
            Alert.alert('Error', 'Failed to create post. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View style={[styles.container, isFocused && styles.containerFocused]}>
            {/* Header with Avatar */}
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Ionicons name="person" size={20} color="#9ca3af" />
                    </View>
                </View>

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder={placeholder}
                        placeholderTextColor="#9ca3af"
                        value={content}
                        onChangeText={setContent}
                        multiline
                        maxLength={MAX_CHARACTERS + 50}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => {
                            // Only blur if content is empty, otherwise keep focused
                            if (!content.trim()) {
                                setIsFocused(false);
                            }
                        }}
                        editable={!isSubmitting}
                    />
                </View>
            </View>

            {/* Hashtags */}
            {hashtags.length > 0 && (
                <View style={styles.hashtagContainer}>
                    {hashtags.map((tag, index) => (
                        <View key={index} style={styles.hashtagChip}>
                            <Text style={styles.hashtagText}>#{tag}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Link Previews */}
            {linkPreviews.map((preview, index) => (
                <View key={index} style={styles.linkPreviewCard}>
                    <View style={styles.linkPreviewContent}>
                        <Text style={styles.linkPreviewTitle} numberOfLines={1}>
                            {preview.title}
                        </Text>
                        <Text style={styles.linkPreviewUrl} numberOfLines={1}>
                            {preview.url}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => handleRemoveLinkPreview(preview.url)}
                        style={styles.linkPreviewRemove}
                    >
                        <Ionicons name="close" size={16} color="#6b7280" />
                    </TouchableOpacity>
                </View>
            ))}

            {/* Location Chip */}
            {selectedLocation && (
                <View style={styles.locationChip}>
                    <Ionicons name="location" size={14} color="#ef4444" />
                    <Text style={styles.locationText}>{selectedLocation.name}</Text>
                    <TouchableOpacity onPress={() => setSelectedLocation(null)}>
                        <Ionicons name="close" size={14} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Image Preview */}
            {imageUri && (
                <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                    <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={handleRemoveImage}
                        disabled={isSubmitting}
                    >
                        <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Actions Bar - Always show when focused */}
            {isFocused && (
                <View style={styles.actionsBar}>
                    <View style={styles.leftActions}>
                        {/* Emoji Button */}
                        <TouchableOpacity
                            style={[styles.actionButton, showEmojiPicker && styles.actionButtonActive]}
                            onPress={() => setShowEmojiPicker(!showEmojiPicker)}
                            disabled={isSubmitting}
                        >
                            <Ionicons name="happy-outline" size={20} color={showEmojiPicker ? "#3b82f6" : "#6b7280"} />
                        </TouchableOpacity>

                        {/* Location Button */}
                        <TouchableOpacity
                            style={[styles.actionButton, (showLocationPicker || selectedLocation) && styles.actionButtonActive]}
                            onPress={() => setShowLocationPicker(true)}
                            disabled={isSubmitting}
                        >
                            <Ionicons name="location-outline" size={20} color={(showLocationPicker || selectedLocation) ? "#ef4444" : "#6b7280"} />
                        </TouchableOpacity>

                        {/* Image Button */}
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={handlePickImage}
                            disabled={isSubmitting}
                        >
                            <Ionicons name="image-outline" size={20} color="#6b7280" />
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.divider} />

                        {/* Social Media Toggles */}
                        <TouchableOpacity
                            style={[styles.socialButton, shareToTwitter && styles.socialButtonActive]}
                            onPress={() => setShareToTwitter(!shareToTwitter)}
                            disabled={isSubmitting}
                        >
                            <Text style={[styles.socialButtonText, shareToTwitter && styles.socialButtonTextActive]}>𝕏</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.socialButton, shareToFacebook && styles.socialButtonActive]}
                            onPress={() => setShareToFacebook(!shareToFacebook)}
                            disabled={isSubmitting}
                        >
                            <Text style={[styles.socialButtonText, shareToFacebook && styles.socialButtonTextActive]}>f</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.socialButton, shareToLinkedIn && styles.socialButtonActive]}
                            onPress={() => setShareToLinkedIn(!shareToLinkedIn)}
                            disabled={isSubmitting}
                        >
                            <Text style={[styles.socialButtonText, shareToLinkedIn && styles.socialButtonTextActive]}>in</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.socialButton, shareToThreads && styles.socialButtonActive]}
                            onPress={() => setShareToThreads(!shareToThreads)}
                            disabled={isSubmitting}
                        >
                            <Text style={[styles.socialButtonText, shareToThreads && styles.socialButtonTextActive]}>@</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.rightActions}>
                        {/* Character Count */}
                        <Text style={[
                            styles.characterCountText,
                            isOverLimit && styles.characterCountError
                        ]}>
                            {characterCount}/{MAX_CHARACTERS}
                        </Text>

                        {/* Post Button */}
                        <TouchableOpacity
                            style={[
                                styles.postButton,
                                !canSubmit && styles.postButtonDisabled
                            ]}
                            onPress={handleSubmit}
                            disabled={!canSubmit}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                                <Text style={styles.postButtonText}>Post</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Emoji Picker Modal */}
            <Modal
                visible={showEmojiPicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowEmojiPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.emojiPickerContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Emoji</Text>
                            <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
                                <Ionicons name="close" size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>
                        <EmojiSelector
                            onEmojiSelected={handleEmojiSelect}
                            showSearchBar={false}
                            columns={8}
                        />
                    </View>
                </View>
            </Modal>

            {/* Location Picker Modal */}
            <Modal
                visible={showLocationPicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowLocationPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.locationPickerContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Location</Text>
                            <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
                                <Ionicons name="close" size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            style={styles.locationOption}
                            onPress={handleGetCurrentLocation}
                            disabled={gettingLocation}
                        >
                            {gettingLocation ? (
                                <ActivityIndicator size="small" color="#3b82f6" />
                            ) : (
                                <Ionicons name="navigate" size={24} color="#3b82f6" />
                            )}
                            <Text style={styles.locationOptionText}>Use Current Location</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        borderRadius: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        padding: 12,
        marginBottom: 0,
    },
    containerFocused: {
        borderColor: '#3b82f6',
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarPlaceholder: {
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputContainer: {
        flex: 1,
    },
    input: {
        fontSize: 16,
        color: '#1f2937',
        minHeight: 44,
        maxHeight: 120,
        textAlignVertical: 'top',
    },
    hashtagContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
        gap: 6,
    },
    hashtagChip: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    hashtagText: {
        fontSize: 12,
        color: '#3b82f6',
        fontWeight: '600',
    },
    linkPreviewCard: {
        flexDirection: 'row',
        marginTop: 12,
        padding: 10,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    linkPreviewContent: {
        flex: 1,
    },
    linkPreviewTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    linkPreviewUrl: {
        fontSize: 12,
        color: '#6b7280',
    },
    linkPreviewRemove: {
        padding: 4,
    },
    locationChip: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginTop: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: '#fef2f2',
        borderRadius: 16,
        gap: 4,
    },
    locationText: {
        fontSize: 12,
        color: '#ef4444',
        fontWeight: '600',
    },
    imagePreviewContainer: {
        marginTop: 12,
        position: 'relative',
    },
    imagePreview: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
    },
    removeImageButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#ffffff',
        borderRadius: 12,
    },
    actionsBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    leftActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    actionButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#f9fafb',
    },
    actionButtonActive: {
        backgroundColor: '#eff6ff',
    },
    divider: {
        width: 1,
        height: 20,
        backgroundColor: '#e5e7eb',
        marginHorizontal: 4,
    },
    socialButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#f9fafb',
        justifyContent: 'center',
        alignItems: 'center',
    },
    socialButtonActive: {
        backgroundColor: '#3b82f6',
    },
    socialButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6b7280',
    },
    socialButtonTextActive: {
        color: '#ffffff',
    },
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    characterCountText: {
        fontSize: 12,
        color: '#6b7280',
    },
    characterCountError: {
        color: '#ef4444',
        fontWeight: '600',
    },
    postButton: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 70,
        alignItems: 'center',
    },
    postButtonDisabled: {
        backgroundColor: '#9ca3af',
        opacity: 0.5,
    },
    postButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    emojiPickerContainer: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
    },
    locationPickerContainer: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
    },
    locationOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    locationOptionText: {
        fontSize: 16,
        color: '#1f2937',
    },
});
