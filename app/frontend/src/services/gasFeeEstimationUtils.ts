/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by temporarily blocking requests to failing services
 */

export class CircuitBreaker {
    private failures = 0;
    private lastFailureTime = 0;
    private readonly threshold: number;
    private readonly timeout: number;
    private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

    constructor(threshold = 5, timeout = 60000) {
        this.threshold = threshold;
        this.timeout = timeout;
    }

    isOpen(): boolean {
        if (this.state === 'OPEN') {
            // Check if timeout has passed
            if (Date.now() - this.lastFailureTime >= this.timeout) {
                this.state = 'HALF_OPEN';
                return false;
            }
            return true;
        }
        return false;
    }

    recordFailure(): void {
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.failures >= this.threshold) {
            this.state = 'OPEN';
            console.warn(`Circuit breaker opened after ${this.failures} failures`);
        }
    }

    recordSuccess(): void {
        this.failures = 0;
        this.state = 'CLOSED';
    }

    getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
        return this.state;
    }

    getFailureCount(): number {
        return this.failures;
    }
}

/**
 * Metrics Collector for Gas Estimation Service
 */
export interface GasEstimationMetrics {
    requestCount: number;
    cacheHitCount: number;
    cacheMissCount: number;
    cacheHitRate: number;
    averageResponseTime: number;
    errorCount: number;
    errorRate: number;
    apiSourceDistribution: Record<string, number>;
    lastUpdated: Date;
}

export class MetricsCollector {
    private metrics: GasEstimationMetrics = {
        requestCount: 0,
        cacheHitCount: 0,
        cacheMissCount: 0,
        cacheHitRate: 0,
        averageResponseTime: 0,
        errorCount: 0,
        errorRate: 0,
        apiSourceDistribution: {},
        lastUpdated: new Date()
    };

    private responseTimes: number[] = [];
    private readonly maxResponseTimesSamples = 100;

    recordRequest(source: string, duration: number, fromCache: boolean, hadError = false): void {
        this.metrics.requestCount++;

        if (fromCache) {
            this.metrics.cacheHitCount++;
        } else {
            this.metrics.cacheMissCount++;
        }

        if (hadError) {
            this.metrics.errorCount++;
        }

        // Update source distribution
        this.metrics.apiSourceDistribution[source] =
            (this.metrics.apiSourceDistribution[source] || 0) + 1;

        // Track response times
        this.responseTimes.push(duration);
        if (this.responseTimes.length > this.maxResponseTimesSamples) {
            this.responseTimes.shift();
        }

        // Calculate derived metrics
        this.metrics.cacheHitRate =
            this.metrics.requestCount > 0
                ? this.metrics.cacheHitCount / this.metrics.requestCount
                : 0;

        this.metrics.errorRate =
            this.metrics.requestCount > 0
                ? this.metrics.errorCount / this.metrics.requestCount
                : 0;

        this.metrics.averageResponseTime =
            this.responseTimes.length > 0
                ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
                : 0;

        this.metrics.lastUpdated = new Date();
    }

    getMetrics(): GasEstimationMetrics {
        return { ...this.metrics };
    }

    reset(): void {
        this.metrics = {
            requestCount: 0,
            cacheHitCount: 0,
            cacheMissCount: 0,
            cacheHitRate: 0,
            averageResponseTime: 0,
            errorCount: 0,
            errorRate: 0,
            apiSourceDistribution: {},
            lastUpdated: new Date()
        };
        this.responseTimes = [];
    }
}

/**
 * Cache Manager with Automatic Cleanup
 * Prevents memory leaks by limiting cache size and removing stale entries
 */
export class CacheManager<T> {
    private cache = new Map<string, { data: T; timestamp: Date }>();
    private readonly maxSize: number;
    private readonly maxAge: number;

    constructor(maxSize = 100, maxAge = 300000) { // 5 minutes default
        this.maxSize = maxSize;
        this.maxAge = maxAge;
    }

    set(key: string, data: T): void {
        // Cleanup before adding if at capacity
        if (this.cache.size >= this.maxSize) {
            this.cleanup();
        }

        this.cache.set(key, {
            data,
            timestamp: new Date()
        });
    }

    get(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if entry is stale
        if (Date.now() - entry.timestamp.getTime() > this.maxAge) {
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    has(key: string): boolean {
        return this.get(key) !== null;
    }

    delete(key: string): void {
        this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    size(): number {
        return this.cache.size;
    }

    /**
     * Remove stale entries and enforce size limit
     */
    private cleanup(): void {
        const now = Date.now();
        const entries = Array.from(this.cache.entries());

        // Remove stale entries
        for (const [key, value] of entries) {
            if (now - value.timestamp.getTime() > this.maxAge) {
                this.cache.delete(key);
            }
        }

        // If still over limit, remove oldest entries
        if (this.cache.size > this.maxSize) {
            const sortedEntries = Array.from(this.cache.entries())
                .sort((a, b) => b[1].timestamp.getTime() - a[1].timestamp.getTime());

            // Keep only the most recent maxSize/2 entries
            const entriesToKeep = sortedEntries.slice(0, Math.floor(this.maxSize / 2));
            this.cache = new Map(entriesToKeep);
        }
    }

    /**
     * Force cleanup (can be called periodically)
     */
    forceCleanup(): void {
        this.cleanup();
    }
}
