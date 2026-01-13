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
}

interface MessagesState {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  loading: boolean;
  error: string | null;

  // Actions
  setConversations: (conversations: Conversation[]) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  markAsRead: (conversationId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  conversations: [],
  messages: {},
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

  updateConversation: (id, updates) => set((state) => ({
    conversations: state.conversations.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    ),
  })),

  markAsRead: (conversationId) => set((state) => ({
    conversations: state.conversations.map((c) =>
      c.id === conversationId ? { ...c, unreadCount: 0 } : c
    ),
  })),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  reset: () => set({
    conversations: [],
    messages: {},
    loading: false,
    error: null,
  }),
}));