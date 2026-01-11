import React, { useState, useEffect } from 'react';
import { OrderStatusBadge, OrderStatus } from './OrderStatusBadge';
import { OrderStatusTimeline } from './OrderStatusTimeline';

interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  price: number;
  image?: string;
  sku?: string;
}

interface OrderAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

interface OrderEvent {
  status: string;
  date: string;
  note?: string;
}

interface OrderMessage {
  id: string;
  sender: 'buyer' | 'seller';
  message: string;
  timestamp: string;
}

interface OrderData {
  id: string;
  orderNumber?: string;
  status: OrderStatus | string;
  createdAt: string;
  updatedAt?: string;
  totalAmount: number;
  currency?: string;
  items: OrderItem[];
  buyerAddress?: string;
  buyerName?: string;
  shippingAddress?: OrderAddress;
  billingAddress?: OrderAddress;
  trackingNumber?: string;
  trackingCarrier?: string;
  estimatedDelivery?: string;
  orderType?: 'physical' | 'digital' | 'service' | 'nft';
  events?: OrderEvent[];
  messages?: OrderMessage[];
  notes?: string;
}

interface OrderDetailDrawerProps {
  order: OrderData | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus?: (orderId: string, status: string, notes?: string) => Promise<void>;
  onAddTracking?: (orderId: string, trackingNumber: string, carrier: string) => Promise<void>;
  onSendMessage?: (orderId: string, message: string) => Promise<void>;
}

export function OrderDetailDrawer({
  order,
  isOpen,
  onClose,
  onUpdateStatus,
  onAddTracking,
  onSendMessage,
}: OrderDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'messages'>('details');
  const [newMessage, setNewMessage] = useState('');
  const [trackingForm, setTrackingForm] = useState({ number: '', carrier: 'FedEx' });
  const [isUpdating, setIsUpdating] = useState(false);

  // Reset state when drawer opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('details');
      setNewMessage('');
      setTrackingForm({ number: '', carrier: 'FedEx' });
    }
  }, [isOpen]);

  if (!order) return null;

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!onUpdateStatus) return;
    setIsUpdating(true);
    try {
      await onUpdateStatus(order.id, newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddTracking = async () => {
    if (!onAddTracking || !trackingForm.number) return;
    setIsUpdating(true);
    try {
      await onAddTracking(order.id, trackingForm.number, trackingForm.carrier);
      setTrackingForm({ number: '', carrier: 'FedEx' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!onSendMessage || !newMessage.trim()) return;
    setIsUpdating(true);
    try {
      await onSendMessage(order.id, newMessage.trim());
      setNewMessage('');
    } finally {
      setIsUpdating(false);
    }
  };

  const quickReplies = [
    'Your order has shipped!',
    'Thank you for your order!',
    "We're experiencing a delay...",
    'Your item is ready for pickup',
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`
          fixed top-0 right-0 h-full w-full max-w-lg bg-gray-900 shadow-2xl z-50
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">
                Order #{order.orderNumber || order.id.slice(0, 8)}
              </h2>
              <p className="text-sm text-gray-400">
                {new Date(order.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Status Badge */}
          <div className="mt-3">
            <OrderStatusBadge status={order.status as OrderStatus} size="lg" />
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-4 border-b border-gray-800 -mx-6 px-6">
            {(['details', 'timeline', 'messages'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  pb-3 px-1 text-sm font-medium capitalize transition-colors relative
                  ${activeTab === tab
                    ? 'text-purple-400'
                    : 'text-gray-400 hover:text-gray-300'
                  }
                `}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-180px)] p-6">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Order Timeline */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-4">Order Progress</h3>
                <OrderStatusTimeline
                  currentStatus={order.status as OrderStatus}
                  orderType={order.orderType}
                  events={order.events}
                />
              </div>

              {/* Customer Info */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Customer</h3>
                <div className="space-y-2">
                  {order.buyerName && (
                    <p className="text-white">{order.buyerName}</p>
                  )}
                  {order.buyerAddress && (
                    <p className="text-sm text-gray-400 font-mono">
                      {order.buyerAddress.slice(0, 6)}...{order.buyerAddress.slice(-4)}
                    </p>
                  )}
                </div>
              </div>

              {/* Shipping Address */}
              {order.shippingAddress && (
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Ship To</h3>
                  <div className="text-sm text-gray-300 space-y-1">
                    <p className="text-white font-medium">{order.shippingAddress.name}</p>
                    <p>{order.shippingAddress.street}</p>
                    <p>
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                    </p>
                    <p>{order.shippingAddress.country}</p>
                    {order.shippingAddress.phone && (
                      <p className="text-gray-400">{order.shippingAddress.phone}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Items */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Items</h3>
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{item.title}</p>
                        <p className="text-sm text-gray-400">
                          Qty: {item.quantity} {item.sku && `| SKU: ${item.sku}`}
                        </p>
                      </div>
                      <p className="text-white font-medium">
                        {formatCurrency(item.price * item.quantity, order.currency)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t border-gray-700 mt-4 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Subtotal</span>
                    <span className="text-white">{formatCurrency(order.totalAmount * 0.9, order.currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Shipping</span>
                    <span className="text-white">{formatCurrency(order.totalAmount * 0.05, order.currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Tax</span>
                    <span className="text-white">{formatCurrency(order.totalAmount * 0.05, order.currency)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-700">
                    <span className="text-white">Total</span>
                    <span className="text-green-400">{formatCurrency(order.totalAmount, order.currency)}</span>
                  </div>
                </div>
              </div>

              {/* Tracking Info */}
              {order.trackingNumber && (
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Tracking</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-mono">{order.trackingNumber}</p>
                      <p className="text-sm text-gray-400">{order.trackingCarrier}</p>
                    </div>
                    <a
                      href={`https://www.google.com/search?q=${order.trackingCarrier}+tracking+${order.trackingNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 text-sm"
                    >
                      Track Package
                    </a>
                  </div>
                </div>
              )}

              {/* Add Tracking Form */}
              {!order.trackingNumber && onAddTracking && order.orderType === 'physical' && (
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Add Tracking</h3>
                  <div className="space-y-3">
                    <select
                      value={trackingForm.carrier}
                      onChange={(e) => setTrackingForm({ ...trackingForm, carrier: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="FedEx">FedEx</option>
                      <option value="UPS">UPS</option>
                      <option value="USPS">USPS</option>
                      <option value="DHL">DHL</option>
                      <option value="Other">Other</option>
                    </select>
                    <input
                      type="text"
                      value={trackingForm.number}
                      onChange={(e) => setTrackingForm({ ...trackingForm, number: e.target.value })}
                      placeholder="Enter tracking number"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={handleAddTracking}
                      disabled={!trackingForm.number || isUpdating}
                      className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium py-2 rounded-lg transition-colors"
                    >
                      {isUpdating ? 'Adding...' : 'Add Tracking'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <OrderStatusTimeline
                currentStatus={order.status as OrderStatus}
                orderType={order.orderType}
                events={order.events}
                orientation="vertical"
                className="bg-gray-800/50 rounded-lg p-4"
              />

              {order.events && order.events.length > 0 && (
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Event History</h3>
                  <div className="space-y-3">
                    {order.events.map((event, index) => (
                      <div key={index} className="flex items-start gap-3 pb-3 border-b border-gray-700 last:border-0 last:pb-0">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
                        <div className="flex-1">
                          <p className="text-white text-sm capitalize">
                            {event.status.replace(/_/g, ' ')}
                          </p>
                          {event.note && (
                            <p className="text-gray-400 text-xs mt-1">{event.note}</p>
                          )}
                          <p className="text-gray-500 text-xs mt-1">
                            {new Date(event.date).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div className="space-y-4">
              {/* Message History */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {order.messages && order.messages.length > 0 ? (
                  order.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-lg max-w-[85%] ${
                        msg.sender === 'seller'
                          ? 'bg-purple-600/20 ml-auto'
                          : 'bg-gray-800'
                      }`}
                    >
                      <p className="text-xs text-gray-400 mb-1">
                        {msg.sender === 'seller' ? 'You' : 'Buyer'} &bull;{' '}
                        {new Date(msg.timestamp).toLocaleString()}
                      </p>
                      <p className="text-white text-sm">{msg.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p>No messages yet</p>
                  </div>
                )}
              </div>

              {/* Quick Replies */}
              {onSendMessage && (
                <>
                  <div className="flex flex-wrap gap-2">
                    {quickReplies.map((reply, index) => (
                      <button
                        key={index}
                        onClick={() => setNewMessage(reply)}
                        className="px-3 py-1.5 bg-gray-800 text-gray-300 text-xs rounded-full hover:bg-gray-700 hover:text-white transition-colors"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>

                  {/* Message Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || isUpdating}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 px-6 py-4">
          <div className="flex gap-3">
            {onUpdateStatus && (
              <select
                onChange={(e) => e.target.value && handleUpdateStatus(e.target.value)}
                disabled={isUpdating}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                defaultValue=""
              >
                <option value="" disabled>Update Status...</option>
                <option value="processing">Mark Processing</option>
                <option value="ready_to_ship">Mark Ready to Ship</option>
                <option value="shipped">Mark Shipped</option>
                <option value="delivered">Mark Delivered</option>
                <option value="completed">Mark Completed</option>
              </select>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default OrderDetailDrawer;
