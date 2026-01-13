import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '@/config/api';
import { orderService } from '@/services/orderService';
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
    Search,
    AlertTriangle,
    X
} from 'lucide-react';
import Link from 'next/link';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import Layout from '@/components/Layout';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    seller?: {
        walletAddress: string;
        handle?: string;
        displayName?: string;
        avatar?: string;
        address?: {
            street: string;
            city: string;
            state: string;
            postalCode: string;
            country: string;
        };
    };
    buyer?: {
        walletAddress: string;
        handle?: string;
        displayName?: string;
        avatar?: string;
        address?: {
            street: string;
            city: string;
            state: string;
            postalCode: string;
            country: string;
        };
    };
    serviceCompletedAt?: Date;
    actualDelivery?: Date;
    taxAmount?: number;
    shippingCost?: number;
    platformFee?: number;
}

interface OrderItem {
    id: string;
    productId: string;
    productName: string;
    productImage?: string;
    quantity: number;
    price: number;
    total: number;
    isPhysical?: boolean;
    isService?: boolean;
}

export default function OrdersPage() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
    const [showCancelConfirm, setShowCancelConfirm] = useState<Order | null>(null);
    const [cancelReason, setCancelReason] = useState('');

    useEffect(() => {
        if (user) {
            fetchOrders();
        } else {
            // If no user, stop loading and show empty state
            setLoading(false);
        }
    }, [user]);

    // Check if order can be cancelled (handle both uppercase and lowercase status)
    const canCancelOrder = useCallback((order: Order) => {
        const status = order.status?.toLowerCase();
        return ['pending', 'processing'].includes(status);
    }, []);

    // Handle cancel order
    const handleCancelOrder = useCallback(async (order: Order) => {
        if (!canCancelOrder(order)) {
            toast.error('This order cannot be cancelled');
            return;
        }
        setShowCancelConfirm(order);
        setCancelReason('');
    }, [canCancelOrder]);

    // Confirm cancel order
    const confirmCancelOrder = useCallback(async () => {
        if (!showCancelConfirm) return;

        setCancellingOrderId(showCancelConfirm.id);
        try {
            const result = await orderService.cancelOrder(showCancelConfirm.id, cancelReason || 'Cancelled by buyer');

            if (result.success) {
                toast.success(result.message || 'Order cancelled successfully');

                // Update the order in the local state
                setOrders(prev => prev.map(o =>
                    o.id === showCancelConfirm.id
                        ? { ...o, status: 'cancelled' as const }
                        : o
                ));

                // Close modals
                setShowCancelConfirm(null);
                setSelectedOrder(null);

                if (result.refundInitiated) {
                    toast.success('Refund has been initiated. You will receive your funds shortly.');
                }
            }
        } catch (error) {
            console.error('Failed to cancel order:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to cancel order');
        } finally {
            setCancellingOrderId(null);
        }
    }, [showCancelConfirm, cancelReason]);

    const fetchOrders = async () => {
        if (!user?.address) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            // Get auth token from various storage locations
            let token = localStorage.getItem('token') ||
                localStorage.getItem('authToken') ||
                localStorage.getItem('auth_token');

            // Also try to get from linkdao_session_data
            if (!token) {
                try {
                    const sessionDataStr = localStorage.getItem('linkdao_session_data');
                    if (sessionDataStr) {
                        const sessionData = JSON.parse(sessionDataStr);
                        token = sessionData.token || sessionData.accessToken;
                    }
                } catch (error) {
                    console.warn('Failed to parse session data for orders auth');
                }
            }

            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // Use /mine endpoint which uses the auth token to identify the user securely
            const response = await fetch(`${API_BASE_URL}/api/orders/mine?role=buyer`, {
                headers,
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to fetch orders');

            const data = await response.json();
            // Sanitize order data to ensure all required properties exist
            const sanitizedOrders = (data.orders || []).map((order: any) => ({
                id: order.id || order._id || `order-${Date.now()}`,
                orderNumber: order.orderNumber || order.order_number || order.id || 'N/A',
                status: order.status || 'pending',
                total: typeof order.total === 'number' ? order.total : parseFloat(order.total) || 0,
                currency: order.currency || 'USD',
                createdAt: order.createdAt || order.created_at || new Date(),
                updatedAt: order.updatedAt || order.updated_at || new Date(),
                items: Array.isArray(order.items) ? order.items.map((item: any) => ({
                    id: item.id || item._id || `item-${Date.now()}`,
                    productId: item.productId || item.product_id || '',
                    productName: item.productName || item.product_name || item.name || 'Unknown Product',
                    productImage: item.productImage || item.product_image || item.image || null,
                    quantity: item.quantity || 1,
                    price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
                    total: typeof item.total === 'number' ? item.total : parseFloat(item.total) || 0,
                    isPhysical: item.isPhysical ?? false,
                    isService: item.isService ?? false
                })) : [],
                shippingAddress: order.shippingAddress || order.shipping_address || null,
                trackingNumber: order.trackingNumber || order.tracking_number || null,
                trackingUrl: order.trackingUrl || order.tracking_url || null,
                paymentMethod: order.paymentMethod || order.payment_method || order.paymentToken || 'Crypto',
                estimatedDelivery: order.estimatedDelivery || order.estimated_delivery || null,
                seller: order.seller,
                buyer: order.buyer,
                serviceCompletedAt: order.serviceCompletedAt ? new Date(order.serviceCompletedAt) : undefined,
                actualDelivery: order.actualDelivery ? new Date(order.actualDelivery) : undefined,
                taxAmount: typeof order.taxAmount === 'number' ? order.taxAmount : parseFloat(order.taxAmount) || 0,
                shippingCost: typeof order.shippingCost === 'number' ? order.shippingCost : parseFloat(order.shippingCost) || 0,
                platformFee: typeof order.platformFee === 'number' ? order.platformFee : parseFloat(order.platformFee) || 0
            }));
            setOrders(sanitizedOrders);
        } catch (error) {
            console.error('Error fetching orders:', error);
            toast.error('Failed to load orders');
            setOrders([]);
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
        const orderNumber = order.orderNumber || '';
        const items = order.items || [];
        const matchesSearch = searchQuery === '' ||
            orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            items.some(item => (item.productName || '').toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesStatus && matchesSearch;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                    <Package size={64} className="mx-auto text-white/40 mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Please sign in</h2>
                    <p className="text-white/60 mb-6">You need to be signed in to view your orders.</p>
                    <Link
                        href="/marketplace"
                        className="inline-block px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                    >
                        Go to Marketplace
                    </Link>
                </div>
            </div>
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
                                <h1 className="text-3xl font-bold text-white">My Orders</h1>
                                <p className="text-white/60 mt-1">Track and manage your purchases</p>
                            </div>
                            <Button
                                variant="outline"
                                icon={<RefreshCw size={20} />}
                                iconPosition="left"
                                onClick={fetchOrders}
                            >
                                Refresh
                            </Button>
                        </div>
                    </GlassPanel>

                    {/* Search and Filters */}
                    <GlassPanel variant="secondary" className="mb-6">
                        <div className="space-y-4">
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
                                    <Button
                                        key={filter.key}
                                        variant={filterStatus === filter.key ? 'primary' : 'outline'}
                                        size="sm"
                                        onClick={() => setFilterStatus(filter.key)}
                                        className="whitespace-nowrap"
                                    >
                                        {filter.label}
                                        {filter.key !== 'all' && (
                                            <span className="ml-2 text-xs">
                                                ({orders.filter(o => o.status === filter.key).length})
                                            </span>
                                        )}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </GlassPanel>

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
                                    onCancelOrder={() => handleCancelOrder(order)}
                                    canCancel={canCancelOrder(order)}
                                    isCancelling={cancellingOrderId === order.id}
                                />
                            ))}
                        </div>
                    )}

                    {/* Order Details Modal */}
                    {selectedOrder && (
                        <OrderDetailsModal
                            order={selectedOrder}
                            onClose={() => setSelectedOrder(null)}
                            onCancelOrder={() => handleCancelOrder(selectedOrder)}
                            canCancel={canCancelOrder(selectedOrder)}
                            isCancelling={cancellingOrderId === selectedOrder.id}
                        />
                    )}

                    {/* Cancel Confirmation Dialog */}
                    {showCancelConfirm && (
                        <CancelConfirmDialog
                            order={showCancelConfirm}
                            reason={cancelReason}
                            onReasonChange={setCancelReason}
                            onConfirm={confirmCancelOrder}
                            onCancel={() => setShowCancelConfirm(null)}
                            isLoading={cancellingOrderId === showCancelConfirm.id}
                        />
                    )}
                </div>
            </div>
        </Layout>
    );
}

// Order Card Component
function OrderCard({ order, onViewDetails, onCancelOrder, canCancel, isCancelling }: {
    order: Order;
    onViewDetails: () => void;
    onCancelOrder: () => void;
    canCancel: boolean;
    isCancelling: boolean;
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
        <GlassPanel variant="secondary" hoverable className="p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    {getStatusIcon(order.status || 'pending')}
                    <div>
                        <h3 className="font-semibold text-white">Order #{order.orderNumber || 'N/A'}</h3>
                        <p className="text-sm text-white/60">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                            }) : 'Unknown date'}
                        </p>
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status || 'pending')}`}>
                    {(order.status || 'pending').charAt(0).toUpperCase() + (order.status || 'pending').slice(1)}
                </span>
            </div>

            {/* Items Preview */}
            <div className="mb-4">
                <div className="flex gap-2 mb-2">
                    {(order.items || []).slice(0, 3).map((item) => (
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
                    {(order.items || []).length > 3 && (
                        <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center">
                            <span className="text-sm text-white/60">+{(order.items || []).length - 3}</span>
                        </div>
                    )}
                </div>
                <p className="text-sm text-white/60">
                    {(order.items || []).length} item{(order.items || []).length !== 1 ? 's' : ''}
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
                        ${(order.total || 0).toFixed(2)}
                    </span>
                    <span className="text-sm text-white/60 ml-2">{order.currency || 'USD'}</span>
                </div>
                <div className="flex gap-2">
                    {canCancel && (
                        <Button
                            variant="outline"
                            icon={isCancelling ? <RefreshCw size={16} className="animate-spin" /> : <XCircle size={16} />}
                            iconPosition="left"
                            onClick={(e) => {
                                e.stopPropagation();
                                onCancelOrder();
                            }}
                            disabled={isCancelling}
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                            {isCancelling ? 'Cancelling...' : 'Cancel'}
                        </Button>
                    )}
                    <Button
                        variant="primary"
                        icon={<Eye size={16} />}
                        iconPosition="left"
                        onClick={onViewDetails}
                    >
                        View Details
                    </Button>
                </div>
            </div>
        </GlassPanel>
    );
}

// Order Details Modal Component
function OrderDetailsModal({ order, onClose, onCancelOrder, canCancel, isCancelling }: {
    order: Order;
    onClose: () => void;
    onCancelOrder: () => void;
    canCancel: boolean;
    isCancelling: boolean;
}) {
    // Calculate if order contains only digital items (not physical)
    const isDigitalOnly = (order.items || []).every(item => !item.isPhysical);

    // Calculate subtotal from items
    const subtotal = (order.items || []).reduce((sum, item) => sum + (item.total || item.price * (item.quantity || 1)), 0);

    // Use stored values if available, otherwise fallback (though stored values SHOULD be 0 if not set)
    const shipping = order.shippingCost !== undefined ? order.shippingCost : (isDigitalOnly ? 0 : (order.total - subtotal) * 0.5);
    const tax = order.taxAmount !== undefined ? order.taxAmount : (order.total - subtotal - shipping);

    // Handle invoice download
    const handleDownloadInvoice = () => {
        const doc = new jsPDF();

        // Helper to format currency
        const formatCurrency = (amount: number) =>
            `$${amount.toFixed(2)}`;

        // Helper to format date
        const formatDate = (date: Date) => new Date(date).toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric'
        });

        // --- Header ---
        doc.setFontSize(20);
        doc.text('TAX INVOICE', 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Order #: ${order.orderNumber}`, 14, 30);
        doc.text(`Date Placed: ${formatDate(order.createdAt)}`, 14, 35);
        doc.text(`Status: ${(order.status || 'pending').toUpperCase()}`, 14, 40);
        doc.text(`Payment Method: ${order.paymentMethod || 'Crypto'}`, 14, 45);

        // --- Seller & Buyer Grid ---
        const startY = 55;

        // Seller Column
        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text('SELLER', 14, startY);
        doc.setFontSize(9);
        doc.setTextColor(80);

        let sellerY = startY + 6;
        const sellerName = order.seller?.displayName || order.seller?.handle || 'Unknown Seller';
        doc.text(sellerName, 14, sellerY);

        if (order.seller?.address) {
            sellerY += 5;
            doc.text(order.seller.address.street, 14, sellerY);
            sellerY += 5;
            doc.text(`${order.seller.address.city}, ${order.seller.address.state} ${order.seller.address.postalCode}`, 14, sellerY);
            sellerY += 5;
            doc.text(order.seller.address.country, 14, sellerY);
        }
        sellerY += 5;
        doc.text(order.seller?.walletAddress || '', 14, sellerY);

        // Buyer Column
        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text('BUYER', 105, startY);
        doc.setFontSize(9);
        doc.setTextColor(80);

        let buyerY = startY + 6;
        const buyerName = order.buyer?.displayName || order.buyer?.handle || 'Unknown Buyer';
        doc.text(buyerName, 105, buyerY);

        // Prefer physical address, fallback to shipping for display
        const buyerAddress = order.buyer?.address || order.shippingAddress;

        if (buyerAddress) {
            buyerY += 5;
            // Handle different structure of shippingAddress vs physicalAddress
            const street = buyerAddress.street || buyerAddress.addressLine1 || '';
            const street2 = buyerAddress.addressLine2 || '';
            const city = buyerAddress.city || '';
            const state = buyerAddress.state || '';
            const postalCode = buyerAddress.postalCode || '';
            const country = buyerAddress.country || '';

            doc.text(street, 105, buyerY);
            if (street2) {
                buyerY += 5;
                doc.text(street2, 105, buyerY);
            }
            buyerY += 5;
            doc.text(`${city}, ${state} ${postalCode}`, 105, buyerY);
            buyerY += 5;
            doc.text(country, 105, buyerY);
        }
        buyerY += 5;
        doc.text(order.buyer?.walletAddress || '', 105, buyerY);


        // --- Items Table ---
        const tableY = Math.max(sellerY, buyerY) + 15;

        const tableBody = (order.items || []).map(item => [
            item.productName,
            item.quantity.toString(),
            formatCurrency(item.price),
            formatCurrency(item.total)
        ]);

        autoTable(doc, {
            startY: tableY,
            head: [['Item', 'Quantity', 'Unit Price', 'Total']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
            styles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 'auto' }, // Item name
                1: { cellWidth: 25, halign: 'center' }, // Qty
                2: { cellWidth: 35, halign: 'right' }, // Price
                3: { cellWidth: 35, halign: 'right' }, // Total
            }
        });

        // --- Summary ---
        const finalY = (doc as any).lastAutoTable.finalY + 10;

        doc.setFontSize(9);
        doc.setTextColor(0);

        const summaryX = 140;
        const currency = order.currency || 'USD';

        doc.text(`Subtotal:`, summaryX, finalY);
        doc.text(formatCurrency(subtotal), 195, finalY, { align: 'right' });

        doc.text(`Shipping:`, summaryX, finalY + 6);
        doc.text(formatCurrency(shipping), 195, finalY + 6, { align: 'right' });

        doc.text(`Tax:`, summaryX, finalY + 12);
        doc.text(formatCurrency(tax), 195, finalY + 12, { align: 'right' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`TOTAL (${currency}):`, summaryX, finalY + 20);
        doc.text(formatCurrency(order.total), 195, finalY + 20, { align: 'right' });

        // --- Footer ---
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.setLineWidth(0.1);
        doc.line(14, pageHeight - 20, 196, pageHeight - 20);
        doc.text('Thank you for your business.', 14, pageHeight - 15);
        doc.text('Generated by LinkDAO', 196, pageHeight - 15, { align: 'right' });

        // Save PDF
        doc.save(`invoice-${order.orderNumber}.pdf`);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <GlassPanel variant="modal" className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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

                    {/* Seller Information */}
                    {order.seller && (
                        <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Seller Information</h3>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10">
                                    {order.seller.avatar ? (
                                        <img src={order.seller.avatar} alt="Seller" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white/40">
                                            {order.seller.displayName?.charAt(0) || order.seller.handle?.charAt(0) || '?'}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-white font-medium">{order.seller.displayName || order.seller.handle || 'Unknown'}</p>
                                    <p className="text-white/60 text-sm font-mono truncate max-w-[200px]">{order.seller.walletAddress}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Order Items */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Order Items</h3>
                        <div className="space-y-3">
                            {(order.items || []).map((item) => (
                                <div
                                    key={item.id}
                                    className="flex gap-4 p-4 bg-white/5 rounded-lg"
                                >
                                    <div className="w-20 h-20 bg-white/10 rounded-lg overflow-hidden flex-shrink-0">
                                        {item.productImage ? (
                                            <img
                                                src={item.productImage}
                                                alt={item.productName || 'Product'}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Package size={32} className="text-white/40" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-medium text-white mb-1">{item.productName || 'Unknown Product'}</h4>
                                        <p className="text-sm text-white/60">Quantity: {item.quantity || 1}</p>
                                        <p className="text-sm text-white/60">Price: ${(item.price || 0).toFixed(2)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-white">${(item.total || 0).toFixed(2)}</p>
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
                                <span>Subtotal ({(order.items || []).length} item{(order.items || []).length !== 1 ? 's' : ''})</span>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-white/80">
                                <span>Shipping{isDigitalOnly ? ' (Digital Delivery)' : ''}</span>
                                <span>{isDigitalOnly && !shipping ? 'Free' : `$${shipping.toFixed(2)}`}</span>
                            </div>
                            <div className="flex justify-between text-white/80">
                                <span>Tax</span>
                                <span>${Math.max(0, tax).toFixed(2)}</span>
                            </div>
                            {order.platformFee && order.platformFee > 0 && (
                                <div className="flex justify-between text-white/80">
                                    <span>Platform Fee</span>
                                    <span>${order.platformFee.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="pt-2 border-t border-white/10 flex justify-between text-xl font-bold text-white">
                                <span>Total</span>
                                <span>${(order.total || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            fullWidth
                            onClick={onClose}
                        >
                            Close
                        </Button>
                        {canCancel && (
                            <Button
                                variant="outline"
                                fullWidth
                                icon={isCancelling ? <RefreshCw size={16} className="animate-spin" /> : <XCircle size={16} />}
                                iconPosition="left"
                                onClick={onCancelOrder}
                                disabled={isCancelling}
                                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                            >
                                {isCancelling ? 'Cancelling...' : 'Cancel Order'}
                            </Button>
                        )}
                        <Button
                            variant="primary"
                            fullWidth
                            icon={<Download size={16} />}
                            iconPosition="left"
                            onClick={handleDownloadInvoice}
                        >
                            Download Invoice
                        </Button>
                    </div>
                </div>
            </GlassPanel>
        </div>
    );
}

// Cancel Confirmation Dialog Component
function CancelConfirmDialog({
    order,
    reason,
    onReasonChange,
    onConfirm,
    onCancel,
    isLoading
}: {
    order: Order;
    reason: string;
    onReasonChange: (reason: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading: boolean;
}) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <GlassPanel variant="modal" className="max-w-md w-full">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 bg-red-500/20 rounded-full">
                            <AlertTriangle size={24} className="text-red-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-white mb-1">Cancel Order</h3>
                            <p className="text-white/60 text-sm">
                                Are you sure you want to cancel order #{order.orderNumber}?
                            </p>
                        </div>
                        <button
                            onClick={onCancel}
                            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                            disabled={isLoading}
                        >
                            <X size={20} className="text-white/60" />
                        </button>
                    </div>

                    {/* Warning Message */}
                    <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <p className="text-yellow-400 text-sm">
                            <strong>Warning:</strong> This action cannot be undone. If you've already paid for this order, a refund will be initiated automatically.
                        </p>
                    </div>

                    {/* Cancellation Reason */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            Reason for cancellation (optional)
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => onReasonChange(e.target.value)}
                            placeholder="Please tell us why you're cancelling this order..."
                            rows={3}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 resize-none"
                            disabled={isLoading}
                        />
                    </div>

                    {/* Order Summary */}
                    <div className="mb-6 p-4 bg-white/5 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-white/60">Order Total</span>
                            <span className="font-semibold text-white">${(order.total || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-white/60">Items</span>
                            <span className="text-white">{(order.items || []).length} item{(order.items || []).length !== 1 ? 's' : ''}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            fullWidth
                            onClick={onCancel}
                            disabled={isLoading}
                        >
                            Keep Order
                        </Button>
                        <Button
                            variant="primary"
                            fullWidth
                            onClick={onConfirm}
                            disabled={isLoading}
                            icon={isLoading ? <RefreshCw size={16} className="animate-spin" /> : <XCircle size={16} />}
                            iconPosition="left"
                            className="bg-red-500 hover:bg-red-600 border-red-500"
                        >
                            {isLoading ? 'Cancelling...' : 'Yes, Cancel Order'}
                        </Button>
                    </div>
                </div>
            </GlassPanel>
        </div>
    );
}
