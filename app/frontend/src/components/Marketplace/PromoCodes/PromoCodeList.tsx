import React from 'react';
import { PromoCode } from '../../../services/promoCodeService';
import { Button, GlassPanel } from '../../../design-system';

interface PromoCodeListProps {
    promoCodes: PromoCode[];
    loading: boolean;
    onRefresh: () => void;
}

export const PromoCodeList: React.FC<PromoCodeListProps> = ({
    promoCodes,
    loading,
    onRefresh
}) => {
    if (loading) {
        return <div className="text-white text-center py-8">Loading promo codes...</div>;
    }

    if (promoCodes.length === 0) {
        return (
            <div className="text-center py-12 bg-white/5 rounded-lg">
                <div className="text-4xl mb-4">🏷️</div>
                <h3 className="text-xl font-semibold text-white mb-2">No Promo Codes Yet</h3>
                <p className="text-gray-400">Create your first promo code to boost sales!</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="text-gray-400 border-b border-white/10">
                        <th className="py-3 px-4">Code</th>
                        <th className="py-3 px-4">Discount</th>
                        <th className="py-3 px-4">Usage</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Dates</th>
                    </tr>
                </thead>
                <tbody className="text-white">
                    {promoCodes.map((promo) => (
                        <tr key={promo.id} className="border-b border-white/5 hover:bg-white/5">
                            <td className="py-3 px-4 font-mono font-bold text-lg">{promo.code}</td>
                            <td className="py-3 px-4">
                                {promo.discountType === 'percentage'
                                    ? `${promo.discountValue}%`
                                    : `$${Number(promo.discountValue).toFixed(2)}`}
                            </td>
                            <td className="py-3 px-4">
                                {promo.usageCount} / {promo.usageLimit ? promo.usageLimit : '∞'}
                            </td>
                            <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded-full text-xs ${promo.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                    }`}>
                                    {promo.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-400">
                                {promo.startDate && <div>Start: {new Date(promo.startDate).toLocaleDateString()}</div>}
                                {promo.endDate && <div>End: {new Date(promo.endDate).toLocaleDateString()}</div>}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
