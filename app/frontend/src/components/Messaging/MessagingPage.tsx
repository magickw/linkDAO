import React, { useState, useEffect } from 'react';
import { ConversationList } from './ConversationList';
import { ConversationView } from './ConversationView';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useWalletAuth } from '../../hooks/useWalletAuth';
import { Conversation, Message } from '../../types/messaging';

interface MessagingPageProps {
  className?: string;
}

export const MessagingPage: React.FC<MessagingPageProps> = ({ className = '' }) => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);
  
  const { walletInfo: { address } } = useWalletAuth();
  const { socket, isConnected } = useWebSocket({
    walletAddress: address || '',
    autoConnect: true
  });

  // Check if mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setShowConversationList(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load conversations on mount
  useEffect(() => {
    if (address) {
      loadConversations();
    }
  }, [address]);

  // WebSocket message handling
  useEffect(() => {
    if (socket && isConnected) {
      socket.on('new_message', handleNewMessage);
      socket.on('conversation_updated', handleConversationUpdate);
      
      return () => {
        socket.off('new_message', handleNewMessage);
        socket.off('conversation_updated', handleConversationUpdate);
      };
    }
  }, [socket, isConnected]);

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/conversations', {
        headers: {
          'Authorization': `Bearer ${address}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const handleNewMessage = (message: Message) => {
    // Update conversation list with new message
    setConversations(prev => prev.map(conv => 
      conv.id === message.conversationId 
        ? { ...conv, lastMessage: message, lastActivity: new Date(message.timestamp) }
        : conv
    ));
  };

  const handleConversationUpdate = (updatedConversation: Conversation) => {
    setConversations(prev => prev.map(conv => 
      conv.id === updatedConversation.id ? updatedConversation : conv
    ));
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    if (isMobile) {
      setShowConversationList(false);
    }
  };

  const handleBackToList = () => {
    if (isMobile) {
      setShowConversationList(true);
      setSelectedConversation(null);
    }
  };

  const startNewConversation = async (recipientAddress: string) => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${address}`,
        },
        body: JSON.stringify({
          participants: [address, recipientAddress],
        }),
      });

      if (response.ok) {
        const newConversation = await response.json();
        setConversations(prev => [newConversation, ...prev]);
        setSelectedConversation(newConversation);
        if (isMobile) {
          setShowConversationList(false);
        }
      }
    } catch (error) {
      console.error('Failed to start new conversation:', error);
    }
  };

  return (
    <div className={`messaging-page h-full flex ${className}`}>
      {/* Conversation List - Desktop always visible, Mobile conditional */}
      <div className={`
        conversation-list-container
        ${isMobile ? (showConversationList ? 'w-full' : 'hidden') : 'w-1/3 min-w-80'}
        border-r border-gray-200 dark:border-gray-700
        bg-white dark:bg-gray-900
      `}>
        <ConversationList
          conversations={conversations}
          selectedConversation={selectedConversation}
          onConversationSelect={handleConversationSelect}
          onStartNewConversation={startNewConversation}
          currentUserAddress={address || ''}
        />
      </div>

      {/* Conversation View - Desktop always visible, Mobile conditional */}
      <div className={`
        conversation-view-container flex-1
        ${isMobile ? (showConversationList ? 'hidden' : 'flex') : 'flex'}
        bg-gray-50 dark:bg-gray-800
      `}>
        {selectedConversation ? (
          <ConversationView
            conversation={selectedConversation}
            currentUserAddress={address || ''}
            onBackToList={handleBackToList}
            showBackButton={isMobile}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p className="text-sm">Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Connection Status Indicator */}
      {!isConnected && (
        <div className="fixed bottom-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm">Reconnecting...</span>
          </div>
        </div>
      )}
    </div>
  );
};