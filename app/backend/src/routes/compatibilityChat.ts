import { Router, Request, Response } from 'express';
import { requireJwt } from '../middleware/authJwt';

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
const conversations: Record<string, Conversation> = {};
const messages: Record<string, Message[]> = {};

// Optional runtime PostgreSQL client (useful when DATABASE_URL is set).
// We use dynamic require to avoid importing the Drizzle schema at compile time
// so TypeScript doesn't try to type-check the large schema file while we
// incrementally migrate to DB-backed implementations.
let sqlClient: any | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const postgres = require('postgres');
  const conn = process.env.DATABASE_URL || undefined;
  if (conn) {
    sqlClient = postgres(conn, { prepare: false });
    console.debug('[compatibilityChat] postgres client initialized');
  }
} catch (err) {
  // If postgres is not installed or connection not available, we'll stay in-memory.
  sqlClient = null;
}

// Helpers
const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const nowIso = () => new Date().toISOString();

// Health check (no auth)
router.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, ts: nowIso() });
});

// List conversations (protected)
router.get('/api/chat/conversations', requireJwt, (_req: Request, res: Response) => {
  if (sqlClient) {
    (async () => {
      try {
        const rows = await sqlClient`SELECT id, title, participants, last_message_id, last_activity, unread_count, created_at FROM conversations ORDER BY last_activity DESC NULLS LAST`;
        return res.json({ conversations: rows });
      } catch (err) {
        console.error('[compatibilityChat] DB error fetching conversations', err);
        const list = Object.values(conversations).sort((a, b) => (b.last_activity || b.created_at).localeCompare(a.last_activity || a.created_at));
        return res.json({ conversations: list });
      }
    })();
    return;
  }

  const list = Object.values(conversations).sort((a, b) => (b.last_activity || b.created_at).localeCompare(a.last_activity || a.created_at));
  res.json({ conversations: list });
});

// Also support /api/conversations as an alternate path
router.get('/api/conversations', requireJwt, (_req: Request, res: Response) => {
  const list = Object.values(conversations).sort((a, b) => (b.last_activity || b.created_at).localeCompare(a.last_activity || a.created_at));
  res.json({ conversations: list });
});

// Create a DM conversation
router.post('/api/chat/conversations/dm', requireJwt, (req: Request, res: Response) => {
  const { participants } = req.body || {};
  if (!Array.isArray(participants) || participants.length === 0) {
    return res.status(400).json({ error: 'participants (string[]) required' });
  }

  if (sqlClient) {
    (async () => {
      try {
        const participantsJson = JSON.stringify(participants);
        const [created] = await sqlClient`INSERT INTO conversations (title, participants, last_activity, unread_count, created_at) VALUES (${null}, ${participantsJson}, NOW(), 0, NOW()) RETURNING id, title, participants, last_message_id, last_activity, unread_count, created_at`;
        // ensure messages array exists in-memory for compatibility tooling
        messages[created.id] = [];
        return res.status(201).json({ conversation: created });
      } catch (err) {
        console.error('[compatibilityChat] DB error creating conversation', err);
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
        conversations[id] = conv;
        messages[id] = [];
        return res.status(201).json({ conversation: conv });
      }
    })();
    return;
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

  conversations[id] = conv;
  messages[id] = [];

  res.status(201).json({ conversation: conv });
});

// Get chat history for a conversation
router.get('/api/chat/history/:conversationId', requireJwt, (req: Request, res: Response) => {
  const { conversationId } = req.params;
  if (!conversationId || !conversations[conversationId]) {
    return res.status(404).json({ error: 'conversation not found' });
  }

  if (sqlClient) {
    (async () => {
      try {
        const msgs = await sqlClient`SELECT id, conversation_id, sender_address, content, timestamp, edited_at, deleted_at FROM chat_messages WHERE conversation_id = ${conversationId} ORDER BY timestamp DESC LIMIT 500`;
        const [convRow] = await sqlClient`SELECT id, title, participants, last_message_id, last_activity, unread_count, created_at FROM conversations WHERE id = ${conversationId} LIMIT 1`;
        return res.json({ conversation: convRow || conversations[conversationId], messages: msgs });
      } catch (err) {
        console.error('[compatibilityChat] DB error fetching history', err);
        const msgs = messages[conversationId] || [];
        return res.json({ conversation: conversations[conversationId], messages: msgs });
      }
    })();
    return;
  }

  const msgs = messages[conversationId] || [];
  res.json({ conversation: conversations[conversationId], messages: msgs });
});

// Post a message
router.post('/api/chat/messages', requireJwt, (req: Request, res: Response) => {
  const { conversation_id, sender_address, content } = req.body || {};
  if (!conversation_id || !conversations[conversation_id]) {
    return res.status(400).json({ error: 'valid conversation_id required' });
  }
  if (!sender_address || !content) {
    return res.status(400).json({ error: 'sender_address and content required' });
  }

  if (sqlClient) {
    (async () => {
      try {
        const [created] = await sqlClient`INSERT INTO chat_messages (conversation_id, sender_address, content, timestamp) VALUES (${conversation_id}, ${sender_address}, ${content}, NOW()) RETURNING id, conversation_id, sender_address, content, timestamp, edited_at, deleted_at`;
        // update conversations metadata
        await sqlClient`UPDATE conversations SET last_message_id = ${created.id}, last_activity = NOW(), unread_count = COALESCE(unread_count,0) + 1 WHERE id = ${conversation_id}`;
        // mirror into in-memory for compatibility
        messages[conversation_id] = messages[conversation_id] || [];
        messages[conversation_id].push(created);
        return res.status(201).json({ message: created });
      } catch (err) {
        console.error('[compatibilityChat] DB error creating message', err);
        // fallback to in-memory
        const msg: Message = {
          id: genId(),
          conversation_id,
          sender_address,
          content,
          timestamp: nowIso(),
        };
        messages[conversation_id].push(msg);
        const conv = conversations[conversation_id];
        conv.last_message = content;
        conv.last_activity = msg.timestamp;
        conv.unread_count = (conv.unread_count || 0) + 1;
        return res.status(201).json({ message: msg });
      }
    })();
    return;
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
  const conv = conversations[conversation_id];
  conv.last_message = content;
  conv.last_activity = msg.timestamp;
  conv.unread_count = (conv.unread_count || 0) + 1;

  res.status(201).json({ message: msg });
});

// Mark messages as read for a conversation
router.post('/api/chat/messages/read', requireJwt, (req: Request, res: Response) => {
  const { conversation_id } = req.body || {};
  if (!conversation_id || !conversations[conversation_id]) {
    return res.status(400).json({ error: 'valid conversation_id required' });
  }

  if (sqlClient) {
    (async () => {
      try {
        await sqlClient`UPDATE conversations SET unread_count = 0 WHERE id = ${conversation_id}`;
        // also update in-memory if present
        if (conversations[conversation_id]) conversations[conversation_id].unread_count = 0;
        return res.json({ ok: true });
      } catch (err) {
        console.error('[compatibilityChat] DB error marking read', err);
        conversations[conversation_id].unread_count = 0;
        return res.json({ ok: true });
      }
    })();
    return;
  }

  conversations[conversation_id].unread_count = 0;
  res.json({ ok: true });
});

// Fallback catch-all for other chat-related paths to avoid 404 spam from frontend discovery
router.all('/api/chat/*', (_req: Request, res: Response) => {
  res.status(204).end();
});

export default router;
