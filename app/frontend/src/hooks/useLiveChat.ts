import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { liveChatService, ChatMessage } from '@/services/liveChatService';

export const useLiveChat = () => {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    if (!user?.address) {
      setError('Authentication required');
      return;
    }

    try {
      const id = await liveChatService.connect(user.address);
      setSessionId(id);
      setConnected(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  }, [user]);

  const sendMessage = useCallback((content: string) => {
    try {
      liveChatService.sendMessage(content);
      
      setMessages(prev => [...prev, {
        id: `temp-${Date.now()}`,
        sessionId: sessionId!,
        sender: 'user',
        content,
        timestamp: new Date(),
      }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  }, [sessionId]);

  const disconnect = useCallback(() => {
    liveChatService.disconnect();
    setConnected(false);
    setSessionId(null);
  }, []);

  useEffect(() => {
    if (!connected) return;

    liveChatService.onMessage((message) => {
      setMessages(prev => [...prev, message]);
    });

    liveChatService.onTyping((typing) => {
      setIsTyping(typing);
    });

    liveChatService.onAgentJoined((name) => {
      setAgentName(name);
    });

    return () => {
      disconnect();
    };
  }, [connected, disconnect]);

  return {
    connected,
    sessionId,
    messages,
    isTyping,
    agentName,
    error,
    connect,
    sendMessage,
    disconnect,
  };
};
