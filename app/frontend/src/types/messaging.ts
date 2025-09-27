// Messaging Types - Secure Chat History
export interface ChatMessage {
  id: string;
  conversationId: string;
  fromAddress: string;
  toAddress?: string; // For DMs
  channelId?: string; // For channels
  content: string;
  encryptedContent?: string;
  timestamp: Date;
  messageType: 'text' | 'image' | 'file' | 'nft' | 'transaction';
  isEncrypted: boolean;
  reactions?: MessageReaction[];
  threadReplies?: ChatMessage[];
  parentId?: string;
  editedAt?: Date;
  deletedAt?: Date;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  emoji: string;
  userAddress: string;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  type: 'dm' | 'channel';
  participants: string[];
  channelId?: string;
  lastMessage?: ChatMessage;
  lastActivity: Date;
  unreadCount: number;
  isArchived: boolean;
  createdAt: Date;
}

export interface ChatChannel {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'gated';
  memberCount: number;
  createdBy: string;
  createdAt: Date;
  isArchived: boolean;
}

export interface MessageAttachment {
  id: string;
  messageId: string;
  type: 'image' | 'file' | 'nft' | 'transaction';
  url: string;
  filename: string;
  size: number;
  mimeType?: string;
  metadata?: Record<string, any>;
}

export interface ChatHistoryRequest {
  conversationId: string;
  limit?: number;
  before?: string; // Message ID for pagination
  after?: string;
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
  hasMore: boolean;
  nextCursor?: string;
  prevCursor?: string;
}