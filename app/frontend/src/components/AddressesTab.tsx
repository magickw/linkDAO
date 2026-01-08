import React, { useState, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { AddressService, Address, CreateAddressInput } from '@/services/addressService';
import { Plus, Edit2, Trash2, CheckCircle, MapPin } from 'lucide-react';

export const AddressesTab: React.FC = () => {
    const { isConnected } = useWeb3();
    const { addToast } = useToast();

    const [addresses, setAddresses] = useState<Address[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState<CreateAddressInput>({
        type: 'billing',
        firstName: '',
        lastName: '',
        company: '',
        address1: '',
        address2: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        phone: '',
        isDefault: false
    });

    const fetchAddresses = async () => {
        setIsLoading(true);
        try {
            const data = await AddressService.getAddresses();
            setAddresses(data);
        } catch (error) {
            console.error('Failed to fetch addresses:', error);
            addToast('Failed to load addresses', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isConnected) {
            fetchAddresses();
        }
    }, [isConnected]);

    const handleEdit = (address: Address) => {
        setFormData({
            type: address.addressType,
            firstName: address.firstName || '',
            lastName: address.lastName || '',
            company: address.company || '',
            address1: address.addressLine1,
            address2: address.addressLine2 || '',
            city: address.city,
            state: address.state,
            zipCode: address.postalCode,
            country: address.country,
            phone: address.phone || '',
            isDefault: address.isDefault
        });
        setEditingId(address.id);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this address?')) return;

        try {
            await AddressService.deleteAddress(id);
            addToast('Address deleted successfully', 'success');
            fetchAddresses();
        } catch (error) {
            addToast('Failed to delete address', 'error');
        }
    };

    const handleSetDefault = async (id: string) => {
        try {
            await AddressService.setDefaultAddress(id);
            addToast('Default address updated', 'success');
            fetchAddresses();
        } catch (error) {
            addToast('Failed to update default address', 'error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            if (editingId) {
                await AddressService.updateAddress(editingId, formData);
                addToast('Address updated successfully', 'success');
            } else {
                await AddressService.createAddress(formData);
                addToast('Address added successfully', 'success');
            }
            setIsEditing(false);
            setEditingId(null);
            fetchAddresses();
        } catch (error) {
            addToast(editingId ? 'Failed to update address' : 'Failed to add address', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditingId(null);
        setFormData({
            type: 'billing',
            firstName: '',
            lastName: '',
            company: '',
            address1: '',
            address2: '',
            city: '',
            state: '',
            zipCode: '',
            country: '',
            phone: '',
            isDefault: false
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    if (isEditing) {
        return (
            <GlassPanel variant="secondary" className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">{editingId ? 'Edit Address' : 'Add New Address'}</h3>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-white/80 mb-2">Address Type</label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                            >
                                <option value="billing">Billing</option>
                                <option value="shipping">Shipping</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">First Name *</label>
                            <input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">Last Name *</label>
                            <input
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                required
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-white/80 mb-2">Company (Optional)</label>
                            <input
                                type="text"
                                name="company"
                                value={formData.company}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-white/80 mb-2">Address Line 1 *</label>
                            <input
                                type="text"
                                name="address1"
                                value={formData.address1}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                required
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-white/80 mb-2">Address Line 2</label>
                            <input
                                type="text"
                                name="address2"
                                value={formData.address2}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">City *</label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">State *</label>
                            <input
                                type="text"
                                name="state"
                                value={formData.state}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">Zip Code *</label>
                            <input
                                type="text"
                                name="zipCode"
                                value={formData.zipCode}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">Country *</label>
                            <input
                                type="text"
                                name="country"
                                value={formData.country}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                                required
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-white/80 mb-2">Phone</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isDefault"
                                    name="isDefault"
                                    checked={formData.isDefault}
                                    onChange={handleChange}
                                    className="w-4 h-4 rounded border-white/10 text-blue-500 focus:ring-blue-500 bg-white/5"
                                />
                                <label htmlFor="isDefault" className="ml-2 text-sm text-white/80">
                                    Set as default {formData.type} address
                                </label>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <Button type="button" variant="ghost" onClick={handleCancel}>Cancel</Button>
                        <Button type="submit" variant="primary" loading={isSaving}>Save Address</Button>
                    </div>
                </form>
            </GlassPanel>
        );
    }

    return (
        <GlassPanel variant="secondary" className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white">Addresses</h3>
                    <p className="text-white/60 text-sm mt-1">Manage your billing and shipping addresses</p>
                </div>
                <Button onClick={() => setIsEditing(true)} icon={<Plus size={16} />}>
                    Add Address
                </Button>
            </div>

            {isLoading ? (
                <div className="text-white/60 text-center py-8">Loading addresses...</div>
            ) : addresses.length === 0 ? (
                <div className="text-white/60 text-center py-12 bg-white/5 rounded-lg border border-white/10">
                    <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No addresses found.</p>
                    <Button variant="ghost" onClick={() => setIsEditing(true)} className="mt-4">
                        Add your first address
                    </Button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {addresses.map((address) => (
                        <div key={address.id} className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2 py-0.5 text-xs rounded-full ${address.addressType === 'billing' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                                            }`}>
                                            {address.addressType.toUpperCase()}
                                        </span>
                                        {address.isDefault && (
                                            <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
                                                <CheckCircle size={10} /> DEFAULT
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="font-bold text-white">{address.firstName} {address.lastName}</h4>
                                    {address.company && <p className="text-white/80 text-sm">{address.company}</p>}
                                    <div className="text-white/60 text-sm mt-2 space-y-0.5">
                                        <p>{address.addressLine1}</p>
                                        {address.addressLine2 && <p>{address.addressLine2}</p>}
                                        <p>{address.city}, {address.state} {address.postalCode}</p>
                                        <p>{address.country}</p>
                                        {address.phone && <p className="mt-2 text-white/50">{address.phone}</p>}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEdit(address)}
                                        icon={<Edit2 size={14} />}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                        onClick={() => handleDelete(address.id)}
                                        icon={<Trash2 size={14} />}
                                    />
                                    {!address.isDefault && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs"
                                            onClick={() => handleSetDefault(address.id)}
                                        >
                                            Make Default
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </GlassPanel>
    );
};
