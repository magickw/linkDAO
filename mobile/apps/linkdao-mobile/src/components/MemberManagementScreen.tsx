/**
 * Member Management Screen
 * Manage community members, roles, and permissions
 */

import React, { useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface Member {
    id: string;
    displayName: string;
    username: string;
    avatar?: string;
    role: 'owner' | 'admin' | 'moderator' | 'member';
    joinedAt: string;
    postsCount: number;
    isOnline: boolean;
}

interface MemberManagementScreenProps {
    communityId: string;
    communityName: string;
}

export default function MemberManagementScreen({
    communityId,
    communityName,
}: MemberManagementScreenProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRole, setSelectedRole] = useState<string>('all');
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);

    // Mock data - replace with actual API call
    const [members, setMembers] = useState<Member[]>([
        {
            id: '1',
            displayName: 'Alice Johnson',
            username: 'alice',
            role: 'admin',
            joinedAt: '2024-01-15',
            postsCount: 156,
            isOnline: true,
        },
        {
            id: '2',
            displayName: 'Bob Smith',
            username: 'bob',
            role: 'moderator',
            joinedAt: '2024-02-20',
            postsCount: 89,
            isOnline: false,
        },
        {
            id: '3',
            displayName: 'Carol White',
            username: 'carol',
            role: 'member',
            joinedAt: '2024-03-10',
            postsCount: 42,
            isOnline: true,
        },
    ]);

    const filteredMembers = members.filter((member) => {
        const matchesSearch =
            member.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.username.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = selectedRole === 'all' || member.role === selectedRole;
        return matchesSearch && matchesRole;
    });

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'owner':
                return '#FFD700';
            case 'admin':
                return '#FF6B6B';
            case 'moderator':
                return '#4ECDC4';
            default:
                return '#95A5A6';
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'owner':
                return 'crown';
            case 'admin':
                return 'shield-checkmark';
            case 'moderator':
                return 'shield-half';
            default:
                return 'person';
        }
    };

    const handleChangeRole = (member: Member) => {
        setSelectedMember(member);
        setShowRoleModal(true);
    };

    const handleRemoveMember = (member: Member) => {
        Alert.alert(
            'Remove Member',
            `Are you sure you want to remove ${member.displayName} from this community?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => {
                        setMembers(members.filter((m) => m.id !== member.id));
                        Alert.alert('Success', 'Member removed successfully');
                    },
                },
            ]
        );
    };

    const updateMemberRole = (newRole: 'admin' | 'moderator' | 'member') => {
        if (!selectedMember) return;

        setMembers(
            members.map((m) =>
                m.id === selectedMember.id ? { ...m, role: newRole } : m
            )
        );
        setShowRoleModal(false);
        setSelectedMember(null);
        Alert.alert('Success', 'Member role updated successfully');
    };

    const renderMember = ({ item }: { item: Member }) => (
        <View style={styles.memberCard}>
            <View style={styles.memberHeader}>
                <View style={styles.avatarContainer}>
                    <View style={[styles.avatar, { backgroundColor: getRoleColor(item.role) }]}>
                        <Text style={styles.avatarText}>
                            {item.displayName.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    {item.isOnline && <View style={styles.onlineIndicator} />}
                </View>

                <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{item.displayName}</Text>
                    <Text style={styles.memberUsername}>@{item.username}</Text>
                    <View style={styles.memberStats}>
                        <Text style={styles.statText}>{item.postsCount} posts</Text>
                        <Text style={styles.statText}>• Joined {new Date(item.joinedAt).toLocaleDateString()}</Text>
                    </View>
                </View>

                <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
                    <Ionicons name={getRoleIcon(item.role) as any} size={12} color="#fff" />
                    <Text style={styles.roleText}>{item.role}</Text>
                </View>
            </View>

            {item.role !== 'owner' && (
                <View style={styles.memberActions}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleChangeRole(item)}
                    >
                        <Ionicons name="swap-horizontal" size={18} color="#007AFF" />
                        <Text style={styles.actionButtonText}>Change Role</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.removeButton]}
                        onPress={() => handleRemoveMember(item)}
                    >
                        <Ionicons name="person-remove" size={18} color="#FF3B30" />
                        <Text style={[styles.actionButtonText, styles.removeButtonText]}>Remove</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Members</Text>
                    <Text style={styles.headerSubtitle}>{communityName}</Text>
                </View>
                <TouchableOpacity style={styles.inviteButton}>
                    <Ionicons name="person-add" size={24} color="#007AFF" />
                </TouchableOpacity>
            </View>

            {/* Search and Filter */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#8E8E93" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search members..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#8E8E93"
                    />
                </View>
            </View>

            {/* Role Filter */}
            <View style={styles.filterContainer}>
                {['all', 'admin', 'moderator', 'member'].map((role) => (
                    <TouchableOpacity
                        key={role}
                        style={[
                            styles.filterChip,
                            selectedRole === role && styles.filterChipActive,
                        ]}
                        onPress={() => setSelectedRole(role)}
                    >
                        <Text
                            style={[
                                styles.filterChipText,
                                selectedRole === role && styles.filterChipTextActive,
                            ]}
                        >
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Member Count */}
            <View style={styles.countContainer}>
                <Text style={styles.countText}>
                    {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'}
                </Text>
            </View>

            {/* Members List */}
            <FlatList
                data={filteredMembers}
                renderItem={renderMember}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
            />

            {/* Role Change Modal */}
            <Modal
                visible={showRoleModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowRoleModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Change Role</Text>
                            <TouchableOpacity onPress={() => setShowRoleModal(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>
                            Select a new role for {selectedMember?.displayName}
                        </Text>

                        <View style={styles.roleOptions}>
                            {['admin', 'moderator', 'member'].map((role) => (
                                <TouchableOpacity
                                    key={role}
                                    style={styles.roleOption}
                                    onPress={() => updateMemberRole(role as any)}
                                >
                                    <View style={[styles.roleIcon, { backgroundColor: getRoleColor(role) }]}>
                                        <Ionicons name={getRoleIcon(role) as any} size={20} color="#fff" />
                                    </View>
                                    <View style={styles.roleOptionInfo}>
                                        <Text style={styles.roleOptionTitle}>
                                            {role.charAt(0).toUpperCase() + role.slice(1)}
                                        </Text>
                                        <Text style={styles.roleOptionDescription}>
                                            {role === 'admin' && 'Full permissions except ownership'}
                                            {role === 'moderator' && 'Can moderate content and members'}
                                            {role === 'member' && 'Standard community member'}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            </Modal>
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
    inviteButton: {
        padding: 4,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
        borderRadius: 10,
        paddingHorizontal: 12,
        height: 40,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#000',
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: '#F2F2F7',
        marginRight: 8,
    },
    filterChipActive: {
        backgroundColor: '#007AFF',
    },
    filterChipText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#000',
    },
    filterChipTextActive: {
        color: '#fff',
    },
    countContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
    },
    countText: {
        fontSize: 14,
        color: '#8E8E93',
    },
    listContainer: {
        padding: 16,
    },
    memberCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    memberHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#34C759',
        borderWidth: 2,
        borderColor: '#fff',
    },
    memberInfo: {
        flex: 1,
        marginLeft: 12,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    memberUsername: {
        fontSize: 14,
        color: '#8E8E93',
        marginTop: 2,
    },
    memberStats: {
        flexDirection: 'row',
        marginTop: 4,
    },
    statText: {
        fontSize: 12,
        color: '#8E8E93',
        marginRight: 4,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    roleText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
        marginLeft: 4,
        textTransform: 'capitalize',
    },
    memberActions: {
        flexDirection: 'row',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F2F2F7',
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#F2F2F7',
        marginRight: 8,
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#007AFF',
        marginLeft: 6,
    },
    removeButton: {
        backgroundColor: '#FFEBEE',
        marginRight: 0,
    },
    removeButtonText: {
        color: '#FF3B30',
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
    roleOptions: {
        paddingHorizontal: 16,
    },
    roleOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    roleIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    roleOptionInfo: {
        flex: 1,
        marginLeft: 12,
    },
    roleOptionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    roleOptionDescription: {
        fontSize: 13,
        color: '#8E8E93',
        marginTop: 2,
    },
});
