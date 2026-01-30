import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { orderService } from '@/services/orderService';
import type { Order, OrderEvent } from '@/types/order';
import { useAccount } from 'wagmi';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import { ArrowLeft, BadgeCheck, Calendar, Clock, Package, ShieldAlert, Truck } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

const RECENT_ORDERS_KEY = 'linkdao_recent_orders';

const statusLabel: Record<string, string> = {
  CREATED: 'Created',
  PAYMENT_PENDING: 'Awaiting Payment',
  PAID: 'Payment Confirmed',
  PROCESSING: 'Processing Order',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  DISPUTED: 'Disputed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

const statusAccent: Record<string, string> = {
  CREATED: 'text-slate-200 bg-slate-500/20 border border-slate-400/20',
  PAYMENT_PENDING: 'text-yellow-200 bg-yellow-500/20 border border-yellow-400/30',
  PAID: 'text-emerald-200 bg-emerald-500/20 border border-emerald-400/30',
  PROCESSING: 'text-blue-200 bg-blue-500/20 border border-blue-400/30',
  SHIPPED: 'text-indigo-200 bg-indigo-500/20 border border-indigo-400/30',
  DELIVERED: 'text-cyan-200 bg-cyan-500/20 border border-cyan-400/30',
  COMPLETED: 'text-emerald-200 bg-emerald-500/20 border border-emerald-400/30',
  DISPUTED: 'text-red-200 bg-red-500/20 border border-red-400/30',
  CANCELLED: 'text-gray-200 bg-gray-500/20 border border-gray-400/30',
  REFUNDED: 'text-purple-200 bg-purple-500/20 border border-purple-400/30',
};

const iconForStatus = (status?: string) => {
  switch (status) {
    case 'PROCESSING':
    case 'PAID':
      return <Clock size={18} />;
    case 'SHIPPED':
      return <Truck size={18} />;
    case 'COMPLETED':
    case 'DELIVERED':
      return <BadgeCheck size={18} />;
    case 'DISPUTED':
      return <ShieldAlert size={18} />;
    default:
      return <Package size={18} />;
  }
};

const loadFallbackOrder = (orderId: string): Order | null => {
  if (typeof window === 'undefined') return null;
  const sessionData = sessionStorage.getItem(RECENT_ORDERS_KEY);
  if (!sessionData) return null;

  const parsed = JSON.parse(sessionData) as Order[];
  return parsed.find((item) => item.id === orderId) || null;
};

const OrderDetailPage: React.FC = () => {
  const router = useRouter();
  const { orderId } = router.query;
  const { address: walletAddress } = useAccount();
  const { addToast } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [timeline, setTimeline] = useState<OrderEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const errorToastShownRef = useRef(false);

  // Function to convert service Order type to types/order.ts Order type
  const convertServiceOrderToTypesOrder = (serviceOrder: any): Order => {
    // Create a minimal Order object that matches the types/order.ts interface
    const convertedOrder: Order = {
      id: serviceOrder.id,
      listingId: serviceOrder.id, // Using order.id as listingId since it's not available
      buyerAddress: walletAddress || '', // Using current user's address as buyer
      sellerAddress: serviceOrder.seller?.id || '', // Using seller id as address
      status: serviceOrder.status,
      amount: serviceOrder.total.toString(),
      paymentToken: serviceOrder.paymentMethod === 'crypto' ? 'USDC' : 'FIAT',
      paymentMethod: serviceOrder.paymentMethod,
      totalAmount: serviceOrder.total,
      currency: serviceOrder.currency,
      product: {
        id: serviceOrder.items[0]?.id || '1',
        title: serviceOrder.items[0]?.title || `Order #${serviceOrder.id}`,
        description: '',
        image: serviceOrder.items[0]?.image || '/api/placeholder/400/400',
        category: '',
        quantity: serviceOrder.items[0]?.quantity || 1,
        unitPrice: serviceOrder.items[0]?.unitPrice || serviceOrder.total,
        totalPrice: serviceOrder.items[0]?.totalPrice || serviceOrder.total
      },
      shippingAddress: serviceOrder.shippingAddress,
      billingAddress: serviceOrder.billingAddress,
      trackingNumber: serviceOrder.trackingNumber,
      trackingCarrier: undefined,
      estimatedDelivery: serviceOrder.estimatedDelivery?.toISOString(),
      actualDelivery: undefined,
      deliveryConfirmation: undefined,
      orderNotes: undefined,
      orderMetadata: undefined,
      createdAt: serviceOrder.createdAt.toISOString(),
      updatedAt: serviceOrder.createdAt.toISOString(),
      timeline: [],
      trackingInfo: undefined,
      disputeId: undefined,
      canConfirmDelivery: false,
      canOpenDispute: false,
      canCancel: false,
      canRefund: false,
      isEscrowProtected: false,
      daysUntilAutoComplete: 0
    };
    return convertedOrder;
  };

  useEffect(() => {
    if (!orderId || typeof orderId !== 'string') return;

    const fetchOrder = async () => {
      setLoading(true);
      try {
        const apiOrder = await orderService.getOrderById(orderId);
        if (apiOrder) {
          // Convert the service Order type to the types/order.ts Order type
          const convertedOrder = convertServiceOrderToTypesOrder(apiOrder);
          setOrder(convertedOrder);

          // Fetch the timeline using getOrderTrackingStatus
          try {
            const trackingStatus = await orderService.getOrderTrackingStatus(orderId);
            setTimeline(trackingStatus.timeline);
          } catch (timelineError) {
            console.warn('Failed to fetch order timeline:', timelineError);
            setTimeline([]);
          }
        } else {
          const fallback = loadFallbackOrder(orderId);
          if (fallback) {
            setOrder(fallback);
            setTimeline([
              {
                id: `${orderId}-created`,
                orderId,
                eventType: 'CREATED',
                description: 'Order created from checkout flow',
                timestamp: fallback.createdAt ?? new Date().toISOString(),
              },
            ]);
          } else {
            addToast('Order not found. Returning to orders list.', 'warning');
            router.replace('/marketplace/orders');
          }
        }
      } catch (error) {
        console.error('Failed to load order', error);
        if (!errorToastShownRef.current) {
          addToast('Unable to load order details. Showing local history if available.', 'warning');
          errorToastShownRef.current = true;
        }
        const fallback = loadFallbackOrder(orderId);
        if (fallback) {
          setOrder(fallback);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, addToast, router]);

  const totalPaid = useMemo(() => {
    if (!order) return null;
    const currency = order.currency || order.paymentToken || 'ETH';
    return `${Number(order.totalAmount || order.amount || 0).toFixed(4)} ${currency}`;
  }, [order]);

  if (!order) {
    return (
      <Layout title="Order details - LinkDAO Marketplace" fullWidth={true}>
        <div className="max-w-3xl mx-auto space-y-6">
          <GlassPanel variant="primary" className="p-12 text-center space-y-5">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center">
                <Package size={24} className="text-white/60" />
              </div>
              <h1 className="text-2xl font-semibold text-white">Locating your order…</h1>
              <p className="text-white/70">
                {loading
                  ? 'Synchronizing with on-chain order history.'
                  : 'We could not find this order. Try refreshing or returning to your orders list.'}
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Button variant="primary" onClick={() => router.push('/marketplace/orders')}>
                Back to orders
              </Button>
              <Button variant="outline" onClick={() => router.push('/support/disputes')}>
                Contact support
              </Button>
            </div>
          </GlassPanel>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`Order ${order.id} - LinkDAO Marketplace`} fullWidth={true}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-col gap-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <span className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Order #{order.id}
              </span>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                {order.product?.title || 'Marketplace purchase'}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
                <span className={`${statusAccent[order.status || 'CREATED']} px-3 py-1 rounded-full inline-flex items-center gap-2 text-xs font-medium`}>
                  {iconForStatus(order.status)}
                  {statusLabel[order.status || 'CREATED']}
                </span>
                {order.createdAt && (
                  <span className="inline-flex items-center gap-2 text-white/70">
                    <Calendar size={16} />
                    Placed {new Date(order.createdAt).toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push(`/support/disputes?orderId=${order.id}`)}>
                Open support case
              </Button>
              <Button variant="primary" onClick={() => router.push('/marketplace')}>
                Continue shopping
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
          <div className="space-y-6">
            <GlassPanel variant="primary" className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <img
                  src={order.product?.image || '/api/placeholder/240/240'}
                  alt={order.product?.title || 'Product image'}
                  className="w-24 h-24 rounded-lg object-cover border border-white/10"
                />
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-white">{order.product?.title}</h2>
                  <p className="text-white/70 text-sm max-w-2xl">
                    {order.product?.description || 'Trusted seller • DAO-certified listing • Escrow protection active'}
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm text-white/70">
                    <span>Quantity: {order.product?.quantity ?? 1}</span>
                    {order.estimatedDelivery && (
                      <span className="inline-flex items-center gap-2">
                        <Truck size={16} />
                        ETA {new Date(order.estimatedDelivery).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-lg space-y-2">
                  <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wide">Payment</h3>
                  <p className="text-2xl font-semibold text-white">{totalPaid}</p>
                  <div className="text-sm text-white/60 space-y-1">
                    <p>Method: {order.paymentMethod?.toUpperCase()}</p>
                    {order.paymentDetails && (
                      <div className="text-xs text-white/50 pt-1 border-t border-white/10 mt-1">
                        {order.paymentDetails.tokenSymbol && <p>Token: {order.paymentDetails.tokenSymbol}</p>}
                        {order.paymentDetails.transactionHash && (
                          <p title={order.paymentDetails.transactionHash}>
                            Tx: {order.paymentDetails.transactionHash.slice(0, 6)}...{order.paymentDetails.transactionHash.slice(-4)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-lg space-y-2">
                  <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wide">Shipping</h3>
                  {order.shippingAddress ? (
                    <div className="text-sm text-white/70 space-y-1">
                      <p>{order.shippingAddress.name}</p>
                      <p>{order.shippingAddress.street}</p>
                      <p>
                        {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                      </p>
                      <p>{order.shippingAddress.country}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-white/60">Digital delivery</p>
                  )}
                </div>

                <div className="p-4 bg-white/5 rounded-lg space-y-2">
                  <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wide">Billing</h3>
                  {order.billingAddress ? (
                    <div className="text-sm text-white/70 space-y-1">
                      <p>{order.billingAddress.name}</p>
                      <p>{order.billingAddress.street}</p>
                      <p>
                        {order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.postalCode}
                      </p>
                      <p>{order.billingAddress.country}</p>
                    </div>
                  ) : order.shippingAddress ? (
                    <div className="text-sm text-white/60">
                      <p>Same as shipping address</p>
                    </div>
                  ) : (
                    <p className="text-sm text-white/60">Not provided</p>
                  )}
                </div>
              </div>
            </GlassPanel>

            <GlassPanel variant="secondary" className="p-6 space-y-5">
              <h2 className="text-lg font-semibold text-white">Order timeline</h2>
              <div className="space-y-4">
                {timeline.length === 0 ? (
                  <p className="text-sm text-white/60">Timeline data will appear once the seller updates this order.</p>
                ) : (
                  timeline.map((event) => (
                    <div key={event.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70">
                        {iconForStatus(event.eventType)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm text-white/80 font-medium">{event.description || event.eventType}</p>
                        <p className="text-xs text-white/50">
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassPanel>
          </div>

          <div className="space-y-6">
            <GlassPanel variant="primary" className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Next steps</h2>
              <ul className="space-y-3 text-sm text-white/70">
                <li>• Track shipment progress and confirm delivery once received.</li>
                <li>• Escrow releases to seller once you confirm the item or after the auto-complete window.</li>
                <li>• Need to escalate? Start a support ticket with the DAO arbitration council.</li>
              </ul>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => router.push(`/support/disputes?orderId=${order.id}`)}>
                  Contact support
                </Button>
                {(order.status === 'COMPLETED' || order.status === 'DELIVERED') && (
                  <Button 
                    variant="primary"
                    onClick={() => {
                      try {
                        // Add items to cart
                        const cartItem = {
                          productId: order.product.id,
                          quantity: order.product.quantity,
                          price: order.product.unitPrice,
                          title: order.product.title,
                          image: order.product.image,
                          sellerId: order.sellerAddress
                        };
                        
                        // Add to cart via localStorage for now
                        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
                        const existingItemIndex = cart.findIndex((item: any) => item.productId === cartItem.productId);
                        
                        if (existingItemIndex >= 0) {
                          cart[existingItemIndex].quantity += cartItem.quantity;
                        } else {
                          cart.push(cartItem);
                        }
                        
                        localStorage.setItem('cart', JSON.stringify(cart));
                        addToast('Items added to cart!', 'success');
                        router.push('/marketplace/checkout');
                      } catch (error) {
                        console.error('Error adding to cart:', error);
                        addToast('Failed to add items to cart', 'error');
                      }
                    }}
                  >
                    Reorder
                  </Button>
                )}
              </div>
            </GlassPanel>

            <GlassPanel variant="secondary" className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Download</h2>
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  try {
                    if (!walletAddress) {
                      addToast('Connect your wallet to download receipt.', 'info');
                      return;
                    }

                    addToast('Generating PDF receipt...', 'info');

                    // Fetch receipts for this order
                    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.linkdao.io'}/api/receipts/order/${order.id}`);
                    const data = await response.json();

                    if (!response.ok || !data.receipts || data.receipts.length === 0) {
                      addToast('No receipt found for this order.', 'error');
                      return;
                    }

                    // Get the first receipt
                    const receipt = data.receipts[0];

                    // Generate PDF by calling the backend
                    const pdfResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.linkdao.io'}/api/receipts/${receipt.id}/pdf`);
                    
                    if (!pdfResponse.ok) {
                      addToast('Failed to generate PDF receipt.', 'error');
                      return;
                    }

                    // Download the PDF
                    const blob = await pdfResponse.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `linkdao-receipt-${order.id}-${new Date().toISOString().split('T')[0]}.pdf`;
                    link.click();
                    window.URL.revokeObjectURL(url);

                    addToast('Receipt downloaded successfully!', 'success');
                  } catch (err) {
                    console.error('Error downloading PDF receipt:', err);
                    addToast('Unable to download receipt right now.', 'error');
                  }
                }}
              >
                Download receipt (PDF)
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  try {
                    if (!walletAddress) {
                      addToast('Connect your wallet to download purchase order.', 'info');
                      return;
                    }

                    addToast('Generating purchase order...', 'info');

                    // Generate or fetch purchase order
                    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.linkdao.io'}/api/orders/${order.id}/purchase-order`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' }
                    });
                    const data = await response.json();
                    
                    if (!response.ok) {
                      throw new Error(data.message || 'Failed to generate purchase order');
                    }
                
                    if (data.pdfUrl) {
                      window.open(data.pdfUrl, '_blank');
                      addToast('Purchase order downloaded successfully!', 'success');
                    } else if (data.purchaseOrder && data.purchaseOrder.pdfUrl) {
                      window.open(data.purchaseOrder.pdfUrl, '_blank');
                      addToast('Purchase order downloaded successfully!', 'success');
                    } else {
                      addToast('Purchase order generated but PDF not available yet.', 'info');
                    }
                  } catch (error) {
                    console.error('Error generating purchase order:', error);
                    addToast('Unable to generate purchase order right now.', 'error');
                  }
                }}
              >
                Download purchase order (PDF)
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  try {
                    if (!walletAddress) {
                      addToast('Connect your wallet to send receipt.', 'info');
                      return;
                    }

                    addToast('Sending receipt to your email...', 'info');
                    
                    // Send receipt email
                    const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.linkdao.io'}/api/receipts/send-email`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        orderId: order.id,
                        totalCost: order.totalAmount,
                        paymentMethod: order.paymentMethod || 'Unknown'
                      })
                    });
                    
                    if (emailResponse.ok) {
                      addToast('Receipt sent to your email!', 'success');
                    } else {
                      throw new Error('Failed to send email');
                    }
                  } catch (error) {
                    console.error('Error sending receipt email:', error);
                    addToast('Unable to send email receipt right now.', 'error');
                  }
                }}
              >
                Email receipt
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  try {
                    if (!walletAddress) {
                      addToast('Connect your wallet to export receipts.', 'info');
                      return;
                    }

                    // Create a simple CSV export since exportOrderHistory doesn't exist
                    const csvContent = [
                      ['Order ID', 'Status', 'Amount', 'Currency', 'Created At', 'Tracking Number'],
                      [
                        order.id,
                        order.status,
                        order.totalAmount.toString(),
                        order.currency,
                        order.createdAt,
                        order.trackingNumber || ''
                      ]
                    ].map(row => row.join(',')).join('\n');

                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `linkdao-order-${order.id}-${new Date().toISOString()}.csv`;
                    link.click();
                    window.URL.revokeObjectURL(url);
                  } catch (err) {
                    console.error(err);
                    addToast('Unable to export receipt right now.', 'error');
                  }
                }}
              >
                Download receipt (CSV)
              </Button>
              <Button variant="outline" className="w-full" onClick={() => window.print()}>
                Print order summary
              </Button>
            </GlassPanel>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default OrderDetailPage;