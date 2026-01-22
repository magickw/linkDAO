import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Conversation, Message } from '../../types/messaging';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { useWebSocket } from '../../hooks/useWebSocket';
import { OrderConversationHeader } from './OrderConversationHeader';
import { PinnedMessageBanner, PinnedMessagesPanel } from './PinnedMessagesPanel';
import { MessageContextMenu, useMessageContextMenu } from './MessageContextMenu';
import { MessageThreadView } from './MessageThreadView';
import { MessageEditModal } from './MessageEditModal';
import { InlineSearchBar } from './MessageSearch';
import { PresenceIndicator } from './PresenceIndicator';
import { unifiedMessagingService } from '../../services/unifiedMessagingService';
import { Search } from 'lucide-react';

interface ConversationViewProps {
  conversation: Conversation;
  currentUserAddress: string;
  onBackToList: () => void;
  showBackButton: boolean;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  conversation,
  currentUserAddress,
  onBackToList,
  showBackButton,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Phase 5: Advanced features state
  const [showPinnedPanel, setShowPinnedPanel] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [quoteTarget, setQuoteTarget] = useState<Message | null>(null);
  const [editTarget, setEditTarget] = useState<Message | null>(null);
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({});
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [otherUserLastSeen, setOtherUserLastSeen] = useState<Date | undefined>();
  const { contextMenu, openContextMenu, closeContextMenu } = useMessageContextMenu();
  
  const { socket, isConnected } = useWebSocket({
    walletAddress: currentUserAddress,
    autoConnect: true
  });

  // Load messages when conversation changes
  useEffect(() => {
    if (conversation.id) {
      loadMessages();
      markAsRead();
    }
  }, [conversation.id]);

  // WebSocket event handlers
  useEffect(() => {
    if (socket && isConnected && conversation.id) {
      // Join conversation room
      socket.emit('join_conversation', conversation.id);

      // Listen for new messages
      socket.on('new_message', handleNewMessage);
      socket.on('typing_start', handleTypingStart);
      socket.on('typing_stop', handleTypingStop);
      socket.on('message_delivered', handleMessageDelivered);
      socket.on('message_read', handleMessageRead);
      // Phase 5: Advanced feature events
      socket.on('reaction_added', handleReactionAdded);
      socket.on('reaction_removed', handleReactionRemoved);
      socket.on('message_pinned', handleMessagePinned);
      socket.on('message_unpinned', handleMessageUnpinned);
      socket.on('message_edited', handleMessageEdited);
      socket.on('message_deleted', handleMessageDeleted);

      return () => {
        socket.emit('leave_conversation', conversation.id);
        socket.off('new_message', handleNewMessage);
        socket.off('typing_start', handleTypingStart);
        socket.off('typing_stop', handleTypingStop);
        socket.off('message_delivered', handleMessageDelivered);
        socket.off('message_read', handleMessageRead);
        socket.off('reaction_added', handleReactionAdded);
        socket.off('reaction_removed', handleReactionRemoved);
        socket.off('message_pinned', handleMessagePinned);
        socket.off('message_unpinned', handleMessageUnpinned);
        socket.off('message_edited', handleMessageEdited);
        socket.off('message_deleted', handleMessageDeleted);
      };
    }
  }, [socket, isConnected, conversation.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Keyboard shortcut for search (Ctrl/Cmd + F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Track other participant's presence
  useEffect(() => {
    const otherParticipant = conversation.participants.find(p => p !== currentUserAddress);
    if (!otherParticipant) return;

    // Check initial online status
    const isOnline = unifiedMessagingService.isUserOnline(otherParticipant);
    setOtherUserOnline(isOnline);

    // Subscribe to presence updates
    const unsubscribe = unifiedMessagingService.on('presence_update', (data) => {
      if (data.userAddress.toLowerCase() === otherParticipant.toLowerCase()) {
        setOtherUserOnline(data.isOnline);
        if (data.lastSeen) {
          setOtherUserLastSeen(data.lastSeen);
        }
      }
    });

    return () => unsubscribe();
  }, [conversation.participants, currentUserAddress]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/conversations/${conversation.id}/messages`, {
        headers: {
          'Authorization': `Bearer ${currentUserAddress}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Reverse messages to display oldest on top, newest at bottom
        // Backend returns messages in descending order (newest first)
        const messages = data.messages || data.data?.messages || [];
        setMessages([...messages].reverse());
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await fetch(`/api/conversations/${conversation.id}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${currentUserAddress}`,
        },
      });
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleNewMessage = (data: any) => {
    // Handle different WebSocket event formats
    const message = data.message || data;
    
    if (message.conversationId === conversation.id) {
      setMessages(prev => {
        // Check if message already exists to avoid duplicates
        const exists = prev.some(m => m.id === message.id);
        if (exists) {
          return prev;
        }
        return [...prev, message];
      });
      
      // Mark as read if message is from another user
      if (message.fromAddress !== currentUserAddress) {
        markAsRead();
      }
    }
  };

  const handleTypingStart = (data: { userId: string, conversationId: string }) => {
    if (data.conversationId === conversation.id && data.userId !== currentUserAddress) {
      setTypingUsers(prev => [...prev.filter(u => u !== data.userId), data.userId]);
    }
  };

  const handleTypingStop = (data: { userId: string, conversationId: string }) => {
    if (data.conversationId === conversation.id) {
      setTypingUsers(prev => prev.filter(u => u !== data.userId));
    }
  };

  const handleMessageDelivered = (data: { messageId: string, status: string }) => {
    setMessages(prev => prev.map(msg =>
      msg.id === data.messageId
        ? { ...msg, deliveryStatus: data.status as any }
        : msg
    ));
  };

  const handleMessageRead = (data: { conversationId: string, readerAddress?: string, userAddress?: string, readAt: string }) => {
    // When we receive a read receipt, mark all our messages in this conversation as read
    // The reader is the person who just read our messages
    const readerAddr = data.readerAddress || data.userAddress;
    if (data.conversationId === conversation.id && readerAddr?.toLowerCase() !== currentUserAddress.toLowerCase()) {
      setMessages(prev => prev.map(msg =>
        // Mark messages we sent as read (since the other person read them)
        msg.fromAddress === currentUserAddress && msg.deliveryStatus !== 'read'
          ? { ...msg, deliveryStatus: 'read' as const }
          : msg
      ));
    }
  };

  // Phase 5: Advanced feature handlers
  const handleReactionAdded = useCallback((data: { messageId: string; emoji: string; userId: string }) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id !== data.messageId) return msg;
      const reactions = [...(msg.reactions || [])];
      const existingReaction = reactions.find(r => r.emoji === data.emoji);
      if (existingReaction) {
        if (!existingReaction.users.includes(data.userId)) {
          existingReaction.count++;
          existingReaction.users.push(data.userId);
        }
      } else {
        reactions.push({ emoji: data.emoji, count: 1, users: [data.userId] });
      }
      return { ...msg, reactions };
    }));
  }, []);

  const handleReactionRemoved = useCallback((data: { messageId: string; emoji: string; userId: string }) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id !== data.messageId) return msg;
      const reactions = (msg.reactions || []).map(r => {
        if (r.emoji !== data.emoji) return r;
        return {
          ...r,
          count: Math.max(0, r.count - 1),
          users: r.users.filter(u => u !== data.userId)
        };
      }).filter(r => r.count > 0);
      return { ...msg, reactions };
    }));
  }, []);

  const handleMessagePinned = useCallback((data: { messageId: string; pinnedBy: string }) => {
    setMessages(prev => prev.map(msg =>
      msg.id === data.messageId
        ? { ...msg, isPinned: true, pinnedBy: data.pinnedBy, pinnedAt: new Date() }
        : msg
    ));
  }, []);

  const handleMessageUnpinned = useCallback((data: { messageId: string }) => {
    setMessages(prev => prev.map(msg =>
      msg.id === data.messageId
        ? { ...msg, isPinned: false, pinnedBy: undefined, pinnedAt: undefined }
        : msg
    ));
  }, []);

  const handleMessageEdited = useCallback((data: { messageId: string; content: string; editedAt: string }) => {
    setMessages(prev => prev.map(msg =>
      msg.id === data.messageId
        ? { ...msg, content: data.content, editedAt: new Date(data.editedAt) }
        : msg
    ));
  }, []);

  const handleMessageDeleted = useCallback((data: { messageId: string }) => {
    setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
  }, []);

  const handleReactionToggle = useCallback(async (messageId: string, emoji: string) => {
    try {
      const message = messages.find(m => m.id === messageId);
      const existingReaction = message?.reactions?.find(r => r.emoji === emoji);
      const hasReacted = existingReaction?.users.includes(currentUserAddress);

      if (hasReacted) {
        await unifiedMessagingService.removeReaction(messageId, emoji);
      } else {
        await unifiedMessagingService.addReaction(messageId, emoji);
      }
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
  }, [messages, currentUserAddress]);

  const handleContextMenuAction = useCallback((action: string, message: Message) => {
    switch (action) {
      case 'reply':
        setReplyTarget(message);
        break;
      case 'edit':
        setEditTarget(message);
        break;
      case 'thread':
        setActiveThreadId(message.id);
        break;
    }
    closeContextMenu();
  }, [closeContextMenu]);

  const handlePinToggle = useCallback((isPinned: boolean) => {
    // Refresh pinned messages if panel is open
    if (showPinnedPanel) {
      setShowPinnedPanel(false);
      setTimeout(() => setShowPinnedPanel(true), 100);
    }
  }, [showPinnedPanel]);

  const handleReplyCountChange = useCallback((messageId: string, count: number) => {
    setReplyCounts(prev => ({ ...prev, [messageId]: count }));
  }, []);

  const handleMessageEdit = useCallback((messageId: string, newContent: string) => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId
        ? { ...msg, content: newContent, editedAt: new Date() }
        : msg
    ));
    setEditTarget(null);
  }, []);

  const scrollToMessage = useCallback((messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight the message briefly
      element.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-75');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-75');
      }, 2000);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (
    content: string, 
    contentType: 'text' | 'image' | 'file' | 'voice' = 'text', 
    attachments?: any[],
    metadata?: any
  ) => {
    try {
      const response = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUserAddress}`,
        },
        body: JSON.stringify({
          content,
          contentType,
          attachments,
          metadata,
          // Support standard fields if backend expects them at root
          replyToId: metadata?.replyToId,
          quotedMessageId: metadata?.quotedMessageId
        }),
      });

      if (response.ok) {
        const newMessage = await response.json();
        // Optimistically add the message to the UI immediately
        if (newMessage && (newMessage.data || newMessage.message)) {
          const messageData = newMessage.data || newMessage.message;
          setMessages(prev => [...prev, messageData]);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (socket && isConnected) {
      if (isTyping) {
        socket.emit('typing_start', { 
          conversationId: conversation.id, 
          userId: currentUserAddress 
        });
      } else {
        socket.emit('typing_stop', { 
          conversationId: conversation.id, 
          userId: currentUserAddress 
        });
      }
    }
  };

  const getOtherParticipant = () => {
    return conversation.participants.find(p => p !== currentUserAddress) || 'Unknown';
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleViewOrder = (orderId: number) => {
    // In a real implementation, this would navigate to the order details page
    console.log('Viewing order:', orderId);
  };

  const handleTrackPackage = (trackingNumber: string) => {
    // In a real implementation, this would open the tracking details
    console.log('Tracking package:', trackingNumber);
  };

  return (
    <div className="conversation-view h-full flex flex-col relative">
      {/* Order Context Header */}
      <OrderConversationHeader
        conversation={{
          ...conversation,
          orderId: (conversation as any).orderId || 12345,
          contextMetadata: {
            productName: 'Wireless Headphones',
            productImage: '',
            orderStatus: 'shipped',
            orderId: (conversation as any).orderId || 12345
          }
        }}
        onViewOrder={handleViewOrder}
        onTrackPackage={handleTrackPackage}
      />

      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center space-x-3">
          {showBackButton && (
            <button
              onClick={onBackToList}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Participant Avatar with Presence */}
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
              {getOtherParticipant().slice(2, 4).toUpperCase()}
            </div>
            <div className="absolute bottom-0 right-0 transform translate-x-0.5 translate-y-0.5">
              <PresenceIndicator
                isOnline={otherUserOnline}
                lastSeen={otherUserLastSeen}
                size="md"
              />
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {truncateAddress(getOtherParticipant())}
              </h3>
              <PresenceIndicator
                isOnline={otherUserOnline}
                lastSeen={otherUserLastSeen}
                size="sm"
                showText={true}
              />
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              {conversation.isEncrypted && (
                <>
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-green-600 dark:text-green-400">End-to-end encrypted</span>
                </>
              )}
              {!isConnected && (
                <span className="text-yellow-600 dark:text-yellow-400">Offline</span>
              )}
            </div>
          </div>

          {/* Search Button */}
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            title="Search messages (Ctrl+F)"
          >
            <Search size={20} />
          </button>

          {/* Options Menu */}
          <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Inline Search Bar */}
      {showSearch && (
        <InlineSearchBar
          conversationId={conversation.id}
          onResultClick={scrollToMessage}
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* Pinned Messages Banner */}
      <PinnedMessageBanner
        conversationId={conversation.id}
        onExpand={() => setShowPinnedPanel(true)}
      />

      {/* Pinned Messages Panel (Overlay) */}
      {showPinnedPanel && (
        <div className="absolute top-0 left-0 right-0 z-30 shadow-lg">
          <PinnedMessagesPanel
            conversationId={conversation.id}
            currentUserAddress={currentUserAddress}
            isAdmin={false}
            onMessageClick={(messageId) => {
              const element = document.getElementById(`message-${messageId}`);
              element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              setShowPinnedPanel(false);
            }}
            onClose={() => setShowPinnedPanel(false)}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Messages Container */}
        <div
          ref={messagesContainerRef}
          className={`flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-800 ${
            activeThreadId ? 'hidden md:block md:w-1/2' : 'w-full'
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <div className="text-4xl mb-2">👋</div>
                <p>Start the conversation!</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div key={message.id} id={`message-${message.id}`}>
                  <MessageBubble
                    message={message}
                    isOwn={message.fromAddress === currentUserAddress}
                    currentUserAddress={currentUserAddress}
                    replyCount={replyCounts[message.id] || 0}
                    repliedToMessage={messages.find(m => m.id === message.replyToId)}
                    quotedMessage={messages.find(m => m.id === (message as any).quotedMessageId || message.metadata?.quotedMessageId)}
                    showAvatar={
                      index === 0 ||
                      messages[index - 1].fromAddress !== message.fromAddress
                    }
                    showTimestamp={
                      index === messages.length - 1 ||
                      messages[index + 1].fromAddress !== message.fromAddress ||
                      new Date(messages[index + 1].timestamp).getTime() - new Date(message.timestamp).getTime() > 300000
                    }
                    onContextMenu={(e, msg) => openContextMenu(e, {
                      messageId: msg.id,
                      conversationId: conversation.id,
                      senderAddress: msg.fromAddress,
                      content: msg.content,
                      isPinned: msg.isPinned
                    })}
                    onThreadClick={(messageId) => setActiveThreadId(messageId)}
                    onJumpToMessage={scrollToMessage}
                    onReactionToggle={handleReactionToggle}
                  />
                </div>
              ))}

              {/* Typing Indicator */}
              {typingUsers.length > 0 && (
                <TypingIndicator users={typingUsers} />
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Thread View (Side Panel) */}
        {activeThreadId && (
          <div className="w-full md:w-1/2 border-l border-gray-200 dark:border-gray-700">
            <MessageThreadView
              messageId={activeThreadId}
              conversationId={conversation.id}
              currentUserAddress={currentUserAddress}
              onClose={() => setActiveThreadId(null)}
              onReplyCountChange={handleReplyCountChange}
            />
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <MessageInput
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          disabled={!isConnected}
          placeholder={isConnected ? "Type a message..." : "Connecting..."}
          replyTarget={replyTarget}
          quoteTarget={quoteTarget}
          onCancelTarget={() => {
            setReplyTarget(null);
            setQuoteTarget(null);
          }}
        />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <MessageContextMenu
          messageId={contextMenu.messageId}
          conversationId={contextMenu.conversationId}
          currentUserAddress={currentUserAddress}
          senderAddress={contextMenu.senderAddress}
          content={contextMenu.content}
          isPinned={contextMenu.isPinned}
          position={contextMenu.position}
          onClose={closeContextMenu}
          onReply={() => {
            const msg = messages.find(m => m.id === contextMenu.messageId);
            if (msg) {
              setReplyTarget(msg);
              setQuoteTarget(null);
            }
          }}
          onQuote={() => {
            const msg = messages.find(m => m.id === contextMenu.messageId);
            if (msg) {
              setQuoteTarget(msg);
              setReplyTarget(null);
            }
          }}
          onEdit={() => {
            const msg = messages.find(m => m.id === contextMenu.messageId);
            if (msg) setEditTarget(msg);
          }}
          onPinToggle={handlePinToggle}
          onReactionAdd={(emoji) => handleReactionToggle(contextMenu.messageId, emoji)}
        />
      )}

      {/* Message Edit Modal */}
      {editTarget && (
        <MessageEditModal
          message={editTarget}
          conversationId={conversation.id}
          onClose={() => setEditTarget(null)}
          onSave={handleMessageEdit}
        />
      )}
    </div>
  );
};