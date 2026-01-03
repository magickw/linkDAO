import { API_BASE_URL } from '../config/api';

export interface CreatePromoCodeInput {
    code: string;
    sellerId: string;
    productId?: string;
    discountType: 'percentage' | 'fixed_amount';
    discountValue: number;
    minOrderAmount?: number;
    maxDiscountAmount?: number;
    startDate?: string;
    endDate?: string;
    usageLimit?: number;
}

export interface PromoCode {
    id: string;
    code: string;
    sellerId: string;
    productId?: string;
    discountType: 'percentage' | 'fixed_amount';
    discountValue: string;
    minOrderAmount?: string;
    maxDiscountAmount?: string;
    startDate?: string;
    endDate?: string;
    usageLimit?: number;
    usageCount: number;
    isActive: boolean;
    createdAt: string;
}

class FrontendPromoCodeService {
    private get baseUrl(): string {
        return typeof window !== 'undefined' && window.location.hostname !== 'localhost'
            ? 'https://api.linkdao.io'
            : API_BASE_URL;
    }

    async createPromoCode(input: CreatePromoCodeInput): Promise<PromoCode> {
        const response = await fetch(`${this.baseUrl}/api/marketplace/promo-codes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(input),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create promo code');
        }

        const result = await response.json();
        return result.data;
    }

    async getPromoCodes(sellerId: string): Promise<PromoCode[]> {
        const response = await fetch(`${this.baseUrl}/api/marketplace/promo-codes?sellerId=${sellerId}`, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch promo codes');
        }

        const result = await response.json();
        return result.data;
    }
}

export const promoCodeService = new FrontendPromoCodeService();
