import React, { useState, useRef } from 'react';
import { useSellerWorkflow } from '../../../hooks/useSellerWorkflow';
import { Button, GlassPanel, LoadingSkeleton } from '../../../design-system';
import { SellerOrder, ServiceDeliverable, ScheduleServiceInput, AddDeliverableInput } from '../../../types/seller';
import { NFTEscrowDepositModal } from './NFTEscrowDepositModal';

interface SellerOrdersTabProps {
    isActive: boolean;
}

// Packing Slip Component for printing
const PackingSlipPrintView: React.FC<{
    slip: any;
    onClose: () => void;
}> = ({ slip, onClose }) => {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>Packing Slip - Order #${slip.orderNumber}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .header h1 { margin-bottom: 5px; }
                        .order-info { margin-bottom: 20px; }
                        .order-info p { margin: 5px 0; }
                        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                        .items-table th, .items-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                        .items-table th { background-color: #f5f5f5; }
                        .total { text-align: right; font-size: 18px; margin-top: 20px; }
                        .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
                        @media print { body { print-color-adjust: exact; } }
                    </style>
                </head>
                <body>
                    ${printContent.innerHTML}
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <GlassPanel className="w-full max-w-2xl max-h-[90vh] overflow-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white">Packing Slip Preview</h2>
                        <div className="flex gap-2">
                            <Button variant="primary" onClick={handlePrint}>Print</Button>
                            <Button variant="ghost" onClick={onClose}>Close</Button>
                        </div>
                    </div>

                    <div ref={printRef} className="bg-white text-gray-900 p-6 rounded-lg">
                        <div className="header text-center mb-8">
                            <h1 className="text-2xl font-bold">PACKING SLIP</h1>
                            <p className="text-gray-600">Order #{slip.orderNumber}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-8 mb-8">
                            <div className="order-info">
                                <h3 className="font-semibold mb-2">Order Details</h3>
                                <p><strong>Order ID:</strong> {slip.orderId}</p>
                                <p><strong>Date:</strong> {new Date(slip.date).toLocaleDateString()}</p>
                                <p><strong>Currency:</strong> {slip.currency}</p>
                            </div>

                            <div className="order-info">
                                <h3 className="font-semibold mb-2">Ship To</h3>
                                {slip.buyerAddress ? (
                                    <>
                                        <p>{slip.buyerAddress.name}</p>
                                        <p>{slip.buyerAddress.street}</p>
                                        <p>{slip.buyerAddress.city}, {slip.buyerAddress.state} {slip.buyerAddress.postalCode}</p>
                                        <p>{slip.buyerAddress.country}</p>
                                    </>
                                ) : (
                                    <p className="text-gray-500 italic">Digital delivery - No shipping address</p>
                                )}
                            </div>
                        </div>

                        <table className="items-table w-full border-collapse border border-gray-300 mb-6">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-gray-300 p-3">Item</th>
                                    <th className="border border-gray-300 p-3 text-center">Qty</th>
                                    <th className="border border-gray-300 p-3 text-right">Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {slip.items?.map((item: any, index: number) => (
                                    <tr key={index}>
                                        <td className="border border-gray-300 p-3">{item.description}</td>
                                        <td className="border border-gray-300 p-3 text-center">{item.quantity}</td>
                                        <td className="border border-gray-300 p-3 text-right">${item.price?.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="total text-right text-lg font-bold">
                            Total: ${slip.totalAmount?.toFixed(2)} {slip.currency}
                        </div>

                        {slip.notes && (
                            <div className="mt-6 p-4 bg-gray-50 rounded">
                                <h4 className="font-semibold mb-2">Notes:</h4>
                                <p>{slip.notes}</p>
                            </div>
                        )}

                        <div className="footer mt-8 text-center text-gray-500 text-sm">
                            <p>Thank you for your order!</p>
                            <p>LinkDAO Marketplace</p>
                        </div>
                    </div>
                </div>
            </GlassPanel>
        </div>
    );
};

// Schedule Service Modal
const ScheduleServiceModal: React.FC<{
    orderId: string;
    onSchedule: (orderId: string, schedule: ScheduleServiceInput) => Promise<boolean>;
    onClose: () => void;
}> = ({ orderId, onSchedule, onClose }) => {
    const [form, setForm] = useState<ScheduleServiceInput>({
        date: '',
        time: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        notes: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!form.date || !form.time) return;
        setLoading(true);
        const success = await onSchedule(orderId, form);
        setLoading(false);
        if (success) onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <GlassPanel className="w-full max-w-md p-6">
                <h2 className="text-xl font-bold text-white mb-4">Schedule Service</h2>
                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Date</label>
                        <input
                            type="date"
                            className="w-full bg-gray-800 border border-gray-700 rounded text-white p-2 focus:border-purple-500 focus:outline-none"
                            value={form.date}
                            onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Time</label>
                        <input
                            type="time"
                            className="w-full bg-gray-800 border border-gray-700 rounded text-white p-2 focus:border-purple-500 focus:outline-none"
                            value={form.time}
                            onChange={(e) => setForm(prev => ({ ...prev, time: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Timezone</label>
                        <select
                            className="w-full bg-gray-800 border border-gray-700 rounded text-white p-2 focus:border-purple-500 focus:outline-none"
                            value={form.timezone}
                            onChange={(e) => setForm(prev => ({ ...prev, timezone: e.target.value }))}
                        >
                            <option value="America/New_York">Eastern Time (ET)</option>
                            <option value="America/Chicago">Central Time (CT)</option>
                            <option value="America/Denver">Mountain Time (MT)</option>
                            <option value="America/Los_Angeles">Pacific Time (PT)</option>
                            <option value="UTC">UTC</option>
                            <option value="Europe/London">London (GMT)</option>
                            <option value="Europe/Paris">Paris (CET)</option>
                            <option value="Asia/Tokyo">Tokyo (JST)</option>
                            <option value="Asia/Shanghai">Shanghai (CST)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Notes (optional)</label>
                        <textarea
                            className="w-full bg-gray-800 border border-gray-700 rounded text-white p-2 focus:border-purple-500 focus:outline-none"
                            value={form.notes}
                            onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Any additional notes for the buyer..."
                            rows={3}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={!form.date || !form.time || loading}
                    >
                        {loading ? 'Scheduling...' : 'Schedule Service'}
                    </Button>
                </div>
            </GlassPanel>
        </div>
    );
};

// Add Deliverable Modal
const AddDeliverableModal: React.FC<{
    orderId: string;
    existingDeliverables: ServiceDeliverable[];
    onAdd: (orderId: string, deliverable: AddDeliverableInput) => Promise<ServiceDeliverable | null>;
    onRemove: (orderId: string, deliverableId: string) => Promise<boolean>;
    onClose: () => void;
}> = ({ orderId, existingDeliverables, onAdd, onRemove, onClose }) => {
    const [form, setForm] = useState<AddDeliverableInput>({
        type: 'link',
        url: '',
        name: '',
        description: ''
    });
    const [loading, setLoading] = useState(false);
    const [deliverables, setDeliverables] = useState<ServiceDeliverable[]>(existingDeliverables);

    const handleAdd = async () => {
        if (!form.url || !form.name) return;
        setLoading(true);
        const result = await onAdd(orderId, form);
        if (result) {
            setDeliverables(prev => [...prev, result]);
            setForm({ type: 'link', url: '', name: '', description: '' });
        }
        setLoading(false);
    };

    const handleRemove = async (deliverableId: string) => {
        const success = await onRemove(orderId, deliverableId);
        if (success) {
            setDeliverables(prev => prev.filter(d => d.id !== deliverableId));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <GlassPanel className="w-full max-w-lg p-6 max-h-[90vh] overflow-auto">
                <h2 className="text-xl font-bold text-white mb-4">Service Deliverables</h2>

                {/* Existing deliverables */}
                {deliverables.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-300 mb-2">Added Deliverables</h3>
                        <ul className="space-y-2">
                            {deliverables.map((d) => (
                                <li key={d.id} className="flex items-center justify-between bg-gray-800 p-3 rounded">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-xs ${
                                            d.type === 'file' ? 'bg-blue-500/20 text-blue-300' :
                                            d.type === 'link' ? 'bg-green-500/20 text-green-300' :
                                            'bg-orange-500/20 text-orange-300'
                                        }`}>
                                            {d.type}
                                        </span>
                                        <a
                                            href={d.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-purple-400 hover:underline"
                                        >
                                            {d.name}
                                        </a>
                                    </div>
                                    <button
                                        onClick={() => handleRemove(d.id)}
                                        className="text-red-400 hover:text-red-300 text-sm"
                                    >
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Add new deliverable form */}
                <div className="space-y-4 mb-6 border-t border-gray-700 pt-4">
                    <h3 className="text-sm font-semibold text-gray-300">Add New Deliverable</h3>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Type</label>
                        <select
                            className="w-full bg-gray-800 border border-gray-700 rounded text-white p-2 focus:border-purple-500 focus:outline-none"
                            value={form.type}
                            onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value as 'file' | 'link' | 'document' }))}
                        >
                            <option value="link">Link (URL)</option>
                            <option value="file">File (Cloud Storage URL)</option>
                            <option value="document">Document (Google Docs, etc.)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Name</label>
                        <input
                            type="text"
                            className="w-full bg-gray-800 border border-gray-700 rounded text-white p-2 focus:border-purple-500 focus:outline-none"
                            value={form.name}
                            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Final Design Files"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">URL</label>
                        <input
                            type="url"
                            className="w-full bg-gray-800 border border-gray-700 rounded text-white p-2 focus:border-purple-500 focus:outline-none"
                            value={form.url}
                            onChange={(e) => setForm(prev => ({ ...prev, url: e.target.value }))}
                            placeholder="https://..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
                        <textarea
                            className="w-full bg-gray-800 border border-gray-700 rounded text-white p-2 focus:border-purple-500 focus:outline-none"
                            value={form.description}
                            onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Brief description of this deliverable..."
                            rows={2}
                        />
                    </div>
                    <Button
                        variant="secondary"
                        onClick={handleAdd}
                        disabled={!form.url || !form.name || loading}
                        className="w-full"
                    >
                        {loading ? 'Adding...' : 'Add Deliverable'}
                    </Button>
                </div>

                <div className="flex justify-end">
                    <Button variant="primary" onClick={onClose}>Done</Button>
                </div>
            </GlassPanel>
        </div>
    );
};

export const SellerOrdersTab: React.FC<SellerOrdersTabProps> = ({ isActive }) => {
    const {
        dashboardData,
        loading,
        error,
        startProcessing,
        markReadyToShip,
        confirmShipment,
        getPackingSlip,
        refresh,
        // Service methods
        scheduleService,
        addDeliverable,
        removeDeliverable,
        startService,
        completeService,
        // Digital product delivery
        completeDigitalDelivery
    } = useSellerWorkflow(isActive);

    const [activeStatus, setActiveStatus] = useState<'new' | 'processing' | 'ready' | 'shipped'>('new');
    const [shippingModalOpen, setShippingModalOpen] = useState<{ isOpen: boolean; orderId: string | null }>({ isOpen: false, orderId: null });
    const [shippingForm, setShippingForm] = useState({ trackingNumber: '', carrier: 'FedEx' });
    const [packingSlipModal, setPackingSlipModal] = useState<{ isOpen: boolean; slip: any }>({ isOpen: false, slip: null });

    // Service modals
    const [scheduleModal, setScheduleModal] = useState<{ isOpen: boolean; orderId: string | null }>({ isOpen: false, orderId: null });
    const [deliverableModal, setDeliverableModal] = useState<{ isOpen: boolean; orderId: string | null; deliverables: ServiceDeliverable[] }>({ isOpen: false, orderId: null, deliverables: [] });

    // NFT Escrow modal
    const [nftDepositModal, setNftDepositModal] = useState<{ isOpen: boolean; order: SellerOrder | null }>({ isOpen: false, order: null });

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
            case 'new': return dashboardData.orders.new;
            case 'processing': return dashboardData.orders.processing;
            case 'ready': return dashboardData.orders.readyToShip;
            case 'shipped': return dashboardData.orders.shipped;
            default: return [];
        }
    })();

    const handleProcess = async (orderId: string) => {
        await startProcessing(orderId);
    };

    const handleGenerateLabel = async (orderId: string) => {
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
            setPackingSlipModal({ isOpen: true, slip });
        }
    };

    // Helper to check if order requires physical shipping
    const requiresShipping = (order: SellerOrder): boolean => {
        return order.requiresShipping === true || order.isPhysical === true;
    };

    // Helper to check if order is a service
    const isServiceOrder = (order: SellerOrder): boolean => {
        return order.isService === true || order.items?.some(item => item.isService === true);
    };

    // Get service type label
    const getServiceTypeLabel = (order: SellerOrder): string => {
        const type = order.serviceType || order.items?.find(i => i.serviceType)?.serviceType;
        switch (type) {
            case 'remote': return 'Remote Service';
            case 'in_person': return 'In-Person Service';
            case 'consultation': return 'Consultation';
            case 'subscription': return 'Subscription';
            default: return 'Service';
        }
    };

    // Get service status badge color
    const getServiceStatusColor = (status?: string): string => {
        switch (status) {
            case 'scheduled': return 'bg-blue-500/20 text-blue-300';
            case 'in_progress': return 'bg-yellow-500/20 text-yellow-300';
            case 'completed': return 'bg-green-500/20 text-green-300';
            case 'buyer_confirmed': return 'bg-emerald-500/20 text-emerald-300';
            case 'cancelled': return 'bg-red-500/20 text-red-300';
            default: return 'bg-gray-500/20 text-gray-300';
        }
    };

    // Helper to check if order is NFT order
    const isNFTOrder = (order: SellerOrder): boolean => {
        return order.isNFTOrder === true || order.items?.some(item => item.isNFT === true);
    };

    // Get NFT escrow status label
    const getNFTEscrowStatusLabel = (status?: string): string => {
        switch (status) {
            case 'created': return 'Escrow Created';
            case 'funds_locked': return 'Payment Received';
            case 'nft_deposited': return 'NFT Deposited';
            case 'ready_for_release': return 'Ready for Release';
            case 'completed': return 'Completed';
            case 'disputed': return 'Disputed';
            case 'cancelled': return 'Cancelled';
            default: return 'Pending';
        }
    };

    // Get NFT escrow status color
    const getNFTEscrowStatusColor = (status?: string): string => {
        switch (status) {
            case 'created': return 'bg-gray-500/20 text-gray-300';
            case 'funds_locked': return 'bg-blue-500/20 text-blue-300';
            case 'nft_deposited': return 'bg-purple-500/20 text-purple-300';
            case 'ready_for_release': return 'bg-green-500/20 text-green-300';
            case 'completed': return 'bg-emerald-500/20 text-emerald-300';
            case 'disputed': return 'bg-red-500/20 text-red-300';
            case 'cancelled': return 'bg-gray-500/20 text-gray-300';
            default: return 'bg-yellow-500/20 text-yellow-300';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
                {(['new', 'processing', 'ready', 'shipped'] as const).map(status => {
                    const count = dashboardData ? (
                        status === 'new' ? dashboardData.orders.new.length :
                            status === 'processing' ? dashboardData.orders.processing.length :
                                status === 'ready' ? dashboardData.orders.readyToShip.length :
                                    dashboardData.orders.shipped.length
                    ) : 0;

                    return (
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
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="space-y-4">
                {orders.length === 0 ? (
                    <GlassPanel className="p-8 text-center text-gray-400">
                        No orders in this status.
                    </GlassPanel>
                ) : (
                    orders.map((order: SellerOrder) => (
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
                                    {order.items && order.items.length > 0 ? (
                                        order.items.map((item, idx) => (
                                            <li key={idx} className="text-sm text-gray-400 flex justify-between">
                                                <span>{item.title}</span>
                                                <span>x{item.quantity}</span>
                                            </li>
                                        ))
                                    ) : (
                                        <li className="text-sm text-gray-500 italic">No items details available</li>
                                    )}
                                </ul>
                            </div>

                            {/* Show delivery type badge */}
                            <div className="mb-4 flex flex-wrap gap-2">
                                {isNFTOrder(order) ? (
                                    <>
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-pink-300 border border-pink-500/30">
                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            NFT - Atomic Swap
                                        </span>
                                        {order.nftEscrowStatus && (
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getNFTEscrowStatusColor(order.nftEscrowStatus)}`}>
                                                {getNFTEscrowStatusLabel(order.nftEscrowStatus)}
                                            </span>
                                        )}
                                        {order.nftDeposited && (
                                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-300">
                                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                                NFT Deposited
                                            </span>
                                        )}
                                    </>
                                ) : isServiceOrder(order) ? (
                                    <>
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-500/20 text-amber-300">
                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                            {getServiceTypeLabel(order)}
                                        </span>
                                        {order.serviceStatus && (
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getServiceStatusColor(order.serviceStatus)}`}>
                                                {order.serviceStatus.replace('_', ' ').toUpperCase()}
                                            </span>
                                        )}
                                    </>
                                ) : requiresShipping(order) ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-300">
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                        </svg>
                                        Physical Product - Requires Shipping
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-500/20 text-purple-300">
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                        </svg>
                                        Digital Product - Instant Delivery
                                    </span>
                                )}
                            </div>

                            {/* Service schedule info */}
                            {isServiceOrder(order) && order.serviceSchedule && (
                                <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
                                    <h4 className="text-sm font-semibold text-gray-300 mb-1">Scheduled For</h4>
                                    <p className="text-sm text-white">
                                        {new Date(order.serviceSchedule.scheduledDate).toLocaleDateString()} at {order.serviceSchedule.scheduledTime}
                                        <span className="text-gray-400 ml-2">({order.serviceSchedule.timezone})</span>
                                    </p>
                                    {order.serviceSchedule.notes && (
                                        <p className="text-xs text-gray-400 mt-1">{order.serviceSchedule.notes}</p>
                                    )}
                                </div>
                            )}

                            {/* Service deliverables */}
                            {isServiceOrder(order) && order.serviceDeliverables && order.serviceDeliverables.length > 0 && (
                                <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
                                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Deliverables ({order.serviceDeliverables.length})</h4>
                                    <ul className="space-y-1">
                                        {order.serviceDeliverables.slice(0, 3).map((d, idx) => (
                                            <li key={idx} className="text-sm text-gray-400 flex items-center gap-2">
                                                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700">{d.type}</span>
                                                <span>{d.name}</span>
                                            </li>
                                        ))}
                                        {order.serviceDeliverables.length > 3 && (
                                            <li className="text-xs text-gray-500">+{order.serviceDeliverables.length - 3} more</li>
                                        )}
                                    </ul>
                                </div>
                            )}

                            {/* NFT Escrow info */}
                            {isNFTOrder(order) && order.nftContractAddress && (
                                <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-purple-500/20">
                                    <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        NFT Details
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-400">Contract:</span>
                                            <span className="text-white font-mono text-xs">
                                                {order.nftContractAddress?.slice(0, 6)}...{order.nftContractAddress?.slice(-4)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-400">Token ID:</span>
                                            <span className="text-white">{order.nftTokenId}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-400">Standard:</span>
                                            <span className="text-purple-300">{order.nftStandard || 'ERC721'}</span>
                                        </div>
                                        {order.nftEscrowId && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-400">Escrow ID:</span>
                                                <span className="text-white font-mono text-xs">{order.nftEscrowId}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {order.shippingAddress && requiresShipping(order) && (
                                <div className="mb-6">
                                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Shipping to</h4>
                                    <p className="text-sm text-gray-400">{order.shippingAddress.name}</p>
                                    <p className="text-sm text-gray-400">{order.shippingAddress.address}</p>
                                    <p className="text-sm text-gray-400">{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2 border-t border-gray-700 pt-4">
                                {/* Physical product actions */}
                                {requiresShipping(order) && !isServiceOrder(order) && (
                                    <Button size="sm" variant="secondary" onClick={() => handlePrintPackingSlip(order.id)}>
                                        Print Packing Slip
                                    </Button>
                                )}

                                {activeStatus === 'new' && !isServiceOrder(order) && (
                                    requiresShipping(order) ? (
                                        <Button size="sm" variant="primary" onClick={() => handleProcess(order.id)}>
                                            Start Processing
                                        </Button>
                                    ) : (
                                        <Button size="sm" variant="primary" onClick={() => completeDigitalDelivery(order.id)}>
                                            Mark as Delivered
                                        </Button>
                                    )
                                )}

                                {/* Service order actions */}
                                {isServiceOrder(order) && activeStatus === 'new' && (
                                    <>
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            onClick={() => setScheduleModal({ isOpen: true, orderId: order.id })}
                                        >
                                            Schedule Service
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => startService(order.id)}
                                        >
                                            Start Immediately
                                        </Button>
                                    </>
                                )}

                                {isServiceOrder(order) && activeStatus === 'processing' && (
                                    <>
                                        {order.serviceStatus === 'scheduled' && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="primary"
                                                    onClick={() => startService(order.id)}
                                                >
                                                    Start Service
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => setScheduleModal({ isOpen: true, orderId: order.id })}
                                                >
                                                    Reschedule
                                                </Button>
                                            </>
                                        )}
                                        {(order.serviceStatus === 'in_progress' || order.serviceStatus === 'pending') && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => setDeliverableModal({
                                                        isOpen: true,
                                                        orderId: order.id,
                                                        deliverables: order.serviceDeliverables || []
                                                    })}
                                                >
                                                    Add Deliverables
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="primary"
                                                    onClick={() => completeService(order.id)}
                                                >
                                                    Mark Complete
                                                </Button>
                                            </>
                                        )}
                                    </>
                                )}

                                {/* NFT Order actions */}
                                {isNFTOrder(order) && !order.nftDeposited && (
                                    <Button
                                        size="sm"
                                        variant="primary"
                                        onClick={() => setNftDepositModal({ isOpen: true, order })}
                                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                    >
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        Deposit NFT to Escrow
                                    </Button>
                                )}

                                {isNFTOrder(order) && order.nftDeposited && order.nftEscrowStatus === 'ready_for_release' && (
                                    <span className="text-sm text-green-400 flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Awaiting buyer confirmation
                                    </span>
                                )}

                                {/* Shipping actions for physical products */}
                                {activeStatus === 'processing' && requiresShipping(order) && !isServiceOrder(order) && (
                                    <Button size="sm" variant="primary" onClick={() => handleGenerateLabel(order.id)}>
                                        Generate Label & Mark Ready
                                    </Button>
                                )}

                                {/* For digital products in processing */}
                                {activeStatus === 'processing' && !requiresShipping(order) && !isServiceOrder(order) && (
                                    <Button size="sm" variant="primary" onClick={() => completeDigitalDelivery(order.id)}>
                                        Complete Digital Delivery
                                    </Button>
                                )}

                                {activeStatus === 'ready' && requiresShipping(order) && (
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

            {/* Packing Slip Modal */}
            {packingSlipModal.isOpen && packingSlipModal.slip && (
                <PackingSlipPrintView
                    slip={packingSlipModal.slip}
                    onClose={() => setPackingSlipModal({ isOpen: false, slip: null })}
                />
            )}

            {/* Schedule Service Modal */}
            {scheduleModal.isOpen && scheduleModal.orderId && (
                <ScheduleServiceModal
                    orderId={scheduleModal.orderId}
                    onSchedule={scheduleService}
                    onClose={() => setScheduleModal({ isOpen: false, orderId: null })}
                />
            )}

            {/* Deliverables Modal */}
            {deliverableModal.isOpen && deliverableModal.orderId && (
                <AddDeliverableModal
                    orderId={deliverableModal.orderId}
                    existingDeliverables={deliverableModal.deliverables}
                    onAdd={addDeliverable}
                    onRemove={removeDeliverable}
                    onClose={() => setDeliverableModal({ isOpen: false, orderId: null, deliverables: [] })}
                />
            )}

            {/* NFT Escrow Deposit Modal */}
            {nftDepositModal.isOpen && nftDepositModal.order && (
                <NFTEscrowDepositModal
                    order={nftDepositModal.order}
                    onClose={() => setNftDepositModal({ isOpen: false, order: null })}
                    onSuccess={refresh}
                />
            )}
        </div>
    );
};
