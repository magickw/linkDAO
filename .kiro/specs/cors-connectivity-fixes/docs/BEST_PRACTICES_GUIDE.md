# Best Practices Guide - Reliable Frontend-Backend Communication

## Overview

This guide outlines best practices for maintaining reliable frontend-backend communication under resource constraints, based on the CORS connectivity fixes implementation. These practices ensure robust, scalable, and maintainable communication patterns.

## Architecture Best Practices

### 1. Layered Communication Architecture

```typescript
// Implement a layered approach for robust communication
interface CommunicationLayer {
  transport: TransportLayer;      // HTTP, WebSocket
  reliability: ReliabilityLayer;  // Circuit breaker, retry logic
  optimization: OptimizationLayer; // Caching, compression
  monitoring: MonitoringLayer;    // Logging, metrics
}

// Example implementation
class RobustCommunicationStack {
  constructor() {
    this.transport = new HttpTransport();
    this.reliability = new CircuitBreakerLayer();
    this.optimization = new CachingLayer();
    this.monitoring = new MetricsLayer();
  }
  
  async request(config: RequestConfig) {
    return this.monitoring.track(
      () => this.optimization.optimize(
        () => this.reliability.execute(
          () => this.transport.send(config)
        )
      )
    );
  }
}
```

### 2. Separation of Concerns

**Service Layer Pattern:**
```typescript
// Separate business logic from communication logic
class PostService {
  constructor(
    private apiClient: ApiClient,
    private cacheService: CacheService,
    private errorHandler: ErrorHandler
  ) {}
  
  async getPosts(filters: PostFilters): Promise<Post[]> {
    try {
      // Try cache first
      const cached = await this.cacheService.get(`posts:${JSON.stringify(filters)}`);
      if (cached) return cached;
      
      // Fetch from API
      const posts = await this.apiClient.get('/posts', { params: filters });
      
      // Cache result
      await this.cacheService.set(`posts:${JSON.stringify(filters)}`, posts, 300);
      
      return posts;
    } catch (error) {
      return this.errorHandler.handlePostsError(error, filters);
    }
  }
}
```

## Request Management Best Practices

### 1. Intelligent Request Deduplication

```typescript
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();
  
  async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }
    
    // Create new request
    const request = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });
    
    this.pendingRequests.set(key, request);
    return request;
  }
  
  generateKey(method: string, url: string, params?: any): string {
    return `${method}:${url}:${JSON.stringify(params || {})}`;
  }
}

// Usage
const deduplicator = new RequestDeduplicator();

async function fetchPosts(filters: any) {
  const key = deduplicator.generateKey('GET', '/api/posts', filters);
  return deduplicator.deduplicate(key, () => 
    apiClient.get('/api/posts', { params: filters })
  );
}
```

### 2. Smart Retry Strategies

```typescript
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: string[];
}

class SmartRetryHandler {
  constructor(private config: RetryConfig) {}
  
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on non-retryable errors
        if (!this.isRetryableError(error)) {
          throw error;
        }
        
        // Don't retry on last attempt
        if (attempt === this.config.maxRetries) {
          break;
        }
        
        // Calculate delay with jitter
        const delay = this.calculateDelay(attempt);
        console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
          context,
          error: error.message
        });
        
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }
  
  private isRetryableError(error: any): boolean {
    // Network errors
    if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNRESET') {
      return true;
    }
    
    // HTTP status codes
    const status = error.response?.status;
    return status === 408 || status === 429 || status >= 500;
  }
  
  private calculateDelay(attempt: number): number {
    const delay = this.config.baseDelay * Math.pow(this.config.backoffFactor, attempt);
    const jitter = Math.random() * 0.1 * delay; // 10% jitter
    return Math.min(delay + jitter, this.config.maxDelay);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 3. Request Prioritization

```typescript
enum RequestPriority {
  CRITICAL = 1,    // User authentication, critical data
  HIGH = 2,        // User-initiated actions
  NORMAL = 3,      // Regular data fetching
  LOW = 4,         // Background updates, analytics
  BACKGROUND = 5   // Prefetching, non-essential data
}

class PriorityRequestQueue {
  private queues = new Map<RequestPriority, Array<QueuedRequest>>();
  private processing = false;
  
  async enqueue<T>(
    request: () => Promise<T>,
    priority: RequestPriority = RequestPriority.NORMAL
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const queuedRequest = {
        execute: request,
        resolve,
        reject,
        timestamp: Date.now()
      };
      
      if (!this.queues.has(priority)) {
        this.queues.set(priority, []);
      }
      
      this.queues.get(priority)!.push(queuedRequest);
      this.processQueue();
    });
  }
  
  private async processQueue() {
    if (this.processing) return;
    this.processing = true;
    
    try {
      while (this.hasRequests()) {
        const request = this.getNextRequest();
        if (!request) break;
        
        try {
          const result = await request.execute();
          request.resolve(result);
        } catch (error) {
          request.reject(error);
        }
      }
    } finally {
      this.processing = false;
    }
  }
  
  private getNextRequest(): QueuedRequest | null {
    // Process by priority order
    for (const priority of [1, 2, 3, 4, 5]) {
      const queue = this.queues.get(priority as RequestPriority);
      if (queue && queue.length > 0) {
        return queue.shift()!;
      }
    }
    return null;
  }
  
  private hasRequests(): boolean {
    return Array.from(this.queues.values()).some(queue => queue.length > 0);
  }
}
```

## Caching Best Practices

### 1. Multi-Level Caching Strategy

```typescript
interface CacheLevel {
  name: string;
  ttl: number;
  maxSize?: number;
  storage: CacheStorage;
}

class MultiLevelCache {
  private levels: CacheLevel[];
  
  constructor() {
    this.levels = [
      {
        name: 'memory',
        ttl: 60,        // 1 minute
        maxSize: 100,
        storage: new MemoryCache()
      },
      {
        name: 'localStorage',
        ttl: 300,       // 5 minutes
        maxSize: 1000,
        storage: new LocalStorageCache()
      },
      {
        name: 'indexedDB',
        ttl: 3600,      // 1 hour
        storage: new IndexedDBCache()
      }
    ];
  }
  
  async get<T>(key: string): Promise<T | null> {
    for (const level of this.levels) {
      try {
        const value = await level.storage.get(key);
        if (value !== null) {
          // Promote to higher levels
          await this.promoteToHigherLevels(key, value, level);
          return value;
        }
      } catch (error) {
        console.warn(`Cache level ${level.name} failed:`, error);
      }
    }
    return null;
  }
  
  async set<T>(key: string, value: T, customTtl?: number): Promise<void> {
    const promises = this.levels.map(level => 
      level.storage.set(key, value, customTtl || level.ttl)
        .catch(error => console.warn(`Cache set failed for ${level.name}:`, error))
    );
    
    await Promise.allSettled(promises);
  }
  
  private async promoteToHigherLevels<T>(
    key: string, 
    value: T, 
    currentLevel: CacheLevel
  ): Promise<void> {
    const currentIndex = this.levels.indexOf(currentLevel);
    const higherLevels = this.levels.slice(0, currentIndex);
    
    const promises = higherLevels.map(level =>
      level.storage.set(key, value, level.ttl)
        .catch(error => console.warn(`Cache promotion failed for ${level.name}:`, error))
    );
    
    await Promise.allSettled(promises);
  }
}
```

### 2. Cache Invalidation Strategies

```typescript
class CacheInvalidationManager {
  private dependencies = new Map<string, Set<string>>();
  private cache: MultiLevelCache;
  
  constructor(cache: MultiLevelCache) {
    this.cache = cache;
  }
  
  // Register cache dependencies
  addDependency(cacheKey: string, dependsOn: string[]): void {
    dependsOn.forEach(dep => {
      if (!this.dependencies.has(dep)) {
        this.dependencies.set(dep, new Set());
      }
      this.dependencies.get(dep)!.add(cacheKey);
    });
  }
  
  // Invalidate cache and all dependent caches
  async invalidate(key: string): Promise<void> {
    const toInvalidate = new Set([key]);
    
    // Find all dependent keys
    const findDependents = (targetKey: string) => {
      const dependents = this.dependencies.get(targetKey);
      if (dependents) {
        dependents.forEach(dependent => {
          if (!toInvalidate.has(dependent)) {
            toInvalidate.add(dependent);
            findDependents(dependent); // Recursive dependency resolution
          }
        });
      }
    };
    
    findDependents(key);
    
    // Invalidate all keys
    const promises = Array.from(toInvalidate).map(k => this.cache.delete(k));
    await Promise.allSettled(promises);
    
    console.log(`Invalidated ${toInvalidate.size} cache entries for key: ${key}`);
  }
  
  // Smart invalidation based on data mutations
  async invalidateByPattern(pattern: RegExp): Promise<void> {
    const allKeys = await this.cache.getAllKeys();
    const matchingKeys = allKeys.filter(key => pattern.test(key));
    
    const promises = matchingKeys.map(key => this.invalidate(key));
    await Promise.allSettled(promises);
  }
}

// Usage example
const cacheManager = new CacheInvalidationManager(cache);

// Set up dependencies
cacheManager.addDependency('posts:all', ['user:profile', 'community:settings']);
cacheManager.addDependency('posts:community:123', ['community:123', 'posts:all']);

// When user profile changes, invalidate dependent caches
await cacheManager.invalidate('user:profile');
```

## Error Handling Best Practices

### 1. Graceful Degradation Framework

```typescript
interface FallbackStrategy<T> {
  name: string;
  execute: () => Promise<T>;
  condition?: (error: Error) => boolean;
}

class GracefulDegradationHandler<T> {
  private strategies: FallbackStrategy<T>[] = [];
  
  addFallback(strategy: FallbackStrategy<T>): this {
    this.strategies.push(strategy);
    return this;
  }
  
  async executeWithFallbacks(
    primaryOperation: () => Promise<T>
  ): Promise<{ data: T; source: string; degraded: boolean }> {
    try {
      const data = await primaryOperation();
      return { data, source: 'primary', degraded: false };
    } catch (primaryError) {
      console.warn('Primary operation failed:', primaryError.message);
      
      for (const strategy of this.strategies) {
        if (strategy.condition && !strategy.condition(primaryError)) {
          continue;
        }
        
        try {
          const data = await strategy.execute();
          return { data, source: strategy.name, degraded: true };
        } catch (fallbackError) {
          console.warn(`Fallback ${strategy.name} failed:`, fallbackError.message);
        }
      }
      
      throw primaryError;
    }
  }
}

// Usage example
const postsHandler = new GracefulDegradationHandler<Post[]>()
  .addFallback({
    name: 'cache',
    execute: () => cache.get('posts:recent'),
    condition: (error) => error.message.includes('network')
  })
  .addFallback({
    name: 'localStorage',
    execute: () => JSON.parse(localStorage.getItem('posts_backup') || '[]')
  })
  .addFallback({
    name: 'empty',
    execute: () => Promise.resolve([])
  });

const result = await postsHandler.executeWithFallbacks(() => 
  apiClient.get('/api/posts')
);
```

### 2. User-Friendly Error Communication

```typescript
interface ErrorContext {
  operation: string;
  userAction?: string;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class UserErrorHandler {
  private errorMessages = new Map<string, string>([
    ['NETWORK_ERROR', 'Connection issue. Please check your internet connection.'],
    ['RATE_LIMITED', 'Too many requests. Please wait a moment and try again.'],
    ['SERVER_ERROR', 'Server is temporarily unavailable. Please try again later.'],
    ['VALIDATION_ERROR', 'Please check your input and try again.'],
    ['AUTHENTICATION_ERROR', 'Please sign in again to continue.']
  ]);
  
  handleError(error: Error, context: ErrorContext): UserErrorResponse {
    const errorType = this.classifyError(error);
    const message = this.getUserFriendlyMessage(errorType, context);
    const actions = this.getAvailableActions(errorType, context);
    
    return {
      message,
      actions,
      severity: context.severity,
      retryable: context.retryable,
      technical: error.message // For debugging
    };
  }
  
  private classifyError(error: Error): string {
    if (error.message.includes('network')) return 'NETWORK_ERROR';
    if (error.message.includes('429')) return 'RATE_LIMITED';
    if (error.message.includes('5')) return 'SERVER_ERROR';
    if (error.message.includes('400')) return 'VALIDATION_ERROR';
    if (error.message.includes('401')) return 'AUTHENTICATION_ERROR';
    return 'UNKNOWN_ERROR';
  }
  
  private getUserFriendlyMessage(errorType: string, context: ErrorContext): string {
    const baseMessage = this.errorMessages.get(errorType) || 'Something went wrong.';
    
    if (context.userAction) {
      return `Unable to ${context.userAction}. ${baseMessage}`;
    }
    
    return baseMessage;
  }
  
  private getAvailableActions(errorType: string, context: ErrorContext): UserAction[] {
    const actions: UserAction[] = [];
    
    if (context.retryable) {
      actions.push({
        label: 'Try Again',
        action: 'retry',
        primary: true
      });
    }
    
    if (errorType === 'AUTHENTICATION_ERROR') {
      actions.push({
        label: 'Sign In',
        action: 'authenticate',
        primary: true
      });
    }
    
    actions.push({
      label: 'Cancel',
      action: 'cancel',
      primary: false
    });
    
    return actions;
  }
}
```

## Performance Optimization Best Practices

### 1. Resource-Aware Operations

```typescript
class ResourceMonitor {
  private memoryThreshold = 0.8; // 80% of available memory
  private networkThreshold = 'slow-2g';
  
  async checkResourceConstraints(): Promise<ResourceStatus> {
    const status: ResourceStatus = {
      memory: await this.checkMemoryUsage(),
      network: await this.checkNetworkConditions(),
      battery: await this.checkBatteryStatus()
    };
    
    return status;
  }
  
  async shouldDeferOperation(operation: OperationType): Promise<boolean> {
    const resources = await this.checkResourceConstraints();
    
    // Defer non-critical operations under resource constraints
    if (resources.memory.usage > this.memoryThreshold) {
      return operation.priority > OperationPriority.HIGH;
    }
    
    if (resources.network.effectiveType === 'slow-2g') {
      return operation.type === 'BACKGROUND_SYNC' || operation.type === 'PREFETCH';
    }
    
    if (resources.battery.level < 0.2 && !resources.battery.charging) {
      return operation.type !== 'USER_INITIATED';
    }
    
    return false;
  }
  
  private async checkMemoryUsage(): Promise<MemoryStatus> {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usage: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
        available: memory.jsHeapSizeLimit - memory.usedJSHeapSize
      };
    }
    
    return { usage: 0, available: Infinity };
  }
  
  private async checkNetworkConditions(): Promise<NetworkStatus> {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      };
    }
    
    return { effectiveType: 'unknown', downlink: Infinity, rtt: 0 };
  }
  
  private async checkBatteryStatus(): Promise<BatteryStatus> {
    if ('getBattery' in navigator) {
      const battery = await (navigator as any).getBattery();
      return {
        level: battery.level,
        charging: battery.charging
      };
    }
    
    return { level: 1, charging: true };
  }
}
```

### 2. Adaptive Request Strategies

```typescript
class AdaptiveRequestManager {
  private resourceMonitor = new ResourceMonitor();
  private requestQueue = new PriorityRequestQueue();
  
  async makeRequest<T>(
    config: RequestConfig,
    options: AdaptiveOptions = {}
  ): Promise<T> {
    const resources = await this.resourceMonitor.checkResourceConstraints();
    const adaptedConfig = await this.adaptRequest(config, resources, options);
    
    return this.requestQueue.enqueue(
      () => this.executeRequest(adaptedConfig),
      adaptedConfig.priority
    );
  }
  
  private async adaptRequest(
    config: RequestConfig,
    resources: ResourceStatus,
    options: AdaptiveOptions
  ): Promise<AdaptedRequestConfig> {
    const adapted: AdaptedRequestConfig = { ...config };
    
    // Adapt based on network conditions
    if (resources.network.effectiveType === 'slow-2g') {
      adapted.timeout = Math.max(config.timeout || 5000, 15000);
      adapted.compression = true;
      adapted.imageQuality = 'low';
    }
    
    // Adapt based on memory constraints
    if (resources.memory.usage > 0.8) {
      adapted.cacheStrategy = 'minimal';
      adapted.batchSize = Math.min(config.batchSize || 10, 5);
    }
    
    // Adapt based on battery status
    if (resources.battery.level < 0.2 && !resources.battery.charging) {
      adapted.priority = Math.max(adapted.priority || RequestPriority.NORMAL, RequestPriority.LOW);
      adapted.backgroundSync = false;
    }
    
    return adapted;
  }
  
  private async executeRequest<T>(config: AdaptedRequestConfig): Promise<T> {
    // Apply compression if needed
    if (config.compression) {
      config.headers = {
        ...config.headers,
        'Accept-Encoding': 'gzip, deflate, br'
      };
    }
    
    // Apply timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);
    
    try {
      const response = await fetch(config.url, {
        ...config,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}
```

## Security Best Practices

### 1. Secure Communication Patterns

```typescript
class SecureCommunicationManager {
  private tokenManager: TokenManager;
  private encryptionService: EncryptionService;
  
  constructor() {
    this.tokenManager = new TokenManager();
    this.encryptionService = new EncryptionService();
  }
  
  async secureRequest<T>(config: RequestConfig): Promise<T> {
    // Add authentication
    const token = await this.tokenManager.getValidToken();
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`
    };
    
    // Add request signing for critical operations
    if (config.critical) {
      const signature = await this.signRequest(config);
      config.headers['X-Request-Signature'] = signature;
    }
    
    // Encrypt sensitive data
    if (config.data && config.encrypt) {
      config.data = await this.encryptionService.encrypt(config.data);
      config.headers['X-Content-Encrypted'] = 'true';
    }
    
    // Add CSRF protection
    const csrfToken = await this.getCSRFToken();
    config.headers['X-CSRF-Token'] = csrfToken;
    
    return this.executeSecureRequest(config);
  }
  
  private async signRequest(config: RequestConfig): Promise<string> {
    const payload = {
      method: config.method,
      url: config.url,
      timestamp: Date.now(),
      nonce: this.generateNonce()
    };
    
    return this.encryptionService.sign(JSON.stringify(payload));
  }
  
  private async getCSRFToken(): Promise<string> {
    // Get CSRF token from meta tag or API
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (metaToken) return metaToken;
    
    // Fetch from API if not in meta tag
    const response = await fetch('/api/csrf-token');
    const { token } = await response.json();
    return token;
  }
  
  private generateNonce(): string {
    return crypto.getRandomValues(new Uint8Array(16))
      .reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
  }
}
```

### 2. Input Validation and Sanitization

```typescript
class InputValidator {
  private schemas = new Map<string, ValidationSchema>();
  
  registerSchema(endpoint: string, schema: ValidationSchema): void {
    this.schemas.set(endpoint, schema);
  }
  
  validateRequest(endpoint: string, data: any): ValidationResult {
    const schema = this.schemas.get(endpoint);
    if (!schema) {
      return { valid: true, data };
    }
    
    const sanitized = this.sanitizeInput(data, schema);
    const errors = this.validateAgainstSchema(sanitized, schema);
    
    return {
      valid: errors.length === 0,
      data: sanitized,
      errors
    };
  }
  
  private sanitizeInput(data: any, schema: ValidationSchema): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    const sanitized: any = {};
    
    for (const [key, fieldSchema] of Object.entries(schema.fields)) {
      if (key in data) {
        sanitized[key] = this.sanitizeField(data[key], fieldSchema);
      }
    }
    
    return sanitized;
  }
  
  private sanitizeField(value: any, fieldSchema: FieldSchema): any {
    if (fieldSchema.type === 'string') {
      // Remove HTML tags and dangerous characters
      return String(value)
        .replace(/<[^>]*>/g, '')
        .replace(/[<>'"&]/g, (char) => {
          const entities: Record<string, string> = {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '&': '&amp;'
          };
          return entities[char] || char;
        })
        .trim();
    }
    
    if (fieldSchema.type === 'number') {
      const num = Number(value);
      return isNaN(num) ? 0 : num;
    }
    
    if (fieldSchema.type === 'boolean') {
      return Boolean(value);
    }
    
    return value;
  }
}
```

## Monitoring and Observability Best Practices

### 1. Comprehensive Metrics Collection

```typescript
class MetricsCollector {
  private metrics = new Map<string, MetricData>();
  private collectors: MetricCollector[] = [];
  
  constructor() {
    this.setupDefaultCollectors();
    this.startCollection();
  }
  
  private setupDefaultCollectors(): void {
    this.collectors = [
      new PerformanceMetricsCollector(),
      new ErrorMetricsCollector(),
      new UserExperienceMetricsCollector(),
      new ResourceMetricsCollector()
    ];
  }
  
  private startCollection(): void {
    setInterval(() => {
      this.collectMetrics();
    }, 30000); // Collect every 30 seconds
  }
  
  private async collectMetrics(): Promise<void> {
    const timestamp = Date.now();
    
    for (const collector of this.collectors) {
      try {
        const metrics = await collector.collect();
        
        for (const [name, value] of Object.entries(metrics)) {
          this.recordMetric(name, value, timestamp);
        }
      } catch (error) {
        console.error(`Metrics collection failed for ${collector.name}:`, error);
      }
    }
  }
  
  private recordMetric(name: string, value: number, timestamp: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name,
        values: [],
        sum: 0,
        count: 0,
        min: Infinity,
        max: -Infinity
      });
    }
    
    const metric = this.metrics.get(name)!;
    metric.values.push({ value, timestamp });
    metric.sum += value;
    metric.count++;
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);
    
    // Keep only last 100 values
    if (metric.values.length > 100) {
      const removed = metric.values.shift()!;
      metric.sum -= removed.value;
      metric.count--;
    }
  }
  
  getMetrics(): MetricsSummary {
    const summary: MetricsSummary = {};
    
    for (const [name, metric] of this.metrics) {
      summary[name] = {
        current: metric.values[metric.values.length - 1]?.value || 0,
        average: metric.sum / metric.count,
        min: metric.min,
        max: metric.max,
        trend: this.calculateTrend(metric.values)
      };
    }
    
    return summary;
  }
  
  private calculateTrend(values: MetricValue[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 10) return 'stable';
    
    const recent = values.slice(-5);
    const older = values.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, v) => sum + v.value, 0) / recent.length;
    const olderAvg = older.reduce((sum, v) => sum + v.value, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }
}
```

### 2. Alerting and Notification System

```typescript
interface AlertRule {
  name: string;
  condition: (metrics: MetricsSummary) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldown: number; // Minimum time between alerts in ms
  action: (alert: Alert) => Promise<void>;
}

class AlertingSystem {
  private rules: AlertRule[] = [];
  private lastAlerts = new Map<string, number>();
  
  constructor(private metricsCollector: MetricsCollector) {
    this.setupDefaultRules();
    this.startMonitoring();
  }
  
  private setupDefaultRules(): void {
    this.rules = [
      {
        name: 'high_error_rate',
        condition: (metrics) => (metrics.error_rate?.current || 0) > 5,
        severity: 'high',
        cooldown: 300000, // 5 minutes
        action: this.sendErrorRateAlert
      },
      {
        name: 'slow_response_time',
        condition: (metrics) => (metrics.response_time?.average || 0) > 5000,
        severity: 'medium',
        cooldown: 600000, // 10 minutes
        action: this.sendPerformanceAlert
      },
      {
        name: 'circuit_breaker_open',
        condition: (metrics) => (metrics.circuit_breaker_trips?.current || 0) > 0,
        severity: 'critical',
        cooldown: 60000, // 1 minute
        action: this.sendCircuitBreakerAlert
      }
    ];
  }
  
  private startMonitoring(): void {
    setInterval(() => {
      this.checkAlerts();
    }, 60000); // Check every minute
  }
  
  private async checkAlerts(): Promise<void> {
    const metrics = this.metricsCollector.getMetrics();
    
    for (const rule of this.rules) {
      if (rule.condition(metrics)) {
        await this.triggerAlert(rule, metrics);
      }
    }
  }
  
  private async triggerAlert(rule: AlertRule, metrics: MetricsSummary): Promise<void> {
    const now = Date.now();
    const lastAlert = this.lastAlerts.get(rule.name) || 0;
    
    // Check cooldown
    if (now - lastAlert < rule.cooldown) {
      return;
    }
    
    const alert: Alert = {
      name: rule.name,
      severity: rule.severity,
      timestamp: now,
      metrics,
      message: this.generateAlertMessage(rule, metrics)
    };
    
    try {
      await rule.action(alert);
      this.lastAlerts.set(rule.name, now);
    } catch (error) {
      console.error(`Failed to send alert ${rule.name}:`, error);
    }
  }
  
  private generateAlertMessage(rule: AlertRule, metrics: MetricsSummary): string {
    switch (rule.name) {
      case 'high_error_rate':
        return `Error rate is ${metrics.error_rate?.current}%, exceeding threshold of 5%`;
      case 'slow_response_time':
        return `Average response time is ${metrics.response_time?.average}ms, exceeding threshold of 5000ms`;
      case 'circuit_breaker_open':
        return `Circuit breaker has tripped ${metrics.circuit_breaker_trips?.current} times`;
      default:
        return `Alert triggered for ${rule.name}`;
    }
  }
  
  private async sendErrorRateAlert(alert: Alert): Promise<void> {
    // Send to monitoring service, Slack, email, etc.
    console.error('HIGH ERROR RATE ALERT:', alert.message);
  }
  
  private async sendPerformanceAlert(alert: Alert): Promise<void> {
    console.warn('PERFORMANCE ALERT:', alert.message);
  }
  
  private async sendCircuitBreakerAlert(alert: Alert): Promise<void> {
    console.error('CIRCUIT BREAKER ALERT:', alert.message);
  }
}
```

## Testing Best Practices

### 1. Comprehensive Testing Strategy

```typescript
// Integration tests for communication layer
describe('Communication Layer Integration', () => {
  let communicationStack: RobustCommunicationStack;
  let mockServer: MockServer;
  
  beforeEach(() => {
    mockServer = new MockServer();
    communicationStack = new RobustCommunicationStack({
      baseURL: mockServer.url
    });
  });
  
  describe('Circuit Breaker Functionality', () => {
    it('should open circuit breaker after threshold failures', async () => {
      // Simulate server failures
      mockServer.respondWith(500, 'Internal Server Error');
      
      // Make requests until circuit breaker opens
      for (let i = 0; i < 6; i++) {
        try {
          await communicationStack.request({ url: '/api/test' });
        } catch (error) {
          // Expected failures
        }
      }
      
      // Circuit breaker should now be open
      const metrics = communicationStack.getCircuitBreakerMetrics();
      expect(metrics.state).toBe('OPEN');
    });
    
    it('should use fallback data when circuit breaker is open', async () => {
      // Setup fallback data
      const fallbackData = [{ id: 1, title: 'Cached Post' }];
      communicationStack.setFallbackData('/api/posts', fallbackData);
      
      // Open circuit breaker
      communicationStack.openCircuitBreaker();
      
      // Request should return fallback data
      const result = await communicationStack.request({ url: '/api/posts' });
      expect(result.data).toEqual(fallbackData);
      expect(result.source).toBe('fallback');
    });
  });
  
  describe('Request Deduplication', () => {
    it('should deduplicate identical concurrent requests', async () => {
      let requestCount = 0;
      mockServer.onRequest('/api/posts', () => {
        requestCount++;
        return { data: [{ id: 1, title: 'Post 1' }] };
      });
      
      // Make multiple concurrent identical requests
      const promises = Array(5).fill(null).map(() =>
        communicationStack.request({ url: '/api/posts' })
      );
      
      await Promise.all(promises);
      
      // Should only make one actual request
      expect(requestCount).toBe(1);
    });
  });
  
  describe('Caching Behavior', () => {
    it('should cache responses and serve from cache', async () => {
      const responseData = [{ id: 1, title: 'Post 1' }];
      mockServer.respondWith(200, responseData);
      
      // First request
      const result1 = await communicationStack.request({
        url: '/api/posts',
        cache: { ttl: 300 }
      });
      
      // Second request should come from cache
      mockServer.respondWith(500, 'Server Error'); // Server now fails
      const result2 = await communicationStack.request({
        url: '/api/posts',
        cache: { ttl: 300 }
      });
      
      expect(result1.data).toEqual(responseData);
      expect(result2.data).toEqual(responseData);
      expect(result2.cached).toBe(true);
    });
  });
});
```

### 2. Performance Testing

```typescript
// Performance benchmarks
describe('Performance Benchmarks', () => {
  it('should handle high request volume efficiently', async () => {
    const startTime = Date.now();
    const requestCount = 100;
    
    const promises = Array(requestCount).fill(null).map((_, index) =>
      communicationStack.request({
        url: `/api/posts/${index}`,
        priority: RequestPriority.NORMAL
      })
    );
    
    await Promise.all(promises);
    
    const duration = Date.now() - startTime;
    const requestsPerSecond = (requestCount / duration) * 1000;
    
    // Should handle at least 10 requests per second
    expect(requestsPerSecond).toBeGreaterThan(10);
  });
  
  it('should maintain performance under memory constraints', async () => {
    // Simulate memory pressure
    const largeData = new Array(1000000).fill('x').join('');
    
    const startTime = Date.now();
    
    for (let i = 0; i < 50; i++) {
      await communicationStack.request({
        url: '/api/test',
        data: { payload: largeData }
      });
    }
    
    const duration = Date.now() - startTime;
    
    // Should complete within reasonable time even with large payloads
    expect(duration).toBeLessThan(30000); // 30 seconds
  });
});
```

## Deployment and Maintenance Best Practices

### 1. Gradual Rollout Strategy

```typescript
class FeatureRolloutManager {
  private rolloutConfig: RolloutConfig;
  
  constructor() {
    this.rolloutConfig = {
      phases: [
        { percentage: 5, duration: 24 * 60 * 60 * 1000 },   // 5% for 24 hours
        { percentage: 25, duration: 48 * 60 * 60 * 1000 },  // 25% for 48 hours
        { percentage: 50, duration: 72 * 60 * 60 * 1000 },  // 50% for 72 hours
        { percentage: 100, duration: Infinity }              // 100% permanently
      ],
      rollbackThresholds: {
        errorRate: 5,      // 5% error rate
        responseTime: 5000, // 5 second response time
        userComplaints: 10  // 10 user complaints
      }
    };
  }
  
  shouldEnableFeature(userId: string, featureName: string): boolean {
    const rollout = this.getCurrentRollout(featureName);
    if (!rollout) return false;
    
    const userHash = this.hashUserId(userId);
    return userHash < rollout.percentage;
  }
  
  private getCurrentRollout(featureName: string): RolloutPhase | null {
    const feature = this.getFeatureConfig(featureName);
    if (!feature) return null;
    
    const elapsed = Date.now() - feature.startTime;
    let cumulativeDuration = 0;
    
    for (const phase of this.rolloutConfig.phases) {
      cumulativeDuration += phase.duration;
      if (elapsed < cumulativeDuration) {
        return phase;
      }
    }
    
    return this.rolloutConfig.phases[this.rolloutConfig.phases.length - 1];
  }
  
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 100;
  }
}
```

### 2. Monitoring and Maintenance Automation

```bash
#!/bin/bash
# scripts/maintenance-check.sh

echo "=== LinkDAO Maintenance Check ==="
echo "Timestamp: $(date)"

# Check system health
echo "1. System Health Check"
curl -s http://localhost:3001/health | jq '.status' || echo "Health check failed"

# Check error rates
echo "2. Error Rate Analysis"
ERROR_RATE=$(curl -s http://localhost:3001/metrics | jq '.error_rate.current')
if (( $(echo "$ERROR_RATE > 5" | bc -l) )); then
  echo "WARNING: High error rate detected: $ERROR_RATE%"
  # Send alert
  curl -X POST "$SLACK_WEBHOOK" -d "{\"text\":\"High error rate: $ERROR_RATE%\"}"
fi

# Check memory usage
echo "3. Memory Usage Check"
MEMORY_USAGE=$(node -e "console.log(Math.round(process.memoryUsage().heapUsed / 1024 / 1024))")
if [ "$MEMORY_USAGE" -gt 400 ]; then
  echo "WARNING: High memory usage: ${MEMORY_USAGE}MB"
  # Trigger garbage collection
  kill -USR2 $(pgrep node)
fi

# Check database performance
echo "4. Database Performance"
DB_SLOW_QUERIES=$(psql $DATABASE_URL -t -c "SELECT count(*) FROM pg_stat_statements WHERE mean_time > 1000;")
if [ "$DB_SLOW_QUERIES" -gt 10 ]; then
  echo "WARNING: $DB_SLOW_QUERIES slow queries detected"
fi

# Check cache hit rates
echo "5. Cache Performance"
CACHE_HIT_RATE=$(curl -s http://localhost:3001/metrics | jq '.cache_hit_rate.current')
if (( $(echo "$CACHE_HIT_RATE < 80" | bc -l) )); then
  echo "WARNING: Low cache hit rate: $CACHE_HIT_RATE%"
fi

echo "=== Maintenance Check Complete ==="
```

This comprehensive best practices guide provides a solid foundation for maintaining reliable frontend-backend communication under resource constraints. The practices cover architecture patterns, error handling, performance optimization, security, monitoring, and maintenance procedures that ensure robust and scalable communication systems.