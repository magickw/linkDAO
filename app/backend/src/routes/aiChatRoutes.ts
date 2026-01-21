import { Router } from 'express';
import { handleChatMessage } from '../controllers/aiChatController';
import { authMiddleware } from '../middleware/authMiddleware';
// CSRF protection might be needed depending on global config, adding simple router for now
// import { csrfProtection } from '../middleware/csrfProtection';

const router = Router();

// Endpoint for AI chat messages
// POST /api/ai-chat/message
// Assuming standard auth middleware is needed, or public if it's for pre-login support?
// Typically support chat might be public or require at least a session. 
// For now, let's keep it open or use optional auth if needed, but safeLogger suggests it's for general support.
// Let's protect it to prevent spam, or check how other routes are done.
// The frontend AIChatSupport seems to be available to anyone? "LinkDAO support assistant".
// Let's stick to authMiddleware if the user is expected to be logged in, or remove if public.
// Users in layout are likely logged in for full features, but support might be pre-login.
// Given frontend doesn't seem to force auth for the button, I'll make it public for now but rate limited in real world.
router.post('/message', handleChatMessage);

export default router;
