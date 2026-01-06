import React from 'react';
import styles from './DeliveryInfo.module.css';

interface DeliveryInfoProps {
    deliveryDate?: Date;
    deliveryTimeRange?: string;
    isPrime?: boolean;
    isFreeShipping?: boolean;
    estimatedDays?: number;
    location?: string;
}

export const DeliveryInfo: React.FC<DeliveryInfoProps> = ({
    deliveryDate,
    deliveryTimeRange,
    isPrime = false,
    isFreeShipping = true,
    estimatedDays = 3,
    location = 'your location'
}) => {
    const formatDeliveryDate = () => {
        if (!deliveryDate) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + estimatedDays);
            return futureDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
            });
        }
        return deliveryDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
        });
    };

    const isNextDay = estimatedDays === 1;
    const deliveryText = isNextDay ? 'Tomorrow' : formatDeliveryDate();

    return (
        <div className={styles.deliveryInfo}>
            {isPrime && (
                <span className={styles.primeBadge}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0L10.5 5.5L16 6.5L12 10.5L13 16L8 13.5L3 16L4 10.5L0 6.5L5.5 5.5L8 0Z" />
                    </svg>
                    Prime
                </span>
            )}

            <div className={styles.deliveryText}>
                {isFreeShipping && <span className={styles.freeShipping}>FREE delivery </span>}
                <span className={styles.deliveryDate}>
                    {deliveryText}
                    {deliveryTimeRange && `, ${deliveryTimeRange}`}
                </span>
            </div>

            {isFreeShipping && (
                <div className={styles.freeReturns}>FREE Returns</div>
            )}

            <div className={styles.deliveryLocation}>
                Deliver to {location}
            </div>
        </div>
    );
};
