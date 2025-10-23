import React, { useState, useEffect, useRef } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Send, 
  Phone, 
  Mail, 
  User, 
  Bot, 
  Clock, 
  Check, 
  X,
  MessageCircle,
  HelpCircle
} from 'lucide-react';

const LiveChatPage: NextPage = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'support',
      content: 'Hello! Welcome to LinkDAO Support. How can I help you today?',
      timestamp: new Date(Date.now() - 300000),
      read: true
    },
    {
      id: 2,
      sender: 'user',
      content: 'Hi, I\'m having trouble connecting my wallet to the platform.',
      timestamp: new Date(Date.now() - 240000),
      read: true
    },
    {
      id: 3,
      sender: 'support',
      content: 'I\'d be happy to help you with that. Could you tell me which wallet you\'re trying to connect and what error message you\'re seeing?',
      timestamp: new Date(Date.now() - 180000),
      read: true
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      sender: 'user',
      content: newMessage,
      timestamp: new Date(),
      read: true
    };

    setMessages([...messages, userMessage]);
    setNewMessage('');
    setIsTyping(true);

    // Simulate support response after a delay
    setTimeout(() => {
      const supportResponse = {
        id: messages.length + 2,
        sender: 'support',
        content: 'Thanks for that information. This is a common issue. Try refreshing the page and ensuring you\'re on the official LinkDAO website (https://linkdao.io). If that doesn\'t work, you may need to reset your wallet connection in your wallet settings.',
        timestamp: new Date(),
        read: false
      };
      setMessages(prev => [...prev, supportResponse]);
      setIsTyping(false);
    }, 2000);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <Head>
        <title>Live Chat Support - LinkDAO</title>
        <meta name="description" content="Get instant help from LinkDAO support team through live chat" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link href="/support" className="flex items-center">
                  <MessageCircle className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-3" />
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">LinkDAO Support</h1>
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Online now
                </div>
                <Link 
                  href="/support/contact" 
                  className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <Phone className="w-4 h-4 mr-1" />
                  Call
                </Link>
                <Link 
                  href="/support/contact" 
                  className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <Mail className="w-4 h-4 mr-1" />
                  Email
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
              <div className="flex items-center">
                <div className="relative">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <Bot className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div className="ml-3">
                  <h2 className="font-semibold">Support Agent</h2>
                  <div className="text-sm text-blue-100 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    Responds in 2 minutes
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="h-96 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`flex mb-4 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.sender === 'support' && (
                    <div className="flex-shrink-0 mr-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  )}
                  <div className={`max-w-xs md:max-w-md lg:max-w-lg ${message.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'} rounded-lg px-4 py-2 shadow`}>
                    <p>{message.content}</p>
                    <div className={`text-xs mt-1 ${message.sender === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'} flex items-center`}>
                      {message.sender === 'support' && message.read && (
                        <Check className="w-3 h-3 mr-1" />
                      )}
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                  {message.sender === 'user' && (
                    <div className="flex-shrink-0 ml-3">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {isTyping && (
                <div className="flex mb-4">
                  <div className="flex-shrink-0 mr-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-4 py-2 shadow">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
              <form onSubmit={handleSendMessage} className="flex">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-r-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Support is available 24/7. For urgent issues, please call +1-800-LINKDAO
              </div>
            </div>
          </div>

          {/* Quick Help */}
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <HelpCircle className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
              Need help with something specific?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: "Wallet Connection", href: "/docs/wallet-setup", icon: "💳" },
                { title: "LDAO Tokens", href: "/docs/ldao-token-guide", icon: "💰" },
                { title: "Marketplace", href: "/docs/marketplace-guide", icon: "🏪" },
                { title: "Governance", href: "/docs/governance-guide", icon: "🏛️" },
                { title: "Security", href: "/docs/security-guide", icon: "🔒" },
                { title: "Technical Issues", href: "/docs/troubleshooting", icon: "🔧" }
              ].map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <span className="text-xl mr-3">{item.icon}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LiveChatPage;