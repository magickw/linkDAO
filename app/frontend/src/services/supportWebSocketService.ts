/**
 * WebSocket Service for Real-time Support Analytics Updates
 * Provides live updates for tickets, metrics, and agent performance
 */

export interface WebSocketMessage {
  type: 'ticket_created' | 'ticket_updated' | 'ticket_resolved' | 'metric_update' | 'agent_update';
  data: any;
  timestamp: string;
}

export type WebSocketCallback = (message: WebSocketMessage) => void;

class SupportWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 3000;
  private callbacks: Map<string, Set<WebSocketCallback>> = new Map();
  private isConnecting: boolean = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Initialize on client side only
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;

    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws/support';
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.notifyCallbacks('connection', { status: 'connected' });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnecting = false;
        this.stopHeartbeat();
        this.notifyCallbacks('connection', { status: 'disconnected' });
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.reconnectAttempts = 0;
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(message: WebSocketMessage): void {
    const callbacks = this.callbacks.get(message.type);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(message);
        } catch (error) {
          console.error('Error in WebSocket callback:', error);
        }
      });
    }

    // Also notify wildcard listeners
    const wildcardCallbacks = this.callbacks.get('*');
    if (wildcardCallbacks) {
      wildcardCallbacks.forEach(callback => {
        try {
          callback(message);
        } catch (error) {
          console.error('Error in WebSocket wildcard callback:', error);
        }
      });
    }
  }

  /**
   * Notify callbacks for a specific event
   */
  private notifyCallbacks(type: string, data: any): void {
    const callbacks = this.callbacks.get(type);
    if (callbacks) {
      const message: WebSocketMessage = {
        type: type as any,
        data,
        timestamp: new Date().toISOString()
      };

      callbacks.forEach(callback => {
        try {
          callback(message);
        } catch (error) {
          console.error('Error in callback notification:', error);
        }
      });
    }
  }

  /**
   * Subscribe to WebSocket messages
   */
  subscribe(type: string | '*', callback: WebSocketCallback): () => void {
    if (!this.callbacks.has(type)) {
      this.callbacks.set(type, new Set());
    }

    this.callbacks.get(type)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.callbacks.get(type);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.callbacks.delete(type);
        }
      }
    };
  }

  /**
   * Send message to WebSocket server
   */
  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Subscribe to ticket events
   */
  subscribeToTickets(callback: WebSocketCallback): () => void {
    const unsubscribeCreated = this.subscribe('ticket_created', callback);
    const unsubscribeUpdated = this.subscribe('ticket_updated', callback);
    const unsubscribeResolved = this.subscribe('ticket_resolved', callback);

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeResolved();
    };
  }

  /**
   * Subscribe to metric updates
   */
  subscribeToMetrics(callback: WebSocketCallback): () => void {
    return this.subscribe('metric_update', callback);
  }

  /**
   * Subscribe to agent updates
   */
  subscribeToAgents(callback: WebSocketCallback): () => void {
    return this.subscribe('agent_update', callback);
  }
}

// Export singleton instance
export const supportWebSocketService = new SupportWebSocketService();
