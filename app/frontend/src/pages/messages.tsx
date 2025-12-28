import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { MessageCircle, Send, X, Users, Search, Paperclip } from 'lucide-react';
import Layout from '@/components/Layout';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import { messagingService } from '@/services/messagingService';
import { marketplaceService } from '@/services/marketplaceService';
import { useWeb3 } from '@/context/Web3Context';

interface Message {
  id: string;
  fromAddress: string;
  toAddress: string;
  content: string;
  timestamp: Date;
  isOwn: boolean;
  isRead: boolean;
  isDelivered: boolean;
}

interface Conversation {
  id: string;
  participants: string[];
  participantName: string;
  participantAvatar: string;
  lastMessage?: string;
  lastActivity: Date;
  unreadCount: number;
  isOnline: boolean;
}

function getAvatarUrl(profileCid: string | undefined): string | undefined {
  if (!profileCid) return undefined;

  // Check if it's a valid IPFS CID
  if (profileCid.startsWith('Qm') || profileCid.startsWith('bafy')) {
    return `https://ipfs.io/ipfs/${profileCid}`;
  }

  // Check if it's already a full URL
  try {
    new URL(profileCid);
    return profileCid;
  } catch {
    // Not a valid URL, return undefined
    return undefined;
  }
}

const MessagesPage: React.FC = () => {
  const router = useRouter();
  const { to } = router.query;
  const { address: account, signer } = useWeb3();

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Helper function to generate conversation ID (same logic as messaging service)
  const getConversationId = (addr1: string, addr2: string): string => {
    const [a1, a2] = [addr1.toLowerCase(), addr2.toLowerCase()].sort();
    return `${a1}_${a2}`;
  };
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagingInitialized, setMessagingInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize messaging service when account/signer changes
  useEffect(() => {
    const initializeMessaging = async () => {
      console.log('Initializing messaging service...', { account, signer: !!signer });

      if (account && signer) {
        try {
          setLoading(true);
          setMessagingInitialized(false);
          setError(null);

          console.log('Starting messaging service initialization');

          // Add timeout to prevent infinite loading
          const initPromise = messagingService.initialize(signer);
          const timeoutPromise = new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('Messaging service initialization timeout')), 15000)
          );

          console.log('Waiting for initialization or timeout');
          await Promise.race([initPromise, timeoutPromise]);
          console.log('Messaging service initialization completed');

          setMessagingInitialized(true);
          setError(null);
        } catch (error) {
          console.error('Failed to initialize messaging service:', error);
          setMessagingInitialized(true); // Set to true to stop loading, but show error
          setError(error instanceof Error ? error.message : 'Failed to initialize messaging service');
        } finally {
          setLoading(false);
          console.log('Finished messaging service initialization attempt');
        }
      } else {
        console.log('Skipping messaging initialization - missing account or signer', { account, signer: !!signer });
      }
    };

    initializeMessaging();
  }, [account, signer]);

  // Load conversations and messages
  useEffect(() => {
    const loadConversations = async () => {
      try {
        setLoading(true);

        // Wait for messaging service to be initialized
        if (!messagingInitialized) {
          return;
        }

        // Get all conversations from the messaging service
        const allConversations = messagingService.getConversations();

        // Transform to our format and fetch user details
        const transformedConversations = await Promise.all(
          allConversations.map(async (conv) => {
            // Find the other participant (not current user)
            const otherParticipant = conv.participants.find(p => p !== account?.toLowerCase());

            // Get user details if available
            let participantName = otherParticipant || 'Unknown User';
            let participantAvatar = '/images/default-avatar.png';

            if (otherParticipant) {
              try {
                // Try to get user details from marketplace service
                const userResponse = await fetch(`/api/users/${otherParticipant}`);
                if (userResponse.ok) {
                  const userData = await userResponse.json();
                  console.log('User data for ' + otherParticipant + ':', userData.data);
                  // Prioritize storeName for sellers, then displayName, username, or name for regular users
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
                  participantAvatar = getAvatarUrl(rawAvatarUrl) || '/images/default-avatar.png';
                  console.log('Raw avatar URL for ' + otherParticipant + ':', rawAvatarUrl);
                  console.log('Resolved avatar for ' + otherParticipant + ':', participantAvatar);
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
              lastActivity: conv.lastActivity,
              unreadCount: conv.unreadCount,
              isOnline: false // TODO: Implement presence system
            };
          })
        );

        setConversations(transformedConversations);

        // If a specific recipient was passed in the query, set them as active
        if (to && account) {
          // Create conversation ID using the same logic as the messaging service
          const [addr1, addr2] = [account.toLowerCase(), (to as string).toLowerCase()].sort();
          const conversationId = `${addr1}_${addr2}`;

          const targetConversation = transformedConversations.find(c => c.id === conversationId);

          if (targetConversation) {
            setActiveConversation(targetConversation);
          } else {
            // Create new conversation if doesn't exist
            const newConv: Conversation = {
              id: conversationId,
              participants: [account!, to as string],
              participantName: formatAddress(to as string),
              participantAvatar: '/images/default-avatar.png',
              lastMessage: undefined,
              lastActivity: new Date(),
              unreadCount: 0,
              isOnline: false
            };
            setConversations(prev => [newConv, ...prev]);
            setActiveConversation(newConv);
          }
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    if (account && messagingInitialized) {
      loadConversations();
    }
  }, [account, to, messagingInitialized]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversation && messagingInitialized) {
      const convMessages = messagingService.getMessages(activeConversation.id);

      // Transform to our format
      const transformedMessages = convMessages.map(msg => ({
        id: msg.id,
        fromAddress: msg.fromAddress,
        toAddress: msg.toAddress,
        content: msg.content,
        timestamp: msg.timestamp,
        isOwn: msg.fromAddress === account,
        isRead: msg.isRead,
        isDelivered: msg.isDelivered
      }));

      setMessages(transformedMessages);

      // Mark messages as read
      messagingService.markMessagesAsRead(activeConversation.id);
    } else {
      setMessages([]);
    }
  }, [activeConversation, account, messagingInitialized]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (newMessage.trim() === '' || !activeConversation || !account || !messagingInitialized) return;

    try {
      // Get the recipient address (the other participant in the conversation)
      const recipientAddress = activeConversation.participants.find(p => p !== account);
      if (!recipientAddress) {
        console.error('No recipient found for conversation');
        return;
      }

      // Send message using messaging service
      await messagingService.sendMessage(recipientAddress, newMessage);

      // Clear input
      setNewMessage('');

      // Reload messages to get the new one
      if (activeConversation) {
        const convMessages = messagingService.getMessages(activeConversation.id);
        const transformedMessages = convMessages.map(msg => ({
          id: msg.id,
          fromAddress: msg.fromAddress,
          toAddress: msg.toAddress,
          content: msg.content,
          timestamp: msg.timestamp,
          isOwn: msg.fromAddress === account,
          isRead: msg.isRead,
          isDelivered: msg.isDelivered
        }));
        setMessages(transformedMessages);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setActiveConversation(conversation);

    // Get the other participant's address
    const otherParticipant = conversation.participants.find(p => p !== account);
    if (otherParticipant && account) {
      // Generate conversation ID using our helper
      const conversationId = getConversationId(account, otherParticipant);
      router.push(`/messages?to=${otherParticipant}`, undefined, { shallow: true });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading || !messagingInitialized) {
    return (
      <Layout title="Messages | LinkDAO" fullWidth={true}>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-white">
              {error ? (
                <span className="text-red-400">Error: {error}</span>
              ) : (
                'Initializing messaging service...'
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
              </h1>
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

            <div className="flex flex-col md:flex-row gap-6">
              {/* Conversations List */}
              <div className="w-full md:w-1/3">
                <div className="bg-white/5 rounded-lg p-4">
                  <h2 className="text-lg font-semibold text-white mb-4">Conversations</h2>
                  <div className="space-y-3">
                    {conversations.map((conversation) => (
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
                    ))}
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
                        {messages.length > 0 ? (
                          messages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex mb-4 ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-xs md:max-w-md lg:max-w-lg rounded-2xl px-4 py-2 ${message.isOwn
                                  ? 'bg-blue-600 text-white rounded-br-none'
                                  : 'bg-white/10 text-white rounded-bl-none'
                                  }`}
                              >
                                <div className="text-white/90">{message.content}</div>
                                <div
                                  className={`text-xs mt-1 flex justify-end ${message.isOwn ? 'text-blue-200' : 'text-white/50'
                                    }`}
                                >
                                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          ))
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
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                        />
                        <button className="bg-white/10 border-y border-r border-white/20 p-3 text-white hover:bg-white/20 transition-colors">
                          <Paperclip size={20} />
                        </button>
                        <button
                          className="bg-blue-600 hover:bg-blue-700 rounded-r-lg px-4 py-3 text-white transition-colors"
                          onClick={handleSendMessage}
                          disabled={!messagingInitialized}
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
                        Choose a conversation from the list to start messaging a seller
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