import { io, Socket } from 'socket.io-client';

// Get the backend URL from environment variables
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect() {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(BACKEND_URL, {
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.emit('connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      this.emit('disconnected');
    });

    // Listen for all custom events and emit them to local listeners
    this.socket.onAny((event, ...args) => {
      this.emit(event, ...args);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  register(address: string) {
    if (this.socket?.connected) {
      this.socket.emit('register', address);
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  off(event: string, callback: Function) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in WebSocket listener for event ${event}:`, error);
        }
      });
    }
  }

  send(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Export a singleton instance
export const webSocketService = new WebSocketService();