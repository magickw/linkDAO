import React, { useEffect, useState } from 'react';
import { SellerWebSocketProvider, useSellerRealTime } from '../../../contexts/SellerWebSocketContext';
import SellerNotificationCenter from '../Notifications/SellerNotificationCenter';
import RealTimeSellerDashboard from '../Dashboard/RealTimeSellerDashboard';

interface SellerWebSocketDemoProps {
  walletAddress: string;
}

// Demo component that shows real-time seller features
const SellerWebSocketDemoContent: React.FC<{ walletAddress: string }> = ({ walletAddress }) => {
  const {
    isConnected,
    connectionStatus,
    orders,
    analytics,
    notifications,
    unreadCount,
    onNewOrder,
    onOrderStatusChange,
    onPaymentReceived,
    onTierUpgrade,
    requestDataRefresh
  } = useSellerRealTime();

  const [eventLog, setEventLog] = useState<string[]>([]);
  const [testMode, setTestMode] = useState(false);

  // Set up event listeners for demo
  useEffect(() => {
    const cleanupFunctions: (() => void)[] = [];

    // Log new orders
    cleanupFunctions.push(
      onNewOrder((order) => {
        setEventLog(prev => [
          `🆕 New Order: ${order.id} - ${order.amount} ${order.currency}`,
          ...prev.slice(0, 19)
        ]);
      })
    );

    // Log order status changes
    cleanupFunctions.push(
      onOrderStatusChange((data) => {
        setEventLog(prev => [
          `📋 Order ${data.orderId} status: ${data.previousStatus} → ${data.status}`,
          ...prev.slice(0, 19)
        ]);
      })
    );

    // Log payments
    cleanupFunctions.push(
      onPaymentReceived((payment) => {
        setEventLog(prev => [
          `💰 Payment: ${payment.amount} ${payment.currency} for order ${payment.orderId}`,
          ...prev.slice(0, 19)
        ]);
      })
    );

    // Log tier upgrades
    cleanupFunctions.push(
      onTierUpgrade((tier) => {
        setEventLog(prev => [
          `🏆 Tier Upgrade: ${tier.previousTier} → ${tier.newTier}`,
          ...prev.slice(0, 19)
        ]);
      })
    );

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [onNewOrder, onOrderStatusChange, onPaymentReceived, onTierUpgrade]);

  // Simulate events for demo purposes
  const simulateNewOrder = () => {
    const mockOrder = {
      id: `order_${Date.now()}`,
      buyerAddress: '0xbuyer123',
      listingId: 'listing_456',
      amount: Math.floor(Math.random() * 1000) + 50,
      currency: 'USDC',
      status: 'pending' as const,
      createdAt: new Date()
    };

    // In a real app, this would come from the WebSocket service
    setEventLog(prev => [
      `🆕 Simulated Order: ${mockOrder.id} - ${mockOrder.amount} ${mockOrder.currency}`,
      ...prev.slice(0, 19)
    ]);
  };

  const simulatePayment = () => {
    const mockPayment = {
      amount: Math.floor(Math.random() * 500) + 100,
      currency: 'USDC',
      orderId: `order_${Date.now()}`,
      transactionHash: `0x${Math.random().toString(16).substr(2, 40)}`
    };

    setEventLog(prev => [
      `💰 Simulated Payment: ${mockPayment.amount} ${mockPayment.currency}`,
      ...prev.slice(0, 19)
    ]);
  };

  const simulateTierUpgrade = () => {
    const tiers = ['bronze', 'silver', 'gold', 'platinum'];
    const currentIndex = Math.floor(Math.random() * 3);
    const newTier = tiers[currentIndex + 1];
    const previousTier = tiers[currentIndex];

    setEventLog(prev => [
      `🏆 Simulated Tier Upgrade: ${previousTier} → ${newTier}`,
      ...prev.slice(0, 19)
    ]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Seller WebSocket Demo
              </h1>
              <p className="text-gray-600 mt-2">
                Real-time seller updates and notifications demonstration
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Wallet: {walletAddress}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-sm font-medium">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {unreadCount > 0 && (
                <div className="px-3 py-1 bg-red-500 text-white text-sm rounded-full">
                  {unreadCount} notifications
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Connection Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600">Status</p>
              <p className="text-lg font-bold text-gray-900">
                {connectionStatus.connected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600">Reconnect Attempts</p>
              <p className="text-lg font-bold text-gray-900">
                {connectionStatus.reconnectAttempts}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-600">Last Connected</p>
              <p className="text-lg font-bold text-gray-900">
                {connectionStatus.lastConnected 
                  ? connectionStatus.lastConnected.toLocaleTimeString()
                  : 'Never'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Demo Controls */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Demo Controls
          </h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={simulateNewOrder}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Simulate New Order
            </button>
            <button
              onClick={simulatePayment}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Simulate Payment
            </button>
            <button
              onClick={simulateTierUpgrade}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Simulate Tier Upgrade
            </button>
            <button
              onClick={() => requestDataRefresh(['orders', 'analytics', 'profile'])}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Refresh Data
            </button>
            <button
              onClick={() => setTestMode(!testMode)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                testMode 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-gray-500 text-white hover:bg-gray-600'
              }`}
            >
              {testMode ? 'Disable Test Mode' : 'Enable Test Mode'}
            </button>
          </div>
        </div>

        {/* Real-time Data Display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Event Log */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Real-time Event Log
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {eventLog.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No events yet. Use the demo controls to simulate events.
                </p>
              ) : (
                eventLog.map((event, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 rounded-lg text-sm font-mono"
                  >
                    <span className="text-gray-500">
                      {new Date().toLocaleTimeString()}
                    </span>
                    <span className="ml-2">{event}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Current Data */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Current Data
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Orders</p>
                <p className="text-lg font-bold text-gray-900">
                  {orders.length} orders
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Notifications</p>
                <p className="text-lg font-bold text-gray-900">
                  {notifications.length} total ({unreadCount} unread)
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Analytics</p>
                <p className="text-lg font-bold text-gray-900">
                  {analytics ? 'Available' : 'Not loaded'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Dashboard */}
        {testMode && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Real-time Seller Dashboard
            </h2>
            <RealTimeSellerDashboard walletAddress={walletAddress} />
          </div>
        )}
      </div>

      {/* Notification Center */}
      <SellerNotificationCenter 
        position="top-right"
        maxVisible={5}
        autoHide={false}
      />
    </div>
  );
};

// Main demo component with provider
export const SellerWebSocketDemo: React.FC<SellerWebSocketDemoProps> = ({ walletAddress }) => {
  if (!walletAddress) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Seller WebSocket Demo
          </h1>
          <p className="text-gray-600">
            Please provide a wallet address to test seller WebSocket functionality.
          </p>
        </div>
      </div>
    );
  }

  return (
    <SellerWebSocketProvider
      walletAddress={walletAddress}
      autoConnect={true}
      enableNotifications={true}
      enableAnalytics={true}
    >
      <SellerWebSocketDemoContent walletAddress={walletAddress} />
    </SellerWebSocketProvider>
  );
};

export default SellerWebSocketDemo;