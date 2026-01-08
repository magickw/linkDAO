import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import { MapPin, Plus, Edit, Trash2, Star, Check } from 'lucide-react';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import Layout from '@/components/Layout';

interface Address {
    id: string;
    addressType: 'shipping' | 'billing' | 'both';
    label?: string;
    firstName: string;
    lastName: string;
    company?: string;
    phone?: string;
    email?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault: boolean;
    isVerified: boolean;
    deliveryInstructions?: string;
}

export default function AddressesPage() {
    const { user } = useAuth();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);
    const [filterType, setFilterType] = useState<'all' | 'shipping' | 'billing'>('all');

    useEffect(() => {
        if (user) {
            fetchAddresses();
        }
    }, [user]);

    const fetchAddresses = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/user/addresses', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch addresses');

            const data = await response.json();
            setAddresses(data.data || []);
        } catch (error) {
            console.error('Error fetching addresses:', error);
            toast.error('Failed to load addresses');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (addressId: string) => {
        if (!confirm('Are you sure you want to delete this address?')) return;

        try {
            const response = await fetch(`/api/user/addresses/${addressId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to delete address');

            toast.success('Address deleted successfully');
            fetchAddresses();
        } catch (error) {
            console.error('Error deleting address:', error);
            toast.error('Failed to delete address');
        }
    };

    const handleSetDefault = async (addressId: string) => {
        try {
            const response = await fetch(`/api/user/addresses/${addressId}/set-default`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to set default address');

            toast.success('Default address updated');
            fetchAddresses();
        } catch (error) {
            console.error('Error setting default address:', error);
            toast.error('Failed to update default address');
        }
    };

    const filteredAddresses = addresses.filter(addr => {
        if (filterType === 'all') return true;
        return addr.addressType === filterType || addr.addressType === 'both';
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
                                <h1 className="text-3xl font-bold text-white">My Addresses</h1>
                                <p className="text-white/60 mt-1">Manage your shipping and billing addresses</p>
                            </div>
                            <Button
                                variant="primary"
                                icon={<Plus size={20} />}
                                iconPosition="left"
                                onClick={() => {
                                    setEditingAddress(null);
                                    setShowForm(true);
                                }}
                            >
                                Add New Address
                            </Button>
                        </div>
                    </GlassPanel>

                    {/* Filter Tabs */}
                    <GlassPanel variant="secondary" className="mb-6">
                        <div className="flex gap-2">
                            {['all', 'shipping', 'billing'].map((type) => (
                                <Button
                                    key={type}
                                    variant={filterType === type ? 'primary' : 'outline'}
                                    size="sm"
                                    onClick={() => setFilterType(type as any)}
                                    className="capitalize"
                                >
                                    {type}
                                </Button>
                            ))}
                        </div>
                    </GlassPanel>

                    {/* Address Grid */}
                    {filteredAddresses.length === 0 ? (
                        <GlassPanel variant="primary" className="text-center py-12">
                            <MapPin size={48} className="mx-auto text-white/40 mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">No addresses yet</h3>
                            <p className="text-white/60 mb-4">Add your first address to get started</p>
                            <Button
                                variant="primary"
                                onClick={() => setShowForm(true)}
                            >
                                Add Address
                            </Button>
                        </GlassPanel>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredAddresses.map((address) => (
                                <AddressCard
                                    key={address.id}
                                    address={address}
                                    onEdit={() => {
                                        setEditingAddress(address);
                                        setShowForm(true);
                                    }}
                                    onDelete={() => handleDelete(address.id)}
                                    onSetDefault={() => handleSetDefault(address.id)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Address Form Modal */}
                    {showForm && (
                        <AddressFormModal
                            address={editingAddress}
                            onClose={() => {
                                setShowForm(false);
                                setEditingAddress(null);
                            }}
                            onSave={() => {
                                setShowForm(false);
                                setEditingAddress(null);
                                fetchAddresses();
                            }}
                        />
                    )}
                </div>
            </Layout>
        );
    }

// Address Card Component
function AddressCard({ address, onEdit, onDelete, onSetDefault }: {
    address: Address;
    onEdit: () => void;
    onDelete: () => void;
    onSetDefault: () => void;
}) {
    return (
        <GlassPanel variant="secondary" hoverable className="p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <MapPin size={20} className="text-blue-400" />
                    <span className="font-semibold text-white">
                        {address.label || address.addressType}
                    </span>
                    {address.isDefault && (
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

            {/* Address Details */}
            <div className="text-sm text-white/70 space-y-1">
                <p className="text-white font-medium">
                    {address.firstName} {address.lastName}
                </p>
                {address.company && <p>{address.company}</p>}
                <p>{address.addressLine1}</p>
                {address.addressLine2 && <p>{address.addressLine2}</p>}
                <p>
                    {address.city}, {address.state} {address.postalCode}
                </p>
                <p>{address.country}</p>
                {address.phone && <p>{address.phone}</p>}
            </div>

            {/* Type Badge */}
            <div className="mt-4 pt-4 border-t border-white/10">
                <span className="inline-block px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full capitalize">
                    {address.addressType}
                </span>
            </div>

            {/* Set as Default Button */}
            {!address.isDefault && (
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

// Address Form Modal Component
function AddressFormModal({ address, onClose, onSave }: {
    address: Address | null;
    onClose: () => void;
    onSave: () => void;
}) {
    const [formData, setFormData] = useState({
        addressType: address?.addressType || 'shipping',
        label: address?.label || '',
        firstName: address?.firstName || '',
        lastName: address?.lastName || '',
        company: address?.company || '',
        phone: address?.phone || '',
        email: address?.email || '',
        addressLine1: address?.addressLine1 || '',
        addressLine2: address?.addressLine2 || '',
        city: address?.city || '',
        state: address?.state || '',
        postalCode: address?.postalCode || '',
        country: address?.country || 'US',
        isDefault: address?.isDefault || false,
        deliveryInstructions: address?.deliveryInstructions || '',
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const url = address
                ? `/api/user/addresses/${address.id}`
                : '/api/user/addresses';

            const response = await fetch(url, {
                method: address ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Failed to save address');

            toast.success(address ? 'Address updated' : 'Address created');
            onSave();
        } catch (error) {
            console.error('Error saving address:', error);
            toast.error('Failed to save address');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <GlassPanel variant="modal" className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-white mb-6">
                        {address ? 'Edit Address' : 'Add New Address'}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Address Type */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Address Type
                            </label>
                            <select
                                value={formData.addressType}
                                onChange={(e) => setFormData({ ...formData, addressType: e.target.value as any })}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                required
                            >
                                <option value="shipping">Shipping</option>
                                <option value="billing">Billing</option>
                                <option value="both">Both</option>
                            </select>
                        </div>

                        {/* Label */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Label (optional)
                            </label>
                            <input
                                type="text"
                                value={formData.label}
                                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                                placeholder="e.g., Home, Work, Mom's House"
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40"
                            />
                        </div>

                        {/* Name Fields */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    First Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Last Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                    required
                                />
                            </div>
                        </div>

                        {/* Company & Phone */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Company (optional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.company}
                                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Phone (optional)
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                />
                            </div>
                        </div>

                        {/* Address Lines */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Address Line 1 *
                            </label>
                            <input
                                type="text"
                                value={formData.addressLine1}
                                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Address Line 2 (optional)
                            </label>
                            <input
                                type="text"
                                value={formData.addressLine2}
                                onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                                placeholder="Apt, Suite, Unit, etc."
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40"
                            />
                        </div>

                        {/* City, State, Zip */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    City *
                                </label>
                                <input
                                    type="text"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    State *
                                </label>
                                <input
                                    type="text"
                                    value={formData.state}
                                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Postal Code *
                                </label>
                                <input
                                    type="text"
                                    value={formData.postalCode}
                                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Country *
                                </label>
                                <input
                                    type="text"
                                    value={formData.country}
                                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                    required
                                />
                            </div>
                        </div>

                        {/* Delivery Instructions */}
                        {formData.addressType !== 'billing' && (
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Delivery Instructions (optional)
                                </label>
                                <textarea
                                    value={formData.deliveryInstructions}
                                    onChange={(e) => setFormData({ ...formData, deliveryInstructions: e.target.value })}
                                    placeholder="e.g., Leave at front door, Ring doorbell"
                                    rows={3}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40"
                                />
                            </div>
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
                                Set as default {formData.addressType} address
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
                                {address ? 'Update Address' : 'Add Address'}
                            </Button>
                        </div>
                    </form>
                </div>
            </GlassPanel>
        </div>
    );
}
