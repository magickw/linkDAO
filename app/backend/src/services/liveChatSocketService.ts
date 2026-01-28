import { messagingService } from './messagingService';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../utils/auth';

// Reuse ChatSession and ChatMessage interfaces but update them to reflect that persistence is handled by DB
interface ChatSession {
  id: string; // This will now correspond to a conversation ID in the DB
  userId: string;
  userSocketId: string;
  agentId?: string;
  agentSocketId?: string;
  status: 'waiting' | 'active' | 'closed';
  createdAt: Date;
  messages: ChatMessage[]; // Kept for in-memory cache/quick access, but primary source is DB
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

        socket.on('initiate-chat', async (data, callback) => {
          // PERSISTENCE CHANGE: Start a conversation in the DB
          // We use a special conversation type 'support' or rely on metadata
          // For now, we'll start a regular conversation but track it in memory as a live chat
          // Ideally, we'd have a 'support' type in startConversation
          
          try {
            // Create a support conversation using the messaging service
            // We use a predefined system support user address or a dedicated support pool
            // For MVP, we can treat it as a conversation where the 'participant' is initially unassigned or a bot
            // Here, we'll create it and then when an agent accepts, we add them.
            
            // To make this work with MessagingService's startConversation which expects 2 participants,
            // we might need to adjust MessagingService or create a temporary "holding" conversation.
            // A simpler approach for the DB migration:
            // 1. Create conversation with just the user (if allowed) or a placeholder support bot address.
            
            const supportBotAddress = process.env.SUPPORT_BOT_ADDRESS || '0x0000000000000000000000000000000000000000'; // Placeholder
            
            const conversationResult = await messagingService.startConversation({
              initiatorAddress: user.walletAddress,
              participantAddress: supportBotAddress, // Placeholder until agent joins
              initialMessage: "Support session started",
              conversationType: 'support' // Assuming MessagingService handles this or just treats as metadata
            });

            if (!conversationResult.success || !conversationResult.data) {
               callback({ success: false, error: 'Failed to start support session' });
               return;
            }

            const sessionId = conversationResult.data.id;
            
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
          } catch (err) {
            console.error("Error initiating chat:", err);
            callback({ success: false, error: 'Internal server error' });
          }
        });

        socket.on('chat-message', async (data, callback) => {
          const { sessionId, content } = data;
          const session = this.sessions.get(sessionId);

          if (!session) {
            callback?.({ success: false, error: 'Session not found' });
            return;
          }

          // PERSISTENCE CHANGE: Save message to DB
          try {
            await messagingService.sendMessage({
              conversationId: sessionId,
              fromAddress: user.walletAddress,
              content: content,
              contentType: 'text',
              attachments: []
            });

            const message: ChatMessage = {
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // In real app, get ID from DB result
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
          } catch (err) {
             console.error("Error sending message:", err);
             callback?.({ success: false, error: 'Failed to save message' });
          }
        });

        socket.on('disconnect', () => {
          this.userSockets.delete(user.id);
          
          for (const [sessionId, session] of this.sessions.entries()) {
            if (session.userSocketId === socket.id) {
              session.status = 'closed'; // Or 'disconnected' - keeping closed for simplicity
              
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

        socket.on('accept-session', async (data) => {
          const { sessionId } = data;
          const session = this.sessions.get(sessionId);
          
          if (!session || session.status !== 'waiting') {
            socket.emit('error', { message: 'Session not available' });
            return;
          }

          // PERSISTENCE CHANGE: Add agent to the conversation participants in DB
          try {
             await messagingService.addParticipant({
               conversationId: sessionId,
               adderAddress: process.env.ADMIN_ADDRESS || user.walletAddress, // Admin adds themselves or system adds
               newParticipantAddress: user.walletAddress,
               role: 'admin'
             });
          } catch (err) {
             console.error("Error adding agent to conversation:", err);
             // Proceed anyway for live session logic, but log error
          }

          session.agentId = user.id;
          session.agentSocketId = socket.id;
          session.status = 'active';
          agent.activeSessions.push(sessionId);
          agent.status = 'busy';

          userNamespace.to(session.userSocketId).emit('agent-joined', agent.name);

          // PERSISTENCE CHANGE: Load history from DB instead of memory
          // We can use messagingService.getConversationMessages to populate session.messages if needed
          // For now, we trust the session.messages (in-memory) but in a full restart scenario,
          // we should reload them here.
          const history = await messagingService.getConversationMessages({
             conversationId: sessionId,
             userAddress: user.walletAddress,
             page: 1,
             limit: 50
          });
          
          let historyMessages: ChatMessage[] = [];
          if (history.success && history.data) {
             historyMessages = history.data.messages.map((m: any) => ({
                id: m.id,
                sessionId: m.conversationId,
                sender: m.senderAddress === user.walletAddress ? 'agent' : 'user', // Simplified logic
                content: m.content,
                timestamp: new Date(m.sentAt)
             })).reverse(); // Oldest first
          }

          socket.emit('session-accepted', {
            sessionId,
            userId: session.userId,
            messages: historyMessages.length > 0 ? historyMessages : session.messages
          });
        });

        socket.on('chat-message', async (data, callback) => {
          const { sessionId, content } = data;
          const session = this.sessions.get(sessionId);

          if (!session || session.agentId !== user.id) {
            callback?.({ success: false, error: 'Invalid session' });
            return;
          }

          // PERSISTENCE CHANGE: Save to DB
          try {
            await messagingService.sendMessage({
              conversationId: sessionId,
              fromAddress: user.walletAddress,
              content: content,
              contentType: 'text',
              attachments: []
            });

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
          } catch (err) {
             console.error("Error sending agent message:", err);
             callback?.({ success: false, error: 'Failed to save message' });
          }
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