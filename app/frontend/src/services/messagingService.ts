/**
 * Wallet-to-Wallet Messaging Service
 * Provides instant chat, encryption, multi-device support, and message management
 */

import { webSocketService } from './webSocketService';
import { ethers } from 'ethers';

export interface ChatMessage {
  id: string;
  fromAddress: string;
  toAddress: string;
  content: string;
  encryptedContent?: string;
  timestamp: Date;
  messageType: 'text' | 'nft_offer' | 'nft_counter' | 'system' | 'file';
  isEncrypted: boolean;
  isRead: boolean;
  isDelivered: boolean;
  metadata?: {
    nftContract?: string;
    nftTokenId?: string;
    offerAmount?: string;
    originalMessageId?: string; // For replies/counters
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    rewardAmount?: string;
    transactionHash?: string;
  };
  signature?: string;
  chainId?: number;
}

export interface ChatConversation {
  id: string;
  participants: string[];
  lastMessage?: ChatMessage;
  lastActivity: Date;
  unreadCount: number;
  isBlocked: boolean;
  isPinned: boolean;
  metadata?: {
    conversationName?: string;
    groupAdmin?: string;
  };
}

export interface MessageNotification {
  id: string;
  type: 'new_message' | 'nft_offer' | 'message_read' | 'user_typing';
  fromAddress: string;
  toAddress: string;
  conversationId: string;
  content?: string;
  timestamp: Date;
  isRead: boolean;
}

export interface UserPresence {
  address: string;
  isOnline: boolean;
  lastSeen: Date;
  currentDevice?: string;
  chainId?: number;
}

export interface BlockedUser {
  address: string;
  blockedAt: Date;
  reason?: string;
}

export interface ChatChannel {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  isInviteOnly: boolean;
  members: string[];
  admins: string[];
  createdAt: Date;
  createdBy: string;
  topic?: string;
  memberCount: number;
  unreadCount: number;
  lastMessage?: ChatMessage;
  isPinned?: boolean;
}

export interface ChannelMessage extends ChatMessage {
  channelId: string;
  threadId?: string; // For threaded replies
  reactions?: {
    emoji: string;
    count: number;
    users: string[];
  }[];
  isPinned?: boolean;
}

class MessagingService {
  private wallet: ethers.Wallet | null = null;
  private currentAddress: string | null = null;
  private conversations: Map<string, ChatConversation> = new Map();
  private messages: Map<string, ChatMessage[]> = new Map();
  private blockedUsers: Set<string> = new Set();
  private cryptoKey: CryptoKey | null = null;
  private isInitialized = false;
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();

  // Events
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    this.initializeWebSocketListeners();
  }

  /**
   * Initialize the messaging service with a wallet
   */
  async initialize(wallet: ethers.Wallet | ethers.Signer): Promise<void> {
    try {
      if (wallet instanceof ethers.Wallet) {
        this.wallet = wallet;
      } else {
        // Convert signer to wallet if possible
        const address = await wallet.getAddress();
        this.currentAddress = address.toLowerCase();
      }

      if (this.wallet) {
        this.currentAddress = this.wallet.address.toLowerCase();
      }

      if (!this.currentAddress) {
        throw new Error('Unable to get wallet address');
      }

      // Generate or retrieve encryption key
      await this.initializeEncryption();

      // Connect to WebSocket and register
      webSocketService.connect();
      webSocketService.register(this.currentAddress);

      // Load existing data
      await this.loadConversations();
      await this.loadBlockedUsers();

      this.isInitialized = true;
      this.emit('initialized');

      console.log('Messaging service initialized for address:', this.currentAddress);
    } catch (error) {
      console.error('Failed to initialize messaging service:', error);
      throw error;
    }
  }

  /**
   * Initialize end-to-end encryption
   */
  private async initializeEncryption(): Promise<void> {
    try {
      // Generate a key for AES encryption
      // In a real implementation, this would be derived from the wallet's private key
      this.cryptoKey = await crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      throw error;
    }
  }

  /**
   * Encrypt message content
   */
  private async encryptMessage(content: string, recipientAddress: string): Promise<string> {
    if (!this.cryptoKey) {
      throw new Error('Encryption not initialized');
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      
      // Generate a random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt the data
      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        this.cryptoKey,
        data
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      // Convert to base64
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Failed to encrypt message:', error);
      throw error;
    }
  }

  /**
   * Decrypt message content
   */
  private async decryptMessage(encryptedContent: string): Promise<string> {
    if (!this.cryptoKey) {
      throw new Error('Encryption not initialized');
    }

    try {
      // Convert from base64
      const combined = new Uint8Array(
        atob(encryptedContent).split('').map(char => char.charCodeAt(0))
      );

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encryptedData = combined.slice(12);

      // Decrypt the data
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        this.cryptoKey,
        encryptedData
      );

      // Convert back to string
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      throw error;
    }
  }

  /**
   * Sign a message with the wallet
   */
  private async signMessage(message: ChatMessage): Promise<string> {
    if (!this.wallet && !this.currentAddress) {
      throw new Error('Wallet not available for signing');
    }

    const messageHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(
        `${message.fromAddress}${message.toAddress}${message.content}${message.timestamp.getTime()}`
      )
    );

    if (this.wallet) {
      return await this.wallet.signMessage(ethers.utils.arrayify(messageHash));
    }

    // For external signers, we'd need to request signature through the provider
    return '';
  }

  /**
   * Send a message
   */
  async sendMessage(
    toAddress: string,
    content: string,
    messageType: ChatMessage['messageType'] = 'text',
    metadata?: ChatMessage['metadata']
  ): Promise<ChatMessage> {
    if (!this.isInitialized || !this.currentAddress) {
      throw new Error('Messaging service not initialized');
    }

    if (this.isBlocked(toAddress)) {
      throw new Error('Cannot send message to blocked user');
    }

    try {
      const now = new Date();
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create message object
      const message: ChatMessage = {
        id: messageId,
        fromAddress: this.currentAddress,
        toAddress: toAddress.toLowerCase(),
        content,
        timestamp: now,
        messageType,
        isEncrypted: true,
        isRead: false,
        isDelivered: false,
        metadata,
        chainId: 1 // Default to mainnet, could be dynamic
      };

      // Encrypt content
      message.encryptedContent = await this.encryptMessage(content, toAddress);
      
      // Sign message
      message.signature = await this.signMessage(message);

      // Send via WebSocket
      webSocketService.send('send_message', message);

      // Add to local storage
      this.addMessageToConversation(message);

      // Update conversation
      const conversationId = this.getConversationId(this.currentAddress, toAddress);
      const conversation = this.conversations.get(conversationId);
      if (conversation) {
        conversation.lastMessage = message;
        conversation.lastActivity = now;
      } else {
        // Create new conversation
        const newConversation: ChatConversation = {
          id: conversationId,
          participants: [this.currentAddress, toAddress.toLowerCase()],
          lastMessage: message,
          lastActivity: now,
          unreadCount: 0,
          isBlocked: false,
          isPinned: false
        };
        this.conversations.set(conversationId, newConversation);
      }

      this.emit('message_sent', message);
      this.emit('conversation_updated', conversationId);

      return message;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Send NFT offer message
   */
  async sendNFTOffer(
    toAddress: string,
    nftContract: string,
    nftTokenId: string,
    offerAmount: string,
    message?: string
  ): Promise<ChatMessage> {
    const content = message || `NFT Offer: ${offerAmount} ETH for token #${nftTokenId}`;
    
    return this.sendMessage(toAddress, content, 'nft_offer', {
      nftContract,
      nftTokenId,
      offerAmount
    });
  }

  /**
   * Send NFT counter offer
   */
  async sendNFTCounter(
    toAddress: string,
    originalMessageId: string,
    counterAmount: string,
    message?: string
  ): Promise<ChatMessage> {
    const content = message || `Counter Offer: ${counterAmount} ETH`;
    
    return this.sendMessage(toAddress, content, 'nft_counter', {
      originalMessageId,
      offerAmount: counterAmount
    });
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(conversationId: string): Promise<void> {
    const messages = this.messages.get(conversationId);
    if (!messages) return;

    const unreadMessages = messages.filter(msg => 
      !msg.isRead && msg.toAddress === this.currentAddress
    );

    if (unreadMessages.length === 0) return;

    // Mark as read locally
    unreadMessages.forEach(msg => msg.isRead = true);

    // Update conversation unread count
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.unreadCount = 0;
    }

    // Notify server
    webSocketService.send('mark_read', {
      conversationId,
      messageIds: unreadMessages.map(msg => msg.id),
      readerAddress: this.currentAddress
    });

    this.emit('messages_read', conversationId, unreadMessages);
    this.emit('conversation_updated', conversationId);
  }

  /**
   * Start typing indicator
   */
  startTyping(conversationId: string): void {
    if (!this.currentAddress) return;

    // Clear existing timeout
    const existingTimeout = this.typingTimeouts.get(conversationId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Send typing start
    webSocketService.send('typing_start', {
      conversationId,
      userAddress: this.currentAddress
    });

    // Set timeout to stop typing
    const timeout = setTimeout(() => {
      this.stopTyping(conversationId);
    }, 5000); // Stop typing after 5 seconds

    this.typingTimeouts.set(conversationId, timeout);
  }

  /**
   * Stop typing indicator
   */
  stopTyping(conversationId: string): void {
    if (!this.currentAddress) return;

    const timeout = this.typingTimeouts.get(conversationId);
    if (timeout) {
      clearTimeout(timeout);
      this.typingTimeouts.delete(conversationId);
    }

    webSocketService.send('typing_stop', {
      conversationId,
      userAddress: this.currentAddress
    });
  }

  /**
   * Block a user
   */
  async blockUser(address: string, reason?: string): Promise<void> {
    const normalizedAddress = address.toLowerCase();
    
    if (this.blockedUsers.has(normalizedAddress)) {
      return; // Already blocked
    }

    this.blockedUsers.add(normalizedAddress);

    // Store in localStorage for persistence
    const blockedList = Array.from(this.blockedUsers);
    localStorage.setItem(`blocked_users_${this.currentAddress}`, JSON.stringify(blockedList));

    // Notify server
    webSocketService.send('block_user', {
      blockerAddress: this.currentAddress,
      blockedAddress: normalizedAddress,
      reason
    });

    this.emit('user_blocked', normalizedAddress);
  }

  /**
   * Unblock a user
   */
  async unblockUser(address: string): Promise<void> {
    const normalizedAddress = address.toLowerCase();
    
    if (!this.blockedUsers.has(normalizedAddress)) {
      return; // Not blocked
    }

    this.blockedUsers.delete(normalizedAddress);

    // Update localStorage
    const blockedList = Array.from(this.blockedUsers);
    localStorage.setItem(`blocked_users_${this.currentAddress}`, JSON.stringify(blockedList));

    // Notify server
    webSocketService.send('unblock_user', {
      blockerAddress: this.currentAddress,
      blockedAddress: normalizedAddress
    });

    this.emit('user_unblocked', normalizedAddress);
  }

  /**
   * Check if a user is blocked
   */
  isBlocked(address: string): boolean {
    return this.blockedUsers.has(address.toLowerCase());
  }

  /**
   * Get all conversations
   */
  getConversations(): ChatConversation[] {
    return Array.from(this.conversations.values())
      .sort((a, b) => {
        // Pinned conversations first
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        
        // Then by last activity
        return b.lastActivity.getTime() - a.lastActivity.getTime();
      });
  }

  /**
   * Get messages for a conversation
   */
  getMessages(conversationId: string): ChatMessage[] {
    return this.messages.get(conversationId) || [];
  }

  /**
   * Get conversation by participants
   */
  getConversationByParticipants(address1: string, address2: string): ChatConversation | null {
    const conversationId = this.getConversationId(address1, address2);
    return this.conversations.get(conversationId) || null;
  }

  /**
   * Search conversations and messages
   */
  searchConversations(query: string): {
    conversations: ChatConversation[];
    messages: { conversationId: string; message: ChatMessage }[];
  } {
    const queryLower = query.toLowerCase();
    const results = {
      conversations: [] as ChatConversation[],
      messages: [] as { conversationId: string; message: ChatMessage }[]
    };

    // Search conversations by participant addresses
    for (const conversation of this.conversations.values()) {
      const hasMatchingParticipant = conversation.participants.some(addr => 
        addr.toLowerCase().includes(queryLower)
      );
      
      if (hasMatchingParticipant) {
        results.conversations.push(conversation);
      }
    }

    // Search message content
    for (const [conversationId, messages] of this.messages.entries()) {
      for (const message of messages) {
        if (message.content.toLowerCase().includes(queryLower)) {
          results.messages.push({ conversationId, message });
        }
      }
    }

    return results;
  }

  /**
   * Get blocked users
   */
  getBlockedUsers(): string[] {
    return Array.from(this.blockedUsers);
  }

  /**
   * Initialize WebSocket listeners
   */
  private initializeWebSocketListeners(): void {
    webSocketService.on('message_received', async (message: ChatMessage) => {
      if (!this.currentAddress) return;

      // Ignore messages from blocked users
      if (this.isBlocked(message.fromAddress)) {
        return;
      }

      try {
        // Decrypt message if encrypted
        if (message.isEncrypted && message.encryptedContent) {
          message.content = await this.decryptMessage(message.encryptedContent);
        }

        // Add to local storage
        this.addMessageToConversation(message);

        // Update conversation
        const conversationId = this.getConversationId(message.fromAddress, message.toAddress);
        let conversation = this.conversations.get(conversationId);
        
        if (!conversation) {
          conversation = {
            id: conversationId,
            participants: [message.fromAddress, message.toAddress],
            lastMessage: message,
            lastActivity: message.timestamp,
            unreadCount: 1,
            isBlocked: false,
            isPinned: false
          };
          this.conversations.set(conversationId, conversation);
        } else {
          conversation.lastMessage = message;
          conversation.lastActivity = message.timestamp;
          if (message.toAddress === this.currentAddress && !message.isRead) {
            conversation.unreadCount++;
          }
        }

        this.emit('message_received', message);
        this.emit('conversation_updated', conversationId);
      } catch (error) {
        console.error('Failed to process received message:', error);
      }
    });

    webSocketService.on('message_delivered', (data: { messageId: string }) => {
      // Find and update message delivery status
      for (const messages of this.messages.values()) {
        const message = messages.find(msg => msg.id === data.messageId);
        if (message) {
          message.isDelivered = true;
          this.emit('message_delivered', message);
          break;
        }
      }
    });

    webSocketService.on('message_read', (data: { messageIds: string[]; readerAddress: string }) => {
      // Update read status for messages
      for (const messages of this.messages.values()) {
        for (const message of messages) {
          if (data.messageIds.includes(message.id) && message.fromAddress === this.currentAddress) {
            message.isRead = true;
            this.emit('message_read', message);
          }
        }
      }
    });

    webSocketService.on('user_typing', (data: { conversationId: string; userAddress: string }) => {
      if (data.userAddress !== this.currentAddress) {
        this.emit('user_typing', data);
      }
    });

    webSocketService.on('user_stopped_typing', (data: { conversationId: string; userAddress: string }) => {
      if (data.userAddress !== this.currentAddress) {
        this.emit('user_stopped_typing', data);
      }
    });

    webSocketService.on('user_presence', (presence: UserPresence) => {
      this.emit('user_presence', presence);
    });
  }

  /**
   * Helper methods
   */
  private getConversationId(address1: string, address2: string): string {
    const [addr1, addr2] = [address1.toLowerCase(), address2.toLowerCase()].sort();
    return `${addr1}_${addr2}`;
  }

  private addMessageToConversation(message: ChatMessage): void {
    const conversationId = this.getConversationId(message.fromAddress, message.toAddress);
    
    if (!this.messages.has(conversationId)) {
      this.messages.set(conversationId, []);
    }
    
    const messages = this.messages.get(conversationId)!;
    messages.push(message);
    
    // Sort by timestamp
    messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private async loadConversations(): Promise<void> {
    // In a real implementation, this would load from backend/IPFS
    const stored = localStorage.getItem(`conversations_${this.currentAddress}`);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        data.conversations.forEach((conv: any) => {
          this.conversations.set(conv.id, {
            ...conv,
            lastActivity: new Date(conv.lastActivity)
          });
        });
        
        data.messages.forEach((msgData: any) => {
          this.messages.set(msgData.conversationId, 
            msgData.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
          );
        });
      } catch (error) {
        console.error('Failed to load conversations:', error);
      }
    }
  }

  private async loadBlockedUsers(): Promise<void> {
    const stored = localStorage.getItem(`blocked_users_${this.currentAddress}`);
    if (stored) {
      try {
        const blockedList = JSON.parse(stored);
        this.blockedUsers = new Set(blockedList);
      } catch (error) {
        console.error('Failed to load blocked users:', error);
      }
    }
  }

  /**
   * Event handling
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, ...args: any[]): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in messaging listener for event ${event}:`, error);
        }
      });
    }
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
    this.typingTimeouts.clear();
    this.listeners.clear();
  }
}

// Export singleton instance
export const messagingService = new MessagingService();
export default messagingService;