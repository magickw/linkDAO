import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { announcementService, Announcement } from '@/services/announcementService';

interface AnnouncementBannerProps {
    communityId: string;
}

export default function AnnouncementBanner({ communityId }: AnnouncementBannerProps) {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);

    useEffect(() => {
        // Load dismissed announcements from local storage
        const savedDismissed = localStorage.getItem(`dismissed_announcements_${communityId}`);
        if (savedDismissed) {
            setDismissedIds(JSON.parse(savedDismissed));
        }

        const fetchAnnouncements = async () => {
            try {
                setLoading(true);
                const response = await announcementService.getActiveAnnouncements(communityId);
                if (response.success) {
                    setAnnouncements(response.data);
                }
            } catch (error) {
                console.error('Error fetching announcements:', error);
            } finally {
                setLoading(false);
            }
        };

        if (communityId) {
            fetchAnnouncements();
        }
    }, [communityId]);

    const handleDismiss = (id: string) => {
        const newDismissedIds = [...dismissedIds, id];
        setDismissedIds(newDismissedIds);
        localStorage.setItem(`dismissed_announcements_${communityId}`, JSON.stringify(newDismissedIds));
    };

    // Filter out dismissed announcements
    const visibleAnnouncements = announcements.filter(a => !dismissedIds.includes(a.id));

    if (loading || visibleAnnouncements.length === 0) {
        return null;
    }

    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'warning':
                return {
                    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
                    border: 'border-yellow-200 dark:border-yellow-800',
                    text: 'text-yellow-800 dark:text-yellow-200',
                    icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />
                };
            case 'success':
                return {
                    bg: 'bg-green-50 dark:bg-green-900/20',
                    border: 'border-green-200 dark:border-green-800',
                    text: 'text-green-800 dark:text-green-200',
                    icon: <CheckCircle className="w-5 h-5 text-green-500" />
                };
            case 'info':
            default:
                return {
                    bg: 'bg-blue-50 dark:bg-blue-900/20',
                    border: 'border-blue-200 dark:border-blue-800',
                    text: 'text-blue-800 dark:text-blue-200',
                    icon: <Info className="w-5 h-5 text-blue-500" />
                };
        }
    };

    return (
        <div className="space-y-2 mb-4">
            <AnimatePresence>
                {visibleAnnouncements.map(announcement => {
                    const styles = getTypeStyles(announcement.type);

                    return (
                        <motion.div
                            key={announcement.id}
                            initial={{ opacity: 0, y: -20, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            className={`relative overflow-hidden rounded-lg border ${styles.border} ${styles.bg} p-4 shadow-sm`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-0.5">
                                    {styles.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={`text-sm font-semibold ${styles.text} mb-1`}>
                                        {announcement.title}
                                    </h3>
                                    <div className={`text-sm ${styles.text} opacity-90 prose prose-sm max-w-none`}>
                                        {announcement.content}
                                    </div>
                                    {announcement.expiresAt && (
                                        <div className="flex items-center mt-2 text-xs opacity-75 gap-1">
                                            <Clock className="w-3 h-3" />
                                            <span>Expires {new Date(announcement.expiresAt).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDismiss(announcement.id)}
                                    className={`flex-shrink-0 ml-2 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${styles.text}`}
                                    aria-label="Dismiss"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
