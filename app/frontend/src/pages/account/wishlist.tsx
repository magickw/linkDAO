import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import { Heart, Plus, Edit, Trash2, Share2, TrendingDown, ShoppingCart, Star, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';

interface Wishlist {
    id: string;
    userId: string;
    name: string;
    description?: string;
    isPublic: boolean;
    shareToken?: string;
    createdAt: Date;
    updatedAt: Date;
}

interface WishlistItem {
    id: string;
    wishlistId: string;
    productId: string;
    quantity?: number;
    priority?: 'high' | 'medium' | 'low';
    notes?: string;
    priceAtAdd?: number;
    priceAlertThreshold?: number;
    addedAt: Date;
    // Product details (from join)
    product?: {
        id: string;
        name: string;
        price: number;
        image?: string;
        inStock: boolean;
    };
}

export default function WishlistPage() {
    const { user } = useAuth();
    const [wishlists, setWishlists] = useState<Wishlist[]>([]);
    const [selectedWishlist, setSelectedWishlist] = useState<Wishlist | null>(null);
    const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showWishlistForm, setShowWishlistForm] = useState(false);
    const [editingWishlist, setEditingWishlist] = useState<Wishlist | null>(null);

    useEffect(() => {
        if (user) {
            fetchWishlists();
        }
    }, [user]);

    useEffect(() => {
        if (selectedWishlist) {
            fetchWishlistItems(selectedWishlist.id);
        }
    }, [selectedWishlist]);

    const fetchWishlists = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/user/wishlists', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch wishlists');

            const data = await response.json();
            const lists = data.data || [];
            setWishlists(lists);

            // Auto-select first wishlist
            if (lists.length > 0 && !selectedWishlist) {
                setSelectedWishlist(lists[0]);
            }
        } catch (error) {
            console.error('Error fetching wishlists:', error);
            toast.error('Failed to load wishlists');
        } finally {
            setLoading(false);
        }
    };

    const fetchWishlistItems = async (wishlistId: string) => {
        try {
            const response = await fetch(`/api/user/wishlists/${wishlistId}/items`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch wishlist items');

            const data = await response.json();
            setWishlistItems(data.data || []);
        } catch (error) {
            console.error('Error fetching wishlist items:', error);
            toast.error('Failed to load wishlist items');
        }
    };

    const handleDeleteWishlist = async (wishlistId: string) => {
        if (!confirm('Are you sure you want to delete this wishlist?')) return;

        try {
            const response = await fetch(`/api/user/wishlists/${wishlistId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to delete wishlist');

            toast.success('Wishlist deleted successfully');
            fetchWishlists();
            setSelectedWishlist(null);
        } catch (error) {
            console.error('Error deleting wishlist:', error);
            toast.error('Failed to delete wishlist');
        }
    };

    const handleRemoveItem = async (productId: string) => {
        if (!selectedWishlist) return;

        try {
            const response = await fetch(`/api/user/wishlists/${selectedWishlist.id}/items/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to remove item');

            toast.success('Item removed from wishlist');
            fetchWishlistItems(selectedWishlist.id);
        } catch (error) {
            console.error('Error removing item:', error);
            toast.error('Failed to remove item');
        }
    };

    const handleShareWishlist = async (wishlist: Wishlist) => {
        const shareUrl = `${window.location.origin}/wishlist/shared/${wishlist.shareToken || wishlist.id}`;

        try {
            await navigator.clipboard.writeText(shareUrl);
            toast.success('Share link copied to clipboard!');
        } catch (error) {
            toast.error('Failed to copy link');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <>
        <Layout fullWidth={true}>
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-white">My Wishlists</h1>
                            <p className="text-white/60 mt-1">Save items you love for later</p>
                        </div>
                        <Button
                            variant="primary"
                            onClick={() => {
                                setEditingWishlist(null);
                                setShowWishlistForm(true);
                            }}
                            icon={<Plus size={20} />}
                        >
                            Create Wishlist
                        </Button>
                    </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Wishlist Sidebar */}
                <div className="col-span-12 lg:col-span-3">
                    <GlassPanel variant="secondary" className="p-4">
                        <h3 className="text-sm font-semibold text-white/60 uppercase mb-3">
                            Your Wishlists
                        </h3>

                        {wishlists.length === 0 ? (
                            <div className="text-center py-8">
                                <Heart size={32} className="mx-auto text-white/40 mb-2" />
                                <p className="text-sm text-white/60 mb-3">No wishlists yet</p>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowWishlistForm(true)}
                                >
                                    Create your first wishlist
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {wishlists.map((wishlist) => (
                                    <button
                                        key={wishlist.id}
                                        onClick={() => setSelectedWishlist(wishlist)}
                                        className={`w-full text-left p-3 rounded-lg transition-all ${selectedWishlist?.id === wishlist.id
                                            ? 'bg-blue-500/20 border border-blue-500/30'
                                            : 'bg-white/5 border border-transparent hover:bg-white/10'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-white text-sm">
                                                {wishlist.name}
                                            </span>
                                            {wishlist.isPublic && (
                                                <Share2 size={14} className="text-blue-400" />
                                            )}
                                        </div>
                                        {wishlist.description && (
                                            <p className="text-xs text-white/50 line-clamp-1">
                                                {wishlist.description}
                                            </p>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </GlassPanel>
                </div>

                {/* Wishlist Content */}
                <div className="col-span-12 lg:col-span-9">
                    {selectedWishlist ? (
                        <>
                            {/* Wishlist Header */}
                            <GlassPanel variant="secondary" className="p-6 mb-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white mb-2">
                                            {selectedWishlist.name}
                                        </h2>
                                        {selectedWishlist.description && (
                                            <p className="text-white/60">{selectedWishlist.description}</p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleShareWishlist(selectedWishlist)}
                                            icon={<Share2 size={18} />}
                                            title="Share wishlist"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setEditingWishlist(selectedWishlist);
                                                setShowWishlistForm(true);
                                            }}
                                            icon={<Edit size={18} />}
                                            title="Edit wishlist"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteWishlist(selectedWishlist.id)}
                                            icon={<Trash2 size={18} />}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                            title="Delete wishlist"
                                        />
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center gap-4 text-sm text-white/60">
                                    <span>{wishlistItems.length} items</span>
                                    <span>•</span>
                                    <span>{selectedWishlist.isPublic ? 'Public' : 'Private'}</span>
                                </div>
                            </GlassPanel>

                            {/* Wishlist Items */}
                            {wishlistItems.length === 0 ? (
                                <GlassPanel variant="primary" className="text-center py-12">
                                    <Heart size={48} className="mx-auto text-white/40 mb-4" />
                                    <h3 className="text-xl font-semibold text-white mb-2">
                                        Your wishlist is empty
                                    </h3>
                                    <p className="text-white/60 mb-4">
                                        Browse products and add them to this wishlist
                                    </p>
                                    <Button
                                        variant="primary"
                                        onClick={() => window.location.href = '/marketplace'}
                                    >
                                        Browse Marketplace
                                    </Button>
                                </GlassPanel>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {wishlistItems.map((item) => (
                                        <WishlistItemCard
                                            key={item.id}
                                            item={item}
                                            onRemove={() => handleRemoveItem(item.productId)}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <GlassPanel variant="primary" className="text-center py-12">
                            <Heart size={48} className="mx-auto text-white/40 mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">
                                Select a wishlist
                            </h3>
                            <p className="text-white/60">
                                Choose a wishlist from the sidebar to view items
                            </p>
                        </GlassPanel>
                    )}
                </div>
            </div>
            </div>
            </div>
        </Layout>

        {/* Wishlist Form Modal */}
        {showWishlistForm && (
            <WishlistFormModal
                wishlist={editingWishlist}
                onClose={() => {
                    setShowWishlistForm(false);
                    setEditingWishlist(null);
                }}
                onSave={() => {
                    setShowWishlistForm(false);
                    setEditingWishlist(null);
                    fetchWishlists();
                }}
            />
        )}
        </>
    );
}

// Wishlist Item Card Component
function WishlistItemCard({ item, onRemove }: {
    item: WishlistItem;
    onRemove: () => void;
}) {
    const product = item.product;
    const priceDropPercent = item.priceAtAdd && product?.price
        ? ((item.priceAtAdd - product.price) / item.priceAtAdd * 100)
        : 0;
    const hasPriceDrop = priceDropPercent > 0;

    return (
        <GlassPanel variant="secondary" className="p-4 hover:border-white/20 transition-all">
            <div className="flex gap-4">
                {/* Product Image */}
                <div className="w-24 h-24 bg-white/10 rounded-lg flex-shrink-0 overflow-hidden">
                    {product?.image ? (
                        <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <ShoppingCart size={32} className="text-white/40" />
                        </div>
                    )}
                </div>

                {/* Product Details */}
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-white line-clamp-2">
                            {product?.name || 'Product'}
                        </h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onRemove}
                            icon={<Trash2 size={16} />}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            title="Remove"
                        />
                    </div>

                    {/* Price Info */}
                    <div className="mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-white">
                                ${product?.price?.toFixed(2) || '0.00'}
                            </span>
                            {hasPriceDrop && (
                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <TrendingDown size={12} />
                                    {priceDropPercent.toFixed(0)}% off
                                </span>
                            )}
                        </div>
                        {item.priceAtAdd && (
                            <span className="text-xs text-white/40">
                                Was ${item.priceAtAdd.toFixed(2)}
                            </span>
                        )}
                    </div>

                    {/* Item Details */}
                    <div className="flex items-center gap-3 text-xs text-white/60">
                        {item.quantity && item.quantity > 1 && (
                            <span>Qty: {item.quantity}</span>
                        )}
                        {item.priority && (
                            <span className={`px-2 py-0.5 rounded-full ${item.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                                item.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-blue-500/20 text-blue-400'
                                }`}>
                                <Star size={10} className="inline mr-1" />
                                {item.priority}
                            </span>
                        )}
                        {!product?.inStock && (
                            <span className="text-red-400">Out of Stock</span>
                        )}
                    </div>

                    {/* Notes */}
                    {item.notes && (
                        <p className="text-xs text-white/50 mt-2 line-clamp-2">
                            {item.notes}
                        </p>
                    )}

                    {/* Add to Cart Button */}
                    <Button
                        variant="primary"
                        size="sm"
                        className="mt-3 w-full"
                        icon={<ShoppingCart size={16} />}
                    >
                        Add to Cart
                    </Button>
                </div>
            </div>
        </GlassPanel>
    );
}

// Wishlist Form Modal Component
function WishlistFormModal({ wishlist, onClose, onSave }: {
    wishlist: Wishlist | null;
    onClose: () => void;
    onSave: () => void;
}) {
    const [formData, setFormData] = useState({
        name: wishlist?.name || '',
        description: wishlist?.description || '',
        isPublic: wishlist?.isPublic || false,
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const url = wishlist
                ? `/api/user/wishlists/${wishlist.id}`
                : '/api/user/wishlists';

            const response = await fetch(url, {
                method: wishlist ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Failed to save wishlist');

            toast.success(wishlist ? 'Wishlist updated' : 'Wishlist created');
            onSave();
        } catch (error) {
            console.error('Error saving wishlist:', error);
            toast.error('Failed to save wishlist');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <GlassPanel variant="modal" className="max-w-md w-full">
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-white mb-6">
                        {wishlist ? 'Edit Wishlist' : 'Create Wishlist'}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Wishlist Name *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Holiday Gifts, Birthday Wishlist"
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Description (optional)
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="What's this wishlist for?"
                                rows={3}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isPublic"
                                checked={formData.isPublic}
                                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                                className="w-4 h-4 rounded border-white/10"
                            />
                            <label htmlFor="isPublic" className="text-sm text-white/80">
                                Make this wishlist public (shareable)
                            </label>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onClose}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                loading={saving}
                                className="flex-1"
                            >
                                {saving ? 'Saving...' : wishlist ? 'Update' : 'Create'}
                            </Button>
                        </div>
                    </form>
                </div>
            </GlassPanel>
        </div>
    );
}
