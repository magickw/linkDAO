/**
 * Content Sanitization Utilities
 *
 * Provides XSS protection and content sanitization for user-generated content
 * in messaging and marketplace features.
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitization configuration for different content types
 */
const SANITIZE_CONFIG = {
  // Strict mode: Remove all HTML tags, only allow plain text
  strict: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },

  // Basic mode: Allow safe HTML formatting tags only
  basic: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'span'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },

  // Rich mode: Allow more formatting and links (for message templates)
  rich: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'span', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):)/i,
    KEEP_CONTENT: true,
  },
};

/**
 * Sanitize message content to prevent XSS attacks
 *
 * @param content - The content to sanitize
 * @param mode - Sanitization mode: 'strict' (plain text), 'basic' (safe HTML), or 'rich' (extended HTML)
 * @returns Sanitized content safe for storage and display
 *
 * @example
 * ```typescript
 * // For chat messages - strip all HTML
 * const safeMessage = sanitizeContent('<script>alert("xss")</script>Hello', 'strict');
 * // Returns: 'Hello'
 *
 * // For message templates - allow basic formatting
 * const safeTemplate = sanitizeContent('<b>Order shipped!</b>', 'basic');
 * // Returns: '<b>Order shipped!</b>'
 * ```
 */
export function sanitizeContent(content: string, mode: 'strict' | 'basic' | 'rich' = 'strict'): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  const config = SANITIZE_CONFIG[mode];
  return DOMPurify.sanitize(content, config);
}

/**
 * Sanitize an array of strings
 *
 * @param items - Array of strings to sanitize
 * @param mode - Sanitization mode
 * @returns Array of sanitized strings
 */
export function sanitizeArray(items: string[], mode: 'strict' | 'basic' | 'rich' = 'strict'): string[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map(item => sanitizeContent(item, mode)).filter(Boolean);
}

/**
 * Sanitize message object for storage
 * Applies appropriate sanitization to different message types
 *
 * @param message - Message object to sanitize
 * @returns Sanitized message object
 */
export function sanitizeMessage(message: {
  content: string;
  messageType?: string;
  attachments?: any[];
  [key: string]: any;
}): typeof message {
  const sanitized = { ...message };

  // Sanitize main content based on message type
  if (message.messageType === 'html') {
    sanitized.content = sanitizeContent(message.content, 'basic');
  } else {
    // Default to strict for text messages
    sanitized.content = sanitizeContent(message.content, 'strict');
  }

  // Sanitize attachment metadata if present
  if (sanitized.attachments && Array.isArray(sanitized.attachments)) {
    sanitized.attachments = sanitized.attachments.map(att => ({
      ...att,
      filename: sanitizeContent(att.filename || '', 'strict'),
      description: sanitizeContent(att.description || '', 'strict'),
    }));
  }

  return sanitized;
}

/**
 * Sanitize message template content
 * Allows rich formatting since templates are created by sellers
 * but still protects against XSS
 *
 * @param template - Template object to sanitize
 * @returns Sanitized template object
 */
export function sanitizeMessageTemplate(template: {
  name: string;
  content: string;
  category?: string;
  tags?: string[];
  [key: string]: any;
}): typeof template {
  return {
    ...template,
    name: sanitizeContent(template.name, 'strict'),
    content: sanitizeContent(template.content, 'rich'),
    category: template.category ? sanitizeContent(template.category, 'strict') : template.category,
    tags: template.tags ? sanitizeArray(template.tags, 'strict') : template.tags,
  };
}

/**
 * Sanitize quick reply content
 *
 * @param quickReply - Quick reply object to sanitize
 * @returns Sanitized quick reply object
 */
export function sanitizeQuickReply(quickReply: {
  triggerKeywords: string[];
  responseText: string;
  category?: string;
  [key: string]: any;
}): typeof quickReply {
  return {
    ...quickReply,
    triggerKeywords: sanitizeArray(quickReply.triggerKeywords, 'strict'),
    responseText: sanitizeContent(quickReply.responseText, 'basic'),
    category: quickReply.category ? sanitizeContent(quickReply.category, 'strict') : quickReply.category,
  };
}

/**
 * Sanitize conversation title and metadata
 *
 * @param conversation - Conversation object to sanitize
 * @returns Sanitized conversation object
 */
export function sanitizeConversation(conversation: {
  title?: string;
  [key: string]: any;
}): typeof conversation {
  return {
    ...conversation,
    title: conversation.title ? sanitizeContent(conversation.title, 'strict') : conversation.title,
  };
}

/**
 * Remove potentially dangerous characters from file names
 *
 * @param filename - Original filename
 * @returns Safe filename
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return '';
  }

  // Remove path separators and null bytes
  return filename
    .replace(/[\/\\]/g, '_')
    .replace(/\0/g, '')
    .replace(/\.\./g, '')
    .trim();
}

/**
 * Validate and sanitize wallet address
 *
 * @param address - Ethereum wallet address
 * @returns Sanitized address or null if invalid
 */
export function sanitizeWalletAddress(address: string): string | null {
  if (!address || typeof address !== 'string') {
    return null;
  }

  // Basic Ethereum address validation
  const cleanAddress = address.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(cleanAddress)) {
    return null;
  }

  return cleanAddress;
}

/**
 * Sanitize search query to prevent injection attacks
 *
 * @param query - Search query string
 * @returns Sanitized query
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    return '';
  }

  // Remove SQL special characters and trim
  return query
    .replace(/[;'"\\]/g, '')
    .trim()
    .substring(0, 200); // Limit length
}

export default {
  sanitizeContent,
  sanitizeArray,
  sanitizeMessage,
  sanitizeMessageTemplate,
  sanitizeQuickReply,
  sanitizeConversation,
  sanitizeFilename,
  sanitizeWalletAddress,
  sanitizeSearchQuery,
};
