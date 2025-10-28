import { Server, Socket } from 'socket.io';
import { verifyToken } from '../utils/auth';

interface ChatSession {
  id: string;
  userId: string;
  socketId: string;
  agentId?: string;
  status: 'waiting' | 'active' | 'closed';
  createdAt: Date;
}

class LiveChatSocketService {
  private sessions: Map<string, ChatSession> = new Map();
  private userSockets: Map<string, string> = new Map();

  initialize(io: Server): void {
    io.on('connection', async (socket: Socket) => {
      try {
        const token = socket.handshake.auth.token;
        const user = await verifyToken(token);
        
        if (!user) {
          socket.disconnect();
          return;
        }

        this.userSockets.set(user.id, socket.id);

        socket.on('initiate-chat', (data, callback) => {
          const sessionId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          const session: ChatSession = {
            id: sessionId,
            userId: user.id,
            socketId: socket.id,
            status: 'waiting',
            createdAt: new Date(),
          };

          this.sessions.set(sessionId, session);
          
          this.assignAgent(sessionId, io);

          callback({ success: true, sessionId });
        });

        socket.on('chat-message', (data) => {
          const { sessionId, content } = data;
          const session = this.sessions.get(sessionId);

          if (!session) return;

          const message = {
            id: `msg-${Date.now()}`,
            sessionId,
            sender: 'user',
            content,
            timestamp: new Date(),
          };

          if (session.agentId) {
            const agentSocketId = this.userSockets.get(session.agentId);
            if (agentSocketId) {
              io.to(agentSocketId).emit('chat-message', message);
            }
          }

          socket.emit('chat-message', message);
        });

        socket.on('disconnect', () => {
          this.userSockets.delete(user.id);
          
          for (const [sessionId, session] of this.sessions.entries()) {
            if (session.socketId === socket.id) {
              session.status = 'closed';
            }
          }
        });
      } catch (error) {
        socket.disconnect();
      }
    });
  }

  private async assignAgent(sessionId: string, io: Server): Promise<void> {
    setTimeout(() => {
      const session = this.sessions.get(sessionId);
      if (!session || session.status !== 'waiting') return;

      const agentId = 'agent-001';
      session.agentId = agentId;
      session.status = 'active';

      const userSocketId = session.socketId;
      io.to(userSocketId).emit('agent-joined', 'Support Agent');

      const welcomeMessage = {
        id: `msg-${Date.now()}`,
        sessionId,
        sender: 'agent',
        content: 'Hello! How can I help you with LDAO tokens today?',
        timestamp: new Date(),
      };

      io.to(userSocketId).emit('chat-message', welcomeMessage);
    }, 2000);
  }
}

export const liveChatSocketService = new LiveChatSocketService();
