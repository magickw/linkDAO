/**
 * Messaging Interface
 * Enhanced messaging with channels, threads, and reactions
 * Refactored to use sub-components for better maintainability.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import CrossChainBridge from './CrossChainBridge';
import useENSIntegration from '../../hooks/useENSIntegration';
import { useChatHistory } from '@/hooks/useChatHistory';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { UserProfile } from '../../models/UserProfile';
import useWebSocket from '../../hooks/useWebSocket';
import { useToast } from '@/context/ToastContext';
import { unifiedMessagingService } from '@/services/unifiedMessagingService';

// Import refactored sub-components
import { ChatSidebar } from './ChatSidebar';
import { ChannelHeader } from './ChannelHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

// Interfaces (kept for local state management, though some are now shared via props)
interface ChatChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  memberCount: number;
  unreadCount: number;
  isPinned?: boolean;
  topic?: string;
  category?: string;
  icon?: string;
  isGated?: boolean;
  gateType?: 'nft' | 'token' | 'role';
  gateRequirement?: string;
}

interface DirectMessageConversation {
  id: string;
  participant: string;
  participantEnsName?: string;
  participantAvatar?: string | null;
  isOnline: boolean;
  isTyping?: boolean;
  lastSeen?: Date;
  unreadCount: number;
  lastMessage?: ChannelMessage;
  isPinned?: boolean;
}

interface ChannelMessage {
  id: string;
  fromAddress: string;
  content: string;
  timestamp: Date;
  replyToId?: string;
  quotedMessageId?: string;
  metadata?: any;
  replyTo?: {
    fromAddress: string;
    content: string;
    senderName?: string;
  };
  reactions?: {
    emoji: string;
    count: number;
    users: string[];
  }[];
  threadReplies?: ChannelMessage[];
  isThread?: boolean;
  parentId?: string;
  attachments?: {
    type: 'nft' | 'transaction' | 'proposal' | 'image' | 'file';
    url: string;
    name: string;
    preview?: string;
    metadata?: any;
  }[];
  mentions?: string[];
  isEncrypted?: boolean;
  encryptionStatus?: 'encrypted' | 'unencrypted' | 'pending';
}

interface ChannelMember {
  address: string;
  name: string;
  status: 'online' | 'idle' | 'busy' | 'offline';
  role: 'admin' | 'moderator' | 'holder' | 'builder' | 'member';
  ensName?: string;
  avatar?: string;
}

interface ChannelCategory {
  id: string;
  name: string;
  isCollapsed: boolean;
}

interface MessagingInterfaceProps {
  className?: string;
  onClose?: () => void;
  conversationId?: string;
  participantAddress?: string;
  participantName?: string;
  participantAvatar?: string | null;
  getParticipantProfile?: (address: string) => UserProfile | undefined;
  hideSidebar?: boolean;
}

const MessagingInterface: React.FC<MessagingInterfaceProps> = ({
  className = '',
  onClose,
  conversationId,
  participantAddress,
  participantName,
  participantAvatar,
  getParticipantProfile,
  hideSidebar = false
}) => {
  const { address, isConnected } = useAccount();
  const { isMobile, touchTargetClasses } = useMobileOptimization();
  const { resolveName } = useENSIntegration();
  const { isConnected: isSocketConnected } = useWebSocket({ walletAddress: address || '' });
  const { addToast } = useToast();

  const safeAddToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    if (typeof addToast === 'function') {
      return addToast(message, type);
    } else {
      console.log(`[Toast Fallback] ${type}: ${message}`);
    }
  };

  const getParticipantDisplayName = (participantAddress: string): string => {
    const profile = getParticipantProfile?.(participantAddress);
    if (profile?.handle) return profile.handle;
    if (profile?.displayName) return profile.displayName;
    if (profile?.ens) return profile.ens;
    const dm = dmConversations.find(d => d.participant === participantAddress);
    if (dm?.participantEnsName) return dm.participantEnsName;
    if (!participantAddress || participantAddress.length <= 10) return participantAddress || '';
    return `${participantAddress.slice(0, 6)}...${participantAddress.slice(-4)}`;
  };

  const { conversations: hookConversations, messages: hookMessages, loadMessages, sendMessage, deleteMessage, hideMessage } = useChatHistory();
  const [dmConversations, setDmConversations] = useState<DirectMessageConversation[]>([]);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [isViewingDM, setIsViewingDM] = useState(false);
  const [selectedDM, setSelectedDM] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [channelCategories, setChannelCategories] = useState<ChannelCategory[]>([
    { id: 'direct', name: 'Direct Messages', isCollapsed: false },
    { id: 'public', name: 'Public Channels', isCollapsed: false },
    { id: 'private', name: 'Private Channels', isCollapsed: false },
    { id: 'gated', name: 'Gated Channels', isCollapsed: false }
  ]);
  
  // Placeholder for channel members logic
  const [channelMembers] = useState<ChannelMember[]>([]);

  // State for UI interactions
  const [showReactionPicker, setShowReactionPicker] = useState<{ messageId: string; show: boolean }>({ messageId: '', show: false });
  const [showThread, setShowThread] = useState<{ messageId: string; show: boolean }>({ messageId: '', show: false });
  const [threadMessages, setThreadMessages] = useState<ChannelMessage[]>([]);
  const [replyingTo, setReplyingTo] = useState<{ messageId: string; handle: string; content: string } | null>(null);
  const [quotingTo, setQuotingTo] = useState<{ messageId: string; handle: string; content: string } | null>(null);
  const [showCrossChainBridge, setShowCrossChainBridge] = useState(false);
  const [reactionTooltip, setReactionTooltip] = useState<{ messageId: string; emoji: string; show: boolean; position: { x: number; y: number } } | null>(null);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Effects ---

  // Initialize with passed conversationId
  useEffect(() => {
    if (conversationId) {
      setIsViewingDM(true);
      setSelectedDM(conversationId);
    }
  }, [conversationId]);

  // Sync hook conversations into DM list
  useEffect(() => {
    if (!hookConversations) return;
    const mapped: DirectMessageConversation[] = hookConversations.map(c => {
      const participantAddress = Array.isArray(c.participants)
        ? (c.participants.find((p: any) => p?.toLowerCase() !== address?.toLowerCase()) || c.participants[0])
        : (c.participants as any);

      // Simple avatar logic based on profile
      let pAvatar: string | null = null;
      if (getParticipantProfile && participantAddress) {
        const profile = getParticipantProfile(participantAddress);
        if (profile) {
          if (profile.avatarCid) pAvatar = profile.avatarCid.startsWith('http') ? profile.avatarCid : `https://ipfs.io/ipfs/${profile.avatarCid}`;
          else if (profile.profileCid) pAvatar = profile.profileCid.startsWith('http') ? profile.profileCid : `https://ipfs.io/ipfs/${profile.profileCid}`;
        }
      }

      const isOnline = unifiedMessagingService.isUserOnline(participantAddress);

      return {
        id: c.id,
        participant: participantAddress,
        participantEnsName: undefined,
        participantAvatar: pAvatar,
        isOnline: isOnline,
        isTyping: false,
        lastSeen: undefined,
        unreadCount: c.unreadCounts?.[address || ''] || 0,
        lastMessage: c.lastMessage ? ({
          id: c.lastMessage.id,
          fromAddress: c.lastMessage.fromAddress,
          content: c.lastMessage.content,
          timestamp: new Date(c.lastMessage.timestamp)
        } as ChannelMessage) : undefined,
        isPinned: (c as any).isPinned || false
      };
    });
    setDmConversations(mapped);
  }, [hookConversations, address, getParticipantProfile]);

  // Subscribe to presence
  useEffect(() => {
    const unsubscribe = unifiedMessagingService.on('presence_update', (data) => {
      setDmConversations(prev => prev.map(dm =>
        dm.participant.toLowerCase() === data.userAddress.toLowerCase()
          ? { ...dm, isOnline: data.isOnline, lastSeen: data.lastSeen }
          : dm
      ));
    });
    return () => unsubscribe();
  }, []);

  // Load messages when DM selected
  useEffect(() => {
    const load = async () => {
      if (isViewingDM && selectedDM) {
        await loadMessages({ conversationId: selectedDM, limit: 100 });
      }
    };
    load();
  }, [isViewingDM, selectedDM, loadMessages]);

  // Sync hook messages to local state
  useEffect(() => {
    if (isViewingDM) {
      setMessages(hookMessages.map(m => ({
        id: m.id,
        fromAddress: m.fromAddress,
        content: m.content,
        timestamp: new Date(m.timestamp),
        replyToId: (m as any).replyToId,
        replyTo: (m as any).replyTo,
        quotedMessageId: (m as any).quotedMessageId || (m as any).metadata?.quotedMessageId,
        metadata: (m as any).metadata,
        reactions: (m as any).reactions as any,
        threadReplies: (m as any).threadReplies as any,
        isEncrypted: !!(m as any).isEncrypted,
        attachments: (m as any).attachments as any
      })));
    }
  }, [isViewingDM, hookMessages]);

  // Resolve ENS
  useEffect(() => {
    const resolveParticipantNames = async () => {
      const participantsToResolve = dmConversations
        .filter(dm => dm.participant && !dm.participantEnsName)
        .map(dm => dm.participant);

      if (participantsToResolve.length > 0) {
        try {
          const resolved = await Promise.all(
            participantsToResolve.map(async (addr) => {
              try {
                const result = await resolveName(addr);
                return { address: addr, ensName: result.resolved && result.isValid ? result.resolved : null };
              } catch {
                return { address: addr, ensName: null };
              }
            })
          );
          setDmConversations(prev =>
            prev.map(dm => {
              const resolvedEntry = resolved.find(r => r.address === dm.participant);
              if (resolvedEntry && resolvedEntry.ensName) {
                return { ...dm, participantEnsName: resolvedEntry.ensName };
              }
              return dm;
            })
          );
        } catch (e) {
          console.warn('ENS batch resolve error', e);
        }
      }
    };
    if (dmConversations.length > 0) resolveParticipantNames();
  }, [dmConversations, resolveName]);

  // --- Handlers ---

  const toggleCategory = (categoryId: string) => {
    setChannelCategories(prev =>
      prev.map(cat => cat.id === categoryId ? { ...cat, isCollapsed: !cat.isCollapsed } : cat)
    );
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !address) return;

    // Logic from original component
    const validReplyToId = replyingTo?.messageId && !replyingTo.messageId.startsWith('msg_') ? replyingTo.messageId : undefined;
    const validQuoteId = quotingTo?.messageId && !quotingTo.messageId.startsWith('msg_') ? quotingTo.messageId : undefined;

    if (isViewingDM && selectedDM) {
      sendMessage({
        conversationId: selectedDM,
        fromAddress: address,
        content: newMessage.trim(),
        messageType: 'text',
        replyToId: validReplyToId,
        metadata: { quotedMessageId: validQuoteId }
      } as any).catch(err => console.warn('DM send failed', err));
    } else if (selectedChannel) {
      sendMessage({
        conversationId: selectedChannel,
        fromAddress: address,
        content: newMessage.trim(),
        messageType: 'text',
        replyToId: validReplyToId,
        metadata: { quotedMessageId: validQuoteId }
      } as any).catch(err => console.warn('Channel send failed', err));
    }

    setNewMessage('');
    setReplyingTo(null);
    setQuotingTo(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !address) return;

    try {
      setIsUploading(true);
      const attachment = await unifiedMessagingService.uploadAttachment(file);
      
      const payload = {
        conversationId: isViewingDM && selectedDM ? selectedDM : selectedChannel,
        fromAddress: address,
        content: '',
        contentType: file.type.startsWith('image/') ? 'image' : 'file',
        attachments: [attachment]
      };

      if (payload.conversationId) {
        await sendMessage(payload as any);
        safeAddToast('File shared successfully!', 'success');
      }
      setShowAttachmentModal(false);
    } catch (error) {
      console.error('Upload error', error);
      safeAddToast('Failed to upload file.', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- Interaction Handlers ---

  const addReaction = (messageId: string, emoji: string) => {
    // Optimistic update
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const reactions = msg.reactions || [];
        const existing = reactions.find(r => r.emoji === emoji);
        if (existing) {
          if (existing.users.includes(address || '')) {
            return {
              ...msg,
              reactions: reactions.map(r => r.emoji === emoji ? { ...r, count: r.count - 1, users: r.users.filter(u => u !== address) } : r).filter(r => r.count > 0)
            };
          } else {
            return {
              ...msg,
              reactions: reactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, users: [...r.users, address || ''] } : r)
            };
          }
        } else {
          return {
            ...msg,
            reactions: [...reactions, { emoji, count: 1, users: [address || ''] }]
          };
        }
      }
      return msg;
    }));
    // In a real app, call API here
  };

  const replyToMessage = (messageId: string, handle: string, content: string) => {
    setReplyingTo({ messageId, handle, content });
  };

  const quoteMessage = (content: string, author: string, messageId: string) => {
    setQuotingTo({ messageId, handle: author, content });
    setReplyingTo(null);
  };

  const openThread = (messageId: string) => {
    const message = messages.find(msg => msg.id === messageId);
    if (message) {
      setThreadMessages([message, ...(message.threadReplies || [])]);
      setShowThread({ messageId, show: true });
    }
  };

  const closeThread = () => setShowThread({ messageId: '', show: false });

  const sendThreadReply = (content: string) => {
    if (!content.trim() || !address) return;
    // Logic for sending thread reply... (simplified for this refactor)
    // Update local state for immediate feedback
    const reply: ChannelMessage = {
      id: `reply_${Date.now()}`,
      fromAddress: address,
      content: content.trim(),
      timestamp: new Date(),
      isThread: true,
      parentId: showThread.messageId
    };
    setThreadMessages(prev => [...prev, reply]);
  };

  const copyMessage = (content: string) => {
    if (!content) return;
    navigator.clipboard.writeText(content)
      .then(() => safeAddToast('Copied to clipboard', 'success'))
      .catch(() => safeAddToast('Failed to copy', 'error'));
  };

  const handleRetractMessage = async (messageId: string) => {
    if (!window.confirm('Retract message?')) return;
    try {
      const cid = isViewingDM ? selectedDM : selectedChannel;
      if (cid) await deleteMessage(messageId, cid);
      safeAddToast('Message retracted', 'success');
    } catch (err: any) {
      safeAddToast(err.message || 'Failed to retract', 'error');
    }
  };

  const handleLocalDelete = (messageId: string) => {
    if (!window.confirm('Delete for me?')) return;
    hideMessage(messageId);
    safeAddToast('Deleted from history', 'success');
  };

  const toggleReactionPicker = (messageId: string) => {
    setShowReactionPicker(prev => ({
      messageId: prev.messageId === messageId && prev.show ? '' : messageId,
      show: !(prev.messageId === messageId && prev.show)
    }));
  };

  const showReactionTooltip = (messageId: string, emoji: string, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setReactionTooltip({
      messageId,
      emoji,
      show: true,
      position: { x: rect.left + rect.width / 2, y: rect.top - 10 }
    });
  };

  const hideReactionTooltip = () => setReactionTooltip(null);

  // --- Render ---

  return (
    <div className={`flex h-full bg-white dark:bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      <ChatSidebar
        hideSidebar={hideSidebar}
        isMobile={isMobile}
        isSocketConnected={isSocketConnected}
        onClose={onClose || (() => {})}
        channelCategories={channelCategories}
        toggleCategory={toggleCategory}
        dmConversations={dmConversations}
        channels={channels}
        isViewingDM={isViewingDM}
        selectedDM={selectedDM}
        selectedChannel={selectedChannel}
        onSelectDM={(id) => {
          setIsViewingDM(true);
          setSelectedDM(id);
          setSelectedChannel(null);
        }}
        onSelectChannel={(id) => {
          setIsViewingDM(false);
          setSelectedDM(null);
          setSelectedChannel(id);
        }}
        getParticipantDisplayName={getParticipantDisplayName}
      />

      {showCrossChainBridge && (
        <div className={`w-80 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 ${isMobile ? 'hidden lg:block' : ''}`}>
          <CrossChainBridge
            className="h-full"
            onBridgeMessage={(m) => console.log('Bridge:', m)}
            onChannelSync={(cid, c) => console.log('Sync:', cid, c)}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <ChannelHeader
          isViewingDM={isViewingDM}
          selectedChannel={selectedChannel}
          selectedDM={selectedDM}
          channels={channels}
          dmConversations={dmConversations}
          participantAvatar={participantAvatar || null}
          participantName={participantName || null}
          participantAddress={participantAddress || null}
          onClose={onClose || (() => {})}
          showCrossChainBridge={showCrossChainBridge}
          setShowCrossChainBridge={setShowCrossChainBridge}
          getParticipantDisplayName={getParticipantDisplayName}
        />

        <MessageList
          messages={messages}
          address={address}
          getParticipantProfile={getParticipantProfile}
          isConnected={isConnected}
          addReaction={addReaction}
          showReactionTooltip={showReactionTooltip}
          hideReactionTooltip={hideReactionTooltip}
          toggleReactionPicker={toggleReactionPicker}
          showReactionPicker={showReactionPicker}
          reactionTooltip={reactionTooltip}
          channelMembers={channelMembers}
          replyToMessage={replyToMessage}
          quoteMessage={quoteMessage}
          openThread={openThread}
          copyMessage={copyMessage}
          handleRetractMessage={handleRetractMessage}
          handleLocalDelete={handleLocalDelete}
          isViewingDM={isViewingDM}
        />

        <MessageInput
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          handleSendMessage={handleSendMessage}
          handleKeyPress={handleKeyPress}
          isUploading={isUploading}
          fileInputRef={fileInputRef}
          handleFileUpload={handleFileUpload}
          setShowAttachmentModal={setShowAttachmentModal}
          replyingTo={replyingTo}
          quotingTo={quotingTo}
          setReplyingTo={setReplyingTo}
          setQuotingTo={setQuotingTo}
        />

        {/* Thread Overlay (Simplified for refactor - ideally could be another sub-component) */}
        {showThread.show && (
          <div className="absolute inset-0 bg-black/70 z-20 flex">
            <div className={`ml-auto w-full md:w-2/3 h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col ${isMobile ? 'w-full' : ''}`}>
              {/* Thread header and content would go here */}
              <div className="p-4 border-b flex justify-between">
                <h3>Thread</h3>
                <button onClick={closeThread}>X</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {threadMessages.map(m => (
                  <div key={m.id} className="mb-2 p-2 bg-gray-100 rounded">
                    <p className="font-bold text-xs">{m.fromAddress.slice(0,6)}</p>
                    <p>{m.content}</p>
                  </div>
                ))}
              </div>
              {/* Simple thread input */}
              <div className="p-4 border-t">
                <input 
                  className="w-full border rounded p-2" 
                  placeholder="Reply..."
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      sendThreadReply(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Attachment Modal */}
        {showAttachmentModal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Share Content</h3>
              <button
                className={`w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-3 rounded-lg flex items-center justify-center transition-colors ${touchTargetClasses}`}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload File'}
              </button>
              <button
                className="mt-4 w-full text-gray-500 hover:text-gray-700"
                onClick={() => setShowAttachmentModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagingInterface;
