/**
 * Community Settings Screen
 * Access member management and moderation tools
 */

import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import MemberManagementScreen from '../../../src/components/MemberManagementScreen';
import ModerationToolsScreen from '../../../src/components/ModerationToolsScreen';
import { useState } from 'react';

export default function CommunitySettingsScreen() {
    const params = useLocalSearchParams();
    const communityId = params.id as string;
    const communityName = params.name as string || 'Community';

    const [activeScreen, setActiveScreen] = useState<'settings' | 'members' | 'moderation'>('settings');

    if (activeScreen === 'members') {
        return <MemberManagementScreen communityId={communityId} communityName={communityName} />;
    }

    if (activeScreen === 'moderation') {
        return <ModerationToolsScreen communityId={communityId} communityName={communityName} />;
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Settings</Text>
                    <Text style={styles.headerSubtitle}>{communityName}</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content}>
                {/* Management Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Management</Text>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => setActiveScreen('members')}
                    >
                        <View style={styles.menuIcon}>
                            <Ionicons name="people" size={24} color="#007AFF" />
                        </View>
                        <View style={styles.menuContent}>
                            <Text style={styles.menuTitle}>Members</Text>
                            <Text style={styles.menuDescription}>Manage roles and permissions</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => setActiveScreen('moderation')}
                    >
                        <View style={styles.menuIcon}>
                            <Ionicons name="shield-checkmark" size={24} color="#FF3B30" />
                        </View>
                        <View style={styles.menuContent}>
                            <Text style={styles.menuTitle}>Moderation</Text>
                            <Text style={styles.menuDescription}>Reports, bans, and AutoMod</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                    </TouchableOpacity>
                </View>

                {/* Community Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Community Settings</Text>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuIcon}>
                            <Ionicons name="settings" size={24} color="#8E8E93" />
                        </View>
                        <View style={styles.menuContent}>
                            <Text style={styles.menuTitle}>General</Text>
                            <Text style={styles.menuDescription}>Name, description, and avatar</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuIcon}>
                            <Ionicons name="lock-closed" size={24} color="#8E8E93" />
                        </View>
                        <View style={styles.menuContent}>
                            <Text style={styles.menuTitle}>Privacy</Text>
                            <Text style={styles.menuDescription}>Public or private community</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuIcon}>
                            <Ionicons name="document-text" size={24} color="#8E8E93" />
                        </View>
                        <View style={styles.menuContent}>
                            <Text style={styles.menuTitle}>Rules</Text>
                            <Text style={styles.menuDescription}>Community guidelines</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                    </TouchableOpacity>
                </View>
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
    backButton: {
        padding: 4,
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#000',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#8E8E93',
        marginTop: 2,
    },
    content: {
        flex: 1,
    },
    section: {
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8E8E93',
        textTransform: 'uppercase',
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    menuIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F2F2F7',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    menuContent: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000',
    },
    menuDescription: {
        fontSize: 13,
        color: '#8E8E93',
        marginTop: 2,
    },
});
