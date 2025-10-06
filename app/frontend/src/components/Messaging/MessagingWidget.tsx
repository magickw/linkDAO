/**
 * Messaging Widget - Compact floating messaging interface
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Bell } from 'lucide-react';
import { useAccount } from 'wagmi';
import MessagingInterface from './MessagingInterface';
import messagingService, { ChatMessage, ChatConversation } from '../../services/messagingService';
import { useChatHistory } from '@/hooks/useChatHistory';
import notificationService from '../../services/notificationService';

interface MessagingWidgetProps {
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

const MessagingWidget: React.FC<MessagingWidgetProps> = ({
  className = '',
  position = 'bottom-right'
}) => {
  const { address, isConnected } = useAccount();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      // hook loads conversations on mount; compute unread from hook
      // no-op here — load will be handled by hook effects below
      setupEventListeners();
    }
  }, [isConnected, address]);

  const { conversations: hookConversations, loadConversations } = useChatHistory();

  useEffect(() => {
    if (!hookConversations) return;
    const total = hookConversations.reduce((sum, conv) => sum + (conv.unreadCounts?.[address || ''] || 0), 0);
    setUnreadCount(total);
  }, [hookConversations]);

  const setupEventListeners = () => {
    messagingService.on('message_received', handleMessageReceived);
    messagingService.on('conversation_updated', loadConversations);
  };

  const handleMessageReceived = (message: ChatMessage) => {
    setHasNewMessage(true);
    loadConversations();
    
    // Show browser notification if widget is closed
    if (!isOpen) {
      notificationService.showMessageNotification({
        id: message.id,
        fromAddress: message.fromAddress,
        toAddress: message.toAddress,
        content: message.content,
        messageType: message.messageType,
        timestamp: message.timestamp,
        conversationId: `${message.fromAddress}_${message.toAddress}`
      });
    }

    setTimeout(() => setHasNewMessage(false), 3000);
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-right': return 'bottom-4 right-4';
      case 'bottom-left': return 'bottom-4 left-4';
      case 'top-right': return 'top-4 right-4';
      case 'top-left': return 'top-4 left-4';
      default: return 'bottom-4 right-4';
    }
  };

  if (!isConnected) return null;

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className={`fixed z-50 ${getPositionClasses()} ${className}`}
          >
            <motion.button
              onClick={() => setIsOpen(true)}
              className={`
                relative w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 
                rounded-full shadow-lg hover:shadow-xl transition-all duration-200
                flex items-center justify-center
                ${hasNewMessage ? 'animate-pulse' : ''}
              `}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <MessageCircle size={24} className="text-white" />
              
              {/* Unread Badge */}
              {unreadCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </motion.div>
              )}

              {hasNewMessage && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"
                />
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Interface */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`fixed z-50 ${getPositionClasses()}`}
            style={{ 
              transformOrigin: position.includes('bottom') ? 'bottom' : 'top',
              width: '800px',
              height: '600px'
            }}
          >
            <div className="bg-gray-900 rounded-lg shadow-2xl border border-gray-700 overflow-hidden">
              <MessagingInterface 
                onClose={() => setIsOpen(false)}
                className="h-full"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MessagingWidget;