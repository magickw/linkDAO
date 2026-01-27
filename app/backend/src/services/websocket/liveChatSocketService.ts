import { Server, Socket } from 'socket.io';
import { verifyToken } from '../../utils/auth';

interface ChatSession {
  id: string;
  userId: string;
  userSocketId: string;
  agentId?: string;
  agentSocketId?: string;
  status: 'waiting' | 'active' | 'closed';
  createdAt: Date;
  messages: ChatMessage[];
}

interface ChatMessage {
  id: string;
  sessionId: string;
  sender: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

interface Agent {
  id: string;
  socketId: string;
  name: string;
  status: 'available' | 'busy' | 'offline';
  activeSessions: string[];
}

class LiveChatSocketService {
  private sessions: Map<string, ChatSession> = new Map();
  private userSockets: Map<string, string> = new Map();
  private agents: Map<string, Agent> = new Map();
  private agentSockets: Map<string, string> = new Map();

  initialize(io: Server): void {
    const userNamespace = io.of('/chat/user');
    const agentNamespace = io.of('/chat/agent');

    userNamespace.on('connection', async (socket: Socket) => {
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
            userSocketId: socket.id,
            status: 'waiting',
            createdAt: new Date(),
            messages: [],
          };

          this.sessions.set(sessionId, session);
          
          this.assignAgent(sessionId, userNamespace, agentNamespace);

          callback({ success: true, sessionId });
        });

        socket.on('chat-message', (data, callback) => {
          const { sessionId, content } = data;
          const session = this.sessions.get(sessionId);

          if (!session) {
            callback?.({ success: false, error: 'Session not found' });
            return;
          }

          const message: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            sessionId,
            sender: 'user',
            content,
            timestamp: new Date(),
          };

          session.messages.push(message);

          if (session.agentSocketId) {
            agentNamespace.to(session.agentSocketId).emit('chat-message', message);
          }

          callback?.({ success: true });
        });

        socket.on('disconnect', () => {
          this.userSockets.delete(user.id);
          
          for (const [sessionId, session] of this.sessions.entries()) {
            if (session.userSocketId === socket.id) {
              session.status = 'closed';
              
              if (session.agentSocketId) {
                agentNamespace.to(session.agentSocketId).emit('session-closed', { sessionId });
              }
            }
          }
        });
      } catch (error) {
        socket.disconnect();
      }
    });

    agentNamespace.on('connection', async (socket: Socket) => {
      try {
        const token = socket.handshake.auth.token;
        const user = await verifyToken(token);
        
        if (!user || (user.role !== 'admin' && user.role !== 'support')) {
          socket.disconnect();
          return;
        }

        const agent: Agent = {
          id: user.id,
          socketId: socket.id,
          name: user.name || 'Support Agent',
          status: 'available',
          activeSessions: [],
        };

        this.agents.set(user.id, agent);
        this.agentSockets.set(user.id, socket.id);

        const waitingSessions = Array.from(this.sessions.values())
          .filter(s => s.status === 'waiting')
          .map(s => ({
            id: s.id,
            userId: s.userId,
            createdAt: s.createdAt,
            messageCount: s.messages.length
          }));

        socket.emit('waiting-sessions', waitingSessions);

        socket.on('accept-session', (data) => {
          const { sessionId } = data;
          const session = this.sessions.get(sessionId);
          
          if (!session || session.status !== 'waiting') {
            socket.emit('error', { message: 'Session not available' });
            return;
          }

          session.agentId = user.id;
          session.agentSocketId = socket.id;
          session.status = 'active';
          agent.activeSessions.push(sessionId);
          agent.status = 'busy';

          userNamespace.to(session.userSocketId).emit('agent-joined', agent.name);

          socket.emit('session-accepted', {
            sessionId,
            userId: session.userId,
            messages: session.messages
          });
        });

        socket.on('chat-message', (data, callback) => {
          const { sessionId, content } = data;
          const session = this.sessions.get(sessionId);

          if (!session || session.agentId !== user.id) {
            callback?.({ success: false, error: 'Invalid session' });
            return;
          }

          const message: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            sessionId,
            sender: 'agent',
            content,
            timestamp: new Date(),
          };

          session.messages.push(message);

          userNamespace.to(session.userSocketId).emit('chat-message', message);

          callback?.({ success: true });
        });

        socket.on('typing', (data) => {
          const { sessionId, isTyping } = data;
          const session = this.sessions.get(sessionId);

          if (session && session.agentId === user.id) {
            userNamespace.to(session.userSocketId).emit('agent-typing', isTyping);
          }
        });

        socket.on('close-session', (data) => {
          const { sessionId } = data;
          const session = this.sessions.get(sessionId);

          if (session && session.agentId === user.id) {
            session.status = 'closed';
            agent.activeSessions = agent.activeSessions.filter(id => id !== sessionId);
            
            if (agent.activeSessions.length === 0) {
              agent.status = 'available';
            }

            userNamespace.to(session.userSocketId).emit('session-closed', { sessionId });
          }
        });

        socket.on('disconnect', () => {
          this.agents.delete(user.id);
          this.agentSockets.delete(user.id);

          agent.activeSessions.forEach(sessionId => {
            const session = this.sessions.get(sessionId);
            if (session) {
              session.status = 'waiting';
              session.agentId = undefined;
              session.agentSocketId = undefined;
              
              this.assignAgent(sessionId, userNamespace, agentNamespace);
            }
          });
        });
      } catch (error) {
        socket.disconnect();
      }
    });
  }

  private async assignAgent(sessionId: string, userNamespace: any, agentNamespace: any): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'waiting') return;

    const availableAgents = Array.from(this.agents.values())
      .filter(agent => agent.status === 'available');

    if (availableAgents.length > 0) {
      const agent = availableAgents[0];
      
      agentNamespace.to(agent.socketId).emit('new-session', {
        id: session.id,
        userId: session.userId,
        createdAt: session.createdAt,
        messageCount: session.messages.length
      });
    } else {
      userNamespace.to(session.userSocketId).emit('waiting-for-agent', {
        position: Array.from(this.sessions.values()).filter(s => s.status === 'waiting').length
      });
    }
  }

  getActiveSessions(): ChatSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status !== 'closed');
  }

  getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }
}

export const liveChatSocketService = new LiveChatSocketService();
