/**
 * WebSocket Service
 * Real-time updates for posts, messages, and notifications
 */

import { io, Socket } from 'socket.io-client';
import { ENV } from '../constants';

type WebSocketEvent =
  | 'connected'
  | 'disconnected'
  | 'new_post'
  | 'post_updated'
  | 'post_deleted'
  | 'new_message'
  | 'message_read'
  | 'typing_start'
  | 'typing_stop'
  | 'notification'
  | 'error';

type EventHandler = (data: any) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventListeners: Map<WebSocketEvent, Set<EventHandler>> = new Map();
  private isConnecting = false;

  /**
   * Connect to WebSocket server
   */
  connect(token: string): void {
    if (this.socket?.connected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      this.socket = io(ENV.WS_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this.setupEventHandlers();
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.isConnecting = false;
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.emit('connected', { socketId: this.socket?.id });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.emit('disconnected', { reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.isConnecting = false;
      this.reconnectAttempts++;

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.connect(this.getStoredToken());
        }, this.reconnectDelay * this.reconnectAttempts);
      }
    });

    // Post events
    this.socket.on('new_post', (data) => {
      this.emit('new_post', data);
    });

    this.socket.on('post_updated', (data) => {
      this.emit('post_updated', data);
    });

    this.socket.on('post_deleted', (data) => {
      this.emit('post_deleted', data);
    });

    // Message events
    this.socket.on('new_message', (data) => {
      this.emit('new_message', data);
    });

    this.socket.on('message_read', (data) => {
      this.emit('message_read', data);
    });

    this.socket.on('typing_start', (data) => {
      this.emit('typing_start', data);
    });

    this.socket.on('typing_stop', (data) => {
      this.emit('typing_stop', data);
    });

    // Notification events
    this.socket.on('notification', (data) => {
      this.emit('notification', data);
    });

    this.socket.on('error', (error) => {
      this.emit('error', error);
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
  }

  /**
   * Subscribe to event
   */
  on(event: WebSocketEvent, handler: EventHandler): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.off(event, handler);
    };
  }

  /**
   * Unsubscribe from event
   */
  off(event: WebSocketEvent, handler: EventHandler): void {
    this.eventListeners.get(event)?.delete(handler);
  }

  /**
   * Emit event to listeners
   */
  private emit(event: WebSocketEvent, data: any): void {
    this.eventListeners.get(event)?.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in ${event} handler:`, error);
      }
    });
  }

  /**
   * Send event to server
   */
  send(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected, cannot send event:', event);
    }
  }

  /**
   * Join a room
   */
  joinRoom(room: string): void {
    this.send('join_room', { room });
  }

  /**
   * Leave a room
   */
  leaveRoom(room: string): void {
    this.send('leave_room', { room });
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get stored token
   */
  private getStoredToken(): string {
    // This should get the token from AsyncStorage
    // For now, return empty string
    return '';
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();