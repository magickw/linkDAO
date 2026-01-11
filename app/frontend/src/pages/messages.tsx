import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { MessageCircle, Send, X, Users, Search, Paperclip, RefreshCw } from 'lucide-react';
import Layout from '@/components/Layout';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import { useUnifiedMessaging, useConversationMessages, useTypingIndicator } from '@/hooks/useUnifiedMessaging';
import { useWeb3 } from '@/context/Web3Context';
import { Message, Conversation } from '@/types/messaging';

interface LocalConversation {
  id: string;
  participants: string[];
  participantName: string;
  participantAvatar: string;
  lastMessage?: string;
  lastActivity: Date;
  unreadCount: number;
  isOnline: boolean;
}

function getAvatarUrl(profileCid: string | undefined, walletAddress?: string): string {
  // If no profile data provided, generate a fallback avatar
  if (!profileCid || profileCid.trim() === '') {
    return walletAddress
      ? `https://api.dicebear.com/7.x/identicon/svg?seed=${walletAddress}&backgroundColor=b6e3f4`
      : '/images/default-avatar.png';
  }

  // Check if it's a valid IPFS CID (starts with Qm or bafy)
  if (profileCid.startsWith('Qm') || profileCid.startsWith('bafy')) {
    return `https://ipfs.io/ipfs/${profileCid}`;
  }

  // Check if it's already a full URL (http:// or https://)
  if (profileCid.startsWith('http://') || profileCid.startsWith('https://')) {
    return profileCid;
  }

  // If it starts with /ipfs/, construct the full IPFS URL
  if (profileCid.startsWith('/ipfs/')) {
    return `https://ipfs.io${profileCid}`;
  }

  // If none of the above, assume it's a relative path or invalid, return fallback
  return walletAddress
    ? `https://api.dicebear.com/7.x/identicon/svg?seed=${walletAddress}&backgroundColor=b6e3f4`
    : '/images/default-avatar.png';
}

const MessagesPage: React.FC = () => {
  const router = useRouter();
  const { to } = router.query;
  const { address: account } = useWeb3();

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Use the unified messaging hook
  const {
    conversations: rawConversations,
    isLoading,
    isInitialized,
    error,
    connectionMode,
    getOrCreateDMConversation,
    sendMessage,
    markAsRead,
    forceSync,
    isUserOnline
  } = useUnifiedMessaging({
    walletAddress: account || undefined,
    autoInitialize: !!account
  });

  const [localConversations, setLocalConversations] = useState<LocalConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<LocalConversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use the conversation messages hook for the active conversation
  const {
    messages: rawMessages,
    isLoading: messagesLoading,
    refresh: refreshMessages
  } = useConversationMessages(activeConversation?.id || null, {
    walletAddress: account || undefined,
    autoLoad: !!activeConversation
  });

  // Typing indicator
  const { handleTyping, stopTyping } = useTypingIndicator(activeConversation?.id || null);

  // Transform conversations to local format with user details
  useEffect(() => {
    const transformConversations = async () => {
      if (!rawConversations || rawConversations.length === 0) {
        setLocalConversations([]);
        return;
      }

      const transformed = await Promise.all(
        rawConversations.map(async (conv) => {
          // Find the other participant (not current user)
          const otherParticipant = conv.participants.find(p => p.toLowerCase() !== account?.toLowerCase());

          // Get user details if available
          let participantName = otherParticipant || 'Unknown User';
          let participantAvatar = otherParticipant
            ? `https://api.dicebear.com/7.x/identicon/svg?seed=${otherParticipant}&backgroundColor=b6e3f4`
            : '/images/default-avatar.png';

          if (otherParticipant) {
            try {
              // Try to get user details from API
              const userResponse = await fetch(`/api/users/${otherParticipant}`);
              if (userResponse.ok) {
                const userData = await userResponse.json();
                // Prioritize storeName for sellers, then displayName, username, or name
                participantName = userData.data?.storeName ||
                  userData.data?.displayName ||
                  userData.data?.username ||
                  userData.data?.name ||
                  formatAddress(otherParticipant);
                const rawAvatarUrl = userData.data?.profileImageCdn ||
                  userData.data?.profilePicture ||
                  userData.data?.avatarUrl ||
                  userData.data?.avatarCid ||
                  userData.data?.profileImageUrl;
                participantAvatar = getAvatarUrl(rawAvatarUrl, otherParticipant);
              } else {
                participantName = formatAddress(otherParticipant);
              }
            } catch (error) {
              console.warn('Could not fetch user details:', error);
              participantName = formatAddress(otherParticipant);
            }
          }

          return {
            id: conv.id,
            participants: conv.participants,
            participantName,
            participantAvatar,
            lastMessage: conv.lastMessage?.content,
            lastActivity: new Date(conv.lastActivity),
            unreadCount: account ? (conv.unreadCounts?.[account] || 0) : 0,
            isOnline: otherParticipant ? isUserOnline(otherParticipant) : false
          };
        })
      );

      setLocalConversations(transformed);
    };

    if (account) {
      transformConversations();
    }
  }, [rawConversations, account, isUserOnline]);

  // Handle URL query parameter for opening a specific conversation
  useEffect(() => {
    const openConversation = async () => {
      if (to && account && isInitialized) {
        const recipientAddress = to as string;

        // Check if conversation already exists in local state
        const existingConv = localConversations.find(c =>
          c.participants.some(p => p.toLowerCase() === recipientAddress.toLowerCase())
        );

        if (existingConv) {
          setActiveConversation(existingConv);
        } else {
          // Create or get the DM conversation
          try {
            const conversation = await getOrCreateDMConversation(recipientAddress);

            // Create local representation
            const newLocalConv: LocalConversation = {
              id: conversation.id,
              participants: conversation.participants,
              participantName: formatAddress(recipientAddress),
              participantAvatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${recipientAddress}&backgroundColor=b6e3f4`,
              lastMessage: undefined,
              lastActivity: new Date(),
              unreadCount: 0,
              isOnline: isUserOnline(recipientAddress)
            };

            setActiveConversation(newLocalConv);
          } catch (error) {
            console.error('Failed to create conversation:', error);
          }
        }
      }
    };

    openConversation();
  }, [to, account, isInitialized, localConversations, getOrCreateDMConversation, isUserOnline]);

  // Mark messages as read when viewing a conversation
  useEffect(() => {
    if (activeConversation && isInitialized) {
      markAsRead(activeConversation.id);
    }
  }, [activeConversation, isInitialized, markAsRead]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [rawMessages]);

  const handleSendMessage = async () => {
    if (newMessage.trim() === '' || !activeConversation || !account || !isInitialized) return;

    try {
      stopTyping();

      // Send message using unified messaging service
      await sendMessage({
        conversationId: activeConversation.id,
        content: newMessage.trim(),
        contentType: 'text'
      });

      // Clear input
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const handleConversationSelect = (conversation: LocalConversation) => {
    setActiveConversation(conversation);

    // Get the other participant's address
    const otherParticipant = conversation.participants.find(p => p.toLowerCase() !== account?.toLowerCase());
    if (otherParticipant) {
      router.push(`/messages?to=${otherParticipant}`, undefined, { shallow: true });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    handleTyping();
  };

  const handleRefresh = async () => {
    await forceSync();
    if (activeConversation) {
      await refreshMessages();
    }
  };

  // Filter conversations by search query
  const filteredConversations = localConversations.filter(conv =>
    conv.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participants.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading && !isInitialized) {
    return (
      <Layout title="Messages | LinkDAO" fullWidth={true}>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-white">
              {error ? (
                <span className="text-red-400">Error: {error}</span>
              ) : (
                'Loading messages...'
              )}
            </p>
            {error && (
              <button
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Messages | LinkDAO" fullWidth={true}>
      <Head>
        <title>Messages | LinkDAO</title>
        <meta name="description" content="Direct messaging with sellers" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          <GlassPanel variant="secondary" className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-white flex items-center">
                <MessageCircle className="mr-2" size={24} />
                Messages
                {connectionMode !== 'websocket' && (
                  <span className="ml-2 text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded">
                    {connectionMode === 'offline' ? 'Offline' : 'Polling'}
                  </span>
                )}
              </h1>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                </Button>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search className="absolute right-3 top-2.5 text-white/50" size={18} />
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              {/* Conversations List */}
              <div className="w-full md:w-1/3">
                <div className="bg-white/5 rounded-lg p-4">
                  <h2 className="text-lg font-semibold text-white mb-4">Conversations</h2>
                  <div className="space-y-3">
                    {filteredConversations.length > 0 ? (
                      filteredConversations.map((conversation) => (
                        <div
                          key={conversation.id}
                          className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${activeConversation?.id === conversation.id
                            ? 'bg-blue-600/30 border border-blue-500/50'
                            : 'hover:bg-white/10'
                            }`}
                          onClick={() => handleConversationSelect(conversation)}
                        >
                          <div className="relative">
                            <img
                              src={conversation.participantAvatar}
                              alt={conversation.participantName}
                              className="w-12 h-12 rounded-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                const otherParticipant = conversation.participants.find(p => p.toLowerCase() !== account?.toLowerCase());
                                target.src = otherParticipant
                                  ? `https://api.dicebear.com/7.x/identicon/svg?seed=${otherParticipant}&backgroundColor=b6e3f4`
                                  : '/images/default-avatar.png';
                              }}
                            />
                            {conversation.isOnline && (
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
                            )}
                          </div>
                          <div className="ml-3 flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-white truncate">
                                {conversation.participantName}
                              </h3>
                              <span className="text-xs text-white/70">
                                {conversation.lastActivity.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm text-white/70 truncate">
                              {conversation.lastMessage || 'No messages yet'}
                            </p>
                          </div>
                          {conversation.unreadCount > 0 && (
                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white ml-2">
                              {conversation.unreadCount}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-white/50">
                        {searchQuery ? 'No conversations found' : 'No conversations yet'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Chat Area */}
              <div className="w-full md:w-2/3 flex flex-col">
                {activeConversation ? (
                  <>
                    <div className="bg-white/5 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="relative">
                            <img
                              src={activeConversation.participantAvatar}
                              alt={activeConversation.participantName}
                              className="w-10 h-10 rounded-full"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                const otherParticipant = activeConversation.participants.find(p => p.toLowerCase() !== account?.toLowerCase());
                                target.src = otherParticipant
                                  ? `https://api.dicebear.com/7.x/identicon/svg?seed=${otherParticipant}&backgroundColor=b6e3f4`
                                  : '/images/default-avatar.png';
                              }}
                            />
                            {activeConversation.isOnline && (
                              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-gray-900"></div>
                            )}
                          </div>
                          <div className="ml-3">
                            <h3 className="font-medium text-white">{activeConversation.participantName}</h3>
                            <p className="text-xs text-white/70">
                              {activeConversation.isOnline ? 'Online' : 'Offline'}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Users className="mr-1" size={16} />
                          View Profile
                        </Button>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="bg-white/5 rounded-lg p-4 flex-1 flex flex-col mb-4">
                      <div className="flex-1 overflow-y-auto max-h-96 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                        {messagesLoading ? (
                          <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                          </div>
                        ) : rawMessages.length > 0 ? (
                          rawMessages.slice().reverse().map((message) => {
                            const isOwn = message.fromAddress?.toLowerCase() === account?.toLowerCase();
                            return (
                              <div
                                key={message.id}
                                className={`flex mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`max-w-xs md:max-w-md lg:max-w-lg rounded-2xl px-4 py-2 ${isOwn
                                    ? 'bg-blue-600 text-white rounded-br-none'
                                    : 'bg-white/10 text-white rounded-bl-none'
                                    }`}
                                >
                                  <div className="text-white/90">{message.content}</div>
                                  <div
                                    className={`text-xs mt-1 flex justify-end ${isOwn ? 'text-blue-200' : 'text-white/50'
                                      }`}
                                  >
                                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {isOwn && message.deliveryStatus && (
                                      <span className="ml-1">
                                        {message.deliveryStatus === 'read' ? ' ✓✓' : message.deliveryStatus === 'delivered' ? ' ✓' : ''}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-white/50 text-center">No messages yet. Start the conversation!</p>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    </div>

                    {/* Message Input */}
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center">
                        <input
                          type="text"
                          placeholder="Type your message..."
                          className="flex-1 bg-white/10 border border-white/20 rounded-l-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={newMessage}
                          onChange={handleInputChange}
                          onKeyPress={handleKeyPress}
                        />
                        <button className="bg-white/10 border-y border-r border-white/20 p-3 text-white hover:bg-white/20 transition-colors">
                          <Paperclip size={20} />
                        </button>
                        <button
                          className="bg-blue-600 hover:bg-blue-700 rounded-r-lg px-4 py-3 text-white transition-colors"
                          onClick={handleSendMessage}
                          disabled={!isInitialized || !newMessage.trim()}
                        >
                          <Send size={20} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-white/5 rounded-lg p-8 flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <MessageCircle size={48} className="text-white/30 mx-auto mb-4" />
                      <h3 className="text-xl font-medium text-white mb-2">Select a conversation</h3>
                      <p className="text-white/70">
                        Choose a conversation from the list to start messaging
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>
    </Layout>
  );
};

export default MessagesPage;
