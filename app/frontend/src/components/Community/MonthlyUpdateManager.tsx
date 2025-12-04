import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    Plus,
    Edit,
    Trash2,
    Eye,
    EyeOff,
    Check,
    X,
    ChevronDown,
    ChevronUp,
    AlertCircle
} from 'lucide-react';
import { monthlyUpdateService, MonthlyUpdate } from '@/services/monthlyUpdateService';
import CreateMonthlyUpdateModal from './CreateMonthlyUpdateModal';

interface MonthlyUpdateManagerProps {
    communityId: string;
}

const MonthlyUpdateManager: React.FC<MonthlyUpdateManagerProps> = ({
    communityId
}) => {
    const [updates, setUpdates] = useState<MonthlyUpdate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingUpdate, setEditingUpdate] = useState<MonthlyUpdate | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        if (isExpanded) {
            loadUpdates();
        }
    }, [communityId, isExpanded]);

    const loadUpdates = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await monthlyUpdateService.getAllUpdates(communityId);
            if (response.success) {
                setUpdates(response.data);
            } else {
                setError('Failed to load updates');
            }
        } catch (err) {
            setError('Failed to load updates');
            console.error('Error loading monthly updates:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async (id: string) => {
        try {
            setActionLoading(id);
            const response = await monthlyUpdateService.publishMonthlyUpdate(id);
            if (response.success) {
                setUpdates(prev => prev.map(u => u.id === id ? { ...u, isPublished: true, publishedAt: new Date().toISOString() } : u));
            }
        } catch (err) {
            console.error('Error publishing update:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleUnpublish = async (id: string) => {
        try {
            setActionLoading(id);
            const response = await monthlyUpdateService.unpublishMonthlyUpdate(id);
            if (response.success) {
                setUpdates(prev => prev.map(u => u.id === id ? { ...u, isPublished: false } : u));
            }
        } catch (err) {
            console.error('Error unpublishing update:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this monthly update?')) return;

        try {
            setActionLoading(id);
            const response = await monthlyUpdateService.deleteMonthlyUpdate(id);
            if (response.success) {
                setUpdates(prev => prev.filter(u => u.id !== id));
            }
        } catch (err) {
            console.error('Error deleting update:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleCreateSuccess = (newUpdate: MonthlyUpdate) => {
        setUpdates(prev => [newUpdate, ...prev]);
        setShowCreateModal(false);
    };

    const handleUpdateSuccess = (updatedUpdate: MonthlyUpdate) => {
        setUpdates(prev => prev.map(u => u.id === updatedUpdate.id ? updatedUpdate : u));
        setEditingUpdate(null);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-500" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Monthly Updates Manager
                    </h3>
                    {updates.length > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                            {updates.length}
                        </span>
                    )}
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
            </button>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
                            {/* Create Button */}
                            <div className="py-3">
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                                >
                                    <Plus className="w-4 h-4" />
                                    Create Monthly Update
                                </button>
                            </div>

                            {/* Loading State */}
                            {loading && (
                                <div className="py-8 text-center text-gray-500">
                                    <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2" />
                                    Loading updates...
                                </div>
                            )}

                            {/* Error State */}
                            {error && (
                                <div className="py-4 text-center text-red-500 flex items-center justify-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            {/* Empty State */}
                            {!loading && !error && updates.length === 0 && (
                                <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                                    <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No monthly updates yet</p>
                                    <p className="text-xs mt-1">Create your first update to keep your community informed</p>
                                </div>
                            )}

                            {/* Updates List */}
                            {!loading && !error && updates.length > 0 && (
                                <div className="space-y-2">
                                    {updates.map(update => (
                                        <div
                                            key={update.id}
                                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                                                        {monthlyUpdateService.formatUpdateDate(update.month, update.year)}
                                                    </span>
                                                    {update.isPublished ? (
                                                        <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                            <Eye className="w-3 h-3" />
                                                            Published
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                            <EyeOff className="w-3 h-3" />
                                                            Draft
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate mt-1">
                                                    {update.title}
                                                </h4>
                                            </div>

                                            <div className="flex items-center gap-1 ml-3">
                                                {actionLoading === update.id ? (
                                                    <div className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full" />
                                                ) : (
                                                    <>
                                                        {update.isPublished ? (
                                                            <button
                                                                onClick={() => handleUnpublish(update.id)}
                                                                className="p-1.5 text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded transition-colors"
                                                                title="Unpublish"
                                                            >
                                                                <EyeOff className="w-4 h-4" />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handlePublish(update.id)}
                                                                className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                                                                title="Publish"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setEditingUpdate(update)}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(update.id)}
                                                            className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Create Modal */}
            {showCreateModal && (
                <CreateMonthlyUpdateModal
                    communityId={communityId}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={handleCreateSuccess}
                />
            )}

            {/* Edit Modal */}
            {editingUpdate && (
                <CreateMonthlyUpdateModal
                    communityId={communityId}
                    existingUpdate={editingUpdate}
                    onClose={() => setEditingUpdate(null)}
                    onSuccess={handleUpdateSuccess}
                />
            )}
        </div>
    );
};

export default MonthlyUpdateManager;
