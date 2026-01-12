/**
 * WebSocket Security Module
 * Enforces WSS connections and validates WebSocket messages
 */

export interface WebSocketSecurityConfig {
    enforceWSS: boolean;
    allowedOrigins: string[];
    maxMessageSize: number;
    heartbeatInterval: number;
    reconnectAttempts: number;
    reconnectDelay: number;
}

export interface SecureWebSocketMessage {
    type: string;
    payload: any;
    timestamp: number;
    signature?: string;
}

export class WebSocketSecurityService {
    private static readonly DEFAULT_CONFIG: WebSocketSecurityConfig = {
        enforceWSS: true,
        allowedOrigins: [
            'wss://api.linkdao.io',
            'wss://*.infura.io',
            'wss://*.alchemy.com',
        ],
        maxMessageSize: 1024 * 1024, // 1MB
        heartbeatInterval: 30000, // 30 seconds
        reconnectAttempts: 5,
        reconnectDelay: 1000, // 1 second
    };

    private config: WebSocketSecurityConfig;
    private ws: WebSocket | null = null;
    private heartbeatTimer: NodeJS.Timeout | null = null;
    private reconnectAttempt = 0;
    private messageHandlers: Map<string, (payload: any) => void> = new Map();

    constructor(config: Partial<WebSocketSecurityConfig> = {}) {
        this.config = { ...WebSocketSecurityService.DEFAULT_CONFIG, ...config };
    }

    /**
     * Connect to WebSocket server with security validation
     */
    async connect(url: string): Promise<void> {
        // Enforce WSS protocol
        if (this.config.enforceWSS && !url.startsWith('wss://')) {
            throw new Error('Only WSS (secure WebSocket) connections are allowed');
        }

        // Validate origin
        if (!this.isAllowedOrigin(url)) {
            throw new Error(`WebSocket origin not allowed: ${url}`);
        }

        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(url);

                this.ws.onopen = () => {
                    console.log('[WebSocketSecurity] Connected to:', url);
                    this.reconnectAttempt = 0;
                    this.startHeartbeat();
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(event);
                };

                this.ws.onerror = (error) => {
                    console.error('[WebSocketSecurity] Error:', error);
                    reject(error);
                };

                this.ws.onclose = () => {
                    console.log('[WebSocketSecurity] Connection closed');
                    this.stopHeartbeat();
                    this.attemptReconnect(url);
                };

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Send secure message
     */
    send(type: string, payload: any): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket is not connected');
        }

        const message: SecureWebSocketMessage = {
            type,
            payload,
            timestamp: Date.now(),
        };

        const messageStr = JSON.stringify(message);

        // Check message size
        if (messageStr.length > this.config.maxMessageSize) {
            throw new Error(`Message size exceeds maximum allowed (${this.config.maxMessageSize} bytes)`);
        }

        // Validate no sensitive data in message
        if (this.containsSensitiveData(payload)) {
            console.warn('[WebSocketSecurity] Warning: Message may contain sensitive data');
        }

        this.ws.send(messageStr);
    }

    /**
     * Register message handler
     */
    on(type: string, handler: (payload: any) => void): void {
        this.messageHandlers.set(type, handler);
    }

    /**
     * Unregister message handler
     */
    off(type: string): void {
        this.messageHandlers.delete(type);
    }

    /**
     * Disconnect WebSocket
     */
    disconnect(): void {
        this.stopHeartbeat();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Check if origin is allowed
     */
    private isAllowedOrigin(url: string): boolean {
        return this.config.allowedOrigins.some(origin => {
            // Support wildcard matching
            if (origin.includes('*')) {
                const pattern = origin.replace(/\*/g, '.*');
                const regex = new RegExp(`^${pattern}$`);
                return regex.test(url);
            }
            return url.startsWith(origin);
        });
    }

    /**
     * Handle incoming message
     */
    private handleMessage(event: MessageEvent): void {
        try {
            // Validate message size
            if (event.data.length > this.config.maxMessageSize) {
                console.error('[WebSocketSecurity] Message size exceeds maximum');
                return;
            }

            // Parse message
            const message: SecureWebSocketMessage = JSON.parse(event.data);

            // Validate message structure
            if (!this.isValidMessage(message)) {
                console.error('[WebSocketSecurity] Invalid message structure');
                return;
            }

            // Check for sensitive data
            if (this.containsSensitiveData(message.payload)) {
                console.warn('[WebSocketSecurity] Received message with potential sensitive data');
            }

            // Dispatch to handler
            const handler = this.messageHandlers.get(message.type);
            if (handler) {
                handler(message.payload);
            }

        } catch (error) {
            console.error('[WebSocketSecurity] Error handling message:', error);
        }
    }

    /**
     * Validate message structure
     */
    private isValidMessage(message: any): message is SecureWebSocketMessage {
        return (
            message &&
            typeof message.type === 'string' &&
            message.payload !== undefined &&
            typeof message.timestamp === 'number'
        );
    }

    /**
     * Check if payload contains sensitive data
     */
    private containsSensitiveData(payload: any): boolean {
        const sensitivePatterns = [
            /private.*key/i,
            /mnemonic/i,
            /seed.*phrase/i,
            /password/i,
            /0x[a-fA-F0-9]{64}/, // Private key pattern
        ];

        const payloadStr = JSON.stringify(payload).toLowerCase();
        return sensitivePatterns.some(pattern => pattern.test(payloadStr));
    }

    /**
     * Start heartbeat to keep connection alive
     */
    private startHeartbeat(): void {
        this.heartbeatTimer = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.send('ping', { timestamp: Date.now() });
            }
        }, this.config.heartbeatInterval);
    }

    /**
     * Stop heartbeat
     */
    private stopHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    /**
     * Attempt to reconnect
     */
    private attemptReconnect(url: string): void {
        if (this.reconnectAttempt >= this.config.reconnectAttempts) {
            console.error('[WebSocketSecurity] Max reconnect attempts reached');
            return;
        }

        this.reconnectAttempt++;
        const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempt - 1);

        console.log(`[WebSocketSecurity] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt}/${this.config.reconnectAttempts})`);

        setTimeout(() => {
            this.connect(url).catch(error => {
                console.error('[WebSocketSecurity] Reconnect failed:', error);
            });
        }, delay);
    }

    /**
     * Get connection status
     */
    get isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * Get connection state
     */
    get readyState(): number {
        return this.ws?.readyState ?? WebSocket.CLOSED;
    }
}
