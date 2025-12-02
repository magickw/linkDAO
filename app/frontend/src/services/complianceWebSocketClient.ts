/**
 * Frontend WebSocket Client for Real-time Compliance Monitoring
 * 
 * Provides real-time updates for compliance monitoring dashboard,
 * including live alerts, metrics updates, and violation notifications.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface ComplianceUpdate {
  type: 'compliance_alert' | 'score_update' | 'violation_detected' | 'system_status' | 'dashboard_updated';
  timestamp: Date;
  data: any;
}

export interface ComplianceAlert {
  id: string;
  type: 'violation' | 'score_change' | 'threshold_breach' | 'policy_update';
  severity: 'low' | 'medium' | 'high' | 'critical';
  sellerId: string;
  sellerName: string;
  timestamp: Date;
  message: string;
  details: any;
  requiresAction: boolean;
  actionDeadline?: Date;
  acknowledged?: boolean;
  resolved?: boolean;
}

export interface ComplianceMetrics {
  timestamp: Date;
  totalSellers: number;
  activeSellers: number;
  averageComplianceScore: number;
  criticalViolations: number;
  highViolations: number;
  mediumViolations: number;
  lowViolations: number;
  pendingAlerts: number;
  acknowledgedAlerts: number;
  resolvedToday: number;
  processingTimeCompliance: number;
  approvalRateCompliance: number;
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

class ComplianceWebSocketClient {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isDestroyed = false;
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();
  private connectionCallbacks: Set<(connected: boolean) => void> = new Set();

  constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url || `ws://localhost:8080/compliance-monitoring`,
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000
    };
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
        resolve();
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          console.log('Compliance WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.notifyConnectionCallbacks(true);
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          console.log('Compliance WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.stopHeartbeat();
          this.notifyConnectionCallbacks(false);
          
          if (!this.isDestroyed && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('Compliance WebSocket error:', error);
          this.isConnecting = false;
          if (this.reconnectAttempts === 0) {
            reject(error);
          }
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isDestroyed = true;
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Subscribe to specific message types
   */
  subscribe(messageType: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(messageType)) {
      this.subscribers.set(messageType, new Set());
    }
    
    this.subscribers.get(messageType)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(messageType);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(messageType);
        }
      }
    };
  }

  /**
   * Add connection status callback
   */
  onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.connectionCallbacks.add(callback);
    
    return () => {
      this.connectionCallbacks.delete(callback);
    };
  }

  /**
   * Send message to server
   */
  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  /**
   * Authenticate with server
   */
  authenticate(userId: string, permissions: string[]): void {
    this.send({
      type: 'authenticate',
      userId,
      permissions
    });
  }

  /**
   * Subscribe to seller compliance updates
   */
  subscribeToSeller(sellerId: string): void {
    this.send({
      type: 'subscribe_seller',
      sellerId
    });
  }

  /**
   * Unsubscribe from seller compliance updates
   */
  unsubscribeFromSeller(sellerId: string): void {
    this.send({
      type: 'unsubscribe_seller',
      sellerId
    });
  }

  /**
   * Request compliance snapshot for seller
   */
  requestComplianceSnapshot(sellerId: string): void {
    this.send({
      type: 'get_compliance_snapshot',
      sellerId
    });
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data.toString());
      
      // Handle connection messages
      if (message.type === 'connection_established') {
        console.log('Connection established with client ID:', message.clientId);
        return;
      }

      if (message.type === 'ping') {
        this.send({ type: 'pong', timestamp: new Date() });
        return;
      }

      // Notify subscribers
      const subscribers = this.subscribers.get(message.type);
      if (subscribers) {
        subscribers.forEach(callback => {
          try {
            callback(message);
          } catch (error) {
            console.error('Error in subscriber callback:', error);
          }
        });
      }

      // Handle general compliance updates
      if (message.type === 'compliance_alert' || 
          message.type === 'score_update' || 
          message.type === 'violation_detected') {
        const generalSubscribers = this.subscribers.get('compliance_update');
        if (generalSubscribers) {
          generalSubscribers.forEach(callback => {
            try {
              callback(message);
            } catch (error) {
              console.error('Error in general subscriber callback:', error);
            }
          });
        }
      }

    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect(): void {
    setTimeout(() => {
      if (!this.isDestroyed) {
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }
    }, this.config.reconnectInterval);
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', timestamp: new Date() });
      }
    }, this.config.heartbeatInterval);
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
   * Notify connection callbacks
   */
  private notifyConnectionCallbacks(connected: boolean): void {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback(connected);
      } catch (error) {
        console.error('Error in connection callback:', error);
      }
    });
  }

  /**
   * Get connection status
   */
  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// React Hook for using the compliance WebSocket client
export function useComplianceWebSocket(config?: Partial<WebSocketConfig>) {
  const clientRef = useRef<ComplianceWebSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize client
  useEffect(() => {
    const client = new ComplianceWebSocketClient({
      url: `ws://${window.location.hostname}:8080/compliance-monitoring`,
      ...config
    });
    
    clientRef.current = client;

    // Set up connection monitoring
    const unsubscribeConnection = client.onConnectionChange((connected) => {
      setIsConnected(connected);
      if (connected) {
        setError(null);
      }
    });

    // Connect to server
    client.connect().catch(error => {
      setError(`Failed to connect: ${error.message}`);
    });

    return () => {
      unsubscribeConnection();
      client.disconnect();
    };
  }, []);

  // Subscribe to compliance updates
  const subscribeToCompliance = useCallback((
    callback: (update: ComplianceUpdate) => void
  ) => {
    if (!clientRef.current) return () => {};

    return clientRef.current.subscribe('compliance_update', (message) => {
      setLastUpdate(new Date());
      callback({
        type: message.type,
        timestamp: new Date(message.timestamp),
        data: message.data
      });
    });
  }, []);

  // Subscribe to alerts
  const subscribeToAlerts = useCallback((
    callback: (alert: ComplianceAlert) => void
  ) => {
    if (!clientRef.current) return () => {};

    return clientRef.current.subscribe('compliance_alert', (message) => {
      setLastUpdate(new Date());
      callback(message.data);
    });
  }, []);

  // Subscribe to seller updates
  const subscribeToSeller = useCallback((
    sellerId: string,
    callback: (data: any) => void
  ) => {
    if (!clientRef.current) return () => {};

    // Subscribe to seller-specific messages
    const unsubscribe1 = clientRef.current.subscribe(`seller_${sellerId}`, callback);
    
    // Subscribe to compliance snapshots
    const unsubscribe2 = clientRef.current.subscribe('compliance_snapshot', (message) => {
      if (message.sellerId === sellerId) {
        callback(message.data);
      }
    });

    // Tell server we want updates for this seller
    clientRef.current.subscribeToSeller(sellerId);

    return () => {
      unsubscribe1();
      unsubscribe2();
      clientRef.current?.unsubscribeFromSeller(sellerId);
    };
  }, []);

  // Authenticate user
  const authenticate = useCallback((userId: string, permissions: string[] = ['read_compliance']) => {
    if (clientRef.current) {
      clientRef.current.authenticate(userId, permissions);
    }
  }, []);

  // Request compliance snapshot
  const requestSnapshot = useCallback((sellerId: string) => {
    if (clientRef.current) {
      clientRef.current.requestComplianceSnapshot(sellerId);
    }
  }, []);

  return {
    isConnected,
    lastUpdate,
    error,
    subscribeToCompliance,
    subscribeToAlerts,
    subscribeToSeller,
    authenticate,
    requestSnapshot
  };
}

export default ComplianceWebSocketClient;