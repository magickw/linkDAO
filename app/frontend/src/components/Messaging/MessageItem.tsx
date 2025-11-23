import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Coins, Star, Smile, Edit3, Check, X, Mic } from 'lucide-react';
import { Button } from '../../design-system';
import { ChatMessage } from '../../services/messagingService';
import messagingService from '../../services/messagingService';
import { EmojiPicker } from './EmojiPicker';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';

interface MessageItemProps {
  message: ChatMessage;
  isOwn: boolean;
  showAvatar: boolean;
  formatTime: (date: Date) => string;
  getMessageStatus: (message: ChatMessage) => React.ReactNode;
  getOtherParticipant: (conversationId: string | null) => string | null;
  selectedConversation: string | null;
  onAddReaction?: (messageId: string, emoji: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isOwn,
  showAvatar,
  formatTime,
  getMessageStatus,
  getOtherParticipant,
  selectedConversation,
  onAddReaction,
  onEditMessage
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  // Mock reactions data (in a real implementation, this would come from props or context)
  // Using a more type-safe approach
  const reactions = (message.metadata as any)?.reactions || [];

  const handleSaveEdit = () => {
    if (onEditMessage) {
      onEditMessage(message.id, editContent);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
        {/* Avatar */}
        {!isOwn && showAvatar && (
          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <User size={12} className="text-white" />
          </div>
        )}
        {!isOwn && !showAvatar && <div className="w-6" />}

        {/* Message */}
        <div className="relative">
          {isEditing ? (
            // Edit mode
            <div className={`px-4 py-2 rounded-2xl ${
              isOwn
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-white'
            }`}>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-transparent border-none outline-none resize-none text-sm"
                rows={3}
              />
              <div className="flex justify-end space-x-2 mt-2">
                <button
                  onClick={handleCancelEdit}
                  className="p-1 text-gray-300 hover:text-white"
                >
                  <X size={16} />
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="p-1 text-gray-300 hover:text-white"
                >
                  <Check size={16} />
                </button>
              </div>
            </div>
          ) : (
            // View mode
            <div
              className={`px-4 py-2 rounded-2xl ${
                isOwn
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-white'
              }`}
            >
              {/* NFT Offer Messages */}
              {message.messageType === 'nft_offer' && message.metadata && (
                <div className="mb-2 p-3 bg-black/20 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Coins size={16} className="text-yellow-500" />
                    <span className="text-sm font-medium">NFT Offer</span>
                  </div>
                  <p className="text-sm">
                    Token #{message.metadata.nftTokenId}
                  </p>
                  <p className="text-lg font-bold">
                    {message.metadata.offerAmount} ETH
                  </p>
                  {!isOwn && (
                    <div className="flex space-x-2 mt-2">
                      <Button 
                        variant="primary" 
                        size="sm"
                        onClick={() => {
                          // Accept offer
                          const otherParticipant = getOtherParticipant(selectedConversation);
                          if (otherParticipant) {
                            messagingService.sendMessage(
                              otherParticipant,
                              'Offer accepted! 🎉',
                              'text'
                            );
                          }
                        }}
                      >
                        Accept
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // Counter offer
                          const counterAmount = prompt('Enter counter offer (ETH):');
                          const otherParticipant = getOtherParticipant(selectedConversation);
                          if (counterAmount && otherParticipant) {
                            messagingService.sendNFTCounter(
                              otherParticipant,
                              message.id,
                              counterAmount,
                              `Counter offer: ${counterAmount} ETH`
                            );
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
          {reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {reactions.map((reaction: any, index: number) => (
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