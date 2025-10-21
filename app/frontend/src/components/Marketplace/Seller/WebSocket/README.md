# Seller WebSocket Integration

This directory contains the real-time WebSocket integration for seller functionality, providing live updates for orders, payments, tier changes, and notifications.

## Overview

The seller WebSocket system provides real-time updates for seller-specific events, enabling immediate notifications and live data synchronization across all seller components.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Components                      │
├─────────────────────────────────────────────────────────────┤
│  SellerDashboard  │  SellerProfile  │  SellerNotifications │
├─────────────────────────────────────────────────────────────┤
│                 SellerWebSocketContext                      │
├─────────────────────────────────────────────────────────────┤
│                 useSellerWebSocket Hook                     │
├─────────────────────────────────────────────────────────────┤
│               SellerWebSocketService                        │
├─────────────────────────────────────────────────────────────┤
│               WebSocketClientService                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Services                         │
├─────────────────────────────────────────────────────────────┤
│               SellerWebSocketService                        │
├─────────────────────────────────────────────────────────────┤
│                 WebSocketService                            │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### Real-time Events
- **New Orders**: Instant notifications when orders are received
- **Order Status Changes**: Live updates on order progression
- **Payment Notifications**: Real-time payment confirmations
- **Tier Upgrades**: Immediate tier change notifications
- **Review Alerts**: New review notifications
- **Analytics Updates**: Live performance metrics

### Connection Management
- **Automatic Reconnection**: Handles network interruptions gracefully
- **Offline Support**: Queues messages when offline
- **Connection Health**: Monitors connection status and quality
- **Exponential Backoff**: Smart reconnection strategy

### Cache Invalidation
- **Real-time Cache Updates**: Invalidates stale data immediately
- **Selective Invalidation**: Only updates relevant cache keys
- **Callback System**: Allows components to react to cache changes

## Usage

### Basic Setup

```tsx
import { SellerWebSocketProvider } from '../../../../contexts/SellerWebSocketContext';

function App() {
  return (
    <SellerWebSocketProvider
      walletAddress="0x..."
      autoConnect={true}
      enableNotifications={true}
      enableAnalytics={true}
    >
      <SellerDashboard />
    </SellerWebSocketProvider>
  );
}
```

### Using the Hook

```tsx
import { useSellerRealTime } from '../../../../contexts/SellerWebSocketContext';

function SellerComponent() {
  const {
    isConnected,
    orders,
    notifications,
    onNewOrder,
    onPaymentReceived
  } = useSellerRealTime();

  useEffect(() => {
    const cleanup = onNewOrder((order) => {
      console.log('New order received:', order);
      // Handle new order
    });

    return cleanup;
  }, [onNewOrder]);

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      <div>Orders: {orders.length}</div>
      <div>Notifications: {notifications.length}</div>
    </div>
  );
}
```

### Event Handlers

```tsx
// Listen for specific events
const cleanupNewOrder = onNewOrder((order) => {
  showNotification(`New order: ${order.id}`);
});

const cleanupPayment = onPaymentReceived((payment) => {
  showNotification(`Payment received: ${payment.amount} ${payment.currency}`);
});

const cleanupTierUpgrade = onTierUpgrade((tier) => {
  showNotification(`Tier upgraded to ${tier.newTier}!`);
});

// Cleanup on unmount
useEffect(() => {
  return () => {
    cleanupNewOrder();
    cleanupPayment();
    cleanupTierUpgrade();
  };
}, []);
```

### Cache Invalidation

```tsx
// Register cache invalidation callbacks
useEffect(() => {
  const handleProfileInvalidation = () => {
    // Refetch profile data
    queryClient.invalidateQueries(['seller', 'profile']);
  };

  registerCacheCallback('profile', handleProfileInvalidation);

  return () => {
    unregisterCacheCallback('profile', handleProfileInvalidation);
  };
}, [registerCacheCallback, unregisterCacheCallback]);
```

## Components

### SellerNotificationCenter
Displays real-time notifications with priority-based styling and auto-dismiss functionality.

```tsx
<SellerNotificationCenter 
  position="top-right"
  maxVisible={5}
  autoHide={true}
/>
```

### RealTimeSellerDashboard
A dashboard component that displays live seller metrics and activity.

```tsx
<RealTimeSellerDashboard 
  walletAddress="0x..."
  className="custom-dashboard"
/>
```

## Event Types

### Order Events
```typescript
interface OrderEvent {
  type: 'new_order' | 'order_status_changed';
  orderId: string;
  status?: string;
  previousStatus?: string;
  order?: SellerOrder;
}
```

### Payment Events
```typescript
interface PaymentEvent {
  type: 'payment_received';
  amount: number;
  currency: string;
  orderId: string;
  transactionHash: string;
}
```

### Tier Events
```typescript
interface TierEvent {
  type: 'tier_upgraded';
  newTier: string;
  previousTier: string;
  benefits: string[];
}
```

## Configuration

### WebSocket Config
```typescript
interface SellerWebSocketConfig {
  walletAddress: string;
  autoConnect?: boolean;
  enableNotifications?: boolean;
  enableAnalytics?: boolean;
}
```

### Notification Config
```typescript
interface NotificationConfig {
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxVisible: number;
  autoHide: boolean;
  soundEnabled: boolean;
}
```

## Error Handling

The system includes comprehensive error handling:

- **Connection Errors**: Automatic reconnection with exponential backoff
- **Message Errors**: Graceful degradation and error logging
- **Service Errors**: Fallback to cached data when available
- **Network Errors**: Offline queue for pending messages

## Testing

### Unit Tests
```bash
npm test -- --testPathPattern=useSellerWebSocket
```

### Integration Tests
```bash
npm test -- --testPathPattern=sellerWebSocketService
```

### Demo Component
Use the `SellerWebSocketDemo` component to test functionality:

```tsx
<SellerWebSocketDemo walletAddress="0x..." />
```

## Performance Considerations

- **Message Queuing**: Limits queue size to prevent memory issues
- **Event Throttling**: Prevents excessive event firing
- **Selective Updates**: Only updates relevant components
- **Connection Pooling**: Reuses WebSocket connections efficiently

## Security

- **Wallet Verification**: Ensures only authorized sellers receive updates
- **Message Validation**: Validates all incoming messages
- **Rate Limiting**: Prevents abuse of WebSocket connections
- **Secure Transmission**: Uses WSS in production

## Troubleshooting

### Common Issues

1. **Connection Failures**
   - Check WebSocket URL configuration
   - Verify wallet address format
   - Check network connectivity

2. **Missing Events**
   - Verify event subscriptions
   - Check WebSocket connection status
   - Review server-side event emission

3. **Performance Issues**
   - Monitor message queue size
   - Check for memory leaks in event handlers
   - Verify cleanup functions are called

### Debug Mode

Enable debug logging:

```typescript
localStorage.setItem('seller-websocket-debug', 'true');
```

## Future Enhancements

- **Message Encryption**: End-to-end encryption for sensitive data
- **Event Filtering**: Advanced filtering based on seller preferences
- **Batch Updates**: Grouping related events for efficiency
- **Analytics Integration**: Detailed WebSocket usage analytics
- **Mobile Optimization**: Enhanced mobile WebSocket handling

## API Reference

See the TypeScript interfaces in the source files for complete API documentation:

- `SellerWebSocketService`
- `useSellerWebSocket`
- `SellerWebSocketContext`
- `SellerNotificationCenter`
- `RealTimeSellerDashboard`