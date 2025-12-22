# WebSocket Enhancement Plan

## Current Issues

### 1. Multiple WebSocket Connections
The application currently creates multiple WebSocket connections:
1. **Primary WebSocket Service** (`webSocketService.ts`) - Singleton instance
2. **WebSocket Client Service** (`webSocketClientService.ts`) - Singleton instance
3. **Live Chat Service** (`liveChatService.ts`) - Creates its own socket.io connection
4. **Community WebSocket Service** - Uses primary WebSocket service
5. **Seller WebSocket Service** - Uses WebSocket client service

### 2. Redundant Singleton Patterns
Multiple singleton implementations for similar functionality:
- Both `webSocketService` and `webSocketClientService` provide similar features
- Different initialization approaches causing confusion

### 3. Fast Refresh Issues
The "Fast Refresh had to perform a full reload" warnings suggest:
- Circular dependencies
- Side effects in module initialization
- Component re-creations during HMR

### 4. WalletConnect Multiple Initializations
Multiple WalletConnect instances being created:
- RainbowKit creates its own WalletConnect instance
- Wagmi config also has WalletConnect connector
- This causes performance issues and unexpected behavior

## Enhancement Plan

### Phase 1: WebSocket Architecture Consolidation

#### 1.1. Create Unified WebSocket Manager
Create a single WebSocket manager that handles all connections:

```typescript
// services/webSocketManager.ts
class WebSocketManager {
  private primaryConnection: WebSocketClientService;
  private liveChatConnection: Socket | null = null;
  private connections: Map<string, WebSocketClientService> = new Map();
  
  // Singleton pattern
  private static instance: WebSocketManager;
  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }
  
  // Primary connection for general app functionality
  getPrimaryConnection(): WebSocketClientService {
    return this.primaryConnection;
  }
  
  // Live chat connection (separate for performance isolation)
  getLiveChatConnection(): Socket | null {
    return this.liveChatConnection;
  }
  
  // Initialize all connections
  async initialize(config: WebSocketConfig): Promise<void> {
    // Initialize primary connection
    this.primaryConnection = initializeWebSocketClient(config.primary);
    
    // Initialize live chat connection separately
    if (config.liveChat) {
      this.liveChatConnection = io(config.liveChat.url, config.liveChat.options);
    }
  }
  
  // Cleanup all connections
  shutdown(): void {
    // Shutdown primary connection
    shutdownWebSocketClient();
    
    // Shutdown live chat connection
    if (this.liveChatConnection) {
      this.liveChatConnection.disconnect();
      this.liveChatConnection = null;
    }
    
    // Clear connections map
    this.connections.clear();
  }
}
```

#### 1.2. Refactor Existing Services
Modify existing services to use the unified WebSocket manager:

**Before:**
```typescript
// communityWebSocketService.ts
import { webSocketService } from './webSocketService';

class CommunityWebSocketService {
  constructor() {
    webSocketService.on('connected', () => {
      // Handle connection
    });
  }
}
```

**After:**
```typescript
// communityWebSocketService.ts
import { webSocketManager } from './webSocketManager';

class CommunityWebSocketService {
  private webSocketClient: WebSocketClientService;
  
  constructor() {
    this.webSocketClient = webSocketManager.getPrimaryConnection();
    this.webSocketClient.on('connected', () => {
      // Handle connection
    });
  }
}
```

### Phase 2: WalletConnect Optimization

#### 2.1. Single WalletConnect Instance
Ensure only one WalletConnect instance is created:

**In `_app.tsx`:**
```typescript
// Ensure RainbowKit is the only wallet provider
<WagmiProvider config={config}>
  <QueryClientProvider client={queryClient}>
    <OnchainKitProvider
      apiKey={ENV_CONFIG.CDP_API_KEY}
      chain={base}
    >
      <RainbowKitProvider>
        {/* Remove duplicate wagmi WalletConnect connector */}
        <Web3Provider>
          {/* ... */}
        </Web3Provider>
      </RainbowKitProvider>
    </OnchainKitProvider>
  </QueryClientProvider>
</WagmiProvider>
```

#### 2.2. WalletConnect Initialization Guard
Add guards to prevent multiple initializations:

```typescript
// lib/rainbowkit.ts
let cachedConfig: ReturnType<typeof getDefaultConfig> | null = null;
let isInitializing = false;

export const config = (() => {
  if (isInitializing) {
    console.warn('WalletConnect initialization already in progress');
    // Return a promise that resolves when initialization is complete
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (cachedConfig) {
          clearInterval(checkInterval);
          resolve(cachedConfig);
        }
      }, 100);
    });
  }
  
  if (cachedConfig) {
    return cachedConfig;
  }
  
  isInitializing = true;
  
  try {
    cachedConfig = getDefaultConfig({
      // ... configuration
    });
    isInitializing = false;
    return cachedConfig;
  } catch (error) {
    isInitializing = false;
    throw error;
  }
})();
```

### Phase 3: Fast Refresh Optimization

#### 3.1. Eliminate Circular Dependencies
Identify and break circular dependencies:

**Problematic pattern:**
```typescript
// serviceA.ts
import { serviceB } from './serviceB';
class ServiceA {
  method() {
    serviceB.doSomething();
  }
}

// serviceB.ts
import { serviceA } from './serviceA';
class ServiceB {
  method() {
    serviceA.doSomething();
  }
}
```

**Solution:**
```typescript
// serviceA.ts
class ServiceA {
  private serviceB: ServiceB | null = null;
  
  setServiceB(serviceB: ServiceB) {
    this.serviceB = serviceB;
  }
  
  method() {
    if (this.serviceB) {
      this.serviceB.doSomething();
    }
  }
}

// serviceB.ts
class ServiceB {
  private serviceA: ServiceA | null = null;
  
  setServiceA(serviceA: ServiceA) {
    this.serviceA = serviceA;
  }
  
  method() {
    if (this.serviceA) {
      this.serviceA.doSomething();
    }
  }
}

// initialization.ts
const serviceA = new ServiceA();
const serviceB = new ServiceB();
serviceA.setServiceB(serviceB);
serviceB.setServiceA(serviceA);
```

#### 3.2. Lazy Initialization
Defer heavy initialization until needed:

```typescript
// services/heavyService.ts
class HeavyService {
  private initialized = false;
  
  private async initializeIfNeeded() {
    if (!this.initialized) {
      await this.initialize();
      this.initialized = true;
    }
  }
  
  async getData() {
    await this.initializeIfNeeded();
    // Return data
  }
}
```

### Phase 4: Performance Monitoring

#### 4.1. Connection Health Monitoring
Add monitoring for WebSocket connections:

```typescript
// services/webSocketMonitor.ts
class WebSocketMonitor {
  private connections: Map<string, ConnectionMetrics> = new Map();
  
  monitorConnection(name: string, connection: WebSocketClientService) {
    const metrics: ConnectionMetrics = {
      connectTime: Date.now(),
      messageCount: 0,
      errorCount: 0,
      latency: 0
    };
    
    connection.on('connected', () => {
      metrics.connectTime = Date.now();
    });
    
    connection.on('message', () => {
      metrics.messageCount++;
    });
    
    connection.on('error', () => {
      metrics.errorCount++;
    });
    
    this.connections.set(name, metrics);
  }
  
  getMetrics(): ConnectionMetrics[] {
    return Array.from(this.connections.values());
  }
}
```

#### 4.2. Memory Leak Prevention
Add cleanup for event listeners:

```typescript
// services/baseService.ts
class BaseService {
  protected listeners: Map<string, Set<Function>> = new Map();
  
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }
  
  off(event: string, callback: Function): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }
  
  removeAllListeners(): void {
    this.listeners.clear();
  }
  
  protected emit(event: string, ...args: any[]): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in listener for event ${event}:`, error);
        }
      });
    }
  }
}
```

## Implementation Timeline

### Week 1: WebSocket Architecture Consolidation
- [ ] Create unified WebSocket manager
- [ ] Refactor existing services to use unified manager
- [ ] Update WebSocket service imports throughout the application
- [ ] Test connection stability

### Week 2: WalletConnect Optimization
- [ ] Implement single WalletConnect instance
- [ ] Add initialization guards
- [ ] Remove duplicate connector configurations
- [ ] Test wallet connection flow

### Week 3: Fast Refresh Optimization
- [ ] Identify and eliminate circular dependencies
- [ ] Implement lazy initialization patterns
- [ ] Add cleanup for event listeners
- [ ] Test development server performance

### Week 4: Performance Monitoring & Testing
- [ ] Implement connection health monitoring
- [ ] Add memory leak prevention measures
- [ ] Conduct comprehensive testing
- [ ] Document changes and create migration guide

## Expected Benefits

### Performance Improvements
- ✅ Reduced memory usage from single WebSocket instance
- ✅ Eliminated WalletConnect initialization warnings
- ✅ Improved authentication performance
- ✅ Better component rendering performance
- ✅ Reduced development server reloads

### Stability Improvements
- ✅ Consistent WebSocket connection management
- ✅ Proper cleanup of resources
- ✅ Reduced race conditions
- ✅ Better error handling

### Developer Experience
- ✅ Simplified WebSocket service architecture
- ✅ Clearer initialization patterns
- ✅ Better debugging capabilities
- ✅ Reduced development friction

## Risk Mitigation

### Backward Compatibility
All changes will maintain backward compatibility through adapter patterns and gradual migration.

### Testing Strategy
- Unit tests for new WebSocket manager
- Integration tests for service refactoring
- End-to-end tests for wallet connection flows
- Performance benchmarks before and after changes

### Rollback Plan
Each phase will be implemented with feature flags to allow quick rollback if issues arise.