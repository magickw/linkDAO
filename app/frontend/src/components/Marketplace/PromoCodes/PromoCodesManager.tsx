import React, { useState, useEffect } from 'react';
import { GlassPanel, Button } from '../../../design-system';
import { PromoCodeForm } from './PromoCodeForm';
import { PromoCodeList } from './PromoCodeList';
import { promoCodeService, PromoCode, CreatePromoCodeInput } from '../../../services/promoCodeService';
import { useUnifiedSeller } from '../../../hooks/useUnifiedSeller';

interface PromoCodesManagerProps {
    walletAddress: string;
}

export const PromoCodesManager: React.FC<PromoCodesManagerProps> = ({ walletAddress }) => {
    const [view, setView] = useState<'list' | 'create'>('list');
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchPromoCodes = async () => {
        setLoading(true);
        try {
            console.log('[PromoCodesManager] Fetching promo codes for seller:', walletAddress);
            const codes = await promoCodeService.getPromoCodes(walletAddress);
            console.log('[PromoCodesManager] Fetched promo codes:', codes);
            setPromoCodes(codes);
        } catch (error) {
            console.error('[PromoCodesManager] Failed to fetch promo codes:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (walletAddress) {
            fetchPromoCodes();
        }
    }, [walletAddress]);

    return (
        <GlassPanel className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white">Promotions</h2>
                    <p className="text-gray-400">Manage your store's promo codes and discounts</p>
                </div>
                {view === 'list' && (
                    <Button variant="primary" onClick={() => setView('create')}>
                        + Create Promo Code
                    </Button>
                )}
            </div>

            {view === 'create' ? (
                <PromoCodeForm
                    sellerId={walletAddress}
                    onSuccess={() => {
                        setView('list');
                        fetchPromoCodes();
                    }}
                    onCancel={() => setView('list')}
                    createPromoCode={(input) => promoCodeService.createPromoCode(input)}
                />
            ) : (
                <PromoCodeList
                    promoCodes={promoCodes}
                    loading={loading}
                    onRefresh={fetchPromoCodes}
                />
            )}
        </GlassPanel>
    );
};
