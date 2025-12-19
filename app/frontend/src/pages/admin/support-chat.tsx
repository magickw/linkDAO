import React, { useState, useEffect, useRef } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { io, Socket } from 'socket.io-client';
import { 
  MessageCircle, 
  Send, 
  User, 
  Clock, 
  CheckCircle,
  XCircle,
  Users,
  Ticket,
  Search,
  History,
  Activity,
  TrendingUp
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sessionId: string;
  sender: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  userId: string;
  createdAt: Date;
  messageCount: number;
  messages?: ChatMessage[];
}

const SupportChatPage: NextPage = () => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [waitingSessions, setWaitingSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<ChatSession[]>([]);
  const [view, setView] = useState<'waiting' | 'history'>('waiting');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    totalToday: 0,
    activeNow: 0,
    avgResponseTime: '0s',
    resolvedToday: 0
  });
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const hasAccess = user && (
      user.role === 'admin' || 
      user.role === 'super_admin' || 
      user.role === 'support' ||
      user.permissions?.includes('support.chat') ||
      user.permissions?.includes('*')
    );

    if (!hasAccess) {
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';
    const token = localStorage.getItem('token') || user.address;

    const newSocket = io(`${baseUrl}/chat/agent`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    newSocket.on('connect', () => {
      setConnected(true);
    });

    newSocket.on('waiting-sessions', (sessions: ChatSession[]) => {
      setWaitingSessions(sessions);
    });

    newSocket.on('new-session', (session: ChatSession) => {
      setWaitingSessions(prev => [...prev, session]);
    });

    newSocket.on('session-accepted', (data: { sessionId: string; userId: string; messages: ChatMessage[] }) => {
      const session = {
        id: data.sessionId,
        userId: data.userId,
        createdAt: new Date(),
        messageCount: data.messages.length,
        messages: data.messages
      };
      setActiveSession(session);
      setMessages(data.messages);
      setWaitingSessions(prev => prev.filter(s => s.id !== data.sessionId));
      setStats(prev => ({ ...prev, activeNow: prev.activeNow + 1 }));
    });

    newSocket.on('chat-message', (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
      setActiveSession(prev => prev ? { ...prev, messageCount: prev.messageCount + 1 } : null);
    });

    newSocket.on('session-closed', (data: { sessionId: string }) => {
      if (activeSession?.id === data.sessionId) {
        setSessionHistory(prev => [activeSession, ...prev]);
        setActiveSession(null);
        setMessages([]);
        setStats(prev => ({ 
          ...prev, 
          activeNow: Math.max(0, prev.activeNow - 1),
          resolvedToday: prev.resolvedToday + 1
        }));
      }
    });

    newSocket.on('error', (error: any) => {
      console.error('Socket error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const acceptSession = (sessionId: string) => {
    if (!socket) return;
    socket.emit('accept-session', { sessionId });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !activeSession) return;

    const messageToSend = newMessage;
    setNewMessage('');

    socket.emit('chat-message', {
      sessionId: activeSession.id,
      content: messageToSend,
    }, (response: any) => {
      if (response?.success) {
        const message: ChatMessage = {
          id: `temp-${Date.now()}`,
          sessionId: activeSession.id,
          sender: 'agent',
          content: messageToSend,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, message]);
      }
    });
  };

  const handleTyping = () => {
    if (!socket || !activeSession) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', { sessionId: activeSession.id, isTyping: true });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing', { sessionId: activeSession.id, isTyping: false });
    }, 1000);
  };

  const closeSession = () => {
    if (!socket || !activeSession) return;
    socket.emit('close-session', { sessionId: activeSession.id });
    setActiveSession(null);
    setMessages([]);
  };

  const hasAccess = user && (
    user.role === 'admin' || 
    user.role === 'super_admin' || 
    user.role === 'support' ||
    user.permissions?.includes('support.chat') ||
    user.permissions?.includes('*')
  );

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Support Chat Dashboard - LinkDAO</title>
        <meta name="description" content="Manage customer support chat sessions" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                <MessageCircle className="w-8 h-8 mr-3 text-blue-600 dark:text-blue-400" />
                Support Chat Dashboard
              </h1>
              <div className="flex items-center space-x-3">
                <Link
                  href="/support/tickets"
                  className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Ticket className="w-4 h-4 mr-2" />
                  Tickets
                </Link>
                {(user.role === 'admin' || user.role === 'super_admin') && (
                  <Link
                    href="/admin/employees"
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Employees
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center ${connected ? 'text-green-600' : 'text-red-600'}`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                {connected ? 'Connected' : 'Disconnected'}
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                <Users className="w-4 h-4 inline mr-1" />
                {waitingSessions.length} waiting
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    {view === 'waiting' ? 'Waiting Sessions' : 'Session History'}
                  </h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search sessions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
                  {view === 'waiting' ? (
                    waitingSessions.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium mb-1">No waiting sessions</p>
                        <p className="text-xs">New chats will appear here</p>
                      </div>
                    ) : (
                      waitingSessions
                        .filter(s => !searchQuery || s.userId.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((session) => (
                          <div
                            key={session.id}
                            className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-2">
                                  <User className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white block">
                                    User {session.userId.substring(0, 8)}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {session.messageCount} messages
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center text-xs text-gray-500">
                                <Clock className="w-3 h-3 mr-1" />
                                {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            <button
                              onClick={() => acceptSession(session.id)}
                              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all text-sm font-medium shadow-sm"
                            >
                              Accept Chat
                            </button>
                          </div>
                        ))
                    )
                  ) : (
                    sessionHistory.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium mb-1">No session history</p>
                        <p className="text-xs">Completed chats will appear here</p>
                      </div>
                    ) : (
                      sessionHistory
                        .filter(s => !searchQuery || s.userId.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((session) => (
                          <div
                            key={session.id}
                            className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center mr-2">
                                  <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white block">
                                    User {session.userId.substring(0, 8)}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {session.messageCount} messages
                                  </span>
                                </div>
                              </div>
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              Completed at {new Date(session.createdAt).toLocaleTimeString()}
                            </div>
                          </div>
                        ))
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                {!activeSession ? (
                  <div className="flex items-center justify-center h-[600px]">
                    <div className="text-center text-gray-500 dark:text-gray-400">
                      <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Select a session to start chatting</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Chat with User {activeSession.userId.substring(0, 8)}...
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Session started {new Date(activeSession.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <button
                        onClick={closeSession}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <XCircle className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="h-[450px] overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex mb-4 ${message.sender === 'agent' ? 'justify-end' : 'justify-start'}`}
                        >
                          {message.sender === 'user' && (
                            <div className="flex-shrink-0 mr-3">
                              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                              </div>
                            </div>
                          )}
                          <div
                            className={`max-w-xs md:max-w-md lg:max-w-lg ${
                              message.sender === 'agent'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                            } rounded-lg px-4 py-2 shadow`}
                          >
                            <p>{message.content}</p>
                            <div
                              className={`text-xs mt-1 ${
                                message.sender === 'agent' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                              }`}
                            >
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                      {/* Quick Reply Templates */}
                      <div className="mb-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => setNewMessage('Thank you for contacting support. How can I help you today?')}
                          className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          Greeting
                        </button>
                        <button
                          onClick={() => setNewMessage('I understand your concern. Let me look into this for you.')}
                          className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          Acknowledge
                        </button>
                        <button
                          onClick={() => setNewMessage('This issue has been resolved. Is there anything else I can help you with?')}
                          className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          Resolved
                        </button>
                      </div>
                      <form onSubmit={handleSendMessage} className="flex">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => {
                            setNewMessage(e.target.value);
                            handleTyping();
                          }}
                          placeholder="Type your message..."
                          className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={!newMessage.trim()}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-r-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </form>
                      {isTyping && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Agent is typing...
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SupportChatPage;
