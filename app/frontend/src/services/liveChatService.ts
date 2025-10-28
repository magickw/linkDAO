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
      const url = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      
      this.socket = io(url, {
        auth: { token },
        transports: ['websocket'],
      });

      this.socket.on('connect', () => {
        this.socket?.emit('initiate-chat', {}, (response: any) => {
          if (response.success) {
            this.sessionId = response.sessionId;
            resolve(response.sessionId);
          } else {
            reject(new Error('Failed to initiate chat'));
          }
        });
      });

      this.socket.on('connect_error', (error) => {
        reject(error);
      });
    });
  }

  sendMessage(content: string): void {
    if (!this.socket || !this.sessionId) {
      throw new Error('Not connected to chat');
    }

    this.socket.emit('chat-message', {
      sessionId: this.sessionId,
      content,
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

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.sessionId = null;
  }
}

export const liveChatService = new LiveChatService();
