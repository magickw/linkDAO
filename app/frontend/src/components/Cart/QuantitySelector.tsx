import React, { useState, useEffect } from 'react';
import styles from './QuantitySelector.module.css';

interface QuantitySelectorProps {
    quantity: number;
    maxQuantity?: number;
    minQuantity?: number;
    onChange: (quantity: number) => void;
    disabled?: boolean;
    showStock?: boolean;
    stockLevel?: number;
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
    quantity,
    maxQuantity = 99,
    minQuantity = 1,
    onChange,
    disabled = false,
    showStock = true,
    stockLevel
}) => {
    const [localQuantity, setLocalQuantity] = useState(quantity);

    useEffect(() => {
        setLocalQuantity(quantity);
    }, [quantity]);

    const handleDecrement = () => {
        if (localQuantity > minQuantity && !disabled) {
            const newQuantity = localQuantity - 1;
            setLocalQuantity(newQuantity);
            onChange(newQuantity);
        }
    };

    const handleIncrement = () => {
        const max = stockLevel !== undefined ? Math.min(maxQuantity, stockLevel) : maxQuantity;
        if (localQuantity < max && !disabled) {
            const newQuantity = localQuantity + 1;
            setLocalQuantity(newQuantity);
            onChange(newQuantity);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value);
        if (!isNaN(value) && value >= minQuantity && value <= maxQuantity) {
            setLocalQuantity(value);
            onChange(value);
        }
    };

    const isLowStock = stockLevel !== undefined && stockLevel < 10;
    const isOutOfStock = stockLevel !== undefined && stockLevel === 0;

    return (
        <div className={styles.quantitySelectorContainer}>
            <div className={styles.quantitySelector}>
                <button
                    className={styles.quantityButton}
                    onClick={handleDecrement}
                    disabled={disabled || localQuantity <= minQuantity}
                    aria-label="Decrease quantity"
                >
                    −
                </button>

                <input
                    type="number"
                    className={styles.quantityInput}
                    value={localQuantity}
                    onChange={handleInputChange}
                    min={minQuantity}
                    max={maxQuantity}
                    disabled={disabled}
                    aria-label="Quantity"
                />

                <button
                    className={styles.quantityButton}
                    onClick={handleIncrement}
                    disabled={disabled || localQuantity >= (stockLevel || maxQuantity)}
                    aria-label="Increase quantity"
                >
                    +
                </button>
            </div>

            {showStock && stockLevel !== undefined && (
                <div className={styles.stockInfo}>
                    {isOutOfStock && (
                        <span className={styles.outOfStock}>Out of stock</span>
                    )}
                    {isLowStock && !isOutOfStock && (
                        <span className={styles.lowStock}>Only {stockLevel} left in stock</span>
                    )}
                    {!isLowStock && !isOutOfStock && (
                        <span className={styles.inStock}>In Stock</span>
                    )}
                </div>
            )}
        </div>
    );
};
