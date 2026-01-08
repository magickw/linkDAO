import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import { CreditCard, Wallet, Plus, Edit, Trash2, Star, Check, Shield } from 'lucide-react';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import Layout from '@/components/Layout';

interface PaymentMethod {
    id: string;
    methodType: 'credit_card' | 'debit_card' | 'crypto_wallet' | 'bank_account';
    provider?: string;
    label?: string;
    cardLast4?: string;
    cardBrand?: string;
    cardExpMonth?: number;
    cardExpYear?: number;
    walletAddress?: string;
    walletType?: string;
    chainId?: number;
    isDefault: boolean;
    isVerified: boolean;
    status: string;
    lastUsedAt?: Date;
}

export default function PaymentMethodsPage() {
    const { user } = useAuth();
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
    const [filterType, setFilterType] = useState<'all' | 'cards' | 'crypto'>('all');

    useEffect(() => {
        if (user) {
            fetchPaymentMethods();
        }
    }, [user]);

    const fetchPaymentMethods = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/user/payment-methods', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch payment methods');

            const data = await response.json();
            setPaymentMethods(data.data || []);
        } catch (error) {
            console.error('Error fetching payment methods:', error);
            toast.error('Failed to load payment methods');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (methodId: string) => {
        if (!confirm('Are you sure you want to remove this payment method?')) return;

        try {
            const response = await fetch(`/api/user/payment-methods/${methodId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to delete payment method');

            toast.success('Payment method removed successfully');
            fetchPaymentMethods();
        } catch (error) {
            console.error('Error deleting payment method:', error);
            toast.error('Failed to remove payment method');
        }
    };

    const handleSetDefault = async (methodId: string) => {
        try {
            const response = await fetch(`/api/user/payment-methods/${methodId}/set-default`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to set default payment method');

            toast.success('Default payment method updated');
            fetchPaymentMethods();
        } catch (error) {
            console.error('Error setting default payment method:', error);
            toast.error('Failed to update default payment method');
        }
    };

    const filteredMethods = paymentMethods.filter(method => {
        if (filterType === 'all') return true;
        if (filterType === 'cards') return method.methodType.includes('card');
        if (filterType === 'crypto') return method.methodType === 'crypto_wallet';
        return true;
    });

    if (loading) {
        return (
            <Layout fullWidth={true}>
                <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout fullWidth={true}>
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <GlassPanel variant="secondary" className="mb-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold text-white">Payment Methods</h1>
                                <p className="text-white/60 mt-1">Manage your cards and crypto wallets</p>
                            </div>
                            <Button
                                variant="primary"
                                icon={<Plus size={20} />}
                                iconPosition="left"
                                onClick={() => {
                                    setEditingMethod(null);
                                    setShowForm(true);
                                }}
                            >
                                Add Payment Method
                            </Button>
                        </div>
                    </GlassPanel>

                    {/* Filter Tabs */}
                    <GlassPanel variant="secondary" className="mb-6">
                        <div className="flex gap-2">
                            {[
                                { key: 'all', label: 'All' },
                                { key: 'cards', label: 'Cards' },
                                { key: 'crypto', label: 'Crypto' }
                            ].map((filter) => (
                                <Button
                                    key={filter.key}
                                    variant={filterType === filter.key ? 'primary' : 'outline'}
                                    size="sm"
                                    onClick={() => setFilterType(filter.key as any)}
                                >
                                    {filter.label}
                                </Button>
                            ))}
                        </div>
                    </GlassPanel>

                    {/* Security Notice */}
                    <GlassPanel variant="secondary" className="mb-6 border-blue-500/20">
                        <div className="flex items-start gap-3">
                            <Shield className="text-blue-400 flex-shrink-0 mt-0.5" size={20} />
                            <div className="text-sm text-white/80">
                                <p className="font-semibold mb-1">Your payment information is secure</p>
                                <p className="text-white/60">
                                    Card details are encrypted and tokenized. We never store your full card number.
                                </p>
                            </div>
                        </div>
                    </GlassPanel>

                    {/* Payment Methods Grid */}
                    {filteredMethods.length === 0 ? (
                        <GlassPanel variant="primary" className="text-center py-12">
                            <CreditCard size={48} className="mx-auto text-white/40 mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">No payment methods yet</h3>
                            <p className="text-white/60 mb-4">Add a payment method for faster checkout</p>
                            <Button
                                variant="primary"
                                onClick={() => setShowForm(true)}
                            >
                                Add Payment Method
                            </Button>
                        </GlassPanel>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredMethods.map((method) => (
                                <PaymentMethodCard
                                    key={method.id}
                                    method={method}
                                    onEdit={() => {
                                        setEditingMethod(method);
                                        setShowForm(true);
                                    }}
                                    onDelete={() => handleDelete(method.id)}
                                    onSetDefault={() => handleSetDefault(method.id)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Payment Method Form Modal */}
                    {showForm && (
                        <PaymentMethodFormModal
                            method={editingMethod}
                            onClose={() => {
                                setShowForm(false);
                                setEditingMethod(null);
                            }}
                            onSave={() => {
                                setShowForm(false);
                                setEditingMethod(null);
                                fetchPaymentMethods();
                            }}
                        />
                    )}
                </div>
            </Layout>
        );
    }

// Payment Method Card Component
function PaymentMethodCard({ method, onEdit, onDelete, onSetDefault }: {
    method: PaymentMethod;
    onEdit: () => void;
    onDelete: () => void;
    onSetDefault: () => void;
}) {
    const isCard = method.methodType.includes('card');
    const isCrypto = method.methodType === 'crypto_wallet';

    return (
        <GlassPanel variant="secondary" hoverable className="p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    {isCard ? (
                        <CreditCard size={20} className="text-blue-400" />
                    ) : (
                        <Wallet size={20} className="text-purple-400" />
                    )}
                    <span className="font-semibold text-white">
                        {method.label || (isCard ? 'Card' : 'Wallet')}
                    </span>
                    {method.isDefault && (
                        <Star size={16} className="text-yellow-400 fill-yellow-400" />
                    )}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onEdit}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        title="Edit"
                    >
                        <Edit size={16} className="text-white/60" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={16} className="text-red-400" />
                    </button>
                </div>
            </div>

            {/* Card Details */}
            {isCard && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-mono text-white">
                            •••• {method.cardLast4}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-white/60">
                        <span className="capitalize">{method.cardBrand}</span>
                        <span>Exp: {method.cardExpMonth}/{method.cardExpYear}</span>
                    </div>
                </div>
            )}

            {/* Crypto Wallet Details */}
            {isCrypto && (
                <div className="space-y-2">
                    <div className="font-mono text-sm text-white/80 break-all">
                        {method.walletAddress?.slice(0, 6)}...{method.walletAddress?.slice(-4)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-white/60">
                        <span className="capitalize">{method.walletType}</span>
                        {method.chainId && <span>Chain: {method.chainId}</span>}
                    </div>
                </div>
            )}

            {/* Status Badge */}
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className={`inline-block px-2 py-1 text-xs rounded-full ${method.status === 'active'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                    }`}>
                    {method.status}
                </span>
                {method.isVerified && (
                    <Shield size={14} className="text-green-400" title="Verified" />
                )}
            </div>

            {/* Set as Default Button */}
            {!method.isDefault && method.status === 'active' && (
                <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    icon={<Check size={16} />}
                    iconPosition="left"
                    onClick={onSetDefault}
                    className="mt-3"
                >
                    Set as Default
                </Button>
            )}
        </GlassPanel>
    );
}

// Payment Method Form Modal Component
function PaymentMethodFormModal({ method, onClose, onSave }: {
    method: PaymentMethod | null;
    onClose: () => void;
    onSave: () => void;
}) {
    const [methodType, setMethodType] = useState<'card' | 'crypto'>(
        method?.methodType === 'crypto_wallet' ? 'crypto' : 'card'
    );
    const [formData, setFormData] = useState({
        label: method?.label || '',
        // Card fields
        cardLast4: method?.cardLast4 || '',
        cardBrand: method?.cardBrand || 'visa',
        cardExpMonth: method?.cardExpMonth || new Date().getMonth() + 1,
        cardExpYear: method?.cardExpYear || new Date().getFullYear(),
        stripePaymentMethodId: method?.provider === 'stripe' ? 'pm_' : '',
        // Crypto fields
        walletAddress: method?.walletAddress || '',
        walletType: method?.walletType || 'metamask',
        chainId: method?.chainId || 1,
        // Common
        isDefault: method?.isDefault || false,
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const payload = methodType === 'card' ? {
                methodType: 'credit_card',
                provider: 'stripe',
                label: formData.label,
                cardLast4: formData.cardLast4,
                cardBrand: formData.cardBrand,
                cardExpMonth: formData.cardExpMonth,
                cardExpYear: formData.cardExpYear,
                stripePaymentMethodId: formData.stripePaymentMethodId,
                isDefault: formData.isDefault,
            } : {
                methodType: 'crypto_wallet',
                provider: formData.walletType,
                label: formData.label,
                walletAddress: formData.walletAddress,
                walletType: formData.walletType,
                chainId: formData.chainId,
                isDefault: formData.isDefault,
            };

            const url = method
                ? `/api/user/payment-methods/${method.id}`
                : '/api/user/payment-methods';

            const response = await fetch(url, {
                method: method ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Failed to save payment method');

            toast.success(method ? 'Payment method updated' : 'Payment method added');
            onSave();
        } catch (error) {
            console.error('Error saving payment method:', error);
            toast.error('Failed to save payment method');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <GlassPanel variant="modal" className="max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-white mb-6">
                        {method ? 'Edit Payment Method' : 'Add Payment Method'}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Method Type Selection */}
                        {!method && (
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <button
                                    type="button"
                                    onClick={() => setMethodType('card')}
                                    className={`p-4 rounded-lg border-2 transition-all ${methodType === 'card'
                                        ? 'border-blue-500 bg-blue-500/10'
                                        : 'border-white/10 bg-white/5'
                                        }`}
                                >
                                    <CreditCard className="mx-auto mb-2" size={24} />
                                    <span className="text-white text-sm">Card</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMethodType('crypto')}
                                    className={`p-4 rounded-lg border-2 transition-all ${methodType === 'crypto'
                                        ? 'border-purple-500 bg-purple-500/10'
                                        : 'border-white/10 bg-white/5'
                                        }`}
                                >
                                    <Wallet className="mx-auto mb-2" size={24} />
                                    <span className="text-white text-sm">Crypto</span>
                                </button>
                            </div>
                        )}

                        {/* Label */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Label (optional)
                            </label>
                            <input
                                type="text"
                                value={formData.label}
                                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                                placeholder="e.g., Personal Visa, Business Card"
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40"
                            />
                        </div>

                        {/* Card Fields */}
                        {methodType === 'card' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Last 4 Digits *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.cardLast4}
                                        onChange={(e) => setFormData({ ...formData, cardLast4: e.target.value.slice(0, 4) })}
                                        placeholder="4242"
                                        maxLength={4}
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Card Brand *
                                    </label>
                                    <select
                                        value={formData.cardBrand}
                                        onChange={(e) => setFormData({ ...formData, cardBrand: e.target.value })}
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                        required
                                    >
                                        <option value="visa">Visa</option>
                                        <option value="mastercard">Mastercard</option>
                                        <option value="amex">American Express</option>
                                        <option value="discover">Discover</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-white/80 mb-2">
                                            Exp Month *
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.cardExpMonth}
                                            onChange={(e) => setFormData({ ...formData, cardExpMonth: parseInt(e.target.value) })}
                                            min="1"
                                            max="12"
                                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white/80 mb-2">
                                            Exp Year *
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.cardExpYear}
                                            onChange={(e) => setFormData({ ...formData, cardExpYear: parseInt(e.target.value) })}
                                            min={new Date().getFullYear()}
                                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Stripe Payment Method ID *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.stripePaymentMethodId}
                                        onChange={(e) => setFormData({ ...formData, stripePaymentMethodId: e.target.value })}
                                        placeholder="pm_..."
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-sm"
                                        required
                                    />
                                    <p className="text-xs text-white/40 mt-1">
                                        Get this from Stripe after tokenizing the card
                                    </p>
                                </div>
                            </>
                        )}

                        {/* Crypto Fields */}
                        {methodType === 'crypto' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Wallet Address *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.walletAddress}
                                        onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value })}
                                        placeholder="0x..."
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-sm"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Wallet Type *
                                    </label>
                                    <select
                                        value={formData.walletType}
                                        onChange={(e) => setFormData({ ...formData, walletType: e.target.value })}
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                        required
                                    >
                                        <option value="metamask">MetaMask</option>
                                        <option value="coinbase">Coinbase Wallet</option>
                                        <option value="walletconnect">WalletConnect</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Chain ID *
                                    </label>
                                    <select
                                        value={formData.chainId}
                                        onChange={(e) => setFormData({ ...formData, chainId: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                        required
                                    >
                                        <option value="1">Ethereum Mainnet (1)</option>
                                        <option value="11155111">Sepolia Testnet (11155111)</option>
                                        <option value="137">Polygon (137)</option>
                                        <option value="8453">Base (8453)</option>
                                    </select>
                                </div>
                            </>
                        )}

                        {/* Set as Default */}
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isDefault"
                                checked={formData.isDefault}
                                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                                className="w-4 h-4 rounded border-white/10"
                            />
                            <label htmlFor="isDefault" className="text-sm text-white/80">
                                Set as default payment method
                            </label>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 pt-4">
                            <Button
                                variant="outline"
                                fullWidth
                                onClick={onClose}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                fullWidth
                                type="submit"
                                disabled={saving}
                                loading={saving}
                            >
                                {method ? 'Update' : 'Add Method'}
                            </Button>
                        </div>
                    </form>
                </div>
            </GlassPanel>
        </div>
    );
}
