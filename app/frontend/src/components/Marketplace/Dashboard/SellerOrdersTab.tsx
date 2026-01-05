import React, { useState } from 'react';
import { useSellerWorkflow } from '../../../hooks/useSellerWorkflow';
import { Button, GlassPanel, LoadingSkeleton } from '../../../design-system';

interface SellerOrdersTabProps {
    isActive: boolean;
}

export const SellerOrdersTab: React.FC<SellerOrdersTabProps> = ({ isActive }) => {
    const {
        dashboardData,
        loading,
        error,
        startProcessing,
        markReadyToShip,
        confirmShipment,
        getPackingSlip,
        refresh
    } = useSellerWorkflow(isActive);

    const [activeStatus, setActiveStatus] = useState<'new' | 'processing' | 'ready' | 'shipped'>('new');
    const [shippingModalOpen, setShippingModalOpen] = useState<{ isOpen: boolean; orderId: string | null }>({ isOpen: false, orderId: null });
    const [shippingForm, setShippingForm] = useState({ trackingNumber: '', carrier: 'FedEx' });

    if (loading && !dashboardData) {
        return (
            <div className="space-y-4">
                <LoadingSkeleton className="h-12 w-full" />
                <LoadingSkeleton className="h-64 w-full" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center p-8 bg-red-500/10 rounded-lg">
                <p className="text-red-400 mb-4">{error}</p>
                <Button onClick={refresh} variant="outline">Retry</Button>
            </div>
        );
    }

    const orders = (() => {
        if (!dashboardData) return [];
        switch (activeStatus) {
            case 'new': return dashboardData.newOrders;
            case 'processing': return dashboardData.processingOrders;
            case 'ready': return dashboardData.readyToShipOrders;
            case 'shipped': return dashboardData.shippedOrders;
            default: return [];
        }
    })();

    const handleProcess = async (orderId: string) => {
        await startProcessing(orderId);
    };

    const handleGenerateLabel = async (orderId: string) => {
        // For now, we mock package details. In a real app, we'd open a modal to ask for weight/dims.
        await markReadyToShip(orderId, { weight: 1, dimensions: { length: 1, width: 1, height: 1 } });
    };

    const handleConfirmShipment = async () => {
        if (shippingModalOpen.orderId && shippingForm.trackingNumber && shippingForm.carrier) {
            const success = await confirmShipment(shippingModalOpen.orderId, shippingForm.trackingNumber, shippingForm.carrier);
            if (success) {
                setShippingModalOpen({ isOpen: false, orderId: null });
                setShippingForm({ trackingNumber: '', carrier: 'FedEx' });
            }
        }
    };

    const handlePrintPackingSlip = async (orderId: string) => {
        const slip = await getPackingSlip(orderId);
        if (slip) {
            // In a real app, this would open a print window or PDF
            alert(JSON.stringify(slip, null, 2));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
                {(['new', 'processing', 'ready', 'shipped'] as const).map(status => (
                    <button
                        key={status}
                        onClick={() => setActiveStatus(status)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeStatus === status
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            }`}
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                        <span className="ml-2 bg-gray-900 px-2 py-0.5 rounded-full text-xs">
                            {dashboardData ? (
                                status === 'new' ? dashboardData.newOrders.length :
                                    status === 'processing' ? dashboardData.processingOrders.length :
                                        status === 'ready' ? dashboardData.readyToShipOrders.length :
                                            dashboardData.shippedOrders.length
                            ) : 0}
                        </span>
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {orders.length === 0 ? (
                    <GlassPanel className="p-8 text-center text-gray-400">
                        No orders in this status.
                    </GlassPanel>
                ) : (
                    orders.map(order => (
                        <GlassPanel key={order.id} className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-white">Order #{order.id.slice(0, 8)}</h3>
                                    <p className="text-sm text-gray-400">Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-bold text-green-400">${order.totalAmount.toFixed(2)}</p>
                                    <span className="inline-block px-2 py-1 rounded text-xs font-bold bg-gray-700 text-gray-300 mt-1">
                                        {order.status}
                                    </span>
                                </div>
                            </div>

                            <div className="mb-4">
                                <h4 className="text-sm font-semibold text-gray-300 mb-2">Items</h4>
                                <ul className="space-y-1">
                                    {order.items.map((item, idx) => (
                                        <li key={idx} className="text-sm text-gray-400 flex justify-between">
                                            <span>{item.title}</span>
                                            <span>x{item.quantity}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="mb-6">
                                <h4 className="text-sm font-semibold text-gray-300 mb-2">Shipping to</h4>
                                <p className="text-sm text-gray-400">{order.shippingAddress.fullName}</p>
                                <p className="text-sm text-gray-400">{order.shippingAddress.streetAddress}</p>
                                <p className="text-sm text-gray-400">{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
                            </div>

                            <div className="flex gap-2 border-t border-gray-700 pt-4">
                                <Button size="sm" variant="secondary" onClick={() => handlePrintPackingSlip(order.id)}>
                                    Print Packing Slip
                                </Button>

                                {activeStatus === 'new' && (
                                    <Button size="sm" variant="primary" onClick={() => handleProcess(order.id)}>
                                        Start Processing
                                    </Button>
                                )}

                                {activeStatus === 'processing' && (
                                    <Button size="sm" variant="primary" onClick={() => handleGenerateLabel(order.id)}>
                                        Generate Label & Mark Ready
                                    </Button>
                                )}

                                {activeStatus === 'ready' && (
                                    <Button
                                        size="sm"
                                        variant="primary"
                                        onClick={() => setShippingModalOpen({ isOpen: true, orderId: order.id })}
                                    >
                                        Confirm Shipment
                                    </Button>
                                )}
                            </div>
                        </GlassPanel>
                    ))
                )}
            </div>

            {/* Shipping Modal */}
            {shippingModalOpen.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <GlassPanel className="w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Confirm Shipment</h2>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Carrier</label>
                                <select
                                    className="w-full bg-gray-800 border-gray-700 rounded text-white p-2"
                                    value={shippingForm.carrier}
                                    onChange={(e) => setShippingForm(prev => ({ ...prev, carrier: e.target.value }))}
                                >
                                    <option value="FedEx">FedEx</option>
                                    <option value="UPS">UPS</option>
                                    <option value="USPS">USPS</option>
                                    <option value="DHL">DHL</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Tracking Number</label>
                                <input
                                    className="w-full bg-gray-800 border border-gray-700 rounded text-white p-2 focus:border-purple-500 focus:outline-none"
                                    value={shippingForm.trackingNumber}
                                    onChange={(e) => setShippingForm(prev => ({ ...prev, trackingNumber: e.target.value }))}
                                    placeholder="Enter tracking number"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setShippingModalOpen({ isOpen: false, orderId: null })}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={handleConfirmShipment}>
                                Confirm & Update Status
                            </Button>
                        </div>
                    </GlassPanel>
                </div>
            )}
        </div>
    );
};
