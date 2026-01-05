import React, { useState, useEffect } from 'react';
import { CreatePromoCodeInput } from '../../../services/promoCodeService';
import { Button } from '../../../design-system';
import { useToast } from '../../../context/ToastContext';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { useUnifiedSellerListings } from '../../../hooks/useUnifiedSeller';

interface Product {
    id: string;
    title: string;
    price: {
        fiat: string;
        fiatSymbol: string;
    };
}

interface PromoCodeFormProps {
    sellerId: string;
    onSuccess: () => void;
    onCancel: () => void;
    createPromoCode: (input: CreatePromoCodeInput) => Promise<any>;
}

export const PromoCodeForm: React.FC<PromoCodeFormProps> = ({
    sellerId,
    onSuccess,
    onCancel,
    createPromoCode
}) => {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [productsLoading, setProductsLoading] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [formData, setFormData] = useState<Partial<CreatePromoCodeInput>>({
        code: '',
        discountType: 'percentage',
        discountValue: 0,
        minOrderAmount: 0,
        maxDiscountAmount: 0,
        usageLimit: 0,
    });

    // Fetch seller's products
    const { listings, loading: listingsLoading } = useUnifiedSellerListings(sellerId);

    useEffect(() => {
        if (listings && listings.length > 0) {
            setProducts(listings.map((listing: any) => ({
                id: listing.id,
                title: listing.title || 'Untitled Product',
                price: listing.price || { fiat: '0.00', fiatSymbol: 'USD' }
            })));
        }
    }, [listings]);

    const handleChange = (field: keyof CreatePromoCodeInput, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.code || !formData.discountValue) {
            addToast('Please fill in required fields', 'error');
            return;
        }

        setLoading(true);
        try {
            await createPromoCode({
                ...formData,
                sellerId,
                discountValue: Number(formData.discountValue),
                minOrderAmount: formData.minOrderAmount ? Number(formData.minOrderAmount) : undefined,
                maxDiscountAmount: formData.maxDiscountAmount ? Number(formData.maxDiscountAmount) : undefined,
                usageLimit: formData.usageLimit ? Number(formData.usageLimit) : undefined,
            } as CreatePromoCodeInput);

            addToast('Promo code created successfully', 'success');
            onSuccess();
        } catch (error: any) {
            console.error('Error creating promo code:', error);
            addToast(error.message || 'Failed to create promo code', 'error');
        } finally {
            setLoading(false);
        }
    };

    const inputClasses = "w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Code</label>
                    <input
                        value={formData.code}
                        onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                        placeholder="SUMMER2025"
                        required
                        className={`${inputClasses} uppercase`}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Product (Optional)</label>
                    <select
                        value={formData.productId || ''}
                        onChange={(e) => handleChange('productId', e.target.value || undefined)}
                        className={inputClasses}
                    >
                        <option value="">All Products</option>
                        {products.map(product => (
                            <option key={product.id} value={product.id}>
                                {product.title} - {product.price.fiatSymbol}{product.price.fiat}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Leave empty to apply to all products</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Discount Type</label>
                    <select
                        value={formData.discountType}
                        onChange={(e) => handleChange('discountType', e.target.value)}
                        className={inputClasses}
                    >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed_amount">Fixed Amount ($)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                        Discount Value {formData.discountType === 'percentage' ? '(%)' : '($)'}
                    </label>
                    <input
                        type="number"
                        value={formData.discountValue}
                        onChange={(e) => handleChange('discountValue', e.target.value)}
                        min="0"
                        step={formData.discountType === 'percentage' ? '1' : '0.01'}
                        required
                        className={inputClasses}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                        <CalendarIcon className="h-4 w-4 inline mr-1" />
                        Start Date
                    </label>
                    <input
                        type="date"
                        value={formData.startDate || ''}
                        onChange={(e) => handleChange('startDate', e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className={inputClasses}
                        onClick={(e) => (e.target as HTMLInputElement).showPicker()}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                        <CalendarIcon className="h-4 w-4 inline mr-1" />
                        End Date
                    </label>
                    <input
                        type="date"
                        value={formData.endDate || ''}
                        onChange={(e) => handleChange('endDate', e.target.value)}
                        min={formData.startDate || new Date().toISOString().split('T')[0]}
                        className={inputClasses}
                        onClick={(e) => (e.target as HTMLInputElement).showPicker()}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Usage Limit (Optional)</label>
                    <input
                        type="number"
                        value={formData.usageLimit || ''}
                        onChange={(e) => handleChange('usageLimit', e.target.value)}
                        placeholder="Unlimited"
                        min="1"
                        className={inputClasses}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Min Order Amount ($)</label>
                    <input
                        type="number"
                        value={formData.minOrderAmount || ''}
                        onChange={(e) => handleChange('minOrderAmount', e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className={inputClasses}
                    />
                </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
                <Button variant="ghost" onClick={onCancel} type="button">
                    Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Promo Code'}
                </Button>
            </div>
        </form>
    );
};
