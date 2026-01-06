import React from 'react';
import styles from './PricingDisplay.module.css';

interface PricingDisplayProps {
    currentPrice: number;
    listPrice?: number;
    currency?: string;
    discount?: number;
    showSavings?: boolean;
}

export const PricingDisplay: React.FC<PricingDisplayProps> = ({
    currentPrice,
    listPrice,
    currency = 'USD',
    discount,
    showSavings = true
}) => {
    const hasDiscount = listPrice && listPrice > currentPrice;
    const discountPercentage = hasDiscount
        ? Math.round(((listPrice - currentPrice) / listPrice) * 100)
        : discount;

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(price);
    };

    return (
        <div className={styles.pricingDisplay}>
            <div className={styles.currentPrice}>
                {formatPrice(currentPrice)}
            </div>

            {hasDiscount && (
                <div className={styles.discountInfo}>
                    <span className={styles.listPrice}>
                        List: {formatPrice(listPrice)}
                    </span>
                    {discountPercentage && (
                        <span className={styles.discountBadge}>
                            -{discountPercentage}%
                        </span>
                    )}
                </div>
            )}

            {showSavings && hasDiscount && (
                <div className={styles.savings}>
                    You save: {formatPrice(listPrice - currentPrice)}
                </div>
            )}
        </div>
    );
};
