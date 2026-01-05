
import { safeLogger } from './safeLogger';

enum CircuitState {
    CLOSED,
    OPEN,
    HALF_OPEN
}

interface CircuitBreakerOptions {
    failureThreshold: number; // Number of failures before opening
    resetTimeout: number; // Time in ms before trying to close (half-open)
}

export class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failureCount: number = 0;
    private lastFailureTime: number = 0;
    private name: string;
    private options: CircuitBreakerOptions;

    constructor(name: string, options: CircuitBreakerOptions) {
        this.name = name;
        this.options = options;
    }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === CircuitState.OPEN) {
            if (Date.now() - this.lastFailureTime > this.options.resetTimeout) {
                this.state = CircuitState.HALF_OPEN;
                safeLogger.info(`[CircuitBreaker] ${this.name} is now HALF_OPEN`);
            } else {
                safeLogger.warn(`[CircuitBreaker] ${this.name} is OPEN. Request rejected.`);
                throw new Error(`Service ${this.name} is temporarily unavailable`);
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess() {
        if (this.state === CircuitState.HALF_OPEN) {
            this.state = CircuitState.CLOSED;
            this.failureCount = 0;
            safeLogger.info(`[CircuitBreaker] ${this.name} is now CLOSED (Service recovered)`);
        } else if (this.state === CircuitState.CLOSED) {
            // Reset failure count on success in CLOSED state? 
            // Usually we might want to decay it or reset it. Simple implementation: reset on success.
            this.failureCount = 0;
        }
    }

    private onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.state === CircuitState.HALF_OPEN) {
            this.state = CircuitState.OPEN;
            safeLogger.warn(`[CircuitBreaker] ${this.name} failed while HALF_OPEN. Switching to OPEN.`);
        } else if (this.failureCount >= this.options.failureThreshold) {
            this.state = CircuitState.OPEN;
            safeLogger.error(`[CircuitBreaker] ${this.name} failure threshold reached. Switching to OPEN.`);
        }
    }
}
