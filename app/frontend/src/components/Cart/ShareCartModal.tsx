import React, { useState } from 'react';
import { X, Copy, Check, Share2 } from 'lucide-react';
import styles from './ShareCartModal.module.css';

interface ShareCartModalProps {
    isOpen: boolean;
    onClose: () => void;
    onShare: () => Promise<{ shareUrl: string; expiresAt: Date }>;
}

export const ShareCartModal: React.FC<ShareCartModalProps> = ({
    isOpen,
    onClose,
    onShare
}) => {
    const [loading, setLoading] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    const [copied, setCopied] = useState(false);

    const handleShare = async () => {
        try {
            setLoading(true);
            const result = await onShare();
            setShareUrl(result.shareUrl);
            setExpiresAt(result.expiresAt);
        } catch (error) {
            console.error('Failed to create share link:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        if (shareUrl) {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatExpiryDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
        }).format(date);
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.titleRow}>
                        <Share2 size={24} />
                        <h2 className={styles.title}>Share Your Cart</h2>
                    </div>
                    <button onClick={onClose} className={styles.closeButton}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    {!shareUrl ? (
                        <>
                            <p className={styles.description}>
                                Create a shareable link to your cart. Anyone with the link can view your cart items and import them to their own cart.
                            </p>
                            <button
                                onClick={handleShare}
                                disabled={loading}
                                className={styles.generateButton}
                            >
                                {loading ? 'Generating...' : 'Generate Share Link'}
                            </button>
                        </>
                    ) : (
                        <>
                            <p className={styles.success}>Share link created successfully!</p>

                            <div className={styles.linkContainer}>
                                <input
                                    type="text"
                                    value={shareUrl}
                                    readOnly
                                    className={styles.linkInput}
                                />
                                <button
                                    onClick={handleCopy}
                                    className={styles.copyButton}
                                >
                                    {copied ? <Check size={18} /> : <Copy size={18} />}
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                            </div>

                            {expiresAt && (
                                <p className={styles.expiry}>
                                    Link expires on {formatExpiryDate(expiresAt)}
                                </p>
                            )}

                            <div className={styles.info}>
                                <p>💡 Share this link with friends or save it for later</p>
                                <p>🔒 The link will expire in 7 days</p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
