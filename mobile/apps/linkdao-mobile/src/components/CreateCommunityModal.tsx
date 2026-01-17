/**
 * Create Community Modal
 * Full-featured community creation with all settings
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Switch,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { communitiesService } from '../../src/services';

interface CreateCommunityModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function CreateCommunityModal({ visible, onClose }: CreateCommunityModalProps) {
    const [name, setName] = useState('');
    const [handle, setHandle] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [avatar, setAvatar] = useState<string | undefined>();
    const [banner, setBanner] = useState<string | undefined>();
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [rules, setRules] = useState<string[]>(['Be respectful', 'No spam']);
    const [ruleInput, setRuleInput] = useState('');
    const [creating, setCreating] = useState(false);

    const handlePickAvatar = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant photo library access');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
            setAvatar(result.assets[0].uri);
        }
    };

    const handlePickBanner = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant photo library access');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
            setBanner(result.assets[0].uri);
        }
    };

    const handleAddTag = () => {
        if (tagInput.trim() && tags.length < 5) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (index: number) => {
        setTags(tags.filter((_, i) => i !== index));
    };

    const handleAddRule = () => {
        if (ruleInput.trim() && rules.length < 10) {
            setRules([...rules, ruleInput.trim()]);
            setRuleInput('');
        }
    };

    const handleRemoveRule = (index: number) => {
        setRules(rules.filter((_, i) => i !== index));
    };

    const validateForm = (): boolean => {
        if (!name.trim()) {
            Alert.alert('Missing Information', 'Please enter a community name');
            return false;
        }
        if (!handle.trim()) {
            Alert.alert('Missing Information', 'Please enter a community handle');
            return false;
        }
        if (!/^[a-z0-9_-]+$/.test(handle)) {
            Alert.alert('Invalid Handle', 'Handle can only contain lowercase letters, numbers, hyphens, and underscores');
            return false;
        }
        if (!description.trim()) {
            Alert.alert('Missing Information', 'Please enter a description');
            return false;
        }
        return true;
    };

    const handleCreate = async () => {
        if (!validateForm()) return;

        setCreating(true);
        try {
            const community = await communitiesService.createCommunity({
                name,
                handle,
                description,
                avatar,
                banner,
                isPublic,
                tags,
                rules,
            });

            if (community) {
                Alert.alert(
                    'Community Created!',
                    `${name} has been created successfully.`,
                    [
                        {
                            text: 'View Community',
                            onPress: () => {
                                onClose();
                                router.push(`/communities/${community.id}`);
                            },
                        },
                    ]
                );
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to create community');
        } finally {
            setCreating(false);
        }
    };

    const handleClose = () => {
        setName('');
        setHandle('');
        setDescription('');
        setIsPublic(true);
        setAvatar(undefined);
        setBanner(undefined);
        setTags([]);
        setRules(['Be respectful', 'No spam']);
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleClose} disabled={creating}>
                        <Text style={styles.cancelButton}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Create Community</Text>
                    <TouchableOpacity onPress={handleCreate} disabled={creating}>
                        {creating ? (
                            <ActivityIndicator size="small" color="#3b82f6" />
                        ) : (
                            <Text style={styles.createButton}>Create</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content}>
                    {/* Banner */}
                    <TouchableOpacity style={styles.bannerContainer} onPress={handlePickBanner}>
                        {banner ? (
                            <View style={styles.bannerPlaceholder} />
                        ) : (
                            <View style={styles.bannerEmpty}>
                                <Ionicons name="image-outline" size={32} color="#9ca3af" />
                                <Text style={styles.bannerText}>Add Banner</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Avatar */}
                    <TouchableOpacity style={styles.avatarContainer} onPress={handlePickAvatar}>
                        {avatar ? (
                            <View style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarEmpty]}>
                                <Ionicons name="camera-outline" size={24} color="#9ca3af" />
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Basic Info */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Community Name *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., Web3 Developers"
                            value={name}
                            onChangeText={setName}
                            maxLength={50}
                        />

                        <Text style={styles.label}>Handle *</Text>
                        <View style={styles.handleInput}>
                            <Text style={styles.handlePrefix}>@</Text>
                            <TextInput
                                style={styles.handleTextInput}
                                placeholder="web3-devs"
                                value={handle}
                                onChangeText={(text) => setHandle(text.toLowerCase())}
                                maxLength={30}
                                autoCapitalize="none"
                            />
                        </View>
                        <Text style={styles.hint}>Lowercase letters, numbers, hyphens, and underscores only</Text>

                        <Text style={styles.label}>Description *</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="What's your community about?"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={4}
                            maxLength={500}
                        />
                        <Text style={styles.charCount}>{description.length}/500</Text>
                    </View>

                    {/* Privacy */}
                    <View style={styles.section}>
                        <View style={styles.switchRow}>
                            <View style={styles.switchInfo}>
                                <Text style={styles.switchLabel}>Public Community</Text>
                                <Text style={styles.switchHint}>
                                    {isPublic ? 'Anyone can view and join' : 'Invite-only'}
                                </Text>
                            </View>
                            <Switch value={isPublic} onValueChange={setIsPublic} />
                        </View>
                    </View>

                    {/* Tags */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Tags (up to 5)</Text>
                        <View style={styles.tagInput}>
                            <TextInput
                                style={styles.tagTextInput}
                                placeholder="Add a tag..."
                                value={tagInput}
                                onChangeText={setTagInput}
                                onSubmitEditing={handleAddTag}
                                maxLength={20}
                            />
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={handleAddTag}
                                disabled={!tagInput.trim() || tags.length >= 5}
                            >
                                <Ionicons name="add" size={20} color="#3b82f6" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.tagsContainer}>
                            {tags.map((tag, index) => (
                                <View key={index} style={styles.tag}>
                                    <Text style={styles.tagText}>#{tag}</Text>
                                    <TouchableOpacity onPress={() => handleRemoveTag(index)}>
                                        <Ionicons name="close-circle" size={16} color="#6b7280" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Rules */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Community Rules</Text>
                        {rules.map((rule, index) => (
                            <View key={index} style={styles.ruleItem}>
                                <Text style={styles.ruleNumber}>{index + 1}.</Text>
                                <Text style={styles.ruleText}>{rule}</Text>
                                <TouchableOpacity onPress={() => handleRemoveRule(index)}>
                                    <Ionicons name="close-circle" size={18} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        <View style={styles.ruleInput}>
                            <TextInput
                                style={styles.ruleTextInput}
                                placeholder="Add a rule..."
                                value={ruleInput}
                                onChangeText={setRuleInput}
                                onSubmitEditing={handleAddRule}
                                maxLength={100}
                            />
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={handleAddRule}
                                disabled={!ruleInput.trim() || rules.length >= 10}
                            >
                                <Ionicons name="add" size={20} color="#3b82f6" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={{ height: 50 }} />
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
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
    createButton: {
        fontSize: 16,
        fontWeight: '600',
        color: '#3b82f6',
    },
    content: {
        flex: 1,
    },
    bannerContainer: {
        height: 150,
        backgroundColor: '#f3f4f6',
    },
    bannerPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#e5e7eb',
    },
    bannerEmpty: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bannerText: {
        marginTop: 8,
        fontSize: 14,
        color: '#6b7280',
    },
    avatarContainer: {
        marginTop: -40,
        marginLeft: 16,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#e5e7eb',
        borderWidth: 4,
        borderColor: '#ffffff',
    },
    avatarEmpty: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    section: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#1f2937',
        marginBottom: 12,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    handleInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        marginBottom: 4,
    },
    handlePrefix: {
        paddingLeft: 12,
        fontSize: 16,
        color: '#6b7280',
    },
    handleTextInput: {
        flex: 1,
        padding: 12,
        fontSize: 16,
        color: '#1f2937',
    },
    hint: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 12,
    },
    charCount: {
        fontSize: 12,
        color: '#9ca3af',
        textAlign: 'right',
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    switchInfo: {
        flex: 1,
    },
    switchLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    switchHint: {
        fontSize: 14,
        color: '#6b7280',
    },
    tagInput: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    tagTextInput: {
        flex: 1,
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#1f2937',
        marginRight: 8,
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eff6ff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    tagText: {
        fontSize: 14,
        color: '#3b82f6',
        fontWeight: '500',
    },
    ruleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        marginBottom: 8,
    },
    ruleNumber: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
        marginRight: 8,
    },
    ruleText: {
        flex: 1,
        fontSize: 14,
        color: '#1f2937',
    },
    ruleInput: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ruleTextInput: {
        flex: 1,
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#1f2937',
        marginRight: 8,
    },
});
