/**
 * WebSocket Connection Manager
 * Handles WebSocket connections with automatic reconnection, heartbeat, and fallback mechanisms
 */

import { webSocketAuthService } from '../webSocketAuthService';

type WebSocketConfig = {
  url: string;
  fallbackUrls?: string[];
  options?: {
    reconnectAttempts?: number;
    reconnectInterval?: number;
    heartbeatInterval?: number;
    responseTimeout?: number;
  };
};

type WebSocketState = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'FAILED';

export class WebSocketManager {
  private static instance: WebSocketManager;
  private socket: WebSocket | null = null;
  private state: WebSocketState = 'DISCONNECTED';
  private reconnectAttempt = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private currentUrl: string;
  private fallbackUrls: string[] = [];
  private currentUrlIndex = 0;
  private messageQueue: any[] = [];
  private connectionId: string;
  private readonly options: Required<WebSocketConfig['options']>;

  private constructor(config: WebSocketConfig) {
    this.currentUrl = config.url;
    this.fallbackUrls = config.fallbackUrls || [];
    this.connectionId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.options = {
      reconnectAttempts: config.options?.reconnectAttempts || 10,
      reconnectInterval: config.options?.reconnectInterval || 1000,
      heartbeatInterval: config.options?.heartbeatInterval || 30000,
      responseTimeout: config.options?.responseTimeout || 5000
    };

    // Initialize offline storage for message queue
    this.initializeOfflineStorage();
  }

  static getInstance(config?: WebSocketConfig): WebSocketManager {
    if (!WebSocketManager.instance && config) {
      WebSocketManager.instance = new WebSocketManager(config);
    }
    return WebSocketManager.instance;
  }

  private initializeOfflineStorage() {
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      const storedMessages = localStorage.getItem('wsMessageQueue');
      if (storedMessages) {
        try {
          this.messageQueue = JSON.parse(storedMessages);
        } catch (e) {
          console.error('Failed to parse stored messages:', e);
          this.messageQueue = [];
        }
      }
    }
  }

  private saveMessageQueue() {
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      localStorage.setItem('wsMessageQueue', JSON.stringify(this.messageQueue));
    }
  }

  private async connect(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.state = 'CONNECTING';
        this.socket = new WebSocket(this.currentUrl);

        this.socket.onopen = async () => {
          this.state = 'CONNECTED';
          this.reconnectAttempt = 0;

          // Authenticate the connection
          const isAuthenticated = await webSocketAuthService.authenticate(this.connectionId);
          if (isAuthenticated) {
            const authMessage = webSocketAuthService.createAuthMessage(this.connectionId);
            if (authMessage) {
              this.socket?.send(JSON.stringify(authMessage));
            }
            this.startHeartbeat();
            this.processMessageQueue();
          } else {
            console.error('WebSocket authentication failed');
            this.handleDisconnection();
            reject(new Error('Authentication failed'));
          }
        };

        this.socket.onclose = () => {
          this.handleDisconnection();
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.handleDisconnection();
          reject(error);
        };

        this.socket.onmessage = this.handleMessage.bind(this);

      } catch (error) {
        console.error('Failed to establish WebSocket connection:', error);
        this.handleDisconnection();
        reject(error);
      }
    });
  }

  private handleDisconnection() {
    this.state = 'DISCONNECTED';
    this.stopHeartbeat();
    
    if (this.reconnectAttempt < this.options.reconnectAttempts) {
      this.state = 'RECONNECTING';
      this.reconnectAttempt++;

      // Try fallback URLs if available
      if (this.fallbackUrls.length > 0) {
        this.currentUrlIndex = (this.currentUrlIndex + 1) % (this.fallbackUrls.length + 1);
        this.currentUrl = this.currentUrlIndex === 0 ? 
          this.currentUrl : 
          this.fallbackUrls[this.currentUrlIndex - 1];
      }

      const delay = Math.min(
        this.options.reconnectInterval * Math.pow(1.5, this.reconnectAttempt - 1),
        30000
      );

      this.reconnectTimeout = setTimeout(() => {
        this.connect().catch(() => {
          console.warn(`Reconnection attempt ${this.reconnectAttempt} failed`);
        });
      }, delay);
    } else {
      this.state = 'FAILED';
      this.enablePollingFallback();
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, this.options.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);

      // Handle heartbeat response
      if (data.type === 'pong') {
        return;
      }

      // Validate message from authenticated connection
      if (!webSocketAuthService.validateMessage(data, this.connectionId)) {
        console.error('Invalid or unauthorized WebSocket message:', data);
        return;
      }

      // Check rate limit
      if (!webSocketAuthService.checkRateLimit(this.connectionId)) {
        console.error('WebSocket rate limit exceeded');
        return;
      }

      // Handle other message types
      this.emit('message', data);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message).catch(() => {
        this.messageQueue.unshift(message);
      });
    }
    this.saveMessageQueue();
  }

  private enablePollingFallback() {
    console.log('WebSocket connection failed, switching to polling fallback');
    // Implement polling logic here
  }

  public async send(message: any): Promise<void> {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      this.messageQueue.push(message);
      this.saveMessageQueue();
      if (this.state !== 'CONNECTING' && this.state !== 'RECONNECTING') {
        await this.connect();
      }
      return;
    }

    try {
      this.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send message:', error);
      this.messageQueue.push(message);
      this.saveMessageQueue();
      throw error;
    }
  }

  private listeners: { [key: string]: Function[] } = {};

  public on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners[event] || [];
    callbacks.forEach(callback => callback(data));
  }

  public getState(): WebSocketState {
    return this.state;
  }

  public async disconnect(): Promise<void> {
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.socket) {
      this.socket.close();
    }
    this.state = 'DISCONNECTED';
  }
}

export default WebSocketManager;