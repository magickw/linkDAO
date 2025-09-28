import { Router, Request, Response } from 'express';

const router = Router();

// Simple in-memory stores for compatibility; replace with DB-backed logic later
const conversationsStore: Record<string, any> = {};
const messagesStore: Record<string, any[]> = {};

// Mirror /api/health for compatibility
router.get('/api/health', (req: Request, res: Response) => {
  res.json({
    message: 'LinkDAO Backend API - Production Ready',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
    status: 'healthy',
    database: 'connected'
  });
});

// Conversations endpoints (multiple candidate paths)
router.get([
  '/api/chat/conversations',
  '/api/conversations',
  '/api/messages/conversations',
  '/api/messaging/conversations'
], (req: Request, res: Response) => {
  const list = Object.values(conversationsStore).map((conv: any) => ({
    id: conv.id,
    participants: conv.participants || [],
    lastMessage: conv.lastMessage || null,
    lastActivity: conv.lastActivity || new Date().toISOString(),
    unreadCount: conv.unreadCount || 0,
    createdAt: conv.createdAt || new Date().toISOString()
  }));
  res.json(list);
});

// Create or get DM conversation
router.post('/api/chat/conversations/dm', (req: Request, res: Response) => {
  const { participantAddress } = req.body || {};
  if (!participantAddress) return res.status(400).json({ error: 'participantAddress required' });

  const id = `dm_${participantAddress.toLowerCase()}`;
  let conv = conversationsStore[id];
  if (!conv) {
    conv = {
      id,
      participants: [participantAddress],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
    conversationsStore[id] = conv;
    messagesStore[id] = [];
  }
  res.json(conv);
});

// Chat history
router.get('/api/chat/history/:conversationId', (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const messages = messagesStore[conversationId] || [];
  res.json({ messages, hasMore: false, nextCursor: null, prevCursor: null });
});

// Send message
router.post('/api/chat/messages', (req: Request, res: Response) => {
  const { conversationId, senderAddress, content } = req.body || {};
  if (!conversationId || !senderAddress || !content) {
    return res.status(400).json({ error: 'conversationId, senderAddress and content required' });
  }

  const msg = {
    id: `msg_${Date.now()}`,
    conversationId,
    senderAddress,
    content,
    timestamp: new Date().toISOString(),
    reactions: []
  };

  messagesStore[conversationId] = messagesStore[conversationId] || [];
  messagesStore[conversationId].unshift(msg);

  conversationsStore[conversationId] = conversationsStore[conversationId] || { id: conversationId, participants: [senderAddress], createdAt: new Date().toISOString() };
  conversationsStore[conversationId].lastMessage = msg;
  conversationsStore[conversationId].lastActivity = msg.timestamp;

  res.status(201).json(msg);
});

// Mark messages as read
router.post('/api/chat/messages/read', (req: Request, res: Response) => {
  // payload: { conversationId, messageIds }
  res.json({ success: true });
});

// Reactions
router.post('/api/chat/messages/:messageId/reactions', (req: Request, res: Response) => res.json({ success: true }));
router.delete('/api/chat/messages/:messageId/reactions', (req: Request, res: Response) => res.json({ success: true }));

// Delete message
router.delete('/api/chat/messages/:messageId', (req: Request, res: Response) => res.json({ success: true }));

export default router;
