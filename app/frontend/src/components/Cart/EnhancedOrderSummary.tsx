import React from 'react';
import { Tag, Percent, Info } from 'lucide-react';
import styles from './EnhancedOrderSummary.module.css';

interface OrderSummaryProps {
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    total: number;
    itemCount: number;
    currency?: string;
    onCheckout: () => void;
    onContinueShopping: () => void;
    showFeeBreakdown?: boolean;
    onToggleFeeBreakdown?: () => void;
    gasFee?: number;
}

export const EnhancedOrderSummary: React.FC<OrderSummaryProps> = ({
    subtotal,
    discount,
    shipping,
    tax,
    total,
    itemCount,
    currency = 'USD',
    onCheckout,
    onContinueShopping,
    showFeeBreakdown = false,
    onToggleFeeBreakdown,
    gasFee = 0
}) => {
    const formatPrice = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    const hasSavings = discount > 0;

    return (
        <div className={styles.orderSummary}>
            <h2 className={styles.title}>Order Summary</h2>

            <div className={styles.breakdown}>
                {/* Subtotal */}
                <div className={styles.row}>
                    <span className={styles.label}>
                        Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                    </span>
                    <span className={styles.value}>{formatPrice(subtotal)}</span>
                </div>

                {/* Discount */}
                {hasSavings && (
                    <div className={`${styles.row} ${styles.discount}`}>
                        <span className={styles.label}>
                            <Percent size={14} className={styles.icon} />
                            Total Discount
                        </span>
                        <span className={styles.value}>-{formatPrice(discount)}</span>
                    </div>
                )}

                {/* Shipping */}
                <div className={styles.row}>
                    <span className={styles.label}>Shipping & Handling</span>
                    <span className={styles.value}>
                        {shipping === 0 ? 'FREE' : formatPrice(shipping)}
                    </span>
                </div>

                {/* Tax */}
                <div className={styles.row}>
                    <span className={styles.label}>Estimated Tax</span>
                    <span className={styles.value}>
                        {tax > 0 ? formatPrice(tax) : 'Calculated at checkout'}
                    </span>
                </div>
                {tax === 0 && (
                    <div className={styles.taxNote}>
                        Log in or add address to see tax estimate
                    </div>
                )}

                {/* Gas Fee */}
                {gasFee > 0 && (
                    <div className={styles.row}>
                        <span className={styles.label}>
                            Estimated Gas Fee
                            {onToggleFeeBreakdown && (
                                <button
                                    onClick={onToggleFeeBreakdown}
                                    className={styles.infoButton}
                                    aria-label="Show fee breakdown"
                                >
                                    <Info size={14} />
                                </button>
                            )}
                        </span>
                        <span className={styles.value}>{formatPrice(gasFee)}</span>
                    </div>
                )}

                {/* Gas Fee Breakdown */}
                {showFeeBreakdown && gasFee > 0 && (
                    <div className={styles.feeBreakdown}>
                        <div className={styles.feeRow}>
                            <span>Network Fee</span>
                            <span>{formatPrice(gasFee * 0.6)}</span>
                        </div>
                        <div className={styles.feeRow}>
                            <span>Protocol Fee</span>
                            <span>{formatPrice(gasFee * 0.3)}</span>
                        </div>
                        <div className={styles.feeRow}>
                            <span>Service Fee</span>
                            <span>{formatPrice(gasFee * 0.1)}</span>
                        </div>
                    </div>
                )}

                {/* Total */}
                <div className={`${styles.row} ${styles.total}`}>
                    <span className={styles.totalLabel}>Order Total</span>
                    <div className={styles.totalValue}>
                        <div className={styles.totalAmount}>{formatPrice(total)}</div>
                        <div className={styles.totalNote}>incl. all fees</div>
                    </div>
                </div>

                {/* Savings Badge */}
                {hasSavings && (
                    <div className={styles.savingsBadge}>
                        <Tag size={16} />
                        <span>You saved {formatPrice(discount)}!</span>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className={styles.actions}>
                <button onClick={onCheckout} className={styles.checkoutButton}>
                    Proceed to Checkout
                    <svg className={styles.arrow} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>

                <button onClick={onContinueShopping} className={styles.continueButton}>
                    Continue Shopping
                </button>
            </div>

            {/* Security Badges */}
            <div className={styles.security}>
                <div className={styles.securityBadge}>
                    <svg className={styles.securityIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Secure Payment</span>
                </div>
                <div className={styles.securityBadge}>
                    <svg className={styles.securityIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Buyer Protection</span>
                </div>
            </div>
        </div>
    );
};
