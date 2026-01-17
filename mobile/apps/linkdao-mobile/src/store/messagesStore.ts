/**
 * Messages Store
 * Manages conversations and messages state using Zustand
 */

import { create } from 'zustand';

export interface Message {
  id: string;
  conversationId: string;
  fromAddress: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  isOwn: boolean;
  contentType?: 'text' | 'image' | 'file' | 'voice';
  replyToId?: string;
  editedAt?: string;
  deliveryStatus?: 'sent' | 'delivered' | 'read';
}

export interface Conversation {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isOnline: boolean;
  isGroup: boolean;
  participants: string[];
  isPublic?: boolean;
  description?: string;
  memberCount?: number;
  inviteCode?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface Contact {
  address: string;
  name?: string;
  displayName?: string;
  avatar?: string;
  ens?: string;
  addedAt: string;
  category?: string;
  notes?: string;
}

export interface TypingIndicator {
  conversationId: string;
  userAddress: string;
  isTyping: boolean;
  timestamp: string;
}

export interface OnlineStatus {
  address: string;
  isOnline: boolean;
  lastSeen: string;
}

interface MessagesState {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  contacts: Contact[];
  onlineUsers: Set<string>;
  typingIndicators: Map<string, Set<string>>;
  loading: boolean;
  error: string | null;

  // Actions
  setConversations: (conversations: Conversation[]) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (messageId: string) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  addConversation: (conversation: Conversation) => void;
  removeConversation: (id: string) => void;
  markAsRead: (conversationId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Contact actions
  setContacts: (contacts: Contact[]) => void;
  addContact: (contact: Contact) => void;
  updateContact: (address: string, updates: Partial<Contact>) => void;
  removeContact: (address: string) => void;
  
  // Online status actions
  setOnlineStatus: (address: string, isOnline: boolean) => void;
  setOnlineUsers: (addresses: string[]) => void;
  
  // Typing indicator actions
  setTypingIndicator: (conversationId: string, userAddress: string, isTyping: boolean) => void;
  clearTypingIndicators: (conversationId: string) => void;
  
  reset: () => void;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  conversations: [],
  messages: {},
  contacts: [],
  onlineUsers: new Set(),
  typingIndicators: new Map(),
  loading: false,
  error: null,

  setConversations: (conversations) => set({ conversations }),

  setMessages: (conversationId, messages) => set((state) => ({
    messages: { ...state.messages, [conversationId]: messages },
  })),

  addMessage: (conversationId, message) => set((state) => ({
    messages: {
      ...state.messages,
      [conversationId]: [...(state.messages[conversationId] || []), message],
    },
  })),

  updateMessage: (messageId, updates) => set((state) => {
    const newMessages = { ...state.messages };
    Object.keys(newMessages).forEach(convId => {
      newMessages[convId] = newMessages[convId].map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      );
    });
    return { messages: newMessages };
  }),

  deleteMessage: (messageId) => set((state) => {
    const newMessages = { ...state.messages };
    Object.keys(newMessages).forEach(convId => {
      newMessages[convId] = newMessages[convId].filter(msg => msg.id !== messageId);
    });
    return { messages: newMessages };
  }),

  updateConversation: (id, updates) => set((state) => ({
    conversations: state.conversations.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    ),
  })),

  addConversation: (conversation) => set((state) => ({
    conversations: [conversation, ...state.conversations],
  })),

  removeConversation: (id) => set((state) => ({
    conversations: state.conversations.filter((c) => c.id !== id),
  })),

  markAsRead: (conversationId) => set((state) => ({
    conversations: state.conversations.map((c) =>
      c.id === conversationId ? { ...c, unreadCount: 0 } : c
    ),
  })),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  setContacts: (contacts) => set({ contacts }),

  addContact: (contact) => set((state) => ({
    contacts: [contact, ...state.contacts],
  })),

  updateContact: (address, updates) => set((state) => ({
    contacts: state.contacts.map((c) =>
      c.address === address ? { ...c, ...updates } : c
    ),
  })),

  removeContact: (address) => set((state) => ({
    contacts: state.contacts.filter((c) => c.address !== address),
  })),

  setOnlineStatus: (address, isOnline) => set((state) => {
    const newOnlineUsers = new Set(state.onlineUsers);
    if (isOnline) {
      newOnlineUsers.add(address);
    } else {
      newOnlineUsers.delete(address);
    }
    return { onlineUsers: newOnlineUsers };
  }),

  setOnlineUsers: (addresses) => set({ onlineUsers: new Set(addresses) }),

  setTypingIndicator: (conversationId, userAddress, isTyping) => set((state) => {
    const newTypingIndicators = new Map(state.typingIndicators);
    let users = newTypingIndicators.get(conversationId) || new Set();
    
    if (isTyping) {
      users.add(userAddress);
    } else {
      users.delete(userAddress);
    }
    
    newTypingIndicators.set(conversationId, users);
    return { typingIndicators: newTypingIndicators };
  }),

  clearTypingIndicators: (conversationId) => set((state) => {
    const newTypingIndicators = new Map(state.typingIndicators);
    newTypingIndicators.delete(conversationId);
    return { typingIndicators: newTypingIndicators };
  }),

  reset: () => set({
    conversations: [],
    messages: {},
    contacts: [],
    onlineUsers: new Set(),
    typingIndicators: new Map(),
    loading: false,
    error: null,
  }),
}));