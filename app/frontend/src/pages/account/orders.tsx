import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    Package,
    Truck,
    CheckCircle,
    XCircle,
    Clock,
    Eye,
    Download,
    RefreshCw,
    MapPin,
    CreditCard,
    Calendar,
    DollarSign,
    ExternalLink,
    Search
} from 'lucide-react';
import Link from 'next/link';

interface Order {
    id: string;
    orderNumber: string;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    total: number;
    currency: string;
    createdAt: Date;
    updatedAt: Date;
    items: OrderItem[];
    shippingAddress?: any;
    trackingNumber?: string;
    trackingUrl?: string;
    paymentMethod?: string;
    estimatedDelivery?: Date;
}

interface OrderItem {
    id: string;
    productId: string;
    productName: string;
    productImage?: string;
    quantity: number;
    price: number;
    total: number;
}

export default function OrdersPage() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (user) {
            fetchOrders();
        }
    }, [user]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/orders', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch orders');

            const data = await response.json();
            setOrders(data.orders || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
            toast.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return <Clock className="text-yellow-400" size={20} />;
            case 'processing':
                return <RefreshCw className="text-blue-400" size={20} />;
            case 'shipped':
                return <Truck className="text-purple-400" size={20} />;
            case 'delivered':
                return <CheckCircle className="text-green-400" size={20} />;
            case 'cancelled':
                return <XCircle className="text-red-400" size={20} />;
            default:
                return <Package className="text-white/60" size={20} />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'processing':
                return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'shipped':
                return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'delivered':
                return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'cancelled':
                return 'bg-red-500/20 text-red-400 border-red-500/30';
            default:
                return 'bg-white/5 text-white/60 border-white/10';
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
        const matchesSearch = searchQuery === '' ||
            order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.items.some(item => item.productName.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesStatus && matchesSearch;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">My Orders</h1>
                    <p className="text-white/60 mt-1">Track and manage your purchases</p>
                </div>
                <button
                    onClick={fetchOrders}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
                >
                    <RefreshCw size={20} />
                    Refresh
                </button>
            </div>

            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by order number or product name..."
                        className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Status Filters */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {[
                        { key: 'all', label: 'All Orders' },
                        { key: 'pending', label: 'Pending' },
                        { key: 'processing', label: 'Processing' },
                        { key: 'shipped', label: 'Shipped' },
                        { key: 'delivered', label: 'Delivered' },
                        { key: 'cancelled', label: 'Cancelled' }
                    ].map((filter) => (
                        <button
                            key={filter.key}
                            onClick={() => setFilterStatus(filter.key)}
                            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${filterStatus === filter.key
                                ? 'bg-blue-500 text-white'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                        >
                            {filter.label}
                            {filter.key !== 'all' && (
                                <span className="ml-2 text-xs">
                                    ({orders.filter(o => o.status === filter.key).length})
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-xl">
                    <Package size={48} className="mx-auto text-white/40 mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">
                        {searchQuery || filterStatus !== 'all' ? 'No orders found' : 'No orders yet'}
                    </h3>
                    <p className="text-white/60 mb-4">
                        {searchQuery || filterStatus !== 'all'
                            ? 'Try adjusting your filters or search query'
                            : 'Start shopping to see your orders here'
                        }
                    </p>
                    {!searchQuery && filterStatus === 'all' && (
                        <Link
                            href="/marketplace"
                            className="inline-block px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                        >
                            Browse Marketplace
                        </Link>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredOrders.map((order) => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            onViewDetails={() => setSelectedOrder(order)}
                        />
                    ))}
                </div>
            )}

            {/* Order Details Modal */}
            {selectedOrder && (
                <OrderDetailsModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                />
            )}
        </div>
    );
}

// Order Card Component
function OrderCard({ order, onViewDetails }: {
    order: Order;
    onViewDetails: () => void;
}) {
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return <Clock className="text-yellow-400" size={20} />;
            case 'processing':
                return <RefreshCw className="text-blue-400" size={20} />;
            case 'shipped':
                return <Truck className="text-purple-400" size={20} />;
            case 'delivered':
                return <CheckCircle className="text-green-400" size={20} />;
            case 'cancelled':
                return <XCircle className="text-red-400" size={20} />;
            default:
                return <Package className="text-white/60" size={20} />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'processing':
                return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'shipped':
                return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'delivered':
                return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'cancelled':
                return 'bg-red-500/20 text-red-400 border-red-500/30';
            default:
                return 'bg-white/5 text-white/60 border-white/10';
        }
    };

    return (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    {getStatusIcon(order.status)}
                    <div>
                        <h3 className="font-semibold text-white">Order #{order.orderNumber}</h3>
                        <p className="text-sm text-white/60">
                            {new Date(order.createdAt).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </p>
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
            </div>

            {/* Items Preview */}
            <div className="mb-4">
                <div className="flex gap-2 mb-2">
                    {order.items.slice(0, 3).map((item) => (
                        <div
                            key={item.id}
                            className="w-16 h-16 bg-white/10 rounded-lg overflow-hidden flex-shrink-0"
                        >
                            {item.productImage ? (
                                <img
                                    src={item.productImage}
                                    alt={item.productName}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Package size={24} className="text-white/40" />
                                </div>
                            )}
                        </div>
                    ))}
                    {order.items.length > 3 && (
                        <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center">
                            <span className="text-sm text-white/60">+{order.items.length - 3}</span>
                        </div>
                    )}
                </div>
                <p className="text-sm text-white/60">
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                </p>
            </div>

            {/* Tracking Info */}
            {order.trackingNumber && (
                <div className="mb-4 p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Truck size={16} className="text-purple-400" />
                            <span className="text-sm text-white/80">Tracking: {order.trackingNumber}</span>
                        </div>
                        {order.trackingUrl && (
                            <a
                                href={order.trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                            >
                                Track
                                <ExternalLink size={14} />
                            </a>
                        )}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="flex justify-between items-center pt-4 border-t border-white/10">
                <div>
                    <span className="text-2xl font-bold text-white">
                        ${order.total.toFixed(2)}
                    </span>
                    <span className="text-sm text-white/60 ml-2">{order.currency}</span>
                </div>
                <button
                    onClick={onViewDetails}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                    <Eye size={16} />
                    View Details
                </button>
            </div>
        </div>
    );
}

// Order Details Modal Component
function OrderDetailsModal({ order, onClose }: {
    order: Order;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">
                                Order #{order.orderNumber}
                            </h2>
                            <p className="text-white/60">
                                Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <XCircle size={24} className="text-white/60" />
                        </button>
                    </div>

                    {/* Order Items */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Order Items</h3>
                        <div className="space-y-3">
                            {order.items.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex gap-4 p-4 bg-white/5 rounded-lg"
                                >
                                    <div className="w-20 h-20 bg-white/10 rounded-lg overflow-hidden flex-shrink-0">
                                        {item.productImage ? (
                                            <img
                                                src={item.productImage}
                                                alt={item.productName}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Package size={32} className="text-white/40" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-medium text-white mb-1">{item.productName}</h4>
                                        <p className="text-sm text-white/60">Quantity: {item.quantity}</p>
                                        <p className="text-sm text-white/60">Price: ${item.price.toFixed(2)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-white">${item.total.toFixed(2)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Shipping Address */}
                    {order.shippingAddress && (
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <MapPin size={20} className="text-blue-400" />
                                Shipping Address
                            </h3>
                            <div className="p-4 bg-white/5 rounded-lg">
                                <p className="text-white">{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                                <p className="text-white/80">{order.shippingAddress.addressLine1}</p>
                                {order.shippingAddress.addressLine2 && (
                                    <p className="text-white/80">{order.shippingAddress.addressLine2}</p>
                                )}
                                <p className="text-white/80">
                                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                                </p>
                                <p className="text-white/80">{order.shippingAddress.country}</p>
                            </div>
                        </div>
                    )}

                    {/* Tracking Information */}
                    {order.trackingNumber && (
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Truck size={20} className="text-purple-400" />
                                Tracking Information
                            </h3>
                            <div className="p-4 bg-white/5 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm text-white/60 mb-1">Tracking Number</p>
                                        <p className="font-mono text-white">{order.trackingNumber}</p>
                                    </div>
                                    {order.trackingUrl && (
                                        <a
                                            href={order.trackingUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            Track Package
                                            <ExternalLink size={16} />
                                        </a>
                                    )}
                                </div>
                                {order.estimatedDelivery && (
                                    <div className="mt-3 pt-3 border-t border-white/10">
                                        <p className="text-sm text-white/60 mb-1">Estimated Delivery</p>
                                        <p className="text-white">
                                            {new Date(order.estimatedDelivery).toLocaleDateString('en-US', {
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Order Summary */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Order Summary</h3>
                        <div className="p-4 bg-white/5 rounded-lg space-y-2">
                            <div className="flex justify-between text-white/80">
                                <span>Subtotal</span>
                                <span>${(order.total * 0.9).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-white/80">
                                <span>Shipping</span>
                                <span>${(order.total * 0.05).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-white/80">
                                <span>Tax</span>
                                <span>${(order.total * 0.05).toFixed(2)}</span>
                            </div>
                            <div className="pt-2 border-t border-white/10 flex justify-between text-xl font-bold text-white">
                                <span>Total</span>
                                <span>${order.total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
                        >
                            Close
                        </button>
                        <button className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2">
                            <Download size={16} />
                            Download Invoice
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
