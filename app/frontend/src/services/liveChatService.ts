import { io, Socket } from 'socket.io-client';

export interface ChatMessage {
  id: string;
  sessionId: string;
  sender: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  userId: string;
  agentId?: string;
  status: 'waiting' | 'active' | 'closed';
  createdAt: Date;
}

class LiveChatService {
  private socket: Socket | null = null;
  private sessionId: string | null = null;

  connect(token: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';
      
      this.socket = io(`${baseUrl}/chat/user`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      this.socket.on('connect', () => {
        this.socket?.emit('initiate-chat', {}, (response: any) => {
          if (response?.success) {
            this.sessionId = response.sessionId;
            resolve(response.sessionId);
          } else {
            reject(new Error(response?.error || 'Failed to initiate chat'));
          }
        });
      });

      this.socket.on('connect_error', (error) => {
        console.error('Live chat connection error:', error);
        reject(new Error(`Connection failed: ${error.message}`));
      });

      this.socket.on('disconnect', (reason) => {
        console.warn('Live chat disconnected:', reason);
      });
    });
  }

  sendMessage(content: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.sessionId) {
        reject(new Error('Not connected to chat'));
        return;
      }

      if (!this.socket.connected) {
        reject(new Error('Socket disconnected'));
        return;
      }

      this.socket.emit('chat-message', {
        sessionId: this.sessionId,
        content,
      }, (response: any) => {
        if (response?.success) {
          resolve();
        } else {
          reject(new Error(response?.error || 'Failed to send message'));
        }
      });
    });
  }

  onMessage(callback: (message: ChatMessage) => void): void {
    this.socket?.on('chat-message', callback);
  }

  onTyping(callback: (isTyping: boolean) => void): void {
    this.socket?.on('agent-typing', callback);
  }

  onAgentJoined(callback: (agentName: string) => void): void {
    this.socket?.on('agent-joined', callback);
  }

  onWaitingForAgent(callback: (data: { position: number }) => void): void {
    this.socket?.on('waiting-for-agent', callback);
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.sessionId = null;
  }
}

export const liveChatService = new LiveChatService();