import React from 'react';
import { DeliveryInfo } from './DeliveryInfo';
import { PricingDisplay } from './PricingDisplay';
import { QuantitySelector } from './QuantitySelector';
import styles from './CartItemCard.module.css';

export interface CartItem {
    id: string;
    productId: string;
    title: string;
    description?: string;
    image: string;
    currentPrice: number;
    listPrice?: number;
    currency?: string;
    quantity: number;
    inventory: number;
    seller?: string;
    attributes?: { [key: string]: string };
    appliedDiscount?: string;
    isGift?: boolean;
    selected?: boolean;
}

interface CartItemCardProps {
    item: CartItem;
    onQuantityChange: (quantity: number) => void;
    onRemove: () => void;
    onSaveForLater?: () => void;
    onToggleSelection?: () => void;
    showSelection?: boolean;
    isPrime?: boolean;
    estimatedDeliveryDays?: number;
}

export const CartItemCard: React.FC<CartItemCardProps> = ({
    item,
    onQuantityChange,
    onRemove,
    onSaveForLater,
    onToggleSelection,
    showSelection = false,
    isPrime = false,
    estimatedDeliveryDays = 3
}) => {
    const discount = item.appliedDiscount ? parseFloat(item.appliedDiscount) : undefined;
    const isLowStock = item.inventory < 10;
    const isOutOfStock = item.inventory === 0;

    return (
        <div className={styles.cartItemCard}>
            {showSelection && (
                <div className={styles.selectionCheckbox}>
                    <input
                        type="checkbox"
                        checked={item.selected !== false}
                        onChange={onToggleSelection}
                        aria-label={`Select ${item.title}`}
                    />
                </div>
            )}

            <div className={styles.productImage}>
                <img src={item.image} alt={item.title} />
                {isLowStock && !isOutOfStock && (
                    <div className={styles.stockBadge}>Low Stock</div>
                )}
            </div>

            <div className={styles.productDetails}>
                <h3 className={styles.productTitle}>{item.title}</h3>

                {item.seller && (
                    <div className={styles.seller}>by {item.seller}</div>
                )}

                {item.attributes && Object.keys(item.attributes).length > 0 && (
                    <div className={styles.attributes}>
                        {Object.entries(item.attributes).map(([key, value]) => (
                            <span key={key} className={styles.attribute}>
                                {key}: <strong>{value}</strong>
                            </span>
                        ))}
                    </div>
                )}

                <DeliveryInfo
                    isPrime={isPrime}
                    estimatedDays={estimatedDeliveryDays}
                    isFreeShipping={true}
                />

                {item.isGift && (
                    <div className={styles.giftBadge}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 0L10 4H16L11 8L13 12L8 9L3 12L5 8L0 4H6L8 0Z" />
                        </svg>
                        This is a gift
                    </div>
                )}

                <div className={styles.actions}>
                    <QuantitySelector
                        quantity={item.quantity}
                        maxQuantity={99}
                        onChange={onQuantityChange}
                        stockLevel={item.inventory}
                        showStock={false}
                    />

                    <button
                        className={styles.actionButton}
                        onClick={onRemove}
                        aria-label="Delete item"
                    >
                        Delete
                    </button>

                    {onSaveForLater && (
                        <button
                            className={styles.actionButton}
                            onClick={onSaveForLater}
                            aria-label="Save for later"
                        >
                            Save for later
                        </button>
                    )}

                    <button
                        className={styles.actionButton}
                        aria-label="Share item"
                    >
                        Share
                    </button>
                </div>
            </div>

            <div className={styles.pricingSection}>
                <PricingDisplay
                    currentPrice={item.currentPrice}
                    listPrice={item.listPrice}
                    currency={item.currency}
                    discount={discount}
                />
            </div>
        </div>
    );
};
