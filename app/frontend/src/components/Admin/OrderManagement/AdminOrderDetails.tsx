import React, { useState, useEffect } from 'react';
import { adminService, AdminOrderDetails as IAdminOrderDetails } from '@/services/adminService';
import { GlassPanel, Button } from '@/design-system';
import { Badge } from '@/components/ui/badge';
import { Package, Clock, ShieldAlert, CheckCircle, XCircle, FileText } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import OrderTimeline from '@/components/Marketplace/OrderTracking/OrderTimeline';
import { ReceiptDisplay } from '@/components/Marketplace/Receipt/ReceiptDisplay';

interface AdminOrderDetailsProps {
    orderId: string;
    onBack: () => void;
}

export function AdminOrderDetails({ orderId, onBack }: AdminOrderDetailsProps) {
    const [order, setOrder] = useState<IAdminOrderDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();
    const [actionLoading, setActionLoading] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [receipt, setReceipt] = useState<any>(null);
    const [escrowStatus, setEscrowStatus] = useState<any>(null);
    const [escrowLoading, setEscrowLoading] = useState(false);

    useEffect(() => {
        loadOrderDetails();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId]);

    const loadOrderDetails = async () => {
        try {
            setLoading(true);
            const data = await adminService.getOrderDetails(orderId);
            setOrder(data);
        } catch (error) {
            console.error('Failed to load order details:', error);
            addToast('Failed to load order details', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action: string) => {
        if (!confirm(`Are you sure you want to perform: ${action}?`)) return;

        try {
            setActionLoading(true);
            // For simplicity, using a generic reason. In a real app, prompt for reason.
            const result = await adminService.performAdminAction(orderId, action, 'Admin manual action', 'Performed via dashboard');
            if (result.success) {
                addToast(`Action ${action} successful`, 'success');
                loadOrderDetails(); // Refresh
            } else {
                addToast(`Action failed: ${result.message}`, 'error');
            }
        } catch (error) {
            addToast('Action failed', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleViewReceipt = async () => {
        try {
            const data = await adminService.getOrderReceipt(orderId);
            if (data) {
                setReceipt(data);
                setShowReceipt(true);
            } else {
                addToast('Receipt not found', 'error');
            }
        } catch (error) {
            addToast('Failed to load receipt', 'error');
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Loading order details...</div>;
    if (!order) return <div className="p-8 text-center text-red-400">Order not found</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-white">Order #{order.id.slice(0, 8)}</h1>
                    <p className="text-gray-400 text-sm">Created on {new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleViewReceipt}
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        View Receipt
                    </Button>
                    {order.availableActions.map(action => (
                        <Button
                            key={action}
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(action)}
                            disabled={actionLoading}
                            className={action === 'cancel' ? 'text-red-400 hover:text-red-300 border-red-500/50' : ''}
                        >
                            {action.replace('_', ' ').toUpperCase()}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="md:col-span-2 space-y-6">
                    <GlassPanel className="p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Items</h3>
                        <div className="space-y-4">
                            {order.items?.map((item: any, i: number) => (
                                <div key={i} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                                    <div>
                                        <p className="text-white font-medium">{item.name || `Item #${i + 1}`}</p>
                                        <p className="text-sm text-gray-400">Qty: {item.quantity}</p>
                                    </div>
                                    <p className="text-white font-medium">${(item.price * item.quantity).toLocaleString()}</p>
                                </div>
                            ))}
                            <div className="flex justify-between items-center pt-4 font-bold text-lg text-white">
                                <span>Total</span>
                                <span>${order.totalAmount.toLocaleString()} {order.currency}</span>
                            </div>
                        </div>
                    </GlassPanel>

                    <GlassPanel className="p-6">
                        <OrderTimeline events={order.timeline || []} />
                    </GlassPanel>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <GlassPanel className="p-6">
                        <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase">Status</h3>
                        <Badge
                            variant={order.status === 'cancelled' ? 'destructive' : 'secondary'}
                            className={
                                order.status === 'completed' ? 'bg-green-500 hover:bg-green-600' :
                                    order.status === 'processing' ? 'bg-blue-500 hover:bg-blue-600' :
                                        order.status === 'shipped' ? 'bg-indigo-500 hover:bg-indigo-600' :
                                            ''
                            }
                        >
                            {order.status.toUpperCase()}
                        </Badge>
                    </GlassPanel>

                    <GlassPanel className="p-6">
                        <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase">Customer</h3>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500"></div>
                            <div>
                                <p className="text-white text-sm">{order.buyerId}</p>
                            </div>
                        </div>
                        <h4 className="text-xs font-semibold text-gray-500 mt-4 mb-1">SHIPPING ADDRESS</h4>
                        {order.shippingAddress ? (
                            <div className="text-sm text-gray-300">
                                <p>{order.shippingAddress.fullName}</p>
                                <p>{order.shippingAddress.streetLine1}</p>
                                <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
                                <p>{order.shippingAddress.country}</p>
                            </div>
                        ) : <p className="text-sm text-gray-500">No shipping address</p>}
                    </GlassPanel>

                    {order.auditLog && order.auditLog.length > 0 && (
                        <GlassPanel className="p-6">
                            <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase">Admin Actions</h3>
                            <ul className="space-y-2">
                                {order.auditLog.map((log: any, i: number) => (
                                    <li key={i} className="text-xs text-gray-300">
                                        <span className="text-yellow-400 font-medium">{log.action}</span> by {log.adminId} <br />
                                        <span className="text-gray-500">{new Date(log.timestamp).toLocaleDateString()}</span>
                                    </li>
                                ))}
                            </ul>
                        </GlassPanel>
                    )}
                </div>
            </div>

            {/* Receipt Modal */}
            {showReceipt && receipt && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 font-sans">
                    <div className="relative max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-4 right-4 z-10 text-gray-500 hover:text-gray-700"
                            onClick={() => setShowReceipt(false)}
                        >
                            Close
                        </Button>
                        <ReceiptDisplay receipt={receipt} onPrint={() => window.print()} />
                    </div>
                </div>
            )}
        </div>
    );
}
