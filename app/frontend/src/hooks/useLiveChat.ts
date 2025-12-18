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
  const [waitingPosition, setWaitingPosition] = useState<number | null>(null);

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

  const sendMessage = useCallback(async (content: string) => {
    if (!sessionId) {
      setError('Not connected to chat');
      return;
    }

    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      sessionId: sessionId,
      sender: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, tempMessage]);

    try {
      await liveChatService.sendMessage(content);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
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
      setWaitingPosition(null);
    });

    liveChatService.onWaitingForAgent((data) => {
      setWaitingPosition(data.position);
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
    waitingPosition,
    connect,
    sendMessage,
    disconnect,
  };
};
