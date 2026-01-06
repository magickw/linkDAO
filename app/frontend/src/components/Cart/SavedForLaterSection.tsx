import React from 'react';
import { SavedItemCard, SavedItem } from './SavedItemCard';
import styles from './SavedForLaterSection.module.css';

interface SavedForLaterSectionProps {
    items: SavedItem[];
    onMoveToCart: (itemId: string) => void;
    onRemove: (itemId: string) => void;
}

export const SavedForLaterSection: React.FC<SavedForLaterSectionProps> = ({
    items,
    onMoveToCart,
    onRemove
}) => {
    if (items.length === 0) {
        return null;
    }

    return (
        <div className={styles.savedForLaterSection}>
            <h2 className={styles.sectionTitle}>
                Saved for later ({items.length} {items.length === 1 ? 'item' : 'items'})
            </h2>

            <div className={styles.itemsContainer}>
                {items.map((item) => (
                    <SavedItemCard
                        key={item.id}
                        item={item}
                        onMoveToCart={() => onMoveToCart(item.id)}
                        onRemove={() => onRemove(item.id)}
                    />
                ))}
            </div>
        </div>
    );
};
