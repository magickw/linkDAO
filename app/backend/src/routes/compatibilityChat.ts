import { Router, Request, Response } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { authMiddleware } from '../middleware/authMiddleware';
// Import Drizzle DB and table bindings for typed queries
import { db } from '../db';
import { conversations, chatMessages } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

// Minimal in-memory compatibility router for chat endpoints.
// Purpose: stop frontend 404s and provide JWT-protected stubs until DB-backed
// implementations are ready. Keep logic simple to avoid touching Drizzle/schema.

type Conversation = {
  id: string;
  participants: string[];
  last_message?: string | null;
  last_activity?: string | null;
  unread_count?: number;
  created_at: string;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_address: string;
  content: string;
  timestamp: string;
  edited_at?: string | null;
  deleted_at?: string | null;
};

const router = Router();

// Simple in-memory stores
const inMemoryConversations: Record<string, Conversation> = {};
const messages: Record<string, Message[]> = {};

// Optional runtime PostgreSQL client (useful when DATABASE_URL is set).
// We use dynamic require to avoid importing the Drizzle schema at compile time
// so TypeScript doesn't try to type-check the large schema file while we
// incrementally migrate to DB-backed implementations.
// Use Drizzle db when available. db will attempt to connect based on DATABASE_URL.
// If db is not usable at runtime, we'll fallback to in-memory stores.
let hasDb = true;
try {
  // sanity-check that db has a run/select method
  if (!db) hasDb = false;
} catch (err) {
  hasDb = false;
}

// Helpers
const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const nowIso = () => new Date().toISOString();

// Health check (no auth)
router.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, ts: nowIso() });
});

// List conversations (protected)
router.get('/api/chat/conversations', authMiddleware, async (_req: Request, res: Response) => {
  try {
    if (hasDb) {
      try {
        const rows = await db.select({
          id: conversations.id,
          title: conversations.title,
          subject: conversations.subject,
          participants: conversations.participants,
          lastMessageId: conversations.lastMessageId,
          lastActivity: conversations.lastActivity,
          unreadCount: conversations.unreadCount,
          createdAt: conversations.createdAt,
        }).from(conversations).orderBy(desc(conversations.lastActivity));

        safeLogger.info(`[compatibilityChat] Successfully fetched ${rows.length} conversations from DB`);
        return res.json({ conversations: rows });
      } catch (dbError) {
        safeLogger.error('[compatibilityChat] DB error fetching conversations', {
          error: dbError instanceof Error ? dbError.message : String(dbError),
          stack: dbError instanceof Error ? dbError.stack : undefined
        });
        // Fallback to in-memory on DB error
        const list = Object.values(inMemoryConversations).sort((a, b) => (b.last_activity || b.created_at).localeCompare(a.last_activity || a.created_at));
        safeLogger.info(`[compatibilityChat] Falling back to in-memory, returning ${list.length} conversations`);
        return res.json({ conversations: list });
      }
    }

    // No DB available, use in-memory
    const list = Object.values(inMemoryConversations).sort((a, b) => (b.last_activity || b.created_at).localeCompare(a.last_activity || a.created_at));
    safeLogger.info(`[compatibilityChat] No DB, returning ${list.length} in-memory conversations`);
    res.json({ conversations: list });
  } catch (error) {
    // Catch-all error handler
    safeLogger.error('[compatibilityChat] Unexpected error in conversations endpoint', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    // Return empty array rather than error to prevent frontend crashes
    res.json({ conversations: [] });
  }
});

// Also support /api/conversations as an alternate path
router.get('/api/conversations', authMiddleware, (_req: Request, res: Response) => {
  const list = Object.values(inMemoryConversations).sort((a, b) => (b.last_activity || b.created_at).localeCompare(a.last_activity || a.created_at));
  res.json({ conversations: list });
});

// Support additional alternate paths for conversations
router.get('/api/messages/conversations', authMiddleware, (_req: Request, res: Response) => {
  const list = Object.values(inMemoryConversations).sort((a, b) => (b.last_activity || b.created_at).localeCompare(a.last_activity || a.created_at));
  res.json({ conversations: list });
});

router.get('/api/messaging/conversations', authMiddleware, (_req: Request, res: Response) => {
  const list = Object.values(inMemoryConversations).sort((a, b) => (b.last_activity || b.created_at).localeCompare(a.last_activity || a.created_at));
  res.json({ conversations: list });
});

// POST endpoint for creating conversations (matches frontend expectation)
router.post('/api/messaging/conversations', csrfProtection, authMiddleware, async (req: Request, res: Response) => {
  const { participantAddress, initialMessage, conversationType } = req.body || {};

  if (!participantAddress) {
    return res.status(400).json({ error: 'participantAddress is required' });
  }

  // Get the authenticated user's address from the request
  const userAddress = (req as any).user?.address || (req as any).userId;

  if (!userAddress) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const participants = [userAddress, participantAddress];

  if (hasDb) {
    try {
      const inserted = await db.insert(conversations).values({
        title: null,
        subject: null,
        participants: participants,
        lastMessageId: null,
        lastActivity: new Date(),
        unreadCount: 0,
        createdAt: new Date(),
      }).returning();

      const created = inserted[0];

      // If initial message provided, send it
      if (initialMessage) {
        try {
          const msgInserted = await db.insert(chatMessages).values({
            conversationId: created.id,
            senderAddress: userAddress,
            content: initialMessage,
            sentAt: new Date(),
          }).returning();

          const msgCreated = msgInserted[0];

          // Update conversation with last message
          await db.update(conversations).set({
            lastMessageId: msgCreated.id,
            lastActivity: new Date(),
          }).where(eq(conversations.id, created.id));
        } catch (msgErr) {
          safeLogger.error('[compatibilityChat] Error creating initial message', msgErr);
        }
      }

      // ensure messages array exists in-memory for compatibility tooling
      messages[String(created.id)] = [];
      return res.status(201).json(created);
    } catch (err) {
      safeLogger.error('[compatibilityChat] DB error creating conversation', err);
      // fallback to in-memory
      const id = genId();
      const conversation: Conversation = {
        id,
        participants,
        last_message: initialMessage || null,
        last_activity: nowIso(),
        unread_count: 0,
        created_at: nowIso(),
      };
      inMemoryConversations[id] = conversation;
      messages[id] = [];
      return res.status(201).json(conversation);
    }
  }

  // No DB available, use in-memory
  const id = genId();
  const conversation: Conversation = {
    id,
    participants,
    last_message: initialMessage || null,
    last_activity: nowIso(),
    unread_count: 0,
    created_at: nowIso(),
  };
  inMemoryConversations[id] = conversation;
  messages[id] = [];
  res.status(201).json(conversation);
});

// Create a DM conversation
router.post('/api/chat/conversations/dm', csrfProtection, authMiddleware, async (req: Request, res: Response) => {
  const { participants } = req.body || {};
  if (!Array.isArray(participants) || participants.length === 0) {
    return res.status(400).json({ error: 'participants (string[]) required' });
  }

  if (hasDb) {
    try {
      const inserted = await db.insert(conversations).values({
        title: null,
        subject: null,
        participants: participants,
        lastMessageId: null,
        lastActivity: new Date(),
        unreadCount: 0,
        createdAt: new Date(),
      }).returning();

      const created = inserted[0];
      // ensure messages array exists in-memory for compatibility tooling
      messages[String(created.id)] = [];
      return res.status(201).json({ conversation: created });
    } catch (err) {
      safeLogger.error('[compatibilityChat] DB error creating conversation', err);
      // fallback to in-memory
      const id = genId();
      const conv: Conversation = {
        id,
        participants,
        last_message: null,
        last_activity: nowIso(),
        unread_count: 0,
        created_at: nowIso(),
      };
      inMemoryConversations[id] = conv;
      messages[id] = [];
      return res.status(201).json({ conversation: conv });
    }
  }

  const id = genId();
  const conv: Conversation = {
    id,
    participants,
    last_message: null,
    last_activity: nowIso(),
    unread_count: 0,
    created_at: nowIso(),
  };

  inMemoryConversations[id] = conv;
  messages[id] = [];

  res.status(201).json({ conversation: conv });
});

// Get chat history for a conversation (matches frontend expectation)
router.get('/api/messaging/conversations/:conversationId/messages', authMiddleware, async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  const before = req.query.before as string;
  const after = req.query.after as string;

  if (hasDb) {
    try {
      let query = db.select({
        id: chatMessages.id,
        conversationId: chatMessages.conversationId,
        senderAddress: chatMessages.senderAddress,
        content: chatMessages.content,
        sentAt: chatMessages.sentAt,
        editedAt: chatMessages.editedAt,
        deletedAt: chatMessages.deletedAt,
      }).from(chatMessages).where(eq(chatMessages.conversationId, conversationId));

      let msgs;
      // Apply pagination
      if (before) {
        msgs = await query.orderBy(desc(chatMessages.sentAt)).limit(limit);
      } else if (after) {
        // For 'after' cursor, we'd need to implement proper cursor pagination
        // For now, just order by sentAt
        msgs = await query.orderBy(desc(chatMessages.sentAt)).limit(limit);
      } else {
        msgs = await query.orderBy(desc(chatMessages.sentAt)).limit(limit);
      }

      const convRows = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
      const convRow = convRows[0];

      // Transform messages to frontend format
      const transformedMessages = msgs.map(msg => ({
        id: String(msg.id),
        conversationId: String(msg.conversationId),
        fromAddress: String(msg.senderAddress),
        content: String(msg.content),
        timestamp: msg.sentAt instanceof Date ? msg.sentAt.toISOString() : String(msg.sentAt),
        contentType: 'text',
        deliveryStatus: 'sent',
        editedAt: msg.editedAt ? (msg.editedAt instanceof Date ? msg.editedAt.toISOString() : String(msg.editedAt)) : undefined,
        deletedAt: msg.deletedAt ? (msg.deletedAt instanceof Date ? msg.deletedAt.toISOString() : String(msg.deletedAt)) : undefined,
      }));

      return res.json({
        conversation: convRow || inMemoryConversations[conversationId],
        messages: transformedMessages,
        hasMore: msgs.length === limit,
        nextCursor: msgs.length > 0 ? String(msgs[msgs.length - 1].sentAt) : undefined,
        prevCursor: msgs.length > 0 ? String(msgs[0].sentAt) : undefined,
      });
    } catch (err) {
      safeLogger.error('[compatibilityChat] DB error fetching history', err);
      const msgs = messages[conversationId] || [];
      return res.json({ conversation: inMemoryConversations[conversationId], messages: msgs });
    }
  }

  const msgs = messages[conversationId] || [];
  res.json({ conversation: inMemoryConversations[conversationId], messages: msgs });
});

// Get chat history for a conversation (legacy endpoint for compatibility)
router.get('/api/chat/history/:conversationId', authMiddleware, async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  if (hasDb) {
    try {
      const msgs = await db.select({
        id: chatMessages.id,
        conversationId: chatMessages.conversationId,
        senderAddress: chatMessages.senderAddress,
        content: chatMessages.content,
        sentAt: chatMessages.sentAt,
        editedAt: chatMessages.editedAt,
        deletedAt: chatMessages.deletedAt,
      }).from(chatMessages).where(eq(chatMessages.conversationId, conversationId)).orderBy(desc(chatMessages.sentAt)).limit(500);

      const convRows = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
      const convRow = convRows[0];
      return res.json({ conversation: convRow || inMemoryConversations[conversationId], messages: msgs });
    } catch (err) {
      safeLogger.error('[compatibilityChat] DB error fetching history', err);
      const msgs = messages[conversationId] || [];
      return res.json({ conversation: inMemoryConversations[conversationId], messages: msgs });
    }
  }

  const msgs = messages[conversationId] || [];
  res.json({ conversation: inMemoryConversations[conversationId], messages: msgs });
});

// Post a message (matches frontend expectation)
router.post('/api/messaging/conversations/:conversationId/messages', csrfProtection, authMiddleware, async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const { fromAddress, content, contentType, deliveryStatus } = req.body || {};

  if (!conversationId || !inMemoryConversations[conversationId] && !hasDb) {
    return res.status(400).json({ error: 'valid conversation_id required' });
  }
  if (!fromAddress || !content) {
    return res.status(400).json({ error: 'fromAddress and content required' });
  }

  if (hasDb) {
    try {
      const inserted = await db.insert(chatMessages).values({
        conversationId: conversationId,
        senderAddress: fromAddress,
        content,
        sentAt: new Date(),
      }).returning();

      const created = inserted[0];

      // read current unreadCount then update conversation
      const convRows = await db.select({ unreadCount: conversations.unreadCount }).from(conversations).where(eq(conversations.id, conversationId)).limit(1);
      const currentUnread = convRows[0]?.unreadCount ?? 0;

      await db.update(conversations).set({
        lastMessageId: created.id,
        lastActivity: new Date(),
        unreadCount: Number(currentUnread) + 1,
      }).where(eq(conversations.id, conversationId));

      // mirror into in-memory for compatibility (map DB row shape to Message)
      messages[conversationId] = messages[conversationId] || [];
      messages[conversationId].push({
        id: String(created.id),
        conversation_id: String(created.conversationId ?? conversationId),
        sender_address: String(created.senderAddress ?? ''),
        content: String(created.content ?? ''),
        timestamp: (created.sentAt instanceof Date ? created.sentAt.toISOString() : String(created.sentAt)),
        edited_at: created.editedAt ? String(created.editedAt) : null,
        deleted_at: created.deletedAt ? String(created.deletedAt) : null,
      });

      // Broadcast message to WebSocket clients
      try {
        const { getWebSocketService } = require('../services/webSocketService');
        const wsService = getWebSocketService();
        if (wsService) {
          // We need participants to broadcast to
          try {
            // We can query DB for participants if we don't have them easily handy,
            // or try to grab from in-memory if we believe it's synced. 
            // DB is safer.
            const dbConv = await db.select({ participants: conversations.participants }).from(conversations).where(eq(conversations.id, conversationId)).limit(1);
            const participants = dbConv.length > 0 ? dbConv[0].participants : [];

            const broadcastMsg = {
              id: String(created.id),
              conversationId: String(created.conversationId ?? conversationId),
              fromAddress: String(created.senderAddress ?? ''),
              content: String(created.content ?? ''),
              timestamp: (created.sentAt instanceof Date ? created.sentAt.toISOString() : String(created.sentAt)),
              contentType: 'text',
              deliveryStatus: 'sent'
            };

            // 1. Send to conversation room
            wsService.sendToConversation(conversationId, 'new_message', broadcastMsg);

            // 2. Send to individual participants
            if (participants && Array.isArray(participants) && participants.length > 0) {
              (participants as string[]).forEach((p: string) => {
                wsService.sendToUser(p, 'new_message', broadcastMsg);
              });
            }
          } catch (e) {
            safeLogger.error('[compatibilityChat] Error fetching participants for DB WS broadcast', e);
          }
        }
      } catch (wsError) {
        safeLogger.error('[compatibilityChat] Error broadcasting WebSocket message (DB path)', wsError);
      }

      return res.status(201).json(created);
    } catch (err) {
      safeLogger.error('[compatibilityChat] DB error creating message', err);
      // fallback to in-memory
      const msg: Message = {
        id: genId(),
        conversation_id: conversationId,
        sender_address: fromAddress,
        content,
        timestamp: nowIso(),
      };
      messages[conversationId].push(msg);
      const conv = inMemoryConversations[conversationId];
      conv.last_message = content;
      conv.last_activity = msg.timestamp;
      conv.unread_count = (conv.unread_count || 0) + 1;
      return res.status(201).json(msg);
    }
  }

  const msg: Message = {
    id: genId(),
    conversation_id: conversationId,
    sender_address: fromAddress,
    content,
    timestamp: nowIso(),
  };

  messages[conversationId].push(msg);

  // update conversation metadata
  const conv = inMemoryConversations[conversationId];
  conv.last_message = content;
  conv.last_activity = msg.timestamp;
  conv.unread_count = (conv.unread_count || 0) + 1;

  // Broadcast message to WebSocket clients
  try {
    const { getWebSocketService } = require('../services/webSocketService');
    const wsService = getWebSocketService();
    if (wsService) {
      // Get conversation participants from DB or in-memory
      let participants = conv ? conv.participants : [];

      // If we used DB (above), we might not have 'conv' populated correctly depending on flow
      // but 'participants' should be available from context or DB query

      if (hasDb && (!participants || participants.length === 0)) {
        try {
          const dbConv = await db.select({ participants: conversations.participants }).from(conversations).where(eq(conversations.id, conversationId)).limit(1);
          if (dbConv.length > 0) {
            participants = dbConv[0].participants;
          }
        } catch (e) {
          safeLogger.error('[compatibilityChat] Error fetching participants for WS broadcast', e);
        }
      }

      // 1. Send to conversation room (for active viewers)
      wsService.sendToConversation(conversationId, 'new_message', msg);

      // 2. Send to individual participants (for notifications/list updates)
      if (participants && participants.length > 0) {
        participants.forEach((p: string) => {
          // Don't send notification to sender (optional, but good practice to still send update)
          // wsService.sendToUser(p, 'new_message', msg);

          // Use sendMessageUpdate helper if available or manual send
          wsService.sendToUser(p, 'new_message', msg);
        });
      }
    }
  } catch (wsError) {
    safeLogger.error('[compatibilityChat] Error broadcasting WebSocket message', wsError);
  }

  res.status(201).json(msg);
});

// Post a message (legacy endpoint for compatibility)
router.post('/api/chat/messages', csrfProtection, authMiddleware, async (req: Request, res: Response) => {
  const { conversation_id, sender_address, content } = req.body || {};
  if (!conversation_id || !inMemoryConversations[conversation_id]) {
    return res.status(400).json({ error: 'valid conversation_id required' });
  }
  if (!sender_address || !content) {
    return res.status(400).json({ error: 'sender_address and content required' });
  }

  if (hasDb) {
    try {
      const inserted = await db.insert(chatMessages).values({
        conversationId: conversation_id,
        senderAddress: sender_address,
        content,
        sentAt: new Date(),
      }).returning();

      const created = inserted[0];

      // read current unreadCount then update conversation
      const convRows = await db.select({ unreadCount: conversations.unreadCount }).from(conversations).where(eq(conversations.id, conversation_id)).limit(1);
      const currentUnread = convRows[0]?.unreadCount ?? 0;

      await db.update(conversations).set({
        lastMessageId: created.id,
        lastActivity: new Date(),
        unreadCount: Number(currentUnread) + 1,
      }).where(eq(conversations.id, conversation_id));

      // mirror into in-memory for compatibility (map DB row shape to Message)
      messages[conversation_id] = messages[conversation_id] || [];
      messages[conversation_id].push({
        id: String(created.id),
        conversation_id: String(created.conversationId ?? conversation_id),
        sender_address: String(created.senderAddress ?? ''),
        content: String(created.content ?? ''),
        timestamp: (created.sentAt instanceof Date ? created.sentAt.toISOString() : String(created.sentAt)),
        edited_at: created.editedAt ? String(created.editedAt) : null,
        deleted_at: created.deletedAt ? String(created.deletedAt) : null,
      });
      return res.status(201).json({ message: created });
    } catch (err) {
      safeLogger.error('[compatibilityChat] DB error creating message', err);
      // fallback to in-memory
      const msg: Message = {
        id: genId(),
        conversation_id,
        sender_address,
        content,
        timestamp: nowIso(),
      };
      messages[conversation_id].push(msg);
      const conv = inMemoryConversations[conversation_id];
      conv.last_message = content;
      conv.last_activity = msg.timestamp;
      conv.unread_count = (conv.unread_count || 0) + 1;
      return res.status(201).json({ message: msg });
    }
  }

  const msg: Message = {
    id: genId(),
    conversation_id,
    sender_address,
    content,
    timestamp: nowIso(),
  };

  messages[conversation_id].push(msg);

  // update conversation metadata
  const conv = inMemoryConversations[conversation_id];
  conv.last_message = content;
  conv.last_activity = msg.timestamp;
  conv.unread_count = (conv.unread_count || 0) + 1;

  // Broadcast
  try {
    const { getWebSocketService } = require('../services/webSocketService');
    const wsService = getWebSocketService();
    if (wsService) {
      const participants = (conv ? conv.participants : []) as string[];
      // 1. Send to conversation room
      // Map to frontend format
      const broadcastMsg = {
        id: msg.id,
        conversationId: msg.conversation_id,
        fromAddress: msg.sender_address,
        content: msg.content,
        timestamp: msg.timestamp,
        contentType: 'text',
        deliveryStatus: 'sent'
      };

      wsService.sendToConversation(conversation_id, 'new_message', broadcastMsg);

      // 2. Send to individual participants
      if (participants && participants.length > 0) {
        participants.forEach((p: string) => {
          wsService.sendToUser(p, 'new_message', broadcastMsg);
        });
      }
    }
  } catch (wsError) {
    safeLogger.error('[compatibilityChat] Error broadcasting WebSocket message (legacy endpoint)', wsError);
  }

  return res.status(201).json({ message: msg });
});

// Mark messages as read for a conversation (matches frontend expectation)
router.put('/api/messaging/conversations/:conversationId/read', csrfProtection, authMiddleware, async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const { messageIds } = req.body || {};

  if (!conversationId) {
    return res.status(400).json({ error: 'valid conversation_id required' });
  }

  if (hasDb) {
    try {
      // Update conversation unread count to 0
      await db.update(conversations).set({ unreadCount: 0 }).where(eq(conversations.id, conversationId));
      // also update in-memory if present
      if (inMemoryConversations[conversationId]) inMemoryConversations[conversationId].unread_count = 0;
      return res.json({ ok: true });
    } catch (err) {
      safeLogger.error('[compatibilityChat] DB error marking read', err);
      if (inMemoryConversations[conversationId]) inMemoryConversations[conversationId].unread_count = 0;
      return res.json({ ok: true });
    }
  }

  if (inMemoryConversations[conversationId]) inMemoryConversations[conversationId].unread_count = 0;
  res.json({ ok: true });
});

// Mark messages as read for a conversation (legacy endpoint for compatibility)
router.post('/api/chat/messages/read', csrfProtection, authMiddleware, async (req: Request, res: Response) => {
  const { conversation_id } = req.body || {};
  if (!conversation_id) {
    return res.status(400).json({ error: 'valid conversation_id required' });
  }

  if (hasDb) {
    try {
      await db.update(conversations).set({ unreadCount: 0 }).where(eq(conversations.id, conversation_id));
      // also update in-memory if present
      if (inMemoryConversations[conversation_id]) inMemoryConversations[conversation_id].unread_count = 0;
      return res.json({ ok: true });
    } catch (err) {
      safeLogger.error('[compatibilityChat] DB error marking read', err);
      if (inMemoryConversations[conversation_id]) inMemoryConversations[conversation_id].unread_count = 0;
      return res.json({ ok: true });
    }
  }

  if (inMemoryConversations[conversation_id]) inMemoryConversations[conversation_id].unread_count = 0;
  res.json({ ok: true });
});

// Fallback catch-all for other chat-related paths to avoid 404 spam from frontend discovery
router.all('/api/chat/*', (_req: Request, res: Response) => {
  res.status(204).end();
});

export default router;
