import { io, Socket } from 'socket.io-client';

interface CommunityUpdate {
  type: 'new_post' | 'vote_update' | 'member_joined' | 'member_left' | 'new_proposal';
  communityId: string;
  data: any;
}

class CommunityWebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  connect(communityId: string) {
    if (this.socket?.connected) return;

    this.socket = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001', {
      query: { communityId }
    });

    this.socket.on('community_update', (update: CommunityUpdate) => {
      const eventListeners = this.listeners.get(update.type);
      if (eventListeners) {
        eventListeners.forEach(listener => listener(update.data));
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribe(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  unsubscribe(event: string, callback: (data: any) => void) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }
}

export const communityWebSocket = new CommunityWebSocketService();