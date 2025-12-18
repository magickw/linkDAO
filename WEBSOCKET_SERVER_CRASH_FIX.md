# WebSocket Server Crash Fix

## Problem

**Error**: `server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration`

**Impact**: Backend server crashes with UNCAUGHT_EXCEPTION, causing complete service downtime

## Root Cause

Multiple Socket.IO Server instances were being created on the same HTTP server:

1. **webSocketService.ts** (line 174): `new Server(httpServer, socketConfig)` - Main WebSocket service
2. **adminWebSocketService.ts** (line 94): `new Server(httpServer, {...})` - Admin WebSocket service (fallback)
3. **index.ts** (line 1315): `new Server(httpServer, {...})` - Live Chat Socket service
4. **enhancedWebSocketService.ts** (line 30): `new Server(httpServer, {...})` - Enhanced WebSocket (not used)

When multiple Socket.IO instances share the same HTTP server, they each try to register a WebSocket upgrade handler. This causes the `handleUpgrade()` method to be called multiple times for the same socket, resulting in the error.

## Solution

**Use a single shared Socket.IO instance with namespaces** instead of creating multiple Server instances.

### Changes Made

#### 1. WebSocketService (webSocketService.ts)
- **Added**: `getSocketIOServer()` method to expose the Socket.IO instance
- This provides a clean public API for sharing the instance

```typescript
// Get the Socket.IO server instance (for sharing with other services)
getSocketIOServer(): Server {
  return this.io;
}
```

#### 2. AdminWebSocketService (adminWebSocketService.ts)
- **Removed**: Fallback code that created a new Server instance
- **Changed**: Always use shared instance via `getWebSocketService().getSocketIOServer()`
- **Added**: Error handling to throw if main service not initialized

```typescript
constructor(httpServer: HttpServer) {
  // CRITICAL FIX: Always use the existing shared Socket.IO instance
  const existingService = getWebSocketService();
  if (existingService) {
    this.io = existingService.getSocketIOServer();
    safeLogger.info('AdminWebSocketService: Using shared Socket.IO instance');
  } else {
    throw new Error('Main WebSocket service not initialized! Initialize WebSocketService first.');
  }
  // ...
}
```

#### 3. Server Initialization (index.ts)
- **Restructured**: Initialization order to ensure main service is created first
- **Changed**: Live Chat service to use shared instance via `webSocketService.getSocketIOServer()`
- **Nested**: All dependent services inside main WebSocket service initialization block

```typescript
if (enableWebSockets) {
  try {
    // Create main WebSocket service FIRST (creates shared Socket.IO instance)
    const webSocketService = initializeWebSocket(httpServer, productionConfig.webSocket);
    
    // Admin WebSocket - uses shared instance
    const adminWebSocketService = initializeAdminWebSocket(httpServer);
    
    // Seller WebSocket - uses shared instance
    const sellerWebSocketService = initializeSellerWebSocket();
    
    // Live Chat - uses shared instance
    const sharedIo = webSocketService.getSocketIOServer();
    liveChatSocketService.initialize(sharedIo);
  } catch (error) {
    console.warn('WebSocket initialization failed:', error);
  }
}
```

## Benefits

1. **Prevents Server Crashes**: Only one upgrade handler is registered
2. **Better Resource Management**: Single Socket.IO instance uses less memory
3. **Cleaner Architecture**: Services share infrastructure via proper API
4. **Easier Debugging**: Single connection point for all WebSocket traffic
5. **Type Safety**: Public method instead of accessing private properties

## Testing

After deploying this fix:

1. Server should start without crashes
2. WebSocket connections should work normally
3. All services (Main, Admin, Seller, Live Chat) should function
4. No duplicate upgrade handler errors in logs

## Prevention

To prevent this issue in the future:

1. **Never** create multiple `new Server(httpServer)` instances
2. **Always** use the shared instance via `getWebSocketService().getSocketIOServer()`
3. **Use namespaces** for different services: `io.of('/admin')`, `io.of('/seller')`, etc.
4. **Initialize** main WebSocket service first, then dependent services
5. **Document** the shared instance pattern for new developers

## Related Files

- `/app/backend/src/services/webSocketService.ts` - Main service with shared instance
- `/app/backend/src/services/adminWebSocketService.ts` - Admin service using shared instance
- `/app/backend/src/index.ts` - Server initialization order
- `/app/backend/src/services/liveChatSocketService.ts` - Live chat using shared instance
- `/app/backend/src/services/sellerWebSocketService.ts` - Seller service using shared instance

## Commit

```bash
git add app/backend/src/services/webSocketService.ts
git add app/backend/src/services/adminWebSocketService.ts
git add app/backend/src/index.ts
git commit -m "fix: prevent WebSocket server crash by using single shared Socket.IO instance

- Add getSocketIOServer() method to WebSocketService for sharing instance
- Update AdminWebSocketService to always use shared instance (no fallback)
- Restructure initialization order in index.ts to create main service first
- Update Live Chat service to use shared instance instead of creating new one
- Prevents 'handleUpgrade() called more than once' error causing server crashes

Fixes: Backend server crash with UNCAUGHT_EXCEPTION on WebSocket connections"
```
