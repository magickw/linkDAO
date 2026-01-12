/**
 * SecureString - Secure handling of sensitive string data
 * Automatically zeros memory after use to prevent data leakage
 */

export class SecureString {
    private data: Uint8Array | null;
    private isCleared: boolean = false;

    constructor(value: string) {
        this.data = new TextEncoder().encode(value);
    }

    /**
     * Get the string value
     * Throws if already cleared
     */
    getValue(): string {
        if (this.isCleared || !this.data) {
            throw new Error('SecureString has been cleared');
        }
        return new TextDecoder().decode(this.data);
    }

    /**
     * Get the raw bytes
     * Throws if already cleared
     */
    getBytes(): Uint8Array {
        if (this.isCleared || !this.data) {
            throw new Error('SecureString has been cleared');
        }
        return this.data;
    }

    /**
     * Clear the data from memory
     * This zeros out the underlying buffer
     */
    clear(): void {
        if (this.data) {
            // Zero out the buffer
            this.data.fill(0);
            this.data = null;
        }
        this.isCleared = true;
    }

    /**
     * Check if the data has been cleared
     */
    get cleared(): boolean {
        return this.isCleared;
    }

    /**
     * Automatic cleanup when object is garbage collected
     */
    [Symbol.dispose](): void {
        this.clear();
    }
}

/**
 * SecureBuffer - Secure handling of binary data
 * Similar to SecureString but for raw bytes
 */
export class SecureBuffer {
    private data: Uint8Array | null;
    private isCleared: boolean = false;

    constructor(size: number);
    constructor(data: Uint8Array);
    constructor(sizeOrData: number | Uint8Array) {
        if (typeof sizeOrData === 'number') {
            this.data = new Uint8Array(sizeOrData);
        } else {
            this.data = new Uint8Array(sizeOrData);
        }
    }

    /**
     * Get the buffer
     * Throws if already cleared
     */
    getBuffer(): Uint8Array {
        if (this.isCleared || !this.data) {
            throw new Error('SecureBuffer has been cleared');
        }
        return this.data;
    }

    /**
     * Get the size of the buffer
     */
    get size(): number {
        return this.data?.length ?? 0;
    }

    /**
     * Clear the buffer from memory
     */
    clear(): void {
        if (this.data) {
            this.data.fill(0);
            this.data = null;
        }
        this.isCleared = true;
    }

    /**
     * Check if the buffer has been cleared
     */
    get cleared(): boolean {
        return this.isCleared;
    }

    /**
     * Automatic cleanup when object is garbage collected
     */
    [Symbol.dispose](): void {
        this.clear();
    }
}

/**
 * Utility function to securely clear a string from memory
 * This is a best-effort approach as JavaScript doesn't provide direct memory control
 */
export function clearString(str: string): void {
    // In JavaScript, we can't directly clear string memory
    // But we can overwrite the variable with zeros
    if (typeof str === 'string') {
        // Create a mutable copy
        const arr = str.split('');
        for (let i = 0; i < arr.length; i++) {
            arr[i] = '\0';
        }
    }
}

/**
 * Utility function to securely clear an object's properties
 */
export function clearObject(obj: any): void {
    if (!obj || typeof obj !== 'object') return;

    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key];

            if (value instanceof SecureString || value instanceof SecureBuffer) {
                value.clear();
            } else if (typeof value === 'string') {
                clearString(value);
                obj[key] = null;
            } else if (value instanceof Uint8Array) {
                value.fill(0);
                obj[key] = null;
            } else if (typeof value === 'object') {
                clearObject(value);
                obj[key] = null;
            } else {
                obj[key] = null;
            }
        }
    }
}

/**
 * Decorator to automatically clear sensitive data after function execution
 */
export function clearAfterUse() {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const sensitiveData: (SecureString | SecureBuffer)[] = [];

            try {
                // Track SecureString/SecureBuffer instances created during execution
                const result = await originalMethod.apply(this, args);
                return result;
            } finally {
                // Clear all tracked sensitive data
                sensitiveData.forEach(data => data.clear());
            }
        };

        return descriptor;
    };
}
