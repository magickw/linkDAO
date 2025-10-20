# Messaging API Documentation

**Version:** 1.0
**Last Updated:** 2025-10-19
**Base URL:** `/api/messaging` (General Messaging), `/api/marketplace/messaging` (Marketplace)

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [General Messaging Endpoints](#general-messaging-endpoints)
5. [Marketplace Messaging Endpoints](#marketplace-messaging-endpoints)
6. [Error Handling](#error-handling)
7. [Security Features](#security-features)
8. [Data Models](#data-models)

---

## Overview

The LinkDAO Messaging System provides two categories of endpoints:

- **General Messaging** (`/api/messaging/*`) - Core messaging features for all users
- **Marketplace Messaging** (`/api/marketplace/messaging/*`) - Enhanced features for marketplace transactions

### Key Features

- ✅ Real-time messaging via WebSocket
- ✅ End-to-end encryption (E2EE)
- ✅ Message templates and quick replies
- ✅ Order-based conversations
- ✅ Automated notifications
- ✅ Conversation analytics
- ✅ XSS protection with DOMPurify

---

## Authentication

All messaging endpoints require authentication via JWT token.

**Headers Required:**
```http
Authorization: Bearer <JWT_TOKEN>
```

**Token Payload:**
```json
{
  "id": "user-uuid",
  "address": "0x...",
  "iat": 1234567890,
  "exp": 1234567890
}
```

---

## Rate Limiting

**General Messaging:** 300 requests per 15 minutes
**Marketplace Messaging:** 300 requests per 15 minutes

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 299
X-RateLimit-Reset: 1634567890
```

---

## General Messaging Endpoints

Total: **18 endpoints**

### 1. Get Conversations

Get paginated list of user's conversations.

**Endpoint:** `GET /api/messaging/conversations`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number for pagination |
| limit | number | No | 20 | Items per page (max: 100) |
| search | string | No | - | Search conversations by title/participant |

**Response:**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "uuid",
        "title": "string",
        "participants": ["0x...", "0x..."],
        "lastActivity": "2025-10-19T12:00:00Z",
        "unreadCount": 3,
        "createdAt": "2025-10-15T10:00:00Z",
        "lastMessage": {
          "id": "uuid",
          "content": "Latest message...",
          "sender_address": "0x...",
          "sent_at": "2025-10-19T11:59:00Z"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45
    }
  }
}
```

---

### 2. Get Conversation Details

Get details of a specific conversation.

**Endpoint:** `GET /api/messaging/conversations/:id`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string (UUID) | Conversation ID |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "string",
    "participants": ["0x...", "0x..."],
    "conversationType": "general",
    "orderId": null,
    "productId": null,
    "lastActivity": "2025-10-19T12:00:00Z",
    "unreadCount": 3,
    "createdAt": "2025-10-15T10:00:00Z"
  }
}
```

---

### 3. Start New Conversation

Create a new conversation between users.

**Endpoint:** `POST /api/messaging/conversations`

**Request Body:**
```json
{
  "participantAddress": "0x...",
  "initialMessage": "Hello! I'd like to discuss...",
  "conversationType": "general"
}
```

**Body Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| participantAddress | string | Yes | Ethereum address of other participant |
| initialMessage | string | No | First message to send |
| conversationType | string | No | Type: general, order_support, product_inquiry |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "participants": ["0x...", "0x..."],
    "lastActivity": "2025-10-19T12:00:00Z",
    "createdAt": "2025-10-19T12:00:00Z"
  },
  "message": "Conversation created successfully"
}
```

---

### 4. Get Conversation Messages

Get paginated messages from a conversation.

**Endpoint:** `GET /api/messaging/conversations/:id/messages`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string (UUID) | Conversation ID |

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number |
| limit | number | No | 50 | Messages per page (max: 100) |
| before | string (UUID) | No | - | Get messages before this message ID |
| after | string (UUID) | No | - | Get messages after this message ID |

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "uuid",
        "conversationId": "uuid",
        "senderAddress": "0x...",
        "content": "Message content (sanitized)",
        "messageType": "text",
        "sentAt": "2025-10-19T12:00:00Z",
        "editedAt": null,
        "deletedAt": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 127
    }
  }
}
```

---

### 5. Send Message

Send a new message in a conversation.

**Endpoint:** `POST /api/messaging/conversations/:id/messages`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string (UUID) | Conversation ID |

**Request Body:**
```json
{
  "content": "Message content here",
  "messageType": "text",
  "replyToId": "uuid",
  "attachments": [
    {
      "filename": "document.pdf",
      "url": "ipfs://...",
      "type": "application/pdf"
    }
  ]
}
```

**Body Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| content | string | Yes | Message content (auto-sanitized for XSS) |
| messageType | string | No | Type: text, html, system (default: text) |
| replyToId | string (UUID) | No | ID of message being replied to |
| attachments | array | No | File attachments metadata |

**Note:** Content is automatically sanitized to prevent XSS attacks:
- `text` type: All HTML tags stripped
- `html` type: Safe HTML tags only (b, i, em, strong, etc.)
- Encrypted messages are NOT sanitized (would break decryption)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "conversationId": "uuid",
    "senderAddress": "0x...",
    "content": "Message content here",
    "messageType": "text",
    "sentAt": "2025-10-19T12:00:00Z",
    "encryptionMetadata": null
  }
}
```

---

### 6. Edit Message

Edit an existing message.

**Endpoint:** `PUT /api/messaging/messages/:id`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string (UUID) | Message ID |

**Request Body:**
```json
{
  "content": "Updated message content"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "content": "Updated message content",
    "editedAt": "2025-10-19T12:05:00Z"
  },
  "message": "Message updated successfully"
}
```

---

### 7. Delete Message

Soft delete a message.

**Endpoint:** `DELETE /api/messaging/messages/:id`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string (UUID) | Message ID |

**Response:**
```json
{
  "success": true,
  "data": null,
  "message": "Message deleted successfully"
}
```

---

### 8. Mark Messages as Read

Mark messages as read up to a specific message.

**Endpoint:** `POST /api/messaging/conversations/:id/read`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string (UUID) | Conversation ID |

**Request Body:**
```json
{
  "messageId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "markedReadCount": 5
  },
  "message": "Messages marked as read"
}
```

---

### 9. Search Messages

Search for messages across all conversations.

**Endpoint:** `GET /api/messaging/search`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | Yes | Search term (sanitized) |
| page | number | No | Page number (default: 1) |
| limit | number | No | Results per page (default: 20, max: 100) |

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "messageId": "uuid",
        "conversationId": "uuid",
        "content": "...matching content...",
        "senderAddress": "0x...",
        "sentAt": "2025-10-19T10:00:00Z",
        "conversationTitle": "Order #123"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15
    }
  }
}
```

---

### 10. Block User

Block a user from messaging.

**Endpoint:** `POST /api/messaging/block/:address`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| address | string | Ethereum address to block |

**Request Body:**
```json
{
  "reason": "Spam messages"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "blockedAddress": "0x...",
    "blockedAt": "2025-10-19T12:00:00Z"
  },
  "message": "User blocked successfully"
}
```

---

### 11. Unblock User

Remove user from block list.

**Endpoint:** `DELETE /api/messaging/block/:address`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| address | string | Ethereum address to unblock |

**Response:**
```json
{
  "success": true,
  "data": null,
  "message": "User unblocked successfully"
}
```

---

### 12. Get Blocked Users

Get list of blocked users.

**Endpoint:** `GET /api/messaging/blocked`

**Response:**
```json
{
  "success": true,
  "data": {
    "blockedUsers": [
      {
        "blockedAddress": "0x...",
        "reason": "Spam messages",
        "createdAt": "2025-10-18T14:00:00Z"
      }
    ]
  }
}
```

---

### 13. Archive Conversation

Move conversation to archive.

**Endpoint:** `POST /api/messaging/conversations/:id/archive`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string (UUID) | Conversation ID |

**Response:**
```json
{
  "success": true,
  "data": null,
  "message": "Conversation archived"
}
```

---

### 14. Unarchive Conversation

Restore conversation from archive.

**Endpoint:** `POST /api/messaging/conversations/:id/unarchive`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string (UUID) | Conversation ID |

**Response:**
```json
{
  "success": true,
  "data": null,
  "message": "Conversation restored"
}
```

---

### 15. Mute Conversation

Mute notifications for a conversation.

**Endpoint:** `POST /api/messaging/conversations/:id/mute`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string (UUID) | Conversation ID |

**Request Body:**
```json
{
  "duration": 3600
}
```

**Body Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| duration | number | No | Mute duration in seconds (null = permanent) |

**Response:**
```json
{
  "success": true,
  "data": {
    "mutedUntil": "2025-10-19T13:00:00Z"
  },
  "message": "Conversation muted"
}
```

---

### 16. Unmute Conversation

Enable notifications for a conversation.

**Endpoint:** `POST /api/messaging/conversations/:id/unmute`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string (UUID) | Conversation ID |

**Response:**
```json
{
  "success": true,
  "data": null,
  "message": "Conversation unmuted"
}
```

---

### 17. Get Unread Count

Get total unread messages count.

**Endpoint:** `GET /api/messaging/unread`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUnread": 42,
    "unreadByConversation": {
      "uuid-1": 5,
      "uuid-2": 3,
      "uuid-3": 34
    }
  }
}
```

---

### 18. Typing Indicator

Send typing indicator (WebSocket event).

**Endpoint:** `POST /api/messaging/conversations/:id/typing`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string (UUID) | Conversation ID |

**Request Body:**
```json
{
  "isTyping": true
}
```

**Response:**
```json
{
  "success": true,
  "data": null
}
```

**WebSocket Event Emitted:**
```json
{
  "event": "typing",
  "conversationId": "uuid",
  "userAddress": "0x...",
  "isTyping": true
}
```

---

## Marketplace Messaging Endpoints

Total: **11 endpoints**

### 1. Create Order Conversation

Auto-create conversation when order is placed.

**Endpoint:** `POST /api/marketplace/messaging/conversations/order/:orderId`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| orderId | number | Order ID |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Order #123 - Product Name",
    "participants": ["0xbuyer...", "0xseller..."],
    "conversationType": "order_support",
    "orderId": 123,
    "productId": "uuid",
    "contextMetadata": {
      "order_id": 123,
      "product_name": "Product Name",
      "order_status": "pending",
      "order_amount": "99.99"
    },
    "createdAt": "2025-10-19T12:00:00Z"
  },
  "message": "Order conversation created successfully"
}
```

---

### 2. Create Product Inquiry

Start conversation about a product.

**Endpoint:** `POST /api/marketplace/messaging/conversations/product/:productId`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| productId | string (UUID) | Product ID |

**Request Body:**
```json
{
  "message": "Is this product still available?"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "uuid",
    "messageId": "uuid"
  },
  "message": "Product inquiry sent successfully"
}
```

---

### 3. Get My Order Conversations

Get all conversations related to user's orders.

**Endpoint:** `GET /api/marketplace/messaging/conversations/my-orders`

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number |
| limit | number | No | 20 | Items per page (max: 50) |

**Response:**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "uuid",
        "title": "Order #123 - Product Name",
        "orderId": 123,
        "orderStatus": "shipped",
        "lastMessage": {
          "content": "Your order has been shipped!",
          "sentAt": "2025-10-19T11:00:00Z"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 8
    }
  }
}
```

---

### 4. Get Order Timeline

Get automated updates timeline for an order conversation.

**Endpoint:** `GET /api/marketplace/messaging/conversations/:id/order-timeline`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string (UUID) | Conversation ID |

**Response:**
```json
{
  "success": true,
  "data": {
    "timeline": [
      {
        "eventType": "order_placed",
        "timestamp": "2025-10-15T10:00:00Z",
        "message": "Order placed successfully",
        "metadata": {
          "order_id": 123,
          "amount": "99.99"
        }
      },
      {
        "eventType": "order_shipped",
        "timestamp": "2025-10-17T14:00:00Z",
        "message": "Your order has been shipped!",
        "metadata": {
          "tracking_number": "1Z999AA10123456784",
          "carrier": "UPS"
        }
      }
    ]
  }
}
```

---

### 5. Get Message Templates

Get user's saved message templates.

**Endpoint:** `GET /api/marketplace/messaging/templates`

**Response:**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "uuid",
        "name": "Order Shipped",
        "content": "Your order has been shipped! Tracking: {tracking_number}",
        "category": "shipping",
        "tags": ["order", "shipping"],
        "usageCount": 42,
        "createdAt": "2025-10-01T00:00:00Z"
      }
    ]
  }
}
```

---

### 6. Create Message Template

Create a new reusable message template.

**Endpoint:** `POST /api/marketplace/messaging/templates`

**Request Body:**
```json
{
  "name": "Order Shipped",
  "content": "Your order has been shipped! Tracking: {tracking_number}",
  "category": "shipping",
  "tags": ["order", "shipping", "notification"]
}
```

**Body Parameters:**
| Parameter | Type | Required | Max Length | Description |
|-----------|------|----------|------------|-------------|
| name | string | Yes | 255 | Template name |
| content | string | Yes | - | Template content (allows rich HTML) |
| category | string | No | 64 | Template category |
| tags | array | No | - | Array of tags for filtering |

**Security:** Content is sanitized with 'rich' mode allowing safe HTML formatting:
- Allowed tags: b, i, em, strong, u, br, p, span, a, ul, ol, li, h1-h6
- Scripts and dangerous tags are stripped
- Only https:// and mailto: links allowed

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Order Shipped",
    "content": "Your order has been shipped! Tracking: {tracking_number}",
    "category": "shipping",
    "tags": ["order", "shipping", "notification"],
    "isActive": true,
    "usageCount": 0,
    "createdAt": "2025-10-19T12:00:00Z"
  },
  "message": "Template created successfully"
}
```

---

### 7. Update Message Template

Update an existing template.

**Endpoint:** `PUT /api/marketplace/messaging/templates/:id`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string (UUID) | Template ID |

**Request Body:**
```json
{
  "name": "Order Shipped (Updated)",
  "content": "Your order #{order_id} has been shipped!",
  "isActive": true
}
```

**Body Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | No | Template name |
| content | string | No | Template content (sanitized) |
| category | string | No | Template category |
| tags | array | No | Array of tags |
| isActive | boolean | No | Active status |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Order Shipped (Updated)",
    "updatedAt": "2025-10-19T12:05:00Z"
  },
  "message": "Template updated successfully"
}
```

---

### 8. Delete Message Template

Delete a template (user must own it).

**Endpoint:** `DELETE /api/marketplace/messaging/templates/:id`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string (UUID) | Template ID |

**Response:**
```json
{
  "success": true,
  "data": null,
  "message": "Template deleted successfully"
}
```

---

### 9. Create Quick Reply

Create automated response triggered by keywords.

**Endpoint:** `POST /api/marketplace/messaging/quick-replies`

**Request Body:**
```json
{
  "triggerKeywords": ["shipping", "delivery", "ship"],
  "responseText": "Our standard shipping time is 3-5 business days. Express shipping is also available!",
  "category": "shipping",
  "priority": 10,
  "isActive": true
}
```

**Body Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| triggerKeywords | array | Yes | Keywords that trigger this reply (sanitized) |
| responseText | string | Yes | Automated response text (sanitized with 'basic' mode) |
| category | string | No | Quick reply category |
| priority | number | No | Priority for matching (higher = first, default: 0) |
| isActive | boolean | No | Active status (default: true) |

**Security:** All inputs are sanitized:
- Keywords: Plain text only, HTML stripped
- Response: Basic HTML formatting allowed (b, i, em, strong, etc.)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "triggerKeywords": ["shipping", "delivery", "ship"],
    "responseText": "Our standard shipping time is 3-5 business days.",
    "category": "shipping",
    "priority": 10,
    "usageCount": 0,
    "createdAt": "2025-10-19T12:00:00Z"
  },
  "message": "Quick reply created successfully"
}
```

---

### 10. Suggest Quick Replies

Get suggested quick replies based on message content.

**Endpoint:** `GET /api/marketplace/messaging/quick-replies/suggest`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| message | string | Yes | Incoming message to match against |

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "id": "uuid",
        "responseText": "Our standard shipping time is 3-5 business days.",
        "matchedKeywords": ["shipping"],
        "priority": 10,
        "category": "shipping"
      }
    ]
  }
}
```

---

### 11. Get Conversation Analytics

Get analytics for a conversation.

**Endpoint:** `GET /api/marketplace/messaging/conversations/:id/analytics`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string (UUID) | Conversation ID |

**Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "uuid",
    "totalMessages": 127,
    "lastMessageAt": "2025-10-19T11:59:00Z",
    "averageResponseTime": "00:15:30",
    "participantStats": {
      "0xbuyer...": {
        "messageCount": 64,
        "lastSent": "2025-10-19T11:59:00Z"
      },
      "0xseller...": {
        "messageCount": 63,
        "lastSent": "2025-10-19T11:45:00Z"
      }
    },
    "messageTypes": {
      "text": 120,
      "system": 7
    }
  }
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": "Error message here",
  "code": 400
}
```

### Common Error Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required or invalid token |
| 403 | Forbidden | User does not have permission |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error occurred |

### Error Examples

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Authentication required",
  "code": 401
}
```

**429 Rate Limit:**
```json
{
  "success": false,
  "error": "Too many messaging requests from this IP",
  "code": 429
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": "Conversation not found or access denied",
  "code": 403
}
```

---

## Security Features

### 1. XSS Protection

All user input is sanitized using DOMPurify with three modes:

**Strict Mode** (Plain Text):
- Used for: Chat messages (text type), usernames, search queries
- Strips ALL HTML tags
- Safe for display anywhere

**Basic Mode** (Safe HTML):
- Used for: Quick replies, basic formatted content
- Allows: b, i, em, strong, u, br, p, span
- Safe for most display contexts

**Rich Mode** (Extended HTML):
- Used for: Message templates (seller-created)
- Allows: All basic tags + a, ul, ol, li, h1-h6
- Only https:// and mailto: links allowed
- Still protected against XSS

### 2. SQL Injection Prevention

- All database queries use parameterized queries
- Drizzle ORM provides automatic escaping
- Address validation with regex: `/^0x[a-fA-F0-9]{40}$/`

### 3. Rate Limiting

- 300 requests per 15 minutes per IP
- Prevents spam and abuse
- Headers include limit information

### 4. Authentication

- JWT tokens with expiration
- Token validation on every request
- User authorization for resource access

### 5. Input Validation

- Request validation middleware
- Type checking and length limits
- Array and object validation

---

## Data Models

### Conversation

```typescript
interface Conversation {
  id: string; // UUID
  title?: string;
  participants: string[]; // Ethereum addresses
  conversationType: 'general' | 'order_support' | 'product_inquiry';
  orderId?: number;
  productId?: string;
  contextMetadata?: object;
  isAutomated: boolean;
  status: 'active' | 'archived';
  lastActivity: Date;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Message

```typescript
interface Message {
  id: string; // UUID
  conversationId: string;
  senderAddress: string;
  content: string; // Sanitized content
  messageType: 'text' | 'html' | 'system';
  encryptionMetadata?: object;
  replyToId?: string;
  attachments?: Attachment[];
  sentAt: Date;
  editedAt?: Date;
  deletedAt?: Date;
}
```

### Message Template

```typescript
interface MessageTemplate {
  id: string; // UUID
  userId: string;
  walletAddress: string;
  name: string; // Sanitized (strict)
  content: string; // Sanitized (rich mode)
  category?: string; // Sanitized (strict)
  tags?: string[]; // Sanitized (strict)
  isActive: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Quick Reply

```typescript
interface QuickReply {
  id: string; // UUID
  userId: string;
  walletAddress: string;
  triggerKeywords: string[]; // Sanitized (strict)
  responseText: string; // Sanitized (basic mode)
  category?: string; // Sanitized (strict)
  isActive: boolean;
  usageCount: number;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Conversation Analytics

```typescript
interface ConversationAnalytics {
  id: string; // UUID
  conversationId: string;
  totalMessages: number;
  lastMessageAt: Date;
  averageResponseTime: string; // Interval
  participantStats: {
    [address: string]: {
      messageCount: number;
      lastSent: Date;
    };
  };
  messageTypes: {
    [type: string]: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

---

## WebSocket Events

### Connection

```javascript
const socket = io('wss://api.linkdao.com', {
  auth: {
    token: 'JWT_TOKEN_HERE'
  }
});
```

### Events

**Join Conversation:**
```javascript
socket.emit('join:conversation', { conversationId: 'uuid' });
```

**Leave Conversation:**
```javascript
socket.emit('leave:conversation', { conversationId: 'uuid' });
```

**New Message (Receive):**
```javascript
socket.on('message:new', (data) => {
  console.log('New message:', data);
  // data = { conversationId, message: {...} }
});
```

**Typing Indicator (Receive):**
```javascript
socket.on('typing', (data) => {
  console.log('User typing:', data);
  // data = { conversationId, userAddress, isTyping }
});
```

**Message Read (Receive):**
```javascript
socket.on('message:read', (data) => {
  console.log('Messages read:', data);
  // data = { conversationId, userAddress, lastReadMessageId }
});
```

---

## Best Practices

### 1. Security

- ✅ Always validate and sanitize user input
- ✅ Use HTTPS for all API calls
- ✅ Store JWT tokens securely (not in localStorage)
- ✅ Implement CSRF protection for web clients
- ✅ Never trust client-side data

### 2. Performance

- ✅ Use pagination for large datasets
- ✅ Implement message caching on client
- ✅ Use WebSocket for real-time updates
- ✅ Batch read receipts
- ✅ Lazy load conversation history

### 3. User Experience

- ✅ Show typing indicators
- ✅ Implement optimistic UI updates
- ✅ Display message timestamps
- ✅ Group messages by date
- ✅ Show delivery/read status

### 4. Error Handling

- ✅ Implement exponential backoff for retries
- ✅ Show user-friendly error messages
- ✅ Log errors for debugging
- ✅ Handle rate limiting gracefully
- ✅ Provide offline support

---

## Support

For issues or questions:
- GitHub: https://github.com/linkdao/linkdao
- Documentation: https://docs.linkdao.com
- Support Email: support@linkdao.com

---

**End of Documentation**
