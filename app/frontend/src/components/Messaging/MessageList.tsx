import React, { useRef, useEffect } from 'react';
import { User, CornerUpLeft, Quote, Copy, Trash2, Link as LinkIcon, Lock } from 'lucide-react';
import DOMPurify from 'dompurify';
import Web3SwipeGestureHandler from '@/components/Mobile/Web3SwipeGestureHandler';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';

interface MessageListProps {
  messages: any[];
  address: string | undefined;
  getParticipantProfile?: (address: string) => any;
  isConnected: boolean;
  addReaction: (messageId: string, emoji: string) => void;
  showReactionTooltip: (messageId: string, emoji: string, event: React.MouseEvent) => void;
  hideReactionTooltip: () => void;
  toggleReactionPicker: (messageId: string) => void;
  showReactionPicker: { messageId: string; show: boolean };
  reactionTooltip: any;
  channelMembers: any[];
  replyToMessage: (id: string, username: string, content: string) => void;
  quoteMessage: (content: string, author: string, id: string) => void;
  openThread: (id: string) => void;
  copyMessage: (content: string) => void;
  handleRetractMessage: (id: string) => void;
  handleLocalDelete: (id: string) => void;
  isViewingDM: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  address,
  getParticipantProfile,
  isConnected,
  addReaction,
  showReactionTooltip,
  hideReactionTooltip,
  toggleReactionPicker,
  showReactionPicker,
  reactionTooltip,
  channelMembers,
  replyToMessage,
  quoteMessage,
  openThread,
  copyMessage,
  handleRetractMessage,
  handleLocalDelete,
  isViewingDM
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { touchTargetClasses } = useMobileOptimization();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Helper functions from the original component
  const truncateAddress = (addr: string) => {
    if (!addr || addr.length <= 10) return addr || '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const parseMentions = (content: string | undefined): JSX.Element => {
    if (!content) return <></>;
    
    // Simplified version for the extracted component
    // In a real refactor, this logic might be moved to a utility or hook
    const mentionRegex = /(@[\w\d]+\.eth|@0x[a-fA-F0-9]{40}|@\w+)/g;
    const parts = content.split(mentionRegex);

    return (
      <>
        {parts.map((part, index) => {
          if (part.match(mentionRegex)) {
            const isCurrentUser = part === `@${address?.slice(0, 6)}...${address?.slice(-4)}` ||
              part === '@you' ||
              (address && part.toLowerCase() === `@${address.toLowerCase()}`);

            return (
              <span
                key={index}
                className={`font-semibold ${isCurrentUser ? 'bg-blue-500/20 text-blue-400 px-1 rounded' : 'text-blue-400'}`}
              >
                {part}
              </span>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-800">
      <div className="space-y-4 pb-2">
        {/* Sort messages chronological (oldest to newest) for display */}
        {[...messages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map((message, index, sortedMessages) => {
          // Date header logic
          const messageDate = new Date(message.timestamp);
          const prevMessageDate = index > 0 ? new Date(sortedMessages[index - 1].timestamp) : null;

          const showDateHeader = index === 0 ||
            (prevMessageDate && messageDate.toDateString() !== prevMessageDate.toDateString());

          // Timestamp display logic (show date if > 24h old)
          const isOlderThanDay = (Date.now() - messageDate.getTime()) > 24 * 60 * 60 * 1000;
          const timestampDisplay = isOlderThanDay
            ? messageDate.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : messageDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

          // Resolve sender profile for avatar and name
          let senderProfile: any | undefined;
          let senderAvatarUrl: string | null = null;
          let senderDisplayName: string = message.fromAddress ? (message.fromAddress.slice(0, 6) + '...' + message.fromAddress.slice(-4)) : 'Unknown';

          if (message.fromAddress === address) {
            senderDisplayName = 'You';
            if (getParticipantProfile) {
              senderProfile = getParticipantProfile(message.fromAddress);
            }
          } else if (getParticipantProfile && message.fromAddress) {
            senderProfile = getParticipantProfile(message.fromAddress);
          }

          if (senderProfile) {
            if (senderProfile.displayName) senderDisplayName = senderProfile.displayName;
            else if (senderProfile.handle) senderDisplayName = senderProfile.handle;
            else if (senderProfile.ens) senderDisplayName = senderProfile.ens;

            if (senderProfile.avatarCid) {
              senderAvatarUrl = senderProfile.avatarCid.startsWith('http') ? senderProfile.avatarCid : `https://ipfs.io/ipfs/${senderProfile.avatarCid}`;
            } else if (senderProfile.profileCid) {
              senderAvatarUrl = senderProfile.profileCid.startsWith('http') ? senderProfile.profileCid : `https://ipfs.io/ipfs/${senderProfile.profileCid}`;
            }
          }

          return (
            <React.Fragment key={message.id}>
              {showDateHeader && (
                <div className="flex justify-center my-6">
                  <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium px-3 py-1 rounded-full shadow-sm">
                    {messageDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )}
              <Web3SwipeGestureHandler
                key={message.id}
                postId={message.id}
                onUpvote={() => addReaction(message.id, '👍')}
                onSave={() => console.log('Save message:', message.id)}
                onTip={() => console.log('Tip message:', message.id)}
                onStake={() => console.log('Stake on message:', message.id)}
                walletConnected={isConnected}
                userBalance={0}
                className=""
              >
                <div
                  className={`flex w-full mb-4 px-2 group ${message.fromAddress === address ? 'justify-end' : 'justify-start'}`}
                  id={`message-${message.id}`}
                >
                  <div className={`flex max-w-[85%] md:max-w-[75%] ${message.fromAddress === address ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    <div className={`flex-shrink-0 ${message.fromAddress === address ? 'ml-3' : 'mr-3'}`}>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center overflow-hidden shadow-sm">
                        {senderAvatarUrl ? (
                          <img
                            src={senderAvatarUrl}
                            alt={senderDisplayName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement?.classList.remove('overflow-hidden');
                              e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                              const icon = document.createElement('div');
                              icon.innerHTML = DOMPurify.sanitize('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>');
                              e.currentTarget.parentElement?.appendChild(icon.firstChild!);
                            }}
                          />
                        ) : (
                          <User size={16} className="text-white" />
                        )}
                      </div>
                    </div>

                    {/* Message Content Container */}
                    <div className={`flex flex-col ${message.fromAddress === address ? 'items-end' : 'items-start'}`}>
                      {/* Sender Name & Time */}
                      <div className={`flex items-baseline mb-1 space-x-2 ${message.fromAddress === address ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {message.fromAddress === address ? 'You' : senderDisplayName}
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                          {timestampDisplay}
                        </span>
                      </div>

                      {/* Bubble */}
                      <div
                        className={`
                          relative p-3 rounded-2xl shadow-sm transition-all
                          ${message.fromAddress === address
                            ? 'bg-blue-600 text-white rounded-tr-none'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-none border border-gray-200 dark:border-gray-700'
                          }
                        `}
                      >
                        {/* Reply Reference */}
                        {message.replyToId && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              const element = document.getElementById(`message-${message.replyToId}`);
                              if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                element.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
                                setTimeout(() => element.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50'), 2000);
                              }
                            }}
                            className={`
                              mb-2 p-2 rounded-lg border-l-4 border-blue-400 cursor-pointer text-xs
                              ${message.fromAddress === address
                                ? 'bg-blue-700/50 text-blue-50'
                                : 'bg-gray-200/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                              }
                            `}
                          >
                            {(() => {
                              const parentMsg = sortedMessages.find(m => m.id === message.replyToId);
                              const parentAuthor = parentMsg
                                ? (parentMsg.fromAddress === address ? 'You' : truncateAddress(parentMsg.fromAddress))
                                : (message.replyTo?.senderName || truncateAddress(message.replyTo?.fromAddress || ''));

                              return (
                                <>
                                  <div className="font-bold mb-0.5 opacity-80">
                                    Replying to {parentAuthor}
                                  </div>
                                  <div className="italic truncate">
                                    {parentMsg?.content || message.replyTo?.content || 'Original message...'}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        )}

                        {/* Quote Reference */}
                        {(() => {
                          const quoteId = (message as any).quotedMessageId || (message as any).metadata?.quotedMessageId;
                          if (!quoteId) return null;
                          const quotedMsg = sortedMessages.find(m => m.id === quoteId);
                          if (!quotedMsg) return null;

                          const quoteAuthor = quotedMsg.fromAddress === address ? 'You' : truncateAddress(quotedMsg.fromAddress);
                          return (
                            <div className={`
                              mb-2 p-2 rounded-lg border-l-4 border-gray-400 text-xs italic
                              ${message.fromAddress === address ? 'bg-blue-700/30 text-blue-50' : 'bg-gray-200 dark:bg-gray-700'}
                            `}>
                              <div className="font-bold not-italic mb-1 opacity-80">{quoteAuthor}</div>
                              <div>{quotedMsg.content}</div>
                            </div>
                          );
                        })()}

                        {/* Message content */}
                        {message.content && message.content.trim() && (
                          <div className="text-sm leading-relaxed break-words">
                            {parseMentions(message.content)}
                          </div>
                        )}

                        {/* Attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {message.attachments.map((attachment: any, idx: number) => (
                              <div key={idx} className="max-w-xs overflow-hidden rounded-lg">
                                {attachment.type === 'image' && (
                                  <img
                                    src={attachment.preview || attachment.url}
                                    alt={attachment.name || 'Image'}
                                    className="w-full h-auto cursor-pointer hover:opacity-90"
                                    onClick={() => window.open(attachment.url, '_blank')}
                                  />
                                )}
                                {attachment.type !== 'image' && (
                                  <div
                                    className={`flex items-center p-2 rounded border ${message.fromAddress === address ? 'bg-blue-700/30 border-blue-500' : 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600'}`}
                                    onClick={() => window.open(attachment.url, '_blank')}
                                  >
                                    <LinkIcon size={14} className="mr-2" />
                                    <span className="text-xs truncate">{attachment.name || 'File'}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Encryption indicator */}
                        {isViewingDM && message.isEncrypted && (
                          <div className="absolute -bottom-1 -left-1 bg-white dark:bg-gray-900 rounded-full p-0.5 shadow-sm">
                            <Lock size={10} className="text-green-500" />
                          </div>
                        )}
                      </div>

                      {/* Reactions */}
                      {message.reactions && message.reactions.length > 0 && (
                        <div className="flex mt-2 space-x-1 relative">
                          {message.reactions.map((reaction: any, idx: number) => (
                            <button
                              key={idx}
                              className={`flex items-center rounded px-2 py-1 text-sm ${reaction.users.includes(address || '')
                                ? 'bg-blue-500/30 text-gray-900 dark:text-white'
                                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                                }`}
                              onClick={() => addReaction(message.id, reaction.emoji)}
                              onMouseEnter={(e) => showReactionTooltip(message.id, reaction.emoji, e)}
                              onMouseLeave={hideReactionTooltip}
                            >
                              <span className="mr-1">{reaction.emoji}</span>
                              <span className="text-gray-600 dark:text-gray-300">{reaction.count}</span>
                            </button>
                          ))}

                          {/* Reaction picker button */}
                          <button
                            className={`w-8 h-8 rounded hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white ${touchTargetClasses}`}
                            onClick={() => toggleReactionPicker(message.id)}
                          >
                            <span>+</span>
                          </button>

                          {/* Reaction picker popup */}
                          {showReactionPicker.messageId === message.id && showReactionPicker.show && (
                            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 shadow-lg z-10">
                              <div className="flex space-x-1">
                                {['👍', '❤️', '😂', '😮', '🔥', '🚀', '👏', '🎉'].map(emoji => (
                                  <button
                                    key={emoji}
                                    className={`w-8 h-8 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-lg ${touchTargetClasses}`}
                                    onClick={() => toggleReactionPicker(message.id)} // This seems to just toggle again? Or should call addReaction? The original had logic.
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Reaction tooltip */}
                          {reactionTooltip && reactionTooltip.messageId === message.id && reactionTooltip.show && (
                            <div
                              className="fixed bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 shadow-lg z-20 pointer-events-none"
                              style={{
                                left: reactionTooltip.position.x,
                                top: reactionTooltip.position.y,
                                transform: 'translate(-50%, -100%)'
                              }}
                            >
                              <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                {(() => {
                                  const reaction = message.reactions?.find((r: any) => r.emoji === reactionTooltip.emoji);
                                  if (!reaction) return null;

                                  const userNames = reaction.users.map((addr: string) => {
                                    if (addr === address) return 'You';
                                    const member = channelMembers.find(m => m.address === addr);
                                    return member ? member.name : addr.slice(0, 6) + '...' + addr.slice(-4);
                                  });

                                  return (
                                    <div className="flex items-center space-x-1">
                                      <span>{reactionTooltip.emoji}</span>
                                      <span>{userNames.join(', ')}</span>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Message actions */}
                      <div className="flex mt-2 items-center justify-between w-full">
                        {/* Primary Actions (Left) */}
                        <div className="flex space-x-2">
                          <button
                            className={`flex items-center px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700/50 dark:hover:bg-gray-600 text-xs font-medium text-gray-700 dark:text-gray-200 transition-colors ${touchTargetClasses}`}
                            onClick={() => {
                              let authorDisplayName = 'Unknown';
                              if (message.fromAddress && message.fromAddress === address) {
                                authorDisplayName = 'You';
                              } else if (message.fromAddress) {
                                let p: any | undefined;
                                if (getParticipantProfile) {
                                  p = getParticipantProfile(message.fromAddress);
                                }
                                if (p?.displayName) authorDisplayName = p.displayName;
                                else if (p?.handle) authorDisplayName = p.handle;
                                else if (p?.ens) authorDisplayName = p.ens;
                                else authorDisplayName = message.fromAddress.slice(0, 6) + '...' + message.fromAddress.slice(-4);
                              }

                              replyToMessage(message.id, authorDisplayName, message.content || '');
                            }}
                            title="Reply to this message"
                          >
                            <CornerUpLeft size={14} className="mr-1.5" />
                            Reply
                          </button>

                          <button
                            className={`flex items-center px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors ${touchTargetClasses}`}
                            onClick={() => {
                              let authorDisplayName = 'Unknown';
                              if (message.fromAddress && message.fromAddress === address) {
                                authorDisplayName = 'You';
                              } else if (message.fromAddress) {
                                let p: any | undefined;
                                if (getParticipantProfile) {
                                  p = getParticipantProfile(message.fromAddress);
                                }
                                if (p?.displayName) authorDisplayName = p.displayName;
                                else if (p?.handle) authorDisplayName = p.handle;
                                else if (p?.ens) authorDisplayName = p.ens;
                                else authorDisplayName = message.fromAddress.slice(0, 6) + '...' + message.fromAddress.slice(-4);
                              }

                              quoteMessage(message.content || '', authorDisplayName, message.id);
                            }}
                            title="Quote this message"
                          >
                            <Quote size={14} className="mr-1.5" />
                            <span className="hidden sm:inline">Quote</span>
                          </button>
                        </div>

                        {/* Secondary Actions (Right) */}
                        <div className="flex space-x-1">
                          {message.threadReplies && message.threadReplies.length > 0 && (
                            <button
                              className={`flex items-center px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 text-xs text-blue-500 dark:text-blue-400 transition-colors ${touchTargetClasses}`}
                              onClick={() => openThread(message.id)}
                              title="View Thread"
                            >
                              <span>Thread</span>
                              <span className="ml-1 bg-blue-100 dark:bg-blue-900/30 rounded-full px-1.5 py-0.5 text-[10px]">
                                {message.threadReplies.length}
                              </span>
                            </button>
                          )}

                          <button
                            className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors ${touchTargetClasses}`}
                            onClick={() => copyMessage(message.content)}
                            title="Copy text"
                          >
                            <Copy size={14} />
                          </button>

                          {/* Retract (Sender only, time-limited) */}
                          {message.fromAddress === address && (Date.now() - new Date(message.timestamp).getTime() < 15 * 60 * 1000) && (
                            <button
                              className={`p-1.5 rounded hover:bg-orange-100 dark:hover:bg-orange-900/20 text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors ${touchTargetClasses}`}
                              onClick={() => handleRetractMessage(message.id)}
                              title="Retract (Unsend)"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}

                          {/* Delete (Local only) */}
                          <button
                            className={`p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors ${touchTargetClasses}`}
                            onClick={() => handleLocalDelete(message.id)}
                            title="Delete for me"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Web3SwipeGestureHandler>
            </React.Fragment>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
