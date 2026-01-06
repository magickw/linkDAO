import React from 'react';
import { Plus } from 'lucide-react';
import styles from './RelatedProductCard.module.css';

interface RelatedProduct {
    id: string;
    title: string;
    priceAmount: string;
    priceCurrency: string;
    images: string[];
    inventory: number;
}

interface RelatedProductCardProps {
    product: RelatedProduct;
    onQuickAdd: (productId: string) => void;
    isAdding?: boolean;
}

export const RelatedProductCard: React.FC<RelatedProductCardProps> = ({
    product,
    onQuickAdd,
    isAdding = false
}) => {
    const price = parseFloat(product.priceAmount);
    const image = product.images && product.images.length > 0
        ? product.images[0]
        : '/placeholder.png';

    return (
        <div className={styles.card}>
            <div className={styles.imageContainer}>
                <img
                    src={image}
                    alt={product.title}
                    className={styles.image}
                />
                {product.inventory < 10 && product.inventory > 0 && (
                    <div className={styles.lowStockBadge}>
                        Only {product.inventory} left
                    </div>
                )}
            </div>

            <div className={styles.content}>
                <h4 className={styles.title}>{product.title}</h4>

                <div className={styles.price}>
                    {product.priceCurrency === 'USD' ? '$' : product.priceCurrency}
                    {price.toFixed(2)}
                </div>

                <button
                    onClick={() => onQuickAdd(product.id)}
                    disabled={isAdding || product.inventory === 0}
                    className={styles.addButton}
                >
                    <Plus size={16} />
                    {isAdding ? 'Adding...' : 'Quick Add'}
                </button>
            </div>
        </div>
    );
};
