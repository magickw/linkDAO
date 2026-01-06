import React, { useState } from 'react';
import { PromoCode, CreatePromoCodeInput } from '../../../services/promoCodeService';
import { Button, GlassPanel } from '../../../design-system';
import { useToast } from '../../../context/ToastContext';

interface PromoCodeListProps {
    promoCodes: PromoCode[];
    loading: boolean;
    onRefresh: () => void;
    walletAddress: string;
}

export const PromoCodeList: React.FC<PromoCodeListProps> = ({
    promoCodes,
    loading,
    onRefresh,
    walletAddress
}) => {
    const { addToast } = useToast();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState<Partial<CreatePromoCodeInput>>({});
    const [saving, setSaving] = useState(false);

    const handleEdit = (promo: PromoCode) => {
        setEditingId(promo.id);
        setEditFormData({
            code: promo.code,
            productId: promo.productId,
            discountType: promo.discountType,
            discountValue: parseFloat(promo.discountValue),
            minOrderAmount: promo.minOrderAmount ? parseFloat(promo.minOrderAmount) : undefined,
            maxDiscountAmount: promo.maxDiscountAmount ? parseFloat(promo.maxDiscountAmount) : undefined,
            startDate: promo.startDate,
            endDate: promo.endDate,
            usageLimit: promo.usageLimit,
            isActive: promo.isActive
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditFormData({});
    };

    const handleSaveEdit = async (promoId: string) => {
        if (!editFormData.code || !editFormData.discountType || editFormData.discountValue === undefined) {
            addToast('Please fill in all required fields', 'error');
            return;
        }

        setSaving(true);
        try {
            const { promoCodeService } = await import('../../../services/promoCodeService');
            await promoCodeService.updatePromoCode(promoId, walletAddress, editFormData);
            addToast('Promo code updated successfully', 'success');
            setEditingId(null);
            onRefresh();
        } catch (error: any) {
            addToast(error.message || 'Failed to update promo code', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (promoId: string) => {
        if (!window.confirm('Are you sure you want to delete this promo code?')) {
            return;
        }

        try {
            const { promoCodeService } = await import('../../../services/promoCodeService');
            await promoCodeService.deletePromoCode(promoId, walletAddress);
            addToast('Promo code deleted successfully', 'success');
            onRefresh();
        } catch (error: any) {
            addToast(error.message || 'Failed to delete promo code', 'error');
        }
    };

    const handleToggleActive = async (promoId: string, currentStatus: boolean) => {
        try {
            const { promoCodeService } = await import('../../../services/promoCodeService');
            await promoCodeService.updatePromoCode(promoId, walletAddress, { isActive: !currentStatus });
            addToast(`Promo code ${!currentStatus ? 'activated' : 'deactivated'}`, 'success');
            onRefresh();
        } catch (error: any) {
            addToast(error.message || 'Failed to update promo code status', 'error');
        }
    };

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
                        <th className="py-3 px-4">Product</th>
                        <th className="py-3 px-4">Discount</th>
                        <th className="py-3 px-4">Usage</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Dates</th>
                        <th className="py-3 px-4">Actions</th>
                    </tr>
                </thead>
                <tbody className="text-white">
                    {promoCodes.map((promo) => (
                        <tr key={promo.id} className="border-b border-white/5 hover:bg-white/5">
                            <td className="py-3 px-4 font-mono font-bold text-lg">
                                {editingId === promo.id ? (
                                    <input
                                        type="text"
                                        value={editFormData.code || ''}
                                        onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
                                        className="bg-white/10 border border-white/20 rounded px-2 py-1 w-full text-white"
                                    />
                                ) : (
                                    promo.code
                                )}
                            </td>
                            <td className="py-3 px-4">
                                {promo.productId ? (
                                    <span className="text-purple-400">Specific Product</span>
                                ) : (
                                    <span className="text-gray-400">All Products</span>
                                )}
                            </td>
                            <td className="py-3 px-4">
                                {editingId === promo.id ? (
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={editFormData.discountType || 'percentage'}
                                            onChange={(e) => setEditFormData({ ...editFormData, discountType: e.target.value as 'percentage' | 'fixed_amount' })}
                                            className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white"
                                        >
                                            <option value="percentage">%</option>
                                            <option value="fixed_amount">$</option>
                                        </select>
                                        <input
                                            type="number"
                                            value={editFormData.discountValue || ''}
                                            onChange={(e) => setEditFormData({ ...editFormData, discountValue: parseFloat(e.target.value) })}
                                            className="bg-white/10 border border-white/20 rounded px-2 py-1 w-20 text-white"
                                        />
                                    </div>
                                ) : (
                                    promo.discountType === 'percentage'
                                        ? `${promo.discountValue}%`
                                        : `$${Number(promo.discountValue).toFixed(2)}`
                                )}
                            </td>
                            <td className="py-3 px-4">
                                {promo.usageCount} / {promo.usageLimit ? promo.usageLimit : '∞'}
                            </td>
                            <td className="py-3 px-4">
                                <button
                                    onClick={() => handleToggleActive(promo.id, promo.isActive)}
                                    className={`px-2 py-1 rounded-full text-xs cursor-pointer transition-colors ${promo.isActive ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                        }`}
                                >
                                    {promo.isActive ? 'Active' : 'Inactive'}
                                </button>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-400">
                                {promo.startDate && <div>Start: {new Date(promo.startDate).toLocaleDateString()}</div>}
                                {promo.endDate && <div>End: {new Date(promo.endDate).toLocaleDateString()}</div>}
                            </td>
                            <td className="py-3 px-4">
                                {editingId === promo.id ? (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleSaveEdit(promo.id)}
                                            disabled={saving}
                                            className="px-3 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors text-sm disabled:opacity-50"
                                        >
                                            {saving ? 'Saving...' : 'Save'}
                                        </button>
                                        <button
                                            onClick={handleCancelEdit}
                                            className="px-3 py-1 bg-gray-500/20 text-gray-400 rounded hover:bg-gray-500/30 transition-colors text-sm"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEdit(promo)}
                                            className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors text-sm"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(promo.id)}
                                            className="px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors text-sm"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
