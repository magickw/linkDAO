import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, MoreVertical, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { announcementService, Announcement } from '@/services/announcementService';
import CreateAnnouncementModal from './CreateAnnouncementModal';

interface AnnouncementManagerProps {
    communityId: string;
}

export default function AnnouncementManager({ communityId }: AnnouncementManagerProps) {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

    const fetchAnnouncements = async () => {
        try {
            setLoading(true);
            const response = await announcementService.getAllAnnouncements(communityId);
            if (response.success) {
                setAnnouncements(response.data);
            }
        } catch (error) {
            console.error('Error fetching announcements:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (communityId) {
            fetchAnnouncements();
        }
    }, [communityId]);

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this announcement?')) {
            try {
                await announcementService.deleteAnnouncement(id);
                fetchAnnouncements();
            } catch (error) {
                console.error('Error deleting announcement:', error);
            }
        }
    };

    const handleToggleActive = async (announcement: Announcement) => {
        try {
            await announcementService.updateAnnouncement(announcement.id, {
                isActive: !announcement.isActive
            });
            fetchAnnouncements();
        } catch (error) {
            console.error('Error updating announcement:', error);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
            case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
            default: return <Info className="w-4 h-4 text-blue-500" />;
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">Announcements</h3>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span>New</span>
                </button>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        Loading announcements...
                    </div>
                ) : announcements.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        No announcements yet. Create one to notify your community.
                    </div>
                ) : (
                    announcements.map(announcement => (
                        <div key={announcement.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-3">
                                    <div className="mt-1">{getTypeIcon(announcement.type)}</div>
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                            {announcement.title}
                                            {!announcement.isActive && (
                                                <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full">
                                                    Inactive
                                                </span>
                                            )}
                                        </h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                            {announcement.content}
                                        </p>
                                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                            <span>Created {new Date(announcement.createdAt).toLocaleDateString()}</span>
                                            {announcement.expiresAt && (
                                                <span>Expires {new Date(announcement.expiresAt).toLocaleDateString()}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => handleToggleActive(announcement)}
                                        className={`px-2 py-1 text-xs rounded-md border transition-colors ${announcement.isActive
                                                ? 'border-green-200 text-green-700 bg-green-50 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                                                : 'border-gray-200 text-gray-600 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                                            }`}
                                    >
                                        {announcement.isActive ? 'Active' : 'Inactive'}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(announcement.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <CreateAnnouncementModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                communityId={communityId}
                onSuccess={fetchAnnouncements}
            />
        </div>
    );
}
