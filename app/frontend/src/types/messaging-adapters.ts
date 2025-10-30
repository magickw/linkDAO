/**
 * Type Adapters for Messaging Components
 * Converts between backend Message types and UI-specific channel message types
 */

import { Message, MessageAttachment, MessageReaction } from './messaging';

/**
 * Extended message type for channel/DM UI with additional display properties
 */
export interface ChannelMessage extends Omit<Message, 'contentType' | 'attachments'> {
  // Reactions aggregated by emoji
  reactions?: {
    emoji: string;
    count: number;
    users: string[];
  }[];
  // Thread support
  threadReplies?: ChannelMessage[];
  isThread?: boolean;
  parentId?: string;
  // Enhanced attachments for UI display (optional, overrides base type)
  attachments?: UIMessageAttachment[];
  // Mentions
  mentions?: string[];
  // Encryption UI state
  isEncrypted?: boolean;
  encryptionStatus?: 'encrypted' | 'unencrypted' | 'pending';
}

/**
 * UI-friendly attachment type with preview and metadata
 */
export interface UIMessageAttachment {
  id?: string;
  type: 'nft' | 'transaction' | 'proposal' | 'image' | 'file';
  url: string;
  name: string;
  preview?: string;
  metadata?: {
    // NFT metadata
    contractAddress?: string;
    tokenId?: string;
    tokenName?: string;
    tokenSymbol?: string;
    imageUrl?: string;
    price?: string;
    // Transaction metadata
    transactionHash?: string;
    blockNumber?: number;
    gasUsed?: string;
    status?: 'success' | 'failed' | 'pending';
    // File metadata
    filename?: string;
    size?: number;
    mimeType?: string;
  };
}

/**
 * Convert backend Message to UI ChannelMessage
 */
export function messageToChannelMessage(
  msg: Message,
  reactions?: MessageReaction[]
): ChannelMessage {
  // Aggregate reactions by emoji
  const aggregatedReactions = reactions ? aggregateReactions(reactions) : undefined;

  return {
    id: msg.id,
    conversationId: msg.conversationId,
    fromAddress: msg.fromAddress,
    content: msg.content,
    timestamp: msg.timestamp,
    deliveryStatus: msg.deliveryStatus,
    replyToId: msg.replyToId,
    encryptionKey: msg.encryptionKey,
    attachments: msg.attachments ? msg.attachments.map(convertAttachment) : undefined,
    reactions: aggregatedReactions,
    isEncrypted: !!msg.encryptionKey,
    encryptionStatus: msg.encryptionKey ? 'encrypted' : 'unencrypted'
  };
}

/**
 * Convert UI ChannelMessage to backend Message format
 */
export function channelMessageToMessage(
  msg: ChannelMessage
): Omit<Message, 'id' | 'timestamp'> {
  // Convert UI attachments back to standard format
  const standardAttachments = msg.attachments
    ?.filter(att => att.type === 'image' || att.type === 'file')
    .map((att): MessageAttachment => ({
      id: att.id || `att_${Date.now()}`,
      type: att.type as 'image' | 'file',
      url: att.url,
      filename: att.metadata?.filename || att.name,
      size: att.metadata?.size || 0,
      mimeType: att.metadata?.mimeType || 'application/octet-stream'
    }));

  return {
    conversationId: msg.conversationId,
    fromAddress: msg.fromAddress,
    content: msg.content,
    contentType: 'text', // Default to text, can be enhanced
    deliveryStatus: msg.deliveryStatus || 'sent',
    replyToId: msg.replyToId,
    encryptionKey: msg.encryptionKey,
    attachments: standardAttachments
  };
}

/**
 * Aggregate message reactions by emoji
 */
function aggregateReactions(reactions: MessageReaction[]) {
  const aggregated = new Map<string, { emoji: string; count: number; users: string[] }>();

  for (const reaction of reactions) {
    const existing = aggregated.get(reaction.emoji);
    if (existing) {
      existing.count++;
      if (!existing.users.includes(reaction.fromAddress)) {
        existing.users.push(reaction.fromAddress);
      }
    } else {
      aggregated.set(reaction.emoji, {
        emoji: reaction.emoji,
        count: 1,
        users: [reaction.fromAddress]
      });
    }
  }

  return Array.from(aggregated.values());
}

/**
 * Convert standard MessageAttachment to UI attachment
 */
function convertAttachment(att: MessageAttachment): UIMessageAttachment {
  return {
    id: att.id,
    type: att.type,
    url: att.url,
    name: att.filename,
    metadata: {
      filename: att.filename,
      size: att.size,
      mimeType: att.mimeType
    }
  };
}

/**
 * Create UI attachment from NFT data
 */
export function createNFTAttachment(data: {
  contractAddress: string;
  tokenId: string;
  tokenName?: string;
  imageUrl?: string;
  price?: string;
}): UIMessageAttachment {
  return {
    type: 'nft',
    url: data.imageUrl || '#',
    name: data.tokenName || `NFT #${data.tokenId}`,
    metadata: {
      contractAddress: data.contractAddress,
      tokenId: data.tokenId,
      tokenName: data.tokenName,
      imageUrl: data.imageUrl,
      price: data.price
    }
  };
}

/**
 * Create UI attachment from transaction data
 */
export function createTransactionAttachment(data: {
  transactionHash: string;
  status?: 'success' | 'failed' | 'pending';
  blockNumber?: number;
  gasUsed?: string;
}): UIMessageAttachment {
  return {
    type: 'transaction',
    url: `https://etherscan.io/tx/${data.transactionHash}`,
    name: `Transaction ${data.transactionHash.slice(0, 10)}...`,
    metadata: {
      transactionHash: data.transactionHash,
      status: data.status || 'success',
      blockNumber: data.blockNumber,
      gasUsed: data.gasUsed
    }
  };
}

/**
 * Check if user has reacted with specific emoji
 */
export function hasUserReacted(
  message: ChannelMessage,
  userAddress: string,
  emoji: string
): boolean {
  const reaction = message.reactions?.find(r => r.emoji === emoji);
  return reaction ? reaction.users.includes(userAddress) : false;
}

/**
 * Get reaction count for specific emoji
 */
export function getReactionCount(message: ChannelMessage, emoji: string): number {
  const reaction = message.reactions?.find(r => r.emoji === emoji);
  return reaction?.count || 0;
}
