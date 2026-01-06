import React from 'react';
import { Trash2, Archive, X } from 'lucide-react';
import styles from './BulkActionBar.module.css';

interface BulkActionBarProps {
    selectedCount: number;
    onBulkDelete: () => void;
    onBulkSaveForLater: () => void;
    onDeselectAll: () => void;
    isLoading?: boolean;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
    selectedCount,
    onBulkDelete,
    onBulkSaveForLater,
    onDeselectAll,
    isLoading = false
}) => {
    if (selectedCount === 0) return null;

    return (
        <div className={styles.bulkActionBar}>
            <div className={styles.container}>
                <div className={styles.info}>
                    <span className={styles.count}>{selectedCount}</span>
                    <span className={styles.label}>
                        {selectedCount === 1 ? 'item' : 'items'} selected
                    </span>
                </div>

                <div className={styles.actions}>
                    <button
                        onClick={onBulkSaveForLater}
                        disabled={isLoading}
                        className={`${styles.actionButton} ${styles.saveButton}`}
                        aria-label="Save selected items for later"
                    >
                        <Archive size={18} />
                        <span>Save for Later</span>
                    </button>

                    <button
                        onClick={onBulkDelete}
                        disabled={isLoading}
                        className={`${styles.actionButton} ${styles.deleteButton}`}
                        aria-label="Delete selected items"
                    >
                        <Trash2 size={18} />
                        <span>Delete</span>
                    </button>

                    <button
                        onClick={onDeselectAll}
                        disabled={isLoading}
                        className={`${styles.actionButton} ${styles.cancelButton}`}
                        aria-label="Deselect all items"
                    >
                        <X size={18} />
                        <span>Cancel</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
