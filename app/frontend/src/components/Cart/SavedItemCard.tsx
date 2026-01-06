import React from 'react';
import styles from './SavedItemCard.module.css';

export interface SavedItem {
    id: string;
    productId: string;
    title: string;
    image: string;
    price: number;
    priceAtSave?: number;
    quantity: number;
    notes?: string;
    savedAt: Date;
}

interface SavedItemCardProps {
    item: SavedItem;
    onMoveToCart: () => void;
    onRemove: () => void;
}

export const SavedItemCard: React.FC<SavedItemCardProps> = ({
    item,
    onMoveToCart,
    onRemove
}) => {
    const hasPriceChange = item.priceAtSave && item.price !== item.priceAtSave;
    const priceIncreased = hasPriceChange && item.price > item.priceAtSave!;
    const priceDecreased = hasPriceChange && item.price < item.priceAtSave!;

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(price);
    };

    return (
        <div className={styles.savedItemCard}>
            <div className={styles.imageContainer}>
                <img src={item.image} alt={item.title} />
            </div>

            <div className={styles.itemDetails}>
                <h4 className={styles.title}>{item.title}</h4>

                <div className={styles.priceInfo}>
                    <span className={styles.currentPrice}>{formatPrice(item.price)}</span>

                    {hasPriceChange && (
                        <div className={priceDecreased ? styles.priceDropped : styles.priceIncreased}>
                            {priceDecreased && '↓ '}
                            {priceIncreased && '↑ '}
                            {priceDecreased ? 'Price dropped!' : 'Price increased'}
                        </div>
                    )}
                </div>

                {item.notes && (
                    <div className={styles.notes}>{item.notes}</div>
                )}

                <div className={styles.actions}>
                    <button
                        className={styles.moveToCartButton}
                        onClick={onMoveToCart}
                    >
                        Move to cart
                    </button>
                    <button
                        className={styles.removeButton}
                        onClick={onRemove}
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};
