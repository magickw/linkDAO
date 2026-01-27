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

// Remove in-memory stores to strictly enforce DB persistence
// const inMemoryConversations: Record<string, Conversation> = {};
// const messages: Record<string, Message[]> = {};

// Optional runtime PostgreSQL client (useful when DATABASE_URL is set).
// We use dynamic require to avoid importing the Drizzle schema at compile time
// so TypeScript doesn't try to type-check the large schema file while we
// incrementally migrate to DB-backed implementations.
// Use Drizzle db when available. db will attempt to connect based on DATABASE_URL.
const hasDb = !!db;

// Helpers
// const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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
        return res.status(500).json({ error: 'Database error fetching conversations' });
      }
    }

    return res.status(500).json({ error: 'Database Not Available' });
  } catch (error) {
    // Catch-all error handler
    safeLogger.error('[compatibilityChat] Unexpected error in conversations endpoint', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Also support /api/conversations as an alternate path
// Also support /api/conversations as an alternate path
router.get('/api/conversations', authMiddleware, (_req: Request, res: Response) => {
  res.status(500).json({ error: 'Use /api/chat/conversations' });
});

// Support additional alternate paths for conversations
router.get('/api/messages/conversations', authMiddleware, (_req: Request, res: Response) => {
  res.status(500).json({ error: 'Use /api/chat/conversations' });
});

router.get('/api/messaging/conversations', authMiddleware, async (_req: Request, res: Response) => {
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
        return res.json(rows);
      } catch (dbError) {
        safeLogger.error('[compatibilityChat] DB error fetching conversations', {
          error: dbError instanceof Error ? dbError.message : String(dbError),
          stack: dbError instanceof Error ? dbError.stack : undefined
        });
        return res.status(500).json({ error: 'Database error fetching conversations' });
      }
    }

    return res.status(500).json({ error: 'Database Not Available' });
  } catch (error) {
    safeLogger.error('[compatibilityChat] Unexpected error in conversations endpoint', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST endpoint for creating conversations (matches frontend expectation)
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

      return res.status(201).json(created);
    } catch (err) {
      safeLogger.error('[compatibilityChat] DB error creating conversation', err);
      return res.status(500).json({ error: 'Database error creating conversation' });
    }
  }

  return res.status(500).json({ error: 'Database Not Available' });
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
      return res.status(201).json({ conversation: created });
    } catch (err) {
      safeLogger.error('[compatibilityChat] DB error creating conversation', err);
      return res.status(500).json({ error: 'Database error creating conversation' });
    }
  }

  return res.status(500).json({ error: 'Database Not Available' });
});

// Get chat history for a conversation (matches frontend expectation)
// Get chat history for a conversation (matches frontend expectation)
router.get('/api/messaging/conversations/:conversationId/messages', authMiddleware, async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  const before = req.query.before as string;
  const after = req.query.after as string;

  // Debug logging to investigate 400 error
  console.log('[compatibilityChat] GET messages - Request params:', {
    conversationId,
    conversationIdType: typeof conversationId,
    params: req.params,
    query: req.query,
    url: req.url,
    originalUrl: req.originalUrl
  });

  if (!conversationId) {
    console.error('[compatibilityChat] GET messages - conversationId is undefined or empty');
    return res.status(400).json({ error: 'valid conversation_id required' });
  }

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

      if (!convRow) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

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
        conversation: convRow,
        messages: transformedMessages,
        hasMore: msgs.length === limit,
        nextCursor: msgs.length > 0 ? String(msgs[msgs.length - 1].sentAt) : undefined,
        prevCursor: msgs.length > 0 ? String(msgs[0].sentAt) : undefined,
      });
    } catch (err) {
      safeLogger.error('[compatibilityChat] DB error fetching history', err);
      return res.status(500).json({ error: 'Database error fetching history' });
    }
  }

  return res.status(500).json({ error: 'Database Not Available' });
});

// Get chat history for a conversation (legacy endpoint for compatibility)
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

      if (!convRow) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      return res.json({ conversation: convRow, messages: msgs });
    } catch (err) {
      safeLogger.error('[compatibilityChat] DB error fetching history', err);
      return res.status(500).json({ error: 'Database error fetching history' });
    }
  }

  return res.status(500).json({ error: 'Database Not Available' });
});

// Post a message (matches frontend expectation)
router.post('/api/messaging/conversations/:conversationId/messages', csrfProtection, authMiddleware, async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const { content, contentType, deliveryStatus } = req.body || {};

  // Debug logging to investigate 400 error
  console.log('[compatibilityChat] POST message - Request params:', {
    conversationId,
    conversationIdType: typeof conversationId,
    params: req.params,
    bodyKeys: Object.keys(req.body || {}),
    url: req.url,
    originalUrl: req.originalUrl
  });

  // Use provided senderAddress/fromAddress or fallback to authenticated user
  // Prefer senderAddress to match DB schema
  const userAddress = (req as any).user?.address || (req as any).userId;
  let fromAddress = req.body?.senderAddress || req.body?.fromAddress || userAddress;

  // Debug logging for authentication
  console.log('[compatibilityChat] Authentication info:', {
    userAddress,
    bodySenderAddress: req.body?.senderAddress,
    bodyFromAddress: req.body?.fromAddress,
    finalFromAddress: fromAddress,
    hasUser: !!(req as any).user,
    userObject: (req as any).user
  });

  // Normalize address to lowercase
  if (fromAddress && typeof fromAddress === 'string') {
    fromAddress = fromAddress.toLowerCase();
  }

  safeLogger.info('[compatibilityChat] Creating message', { conversationId, fromAddress, contentLength: content?.length });

  if (!conversationId) {
    console.error('[compatibilityChat] POST message - conversationId is undefined or empty');
    return res.status(400).json({ error: 'valid conversation_id required' });
  }
  if (!fromAddress) {
    console.error('[compatibilityChat] POST message - fromAddress is undefined or empty', {
      userAddress,
      body: req.body,
      user: (req as any).user
    });
    return res.status(401).json({ error: 'Authentication required - no sender address found' });
  }
  if (!content) {
    return res.status(400).json({ error: 'content required' });
  }

  if (hasDb) {
    let created: any;
    try {
      // Verify conversation exists
      const conversationExists = await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.id, conversationId)).limit(1);

      if (conversationExists.length === 0) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Insert message into database
      try {
        const inserted = await db.insert(chatMessages).values({
          conversationId: conversationId,
          senderAddress: fromAddress,
          content,
          sentAt: new Date(),
        }).returning();

        created = inserted[0];
        safeLogger.info('[compatibilityChat] Message created successfully', { messageId: created.id, conversationId });
      } catch (insertError) {
        safeLogger.error('[compatibilityChat] Failed to insert message', {
          error: insertError,
          errorMessage: insertError instanceof Error ? insertError.message : 'Unknown error',
          errorStack: insertError instanceof Error ? insertError.stack : undefined,
          conversationId,
          fromAddress,
          contentLength: content?.length
        });
        throw insertError;
      }

      // read current unreadCount then update conversation
      let currentUnread = 0;
      try {
        const convRows = await db.select({ unreadCount: conversations.unreadCount }).from(conversations).where(eq(conversations.id, conversationId)).limit(1);
        currentUnread = convRows[0]?.unreadCount ?? 0;
      } catch (selectError) {
        safeLogger.error('[compatibilityChat] Failed to select conversation for unread count', {
          error: selectError,
          errorMessage: selectError instanceof Error ? selectError.message : 'Unknown error',
          conversationId
        });
        // Continue with default value
      }

      try {
        await db.update(conversations).set({
          lastMessageId: created.id,
          lastActivity: new Date(),
          unreadCount: Number(currentUnread) + 1,
        }).where(eq(conversations.id, conversationId));

        safeLogger.info('[compatibilityChat] Conversation updated', { conversationId, newUnreadCount: Number(currentUnread) + 1 });
      } catch (updateError) {
        safeLogger.error('[compatibilityChat] Failed to update conversation', {
          error: updateError,
          errorMessage: updateError instanceof Error ? updateError.message : 'Unknown error',
          errorStack: updateError instanceof Error ? updateError.stack : undefined,
          conversationId,
          lastMessageId: created.id
        });
        // Don't throw here - the message was created successfully, just the update failed
      }

      // Broadcast message to WebSocket clients (non-blocking)
      setImmediate(async () => {
        try {
          const { getWebSocketService } = require('../services/websocket/webSocketService');
          const wsService = getWebSocketService();

          if (wsService) {
            // We need participants to broadcast to
            let participants: any = [];
            try {
              const dbConv = await db.select({ participants: conversations.participants }).from(conversations).where(eq(conversations.id, conversationId)).limit(1);
              participants = dbConv.length > 0 ? dbConv[0].participants : [];
            } catch (participantError) {
              safeLogger.error('[compatibilityChat] Failed to fetch participants for broadcast', {
                error: participantError,
                errorMessage: participantError instanceof Error ? participantError.message : 'Unknown error',
                conversationId
              });
              // Continue with empty participants array
            }

            const broadcastMsg = {
              id: String(created.id),
              conversationId: String(created.conversationId ?? conversationId),
              fromAddress: String(created.senderAddress ?? ''),
              content: String(created.content ?? ''),
              timestamp: (created.sentAt instanceof Date ? created.sentAt.toISOString() : String(created.sentAt)),
              contentType: 'text',
              deliveryStatus: 'sent'
            };

            safeLogger.info('[compatibilityChat] Broadcasting message', { conversationId, participantCount: (participants as string[] | undefined)?.length ?? 0 });

            // 1. Send to conversation room
            try {
              wsService.sendToConversation(conversationId, 'new_message', broadcastMsg);
            } catch (broadcastError) {
              safeLogger.error('[compatibilityChat] Failed to broadcast to conversation room', {
                error: broadcastError,
                errorMessage: broadcastError instanceof Error ? broadcastError.message : 'Unknown error',
                conversationId
              });
            }

            // 2. Send to individual participants
            if (participants && Array.isArray(participants) && participants.length > 0) {
              (participants as string[]).forEach((p: string) => {
                wsService.sendToUser(p, 'new_message', broadcastMsg);
              });
            }
          } else {
            safeLogger.warn('[compatibilityChat] WebSocket service not available');
          }
        } catch (wsError) {
          // Don't fail the request if WebSocket broadcast fails
          safeLogger.error('[compatibilityChat] Error broadcasting WebSocket message (DB path)', wsError);
        }
      });

      // Transform database response to match frontend expectations
      const responseMessage = {
        id: String(created.id),
        conversationId: String(created.conversationId ?? conversationId),
        fromAddress: String(created.senderAddress ?? fromAddress),
        content: String(created.content ?? ''),
        timestamp: (created.sentAt instanceof Date ? created.sentAt.toISOString() : String(created.sentAt)),
        contentType: 'text',
        deliveryStatus: 'sent'
      };

      return res.status(201).json(responseMessage);
    } catch (err) {
      safeLogger.error('[compatibilityChat] DB error creating message', { error: err, conversationId, fromAddress });
      return res.status(500).json({ error: 'Database error creating message', details: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  return res.status(500).json({ error: 'Database Not Available' });
});

// Post a message (legacy endpoint for compatibility)
router.post('/api/chat/messages', csrfProtection, authMiddleware, async (req: Request, res: Response) => {
  const { conversation_id, sender_address, content } = req.body || {};
  if (!conversation_id) {
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

      return res.status(201).json({ message: created });
    } catch (err) {
      safeLogger.error('[compatibilityChat] DB error creating message', err);
      return res.status(500).json({ error: 'Database error creating message' });
    }
  }

  return res.status(500).json({ error: 'Database Not Available' });
});

// Mark messages as read for a conversation (matches frontend expectation)
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
      return res.json({ ok: true });
    } catch (err) {
      safeLogger.error('[compatibilityChat] DB error marking read', err);
      // optimize for optimistic UI success even on error
      return res.json({ ok: true });
    }
  }

  return res.status(500).json({ error: 'Database Not Available' });
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
      return res.json({ ok: true });
    } catch (err) {
      safeLogger.error('[compatibilityChat] DB error marking read', err);
      return res.json({ ok: true });
    }
  }

  return res.status(500).json({ error: 'Database Not Available' });
});

// Fallback catch-all for other chat-related paths to avoid 404 spam from frontend discovery
router.all('/api/chat/*', (_req: Request, res: Response) => {
  res.status(204).end();
});

export default router;
