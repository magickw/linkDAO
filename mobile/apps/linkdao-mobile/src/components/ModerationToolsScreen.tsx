/**
 * Moderation Tools Screen
 * Content moderation, reports, and community safety tools
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    Modal,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface Report {
    id: string;
    type: 'post' | 'comment' | 'user';
    contentId: string;
    reportedBy: string;
    reason: string;
    description: string;
    status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
    createdAt: string;
    content?: {
        text: string;
        author: string;
    };
}

interface ModerationToolsScreenProps {
    communityId: string;
    communityName: string;
}

export default function ModerationToolsScreen({
    communityId,
    communityName,
}: ModerationToolsScreenProps) {
    const [selectedTab, setSelectedTab] = useState<'reports' | 'banned' | 'automod'>('reports');
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [showActionModal, setShowActionModal] = useState(false);
    const [actionNote, setActionNote] = useState('');

    // Mock data - replace with actual API call
    const [reports, setReports] = useState<Report[]>([
        {
            id: '1',
            type: 'post',
            contentId: 'post-123',
            reportedBy: 'user-456',
            reason: 'Spam',
            description: 'This post contains promotional content',
            status: 'pending',
            createdAt: '2024-01-15T10:30:00Z',
            content: {
                text: 'Check out this amazing product...',
                author: 'spammer123',
            },
        },
        {
            id: '2',
            type: 'comment',
            contentId: 'comment-789',
            reportedBy: 'user-101',
            reason: 'Harassment',
            description: 'Offensive language directed at another user',
            status: 'reviewing',
            createdAt: '2024-01-14T15:45:00Z',
            content: {
                text: 'You are completely wrong about...',
                author: 'angry_user',
            },
        },
    ]);

    const [bannedUsers, setBannedUsers] = useState([
        { id: '1', username: 'spammer123', reason: 'Repeated spam', bannedAt: '2024-01-10' },
        { id: '2', username: 'troll_account', reason: 'Harassment', bannedAt: '2024-01-08' },
    ]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return '#FF9500';
            case 'reviewing':
                return '#007AFF';
            case 'resolved':
                return '#34C759';
            case 'dismissed':
                return '#8E8E93';
            default:
                return '#8E8E93';
        }
    };

    const getReasonIcon = (reason: string) => {
        switch (reason.toLowerCase()) {
            case 'spam':
                return 'mail';
            case 'harassment':
                return 'warning';
            case 'inappropriate':
                return 'eye-off';
            case 'misinformation':
                return 'information-circle';
            default:
                return 'flag';
        }
    };

    const handleReportAction = (report: Report, action: 'approve' | 'remove' | 'ban' | 'dismiss') => {
        setSelectedReport(report);
        setShowActionModal(true);
    };

    const executeAction = (action: 'approve' | 'remove' | 'ban' | 'dismiss') => {
        if (!selectedReport) return;

        let message = '';
        switch (action) {
            case 'approve':
                message = 'Content approved and report dismissed';
                break;
            case 'remove':
                message = 'Content removed successfully';
                break;
            case 'ban':
                message = 'User banned from community';
                break;
            case 'dismiss':
                message = 'Report dismissed';
                break;
        }

        setReports(reports.map(r =>
            r.id === selectedReport.id
                ? { ...r, status: action === 'dismiss' ? 'dismissed' : 'resolved' }
                : r
        ));

        setShowActionModal(false);
        setSelectedReport(null);
        setActionNote('');
        Alert.alert('Success', message);
    };

    const renderReport = ({ item }: { item: Report }) => (
        <View style={styles.reportCard}>
            <View style={styles.reportHeader}>
                <View style={styles.reportType}>
                    <Ionicons name={getReasonIcon(item.reason)} size={16} color="#FF3B30" />
                    <Text style={styles.reportReason}>{item.reason}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
            </View>

            {item.content && (
                <View style={styles.contentPreview}>
                    <Text style={styles.contentAuthor}>@{item.content.author}</Text>
                    <Text style={styles.contentText} numberOfLines={2}>
                        {item.content.text}
                    </Text>
                </View>
            )}

            <Text style={styles.reportDescription}>{item.description}</Text>

            <View style={styles.reportFooter}>
                <Text style={styles.reportTime}>
                    {new Date(item.createdAt).toLocaleDateString()}
                </Text>
                {item.status === 'pending' && (
                    <View style={styles.quickActions}>
                        <TouchableOpacity
                            style={[styles.quickAction, styles.approveAction]}
                            onPress={() => handleReportAction(item, 'approve')}
                        >
                            <Ionicons name="checkmark" size={16} color="#34C759" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.quickAction, styles.removeAction]}
                            onPress={() => handleReportAction(item, 'remove')}
                        >
                            <Ionicons name="trash" size={16} color="#FF3B30" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.quickAction, styles.moreAction]}
                            onPress={() => {
                                setSelectedReport(item);
                                setShowActionModal(true);
                            }}
                        >
                            <Ionicons name="ellipsis-horizontal" size={16} color="#007AFF" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );

    const renderBannedUser = ({ item }: { item: any }) => (
        <View style={styles.bannedCard}>
            <View style={styles.bannedHeader}>
                <View style={styles.bannedAvatar}>
                    <Text style={styles.bannedAvatarText}>{item.username.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.bannedInfo}>
                    <Text style={styles.bannedUsername}>@{item.username}</Text>
                    <Text style={styles.bannedReason}>{item.reason}</Text>
                    <Text style={styles.bannedDate}>Banned {item.bannedAt}</Text>
                </View>
                <TouchableOpacity
                    style={styles.unbanButton}
                    onPress={() => {
                        Alert.alert(
                            'Unban User',
                            `Remove ban for @${item.username}?`,
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Unban',
                                    onPress: () => {
                                        setBannedUsers(bannedUsers.filter(u => u.id !== item.id));
                                        Alert.alert('Success', 'User unbanned');
                                    },
                                },
                            ]
                        );
                    }}
                >
                    <Text style={styles.unbanButtonText}>Unban</Text>
                </TouchableOpacity>
            </View>
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
                    <Text style={styles.headerTitle}>Moderation</Text>
                    <Text style={styles.headerSubtitle}>{communityName}</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'reports' && styles.tabActive]}
                    onPress={() => setSelectedTab('reports')}
                >
                    <Text style={[styles.tabText, selectedTab === 'reports' && styles.tabTextActive]}>
                        Reports
                    </Text>
                    {reports.filter(r => r.status === 'pending').length > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                                {reports.filter(r => r.status === 'pending').length}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'banned' && styles.tabActive]}
                    onPress={() => setSelectedTab('banned')}
                >
                    <Text style={[styles.tabText, selectedTab === 'banned' && styles.tabTextActive]}>
                        Banned Users
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'automod' && styles.tabActive]}
                    onPress={() => setSelectedTab('automod')}
                >
                    <Text style={[styles.tabText, selectedTab === 'automod' && styles.tabTextActive]}>
                        AutoMod
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            {selectedTab === 'reports' && (
                <FlatList
                    data={reports}
                    renderItem={renderReport}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="checkmark-circle" size={64} color="#34C759" />
                            <Text style={styles.emptyTitle}>All Clear!</Text>
                            <Text style={styles.emptyText}>No pending reports</Text>
                        </View>
                    }
                />
            )}

            {selectedTab === 'banned' && (
                <FlatList
                    data={bannedUsers}
                    renderItem={renderBannedUser}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="people" size={64} color="#8E8E93" />
                            <Text style={styles.emptyTitle}>No Banned Users</Text>
                            <Text style={styles.emptyText}>All members are in good standing</Text>
                        </View>
                    }
                />
            )}

            {selectedTab === 'automod' && (
                <View style={styles.automodContainer}>
                    <Text style={styles.automodTitle}>AutoMod Rules</Text>
                    <Text style={styles.automodDescription}>
                        Automatically moderate content based on keywords and patterns
                    </Text>
                    <TouchableOpacity style={styles.addRuleButton}>
                        <Ionicons name="add-circle" size={20} color="#007AFF" />
                        <Text style={styles.addRuleText}>Add Rule</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Action Modal */}
            <Modal
                visible={showActionModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowActionModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Moderation Action</Text>
                            <TouchableOpacity onPress={() => setShowActionModal(false)}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.actionOptions}>
                            <TouchableOpacity
                                style={styles.actionOption}
                                onPress={() => executeAction('approve')}
                            >
                                <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                                <Text style={styles.actionOptionText}>Approve Content</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionOption}
                                onPress={() => executeAction('remove')}
                            >
                                <Ionicons name="trash" size={24} color="#FF3B30" />
                                <Text style={styles.actionOptionText}>Remove Content</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionOption}
                                onPress={() => executeAction('ban')}
                            >
                                <Ionicons name="ban" size={24} color="#FF3B30" />
                                <Text style={styles.actionOptionText}>Ban User</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionOption}
                                onPress={() => executeAction('dismiss')}
                            >
                                <Ionicons name="close-circle" size={24} color="#8E8E93" />
                                <Text style={styles.actionOptionText}>Dismiss Report</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.noteInput}
                            placeholder="Add a note (optional)"
                            value={actionNote}
                            onChangeText={setActionNote}
                            multiline
                            numberOfLines={3}
                        />
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
    tabs: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: '#007AFF',
    },
    tabText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#8E8E93',
    },
    tabTextActive: {
        color: '#007AFF',
    },
    badge: {
        backgroundColor: '#FF3B30',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 6,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },
    listContainer: {
        padding: 16,
    },
    reportCard: {
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
    reportHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    reportType: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reportReason: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FF3B30',
        marginLeft: 6,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
        textTransform: 'capitalize',
    },
    contentPreview: {
        backgroundColor: '#F2F2F7',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    contentAuthor: {
        fontSize: 13,
        fontWeight: '600',
        color: '#007AFF',
        marginBottom: 4,
    },
    contentText: {
        fontSize: 14,
        color: '#000',
    },
    reportDescription: {
        fontSize: 14,
        color: '#8E8E93',
        marginBottom: 12,
    },
    reportFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    reportTime: {
        fontSize: 12,
        color: '#8E8E93',
    },
    quickActions: {
        flexDirection: 'row',
        gap: 8,
    },
    quickAction: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    approveAction: {
        backgroundColor: '#E8F5E9',
    },
    removeAction: {
        backgroundColor: '#FFEBEE',
    },
    moreAction: {
        backgroundColor: '#E3F2FD',
    },
    bannedCard: {
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
    bannedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bannedAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FF3B30',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bannedAvatarText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    bannedInfo: {
        flex: 1,
        marginLeft: 12,
    },
    bannedUsername: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    bannedReason: {
        fontSize: 14,
        color: '#8E8E93',
        marginTop: 2,
    },
    bannedDate: {
        fontSize: 12,
        color: '#8E8E93',
        marginTop: 2,
    },
    unbanButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#34C759',
    },
    unbanButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    automodContainer: {
        flex: 1,
        padding: 16,
    },
    automodTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#000',
        marginBottom: 8,
    },
    automodDescription: {
        fontSize: 14,
        color: '#8E8E93',
        marginBottom: 24,
    },
    addRuleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    addRuleText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#007AFF',
        marginLeft: 8,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#000',
        marginTop: 16,
    },
    emptyText: {
        fontSize: 14,
        color: '#8E8E93',
        marginTop: 8,
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
    actionOptions: {
        padding: 16,
    },
    actionOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    actionOptionText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000',
        marginLeft: 12,
    },
    noteInput: {
        backgroundColor: '#F2F2F7',
        borderRadius: 8,
        padding: 12,
        marginHorizontal: 16,
        marginTop: 8,
        fontSize: 14,
        color: '#000',
        minHeight: 80,
        textAlignVertical: 'top',
    },
});
