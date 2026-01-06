import React, { useState, useEffect } from 'react';
import { RelatedProductCard } from './RelatedProductCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './RelatedProductsSidebar.module.css';

interface RelatedProduct {
    id: string;
    title: string;
    priceAmount: string;
    priceCurrency: string;
    images: string[];
    inventory: number;
}

interface RelatedProductsSidebarProps {
    onQuickAdd: (productId: string) => Promise<void>;
}

export const RelatedProductsSidebar: React.FC<RelatedProductsSidebarProps> = ({
    onQuickAdd
}) => {
    const [products, setProducts] = useState<RelatedProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [addingProductId, setAddingProductId] = useState<string | null>(null);
    const [scrollPosition, setScrollPosition] = useState(0);

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            setLoading(true);
            // For now, we'll use a simple fetch to get popular products
            // In a real implementation, this would call a recommendations API
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000'}/api/products?limit=8&sort=popular`);

            if (response.ok) {
                const data = await response.json();
                setProducts(data.data || []);
            }
        } catch (error) {
            console.error('Error loading related products:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickAdd = async (productId: string) => {
        try {
            setAddingProductId(productId);
            await onQuickAdd(productId);
        } catch (error) {
            console.error('Error adding product:', error);
        } finally {
            setAddingProductId(null);
        }
    };

    const scroll = (direction: 'left' | 'right') => {
        const container = document.getElementById('related-products-scroll');
        if (container) {
            const scrollAmount = 220; // Card width + gap
            const newPosition = direction === 'left'
                ? scrollPosition - scrollAmount
                : scrollPosition + scrollAmount;

            container.scrollTo({ left: newPosition, behavior: 'smooth' });
            setScrollPosition(newPosition);
        }
    };

    if (loading) {
        return (
            <div className={styles.sidebar}>
                <h3 className={styles.title}>You might also like</h3>
                <div className={styles.loading}>Loading recommendations...</div>
            </div>
        );
    }

    if (products.length === 0) {
        return null;
    }

    return (
        <div className={styles.sidebar}>
            <h3 className={styles.title}>You might also like</h3>

            <div className={styles.scrollContainer}>
                <button
                    onClick={() => scroll('left')}
                    className={`${styles.scrollButton} ${styles.scrollLeft}`}
                    disabled={scrollPosition <= 0}
                >
                    <ChevronLeft size={20} />
                </button>

                <div id="related-products-scroll" className={styles.productsGrid}>
                    {products.map(product => (
                        <RelatedProductCard
                            key={product.id}
                            product={product}
                            onQuickAdd={handleQuickAdd}
                            isAdding={addingProductId === product.id}
                        />
                    ))}
                </div>

                <button
                    onClick={() => scroll('right')}
                    className={`${styles.scrollButton} ${styles.scrollRight}`}
                >
                    <ChevronRight size={20} />
                </button>
            </div>
        </div>
    );
};
