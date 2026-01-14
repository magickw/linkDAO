/**
 * Enhanced Post Composer
 * Full-featured post creation with rich text, media, polls, and social sharing
 */

import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';

interface EnhancedPostComposerProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (postData: PostData) => Promise<void>;
    communityId?: string;
}

interface PostData {
    content: string;
    mediaUrls: string[];
    tags: string[];
    pollData?: PollData;
    shareToSocialMedia?: {
        twitter?: boolean;
        facebook?: boolean;
        linkedin?: boolean;
        threads?: boolean;
    };
    communityId?: string;
}

interface PollData {
    question: string;
    options: string[];
    duration: number; // hours
}

export default function EnhancedPostComposer({
    visible,
    onClose,
    onSubmit,
    communityId,
}: EnhancedPostComposerProps) {
    const richText = useRef<RichEditor>(null);
    const [content, setContent] = useState('');
    const [mediaItems, setMediaItems] = useState<string[]>([]);
    const [showPollCreator, setShowPollCreator] = useState(false);
    const [pollData, setPollData] = useState<PollData | undefined>();
    const [shareToTwitter, setShareToTwitter] = useState(false);
    const [shareToFacebook, setShareToFacebook] = useState(false);
    const [shareToLinkedIn, setShareToLinkedIn] = useState(false);
    const [shareToThreads, setShareToThreads] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant photo library access to upload images');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
            allowsEditing: false,
        });

        if (!result.canceled) {
            const newMedia = result.assets.map(asset => asset.uri);
            setMediaItems([...mediaItems, ...newMedia]);
        }
    };

    const handleTakePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant camera access to take photos');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            quality: 0.8,
            allowsEditing: true,
        });

        if (!result.canceled) {
            setMediaItems([...mediaItems, result.assets[0].uri]);
        }
    };

    const handleRemoveMedia = (index: number) => {
        setMediaItems(mediaItems.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!content.trim() && mediaItems.length === 0) {
            Alert.alert('Empty post', 'Please add some content or media');
            return;
        }

        setIsSubmitting(true);

        try {
            const postData: PostData = {
                content,
                mediaUrls: mediaItems,
                tags: extractHashtags(content),
                communityId,
            };

            if (pollData) {
                postData.pollData = pollData;
            }

            if (shareToTwitter || shareToFacebook || shareToLinkedIn || shareToThreads) {
                postData.shareToSocialMedia = {
                    twitter: shareToTwitter,
                    facebook: shareToFacebook,
                    linkedin: shareToLinkedIn,
                    threads: shareToThreads,
                };
            }

            await onSubmit(postData);
            handleClose();
        } catch (error) {
            Alert.alert('Error', 'Failed to create post. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setContent('');
        setMediaItems([]);
        setPollData(undefined);
        setShowPollCreator(false);
        setShareToTwitter(false);
        setShareToFacebook(false);
        setShareToLinkedIn(false);
        setShareToThreads(false);
        onClose();
    };

    const extractHashtags = (text: string): string[] => {
        const hashtagRegex = /#(\w+)/g;
        const matches = text.match(hashtagRegex);
        return matches ? matches.map(tag => tag.slice(1)) : [];
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <SafeAreaView style={styles.container}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleClose} disabled={isSubmitting}>
                            <Text style={styles.cancelButton}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Create Post</Text>
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={isSubmitting || (!content.trim() && mediaItems.length === 0)}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color="#3b82f6" />
                            ) : (
                                <Text
                                    style={[
                                        styles.postButton,
                                        (!content.trim() && mediaItems.length === 0) && styles.postButtonDisabled,
                                    ]}
                                >
                                    Post
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        {/* Rich Text Editor */}
                        <View style={styles.editorContainer}>
                            <RichEditor
                                ref={richText}
                                onChange={setContent}
                                placeholder="What's on your mind?"
                                initialHeight={200}
                                style={styles.richEditor}
                            />
                            <RichToolbar
                                editor={richText}
                                actions={[
                                    actions.setBold,
                                    actions.setItalic,
                                    actions.insertBulletsList,
                                    actions.insertOrderedList,
                                    actions.insertLink,
                                ]}
                                iconTint="#6b7280"
                                selectedIconTint="#3b82f6"
                                style={styles.richToolbar}
                            />
                        </View>

                        {/* Media Preview */}
                        {mediaItems.length > 0 && (
                            <View style={styles.mediaPreview}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {mediaItems.map((uri, index) => (
                                        <View key={index} style={styles.mediaItem}>
                                            <View style={styles.mediaPlaceholder} />
                                            <TouchableOpacity
                                                style={styles.removeMediaButton}
                                                onPress={() => handleRemoveMedia(index)}
                                            >
                                                <Ionicons name="close-circle" size={24} color="#ef4444" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* Poll Preview */}
                        {pollData && (
                            <View style={styles.pollPreview}>
                                <View style={styles.pollHeader}>
                                    <Text style={styles.pollQuestion}>{pollData.question}</Text>
                                    <TouchableOpacity onPress={() => setPollData(undefined)}>
                                        <Ionicons name="close-circle" size={20} color="#6b7280" />
                                    </TouchableOpacity>
                                </View>
                                {pollData.options.map((option, index) => (
                                    <View key={index} style={styles.pollOption}>
                                        <Text style={styles.pollOptionText}>{option}</Text>
                                    </View>
                                ))}
                                <Text style={styles.pollDuration}>{pollData.duration} hours</Text>
                            </View>
                        )}

                        {/* Social Sharing Toggles */}
                        <View style={styles.socialSharing}>
                            <Text style={styles.socialSharingTitle}>Share to:</Text>
                            <View style={styles.socialToggles}>
                                <TouchableOpacity
                                    style={[styles.socialToggle, shareToTwitter && styles.socialToggleActive]}
                                    onPress={() => setShareToTwitter(!shareToTwitter)}
                                >
                                    <Text style={[styles.socialToggleText, shareToTwitter && styles.socialToggleTextActive]}>
                                        𝕏
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.socialToggle, shareToFacebook && styles.socialToggleActive]}
                                    onPress={() => setShareToFacebook(!shareToFacebook)}
                                >
                                    <Text style={[styles.socialToggleText, shareToFacebook && styles.socialToggleTextActive]}>
                                        f
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.socialToggle, shareToLinkedIn && styles.socialToggleActive]}
                                    onPress={() => setShareToLinkedIn(!shareToLinkedIn)}
                                >
                                    <Text style={[styles.socialToggleText, shareToLinkedIn && styles.socialToggleTextActive]}>
                                        in
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.socialToggle, shareToThreads && styles.socialToggleActive]}
                                    onPress={() => setShareToThreads(!shareToThreads)}
                                >
                                    <Text style={[styles.socialToggleText, shareToThreads && styles.socialToggleTextActive]}>
                                        @
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Action Bar */}
                    <View style={styles.actionBar}>
                        <TouchableOpacity style={styles.actionButton} onPress={handlePickImage}>
                            <Ionicons name="image-outline" size={24} color="#3b82f6" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={handleTakePhoto}>
                            <Ionicons name="camera-outline" size={24} color="#3b82f6" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => setShowPollCreator(true)}
                        >
                            <Ionicons name="bar-chart-outline" size={24} color="#3b82f6" />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>

            {/* Poll Creator Modal */}
            <PollCreatorModal
                visible={showPollCreator}
                onClose={() => setShowPollCreator(false)}
                onSubmit={(data) => {
                    setPollData(data);
                    setShowPollCreator(false);
                }}
            />
        </Modal>
    );
}

// Poll Creator Modal Component
interface PollCreatorModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: PollData) => void;
}

function PollCreatorModal({ visible, onClose, onSubmit }: PollCreatorModalProps) {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [duration, setDuration] = useState(24);

    const handleAddOption = () => {
        if (options.length < 4) {
            setOptions([...options, '']);
        }
    };

    const handleRemoveOption = (index: number) => {
        if (options.length > 2) {
            setOptions(options.filter((_, i) => i !== index));
        }
    };

    const handleUpdateOption = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleSubmit = () => {
        if (!question.trim()) {
            Alert.alert('Missing question', 'Please enter a poll question');
            return;
        }

        const validOptions = options.filter(opt => opt.trim());
        if (validOptions.length < 2) {
            Alert.alert('Not enough options', 'Please provide at least 2 options');
            return;
        }

        onSubmit({
            question: question.trim(),
            options: validOptions,
            duration,
        });

        // Reset
        setQuestion('');
        setOptions(['', '']);
        setDuration(24);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.pollModalOverlay}>
                <View style={styles.pollModalContent}>
                    <View style={styles.pollModalHeader}>
                        <Text style={styles.pollModalTitle}>Create Poll</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#1f2937" />
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        style={styles.pollQuestionInput}
                        placeholder="Ask a question..."
                        value={question}
                        onChangeText={setQuestion}
                        multiline
                    />

                    {options.map((option, index) => (
                        <View key={index} style={styles.pollOptionInput}>
                            <TextInput
                                style={styles.pollOptionText}
                                placeholder={`Option ${index + 1}`}
                                value={option}
                                onChangeText={(value) => handleUpdateOption(index, value)}
                            />
                            {options.length > 2 && (
                                <TouchableOpacity onPress={() => handleRemoveOption(index)}>
                                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}

                    {options.length < 4 && (
                        <TouchableOpacity style={styles.addOptionButton} onPress={handleAddOption}>
                            <Ionicons name="add-circle-outline" size={20} color="#3b82f6" />
                            <Text style={styles.addOptionText}>Add option</Text>
                        </TouchableOpacity>
                    )}

                    <View style={styles.durationSelector}>
                        <Text style={styles.durationLabel}>Poll duration:</Text>
                        <View style={styles.durationButtons}>
                            {[24, 48, 72, 168].map((hours) => (
                                <TouchableOpacity
                                    key={hours}
                                    style={[
                                        styles.durationButton,
                                        duration === hours && styles.durationButtonActive,
                                    ]}
                                    onPress={() => setDuration(hours)}
                                >
                                    <Text
                                        style={[
                                            styles.durationButtonText,
                                            duration === hours && styles.durationButtonTextActive,
                                        ]}
                                    >
                                        {hours}h
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <TouchableOpacity style={styles.pollSubmitButton} onPress={handleSubmit}>
                        <Text style={styles.pollSubmitButtonText}>Add Poll</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    keyboardView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    cancelButton: {
        fontSize: 16,
        color: '#6b7280',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    postButton: {
        fontSize: 16,
        fontWeight: '600',
        color: '#3b82f6',
    },
    postButtonDisabled: {
        color: '#9ca3af',
    },
    content: {
        flex: 1,
    },
    editorContainer: {
        padding: 16,
    },
    richEditor: {
        minHeight: 200,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        padding: 12,
    },
    richToolbar: {
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        marginTop: 8,
    },
    mediaPreview: {
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    mediaItem: {
        width: 100,
        height: 100,
        marginRight: 8,
        position: 'relative',
    },
    mediaPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#e5e7eb',
        borderRadius: 8,
    },
    removeMediaButton: {
        position: 'absolute',
        top: -8,
        right: -8,
    },
    pollPreview: {
        margin: 16,
        padding: 16,
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    pollHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    pollQuestion: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    pollOption: {
        padding: 12,
        backgroundColor: '#ffffff',
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    pollOptionText: {
        fontSize: 14,
        color: '#374151',
    },
    pollDuration: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 8,
    },
    socialSharing: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    socialSharingTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: 12,
    },
    socialToggles: {
        flexDirection: 'row',
        gap: 12,
    },
    socialToggle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    socialToggleActive: {
        backgroundColor: '#3b82f6',
        borderColor: '#2563eb',
    },
    socialToggleText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#6b7280',
    },
    socialToggleTextActive: {
        color: '#ffffff',
    },
    actionBar: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        gap: 16,
    },
    actionButton: {
        padding: 8,
    },
    // Poll Creator Modal Styles
    pollModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    pollModalContent: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    pollModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    pollModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    pollQuestionInput: {
        fontSize: 16,
        padding: 12,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        marginBottom: 16,
        minHeight: 60,
    },
    pollOptionInput: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    addOptionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        marginBottom: 16,
    },
    addOptionText: {
        fontSize: 14,
        color: '#3b82f6',
        fontWeight: '600',
    },
    durationSelector: {
        marginBottom: 20,
    },
    durationLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: 12,
    },
    durationButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    durationButton: {
        flex: 1,
        padding: 12,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        alignItems: 'center',
    },
    durationButtonActive: {
        backgroundColor: '#3b82f6',
    },
    durationButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
    },
    durationButtonTextActive: {
        color: '#ffffff',
    },
    pollSubmitButton: {
        backgroundColor: '#3b82f6',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    pollSubmitButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ffffff',
    },
});
