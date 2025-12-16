import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Smile, Edit3, Star, Coins } from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { EmojiPicker } from './EmojiPicker';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { ChatMessage } from '@/services/messagingService';
import { messagingService } from '@/services/messagingService';
import { useToast } from '@/hooks/useToast';

interface MessageItemProps {
  message: ChatMessage;
  isOwn: boolean;
  isSelected: boolean;
  showAvatar: boolean;
  avatarUrl?: string;
  displayName?: string;
  selectedConversation: string;
  getOtherParticipant: (conversationId: string) => string | null;
  onAddReaction?: (messageId: string, emoji: string) => void;
  onMessageSelect?: (messageId: string) => void;
  formatTime: (date: Date) => string;
  getMessageStatus: (message: ChatMessage) => React.ReactNode;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isOwn,
  isSelected,
  showAvatar,
  avatarUrl,
  displayName,
  selectedConversation,
  getOtherParticipant,
  onAddReaction,
  onMessageSelect,
  formatTime,
  getMessageStatus
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { addToast } = useToast();
  
  // Check if messaging service is initialized
  const isMessagingInitialized = () => {
    // This is a simplified check - in a real implementation, you might want to check
    // the actual initialization state of the messaging service
    return messagingService && typeof messagingService === 'object';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: isOwn ? 100 : -100 }}
      transition={{ duration: 0.2 }}
      className={`${isSelected ? 'bg-blue-500/20' : ''} ${isOwn ? 'justify-end' : 'justify-start'} flex mb-4`}
      onClick={() => onMessageSelect?.(message.id)}
    >
      <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} max-w-xs md:max-w-md lg:max-w-lg`}>
        {/* Avatar */}
        {showAvatar && (
          <div className={`mx-2 ${isOwn ? 'ml-2' : 'mr-2'}`}>
            <img
              src={avatarUrl || '/images/default-avatar.png'}
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover"
            />
          </div>
        )}

        {/* Message Bubble */}
        <div className={`relative rounded-2xl px-4 py-2 ${isOwn ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-white rounded-bl-none'}`}>
          {/* Sender Name */}
          {!isOwn && displayName && (
            <div className="text-xs font-medium text-blue-300 mb-1">
              {displayName}
            </div>
          )}

          {/* Message Content */}
          {isEditing ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                defaultValue={message.content}
                className="bg-gray-600 text-white rounded px-2 py-1 text-sm flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditing(false);
                    // In a real implementation, you would update the message here
                  }
                  if (e.key === 'Escape') {
                    setIsEditing(false);
                  }
                }}
                onBlur={() => setIsEditing(false)}
              />
            </div>
          ) : (
            <div>
              {/* NFT Offer Messages */}
              {message.messageType === 'nft_offer' && message.metadata && (
                <div className="mb-2 p-3 bg-purple-500/20 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Star size={16} className="text-purple-400" />
                    <span className="text-sm font-medium">NFT Offer</span>
                  </div>
                  <p className="text-sm mb-2">{message.content}</p>
                  <p className="text-lg font-bold">
                    {message.metadata.offerAmount} ETH
                  </p>
                  {!isOwn && (
                    <div className="flex space-x-2 mt-2">
                      <Button 
                        variant="primary" 
                        size="sm"
                        onClick={async () => {
                          // Accept offer
                          const otherParticipant = getOtherParticipant(selectedConversation);
                          if (otherParticipant) {
                            try {
                              if (!isMessagingInitialized()) {
                                addToast("Messaging service not initialized. Please refresh the page.", "error");
                                return;
                              }
                              await messagingService.sendMessage(
                                otherParticipant,
                                'Offer accepted! 🎉',
                                'text'
                              );
                            } catch (error) {
                              console.error('Failed to send message:', error);
                              addToast("Failed to send message. Please try again.", "error");
                            }
                          }
                        }}
                      >
                        Accept
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={async () => {
                          // Counter offer
                          const counterAmount = prompt('Enter counter offer (ETH):');
                          const otherParticipant = getOtherParticipant(selectedConversation);
                          if (counterAmount && otherParticipant) {
                            try {
                              if (!isMessagingInitialized()) {
                                addToast("Messaging service not initialized. Please refresh the page.", "error");
                                return;
                              }
                              await messagingService.sendNFTCounter(
                                otherParticipant,
                                message.id,
                                counterAmount,
                                `Counter offer: ${counterAmount} ETH`
                              );
                            } catch (error) {
                              console.error('Failed to send counter offer:', error);
                              addToast("Failed to send counter offer. Please try again.", "error");
                            }
                          }
                        }}
                      >
                        Counter
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* NFT Counter Offer Messages */}
              {message.messageType === 'nft_counter' && message.metadata && (
                <div className="mb-2 p-3 bg-purple-500/20 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Star size={16} className="text-purple-400" />
                    <span className="text-sm font-medium">Counter Offer</span>
                  </div>
                  <p className="text-lg font-bold">
                    {message.metadata.offerAmount} ETH
                  </p>
                </div>
              )}

              {/* System Messages */}
              {message.messageType === 'system' && message.metadata?.rewardAmount && (
                <div className="mb-2 p-3 bg-green-500/20 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Coins size={16} className="text-green-400" />
                    <span className="text-sm font-medium">Reward Received</span>
                  </div>
                  <p className="text-sm">
                    {message.metadata.rewardAmount} ETH testnet reward
                  </p>
                  {message.metadata.transactionHash && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        window.open(`https://etherscan.io/tx/${message.metadata?.transactionHash}`, '_blank');
                      }}
                    >
                      View Transaction
                    </Button>
                  )}
                </div>
              )}

              {/* Voice Message */}
              {message.messageType === 'file' && message.metadata?.fileUrl && (
                <div className="mb-2">
                  <VoiceMessagePlayer 
                    audioUrl={message.metadata.fileUrl} 
                    duration={message.metadata.duration || 0}
                  />
                </div>
              )}

              {/* Text Message */}
              {message.messageType === 'text' && (
                <p className="text-sm">{message.content}</p>
              )}
            </div>
          )}

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {message.reactions.map((reaction: any, index: number) => (
                <span 
                  key={index} 
                  className="inline-flex items-center bg-gray-600/50 rounded-full px-2 py-1 text-xs"
                >
                  {reaction.emoji} {reaction.count > 1 && <span className="ml-1">{reaction.count}</span>}
                </span>
              ))}
            </div>
          )}

          {/* Message Actions */}
          <div className="flex items-center justify-between mt-1">
            <div className={`flex items-center space-x-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <span className="text-xs text-gray-400">
                {formatTime(message.timestamp)}
              </span>
              {getMessageStatus(message)}
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center">
              {/* Reaction Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEmojiPicker(!showEmojiPicker);
                }}
                className="ml-2 p-1 text-gray-400 hover:text-gray-200 rounded-full hover:bg-gray-600/50 transition-colors"
                title="Add reaction"
              >
                <Smile size={14} />
              </button>
              
              {/* Edit Button (only for own messages) */}
              {isOwn && !isEditing && message.messageType === 'text' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className="ml-2 p-1 text-gray-400 hover:text-gray-200 rounded-full hover:bg-gray-600/50 transition-colors"
                  title="Edit message"
                >
                  <Edit3 size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="absolute bottom-full right-0 mb-2 z-10">
              <EmojiPicker
                onEmojiSelect={(emoji) => {
                  onAddReaction?.(message.id, emoji);
                  setShowEmojiPicker(false);
                }}
                onClose={() => setShowEmojiPicker(false)}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};