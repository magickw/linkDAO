import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  sender: 'buyer' | 'seller' | 'system';
  message: string;
  timestamp: string;
  read?: boolean;
}

interface OrderMessagingProps {
  orderId: string;
  orderNumber?: string;
  messages: Message[];
  buyerName?: string;
  onSendMessage: (orderId: string, message: string) => Promise<void>;
  onMarkRead?: (messageIds: string[]) => void;
  isLoading?: boolean;
  className?: string;
}

const quickReplies = [
  { id: 'shipped', text: 'Your order has shipped! You should receive tracking information shortly.' },
  { id: 'thankyou', text: 'Thank you for your order! We appreciate your business.' },
  { id: 'delay', text: 'We\'re experiencing a slight delay with your order. We apologize for the inconvenience and will update you soon.' },
  { id: 'ready', text: 'Your item is packed and ready for pickup/shipping!' },
  { id: 'question', text: 'Thank you for reaching out! I\'ll get back to you with more information shortly.' },
  { id: 'delivered', text: 'Your order has been marked as delivered. Please let us know if you have any questions!' },
];

export function OrderMessaging({
  orderId,
  orderNumber,
  messages,
  buyerName = 'Buyer',
  onSendMessage,
  onMarkRead,
  isLoading = false,
  className = '',
}: OrderMessagingProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark unread messages as read
  useEffect(() => {
    if (onMarkRead) {
      const unreadIds = messages
        .filter(m => m.sender === 'buyer' && !m.read)
        .map(m => m.id);
      if (unreadIds.length > 0) {
        onMarkRead(unreadIds);
      }
    }
  }, [messages, onMarkRead]);

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(orderId, newMessage.trim());
      setNewMessage('');
      setShowQuickReplies(false);
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickReply = (text: string) => {
    setNewMessage(text);
    setShowQuickReplies(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday ' + date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString(undefined, { weekday: 'short' }) + ' ' +
        date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
      date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className={`flex flex-col h-full bg-gray-900 rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">{buyerName.charAt(0)}</span>
            </div>
            <div>
              <p className="text-white font-medium text-sm">{buyerName}</p>
              <p className="text-gray-400 text-xs">Order #{orderNumber || orderId.slice(0, 8)}</p>
            </div>
          </div>
          <span className="text-xs text-gray-500">
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] max-h-[400px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Start a conversation with your buyer</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'seller' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                  max-w-[80%] rounded-2xl px-4 py-2
                  ${msg.sender === 'seller'
                    ? 'bg-purple-600 text-white rounded-br-md'
                    : msg.sender === 'system'
                      ? 'bg-gray-700/50 text-gray-400 text-center w-full max-w-full rounded-xl'
                      : 'bg-gray-800 text-white rounded-bl-md'
                  }
                `}
              >
                {msg.sender !== 'system' && (
                  <p className="text-xs opacity-75 mb-1">
                    {msg.sender === 'seller' ? 'You' : buyerName}
                  </p>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                <p className={`text-xs mt-1 ${msg.sender === 'seller' ? 'text-purple-200' : 'text-gray-500'}`}>
                  {formatTimestamp(msg.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies */}
      {showQuickReplies && (
        <div className="px-4 py-2 border-t border-gray-800 bg-gray-900/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Quick Replies</span>
            <button
              onClick={() => setShowQuickReplies(false)}
              className="text-gray-500 hover:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {quickReplies.map((reply) => (
              <button
                key={reply.id}
                onClick={() => handleQuickReply(reply.text)}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs text-left rounded-lg transition-colors line-clamp-2"
              >
                {reply.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowQuickReplies(!showQuickReplies)}
            className={`p-2 rounded-lg transition-colors ${
              showQuickReplies
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            title="Quick replies"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 pr-12 text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent max-h-32"
              style={{ minHeight: '42px' }}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className="p-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl transition-colors"
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrderMessaging;
