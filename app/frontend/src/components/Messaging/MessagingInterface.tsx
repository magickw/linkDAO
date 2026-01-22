/**
 * Messaging Interface
 * Enhanced messaging with channels, threads, and reactions
 */

import DOMPurify from 'dompurify';
import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle, Search, Send, User, Plus, Hash, Lock,
  ThumbsUp, Heart, Zap, Rocket, Globe, Users, X, ChevronDown, ChevronRight,
  Image, Link as LinkIcon, Loader2, Wallet, Vote, Calendar, Tag, Settings, ArrowLeftRight,
  Phone, Video, Shield, ArrowLeft, Wifi, WifiOff, Trash2, Copy, Quote, CornerUpLeft
} from 'lucide-react';
import { useAccount } from 'wagmi';
import CrossChainBridge from './CrossChainBridge';
import useENSIntegration from '../../hooks/useENSIntegration';
import { useChatHistory } from '@/hooks/useChatHistory';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import Web3SwipeGestureHandler from '@/components/Mobile/Web3SwipeGestureHandler';
import { motion, PanInfo } from 'framer-motion';
import { UserProfile } from '../../models/UserProfile';
import useWebSocket from '../../hooks/useWebSocket';
import { useToast } from '@/context/ToastContext';
import { unifiedMessagingService } from '@/services/unifiedMessagingService';

// Helper function to get the backend URL
const getBackendUrl = (): string => {
  let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'www.linkdao.io' || hostname === 'linkdao.io' || hostname === 'app.linkdao.io') {
      backendUrl = 'https://api.linkdao.io';
    }
  }
  return backendUrl;
};


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

// Add DirectMessageConversation interface
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
    metadata?: {
      contractAddress?: string;
      tokenId?: string;
      tokenName?: string;
      tokenSymbol?: string;
      imageUrl?: string;
      price?: string;
      transactionHash?: string;
      blockNumber?: number;
      gasUsed?: string;
      status?: 'success' | 'failed' | 'pending';
    };
  }[];
  mentions?: string[];
  // DM-specific properties
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
  balance?: {
    eth: number;
    ld: number;
  };
}

// Channel categories for organization
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
  /** When true, hides the left sidebar (for use when parent component has its own sidebar) */
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
  const { isMobile, triggerHapticFeedback, touchTargetClasses } = useMobileOptimization();
  const { resolveName, resolvedNames, isLoading } = useENSIntegration();
  const { isConnected: isSocketConnected } = useWebSocket({ walletAddress: address || '' });
  const { addToast } = useToast();

  // Add a safety check for the toast function
  const safeAddToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    if (typeof addToast === 'function') {
      return addToast(message, type);
    } else {
      console.log(`[Toast Fallback] ${type}: ${message}`);
    }
  };

  // Helper function to get the best display name for a participant
  const getParticipantDisplayName = (participantAddress: string): string => {
    // Try to get the participant's profile
    const profile = getParticipantProfile?.(participantAddress);

    // Priority: handle > display name > ENS name > shortened address
    if (profile?.handle) return profile.handle;
    if (profile?.displayName) return profile.displayName;
    if (profile?.ens) return profile.ens;

    // Check if we have a resolved ENS name
    const dm = dmConversations.find(d => d.participant === participantAddress);
    if (dm?.participantEnsName) return dm.participantEnsName;

    // Fall back to shortened address
    return truncateAddress(participantAddress);
  };

  // Helper function to truncate addresses
  const truncateAddress = (addr: string) => {
    if (!addr || addr.length <= 10) return addr || '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };



  // Add typing timeout ref for channel messages
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add state for DM conversations (backed by chat history hook)
  const { conversations: hookConversations, messages: hookMessages, loadMessages, sendMessage, deleteMessage, hideMessage } = useChatHistory();
  const [dmConversations, setDmConversations] = useState<DirectMessageConversation[]>([]);

  // Channels will be loaded from backend - no mock data
  const [channels, setChannels] = useState<ChatChannel[]>([]);

  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  // Add state to track if we're viewing a DM or channel
  const [isViewingDM, setIsViewingDM] = useState(false);
  const [selectedDM, setSelectedDM] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Initialize with passed conversationId from parent
  useEffect(() => {
    if (conversationId) {
      setIsViewingDM(true);
      setSelectedDM(conversationId);
    }
  }, [conversationId]);

  const [messages, setMessages] = useState<ChannelMessage[]>([]);

  const [newMessage, setNewMessage] = useState('');
  const [conversations, setConversations] = useState([]);

  // Mobile swipe gesture state
  const [swipeStates, setSwipeStates] = useState<Record<string, { x: number; opacity: number }>>({});

  // Add state for channel categories
  const [channelCategories, setChannelCategories] = useState<ChannelCategory[]>([
    { id: 'direct', name: 'Direct Messages', isCollapsed: false },
    { id: 'public', name: 'Public Channels', isCollapsed: false },
    { id: 'private', name: 'Private Channels', isCollapsed: false },
    { id: 'gated', name: 'Gated Channels', isCollapsed: false }
  ]);
  const [channelMembers] = useState<ChannelMember[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);



  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea when newMessage changes
  useEffect(() => {
    if (messageInputRef.current) {
      messageInputRef.current.style.height = 'auto';
      messageInputRef.current.style.height = `${Math.min(messageInputRef.current.scrollHeight, 200)}px`;
    }
  }, [newMessage]);

  // Sync hook conversations into DM list
  useEffect(() => {
    if (!hookConversations) return;
    const mapped: DirectMessageConversation[] = hookConversations.map(c => {
      // DEBUG: Log participant extraction logic
      if (Math.random() < 0.05) { // Sample logs to avoid spam
        console.log('Participant Debug:', {
          id: c.id,
          participants: c.participants,
          myAddress: address,
          found: c.participants.find((p: any) => p?.toLowerCase() !== address?.toLowerCase())
        });
      }

      const participantAddress = Array.isArray(c.participants)
        ? (c.participants.find((p: any) => p?.toLowerCase() !== address?.toLowerCase()) || c.participants[0])
        : (c.participants as any);

      // Get participant profile to fetch avatar
      let participantAvatar: string | null = null;
      if (getParticipantProfile && participantAddress) {
        const profile = getParticipantProfile(participantAddress);
        if (profile) {
          // Priority: avatarCid > profileCid
          if (profile.avatarCid) {
            participantAvatar = profile.avatarCid.startsWith('http') ? profile.avatarCid : `https://ipfs.io/ipfs/${profile.avatarCid}`;
          } else if (profile.profileCid) {
            participantAvatar = profile.profileCid.startsWith('http') ? profile.profileCid : `https://ipfs.io/ipfs/${profile.profileCid}`;
          }
        }
      }

      // CHECK INITIAL ONLINE STATUS
      const isOnline = unifiedMessagingService.isUserOnline(participantAddress);

      return {
        id: c.id,
        participant: participantAddress,
        participantEnsName: undefined,
        participantAvatar,
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

  // Subscribe to presence updates
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

  // When viewing a DM, load messages via hook
  useEffect(() => {
    const load = async () => {
      if (isViewingDM && selectedDM) {
        await loadMessages({ conversationId: selectedDM, limit: 100 });
      }
    };
    load();
  }, [isViewingDM, selectedDM, loadMessages]);

  // Mirror hook messages into channel messages when viewing DM
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

  // Resolve ENS names for DM participants
  useEffect(() => {
    const resolveParticipantNames = async () => {
      // Get participants that don't have ENS names resolved yet
      const participantsToResolve = dmConversations
        .filter(dm => dm.participant && !dm.participantEnsName)
        .map(dm => dm.participant);

      if (participantsToResolve.length > 0) {
        try {
          // Resolve all participant addresses to ENS names
          const resolved = await Promise.all(
            participantsToResolve.map(async (addr) => {
              try {
                const result = await resolveName(addr);
                return { address: addr, ensName: result.resolved && result.isValid ? result.resolved : null };
              } catch (error) {
                console.warn(`Failed to resolve ENS name for ${addr}:`, error);
                return { address: addr, ensName: null };
              }
            })
          );

          // Update DM conversations with resolved ENS names
          setDmConversations(prev =>
            prev.map(dm => {
              const resolvedEntry = resolved.find(r => r.address === dm.participant);
              if (resolvedEntry && resolvedEntry.ensName) {
                return { ...dm, participantEnsName: resolvedEntry.ensName };
              }
              return dm;
            })
          );
        } catch (error) {
          console.warn('Batch ENS resolution failed:', error);
        }
      }
    };

    if (dmConversations.length > 0) {
      resolveParticipantNames();
    }
  }, [dmConversations, resolveName]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendChannelMessage = () => {
    if (!newMessage.trim() || !address) return;

    const message: ChannelMessage = {
      id: `msg_${Date.now()}`,
      fromAddress: address,
      content: newMessage.trim(),
      timestamp: new Date()
    };

    // Check for mentions and send notifications
    if (checkForMentions(message.content)) {
      sendNotification('mention', message);
    } else if (notificationSettings.general) {
      sendNotification('message', message);
    }

    // If viewing a DM, use hook sendMessage to persist
    // If viewing a DM, use hook sendMessage to persist
    if (isViewingDM && selectedDM) {
      // Don't send replyToId if it's an optimistic ID (starts with msg_)
      const validReplyToId = replyingTo?.messageId && !replyingTo.messageId.startsWith('msg_')
        ? replyingTo.messageId
        : undefined;
      
      const validQuoteId = quotingTo?.messageId && !quotingTo.messageId.startsWith('msg_')
        ? quotingTo.messageId
        : undefined;

      sendMessage({
        conversationId: selectedDM,
        fromAddress: address,
        content: newMessage.trim(),
        messageType: 'text',
        replyToId: validReplyToId,
        metadata: {
          quotedMessageId: validQuoteId
        }
      } as any).catch(err => {
        console.warn('Failed to send DM via hook', err);
        // Do NOT manually add to local state here - the hook handles optimistic updates
        // and we don't want duplicates if the hook retries or when network recovers
      });
    } else if (selectedChannel) {
      // Don't send replyToId if it's an optimistic ID (starts with msg_)
      const validReplyToId = replyingTo?.messageId && !replyingTo.messageId.startsWith('msg_')
        ? replyingTo.messageId
        : undefined;

      const validQuoteId = quotingTo?.messageId && !quotingTo.messageId.startsWith('msg_')
        ? quotingTo.messageId
        : undefined;

      // Handle channel message - persist to backend
      sendMessage({
        conversationId: selectedChannel,
        fromAddress: address,
        content: newMessage.trim(),
        messageType: 'text',
        replyToId: validReplyToId,
        metadata: {
          quotedMessageId: validQuoteId
        }
      } as any).catch(err => {
        console.warn('Failed to send channel message via hook', err);
      });
    } else {
      // Fallback for UI testing if no channel selected (shouldn't happen with disabled button)
      const message: ChannelMessage = {
        id: `msg_${Date.now()}`,
        fromAddress: address,
        content: newMessage.trim(),
        timestamp: new Date(),
        parentId: replyingTo?.messageId
      };
      setMessages(prev => [...prev, message]);
    }

    setNewMessage('');
    setReplyingTo(null);
    setQuotingTo(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChannelMessage();
    }
  };

  const addReaction = (messageId: string, emoji: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const reactions = msg.reactions || [];
        const existingReaction = reactions.find(r => r.emoji === emoji);

        if (existingReaction) {
          // Check if user already reacted with this emoji
          if (existingReaction.users.includes(address || '')) {
            return {
              ...msg,
              reactions: reactions.map(r =>
                r.emoji === emoji
                  ? {
                    ...r,
                    count: r.count - 1,
                    users: r.users.filter(u => u !== address)
                  }
                  : r
              ).filter(r => r.count > 0)
            };
          } else {
            return {
              ...msg,
              reactions: reactions.map(r =>
                r.emoji === emoji
                  ? {
                    ...r,
                    count: r.count + 1,
                    users: [...r.users, address || '']
                  }
                  : r
              )
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
  };



  const openThread = (messageId: string) => {
    const message = messages.find(msg => msg.id === messageId);
    if (message) {
      setThreadMessages([
        message,
        ...(message.threadReplies || [])
      ]);
      setShowThread({ messageId, show: true });
    }
  };

  const closeThread = () => {
    setShowThread({ messageId: '', show: false });
  };

  const replyToMessage = (messageId: string, username: string, content: string) => {
    setReplyingTo({ messageId, username, content });
    messageInputRef.current?.focus();
  };

  const sendThreadReply = (content: string) => {
    if (!content.trim() || !address) return;

    const reply: ChannelMessage = {
      id: `reply_${Date.now()}`,
      fromAddress: address,
      content: content.trim(),
      timestamp: new Date(),
      isThread: true,
      parentId: showThread.messageId
    };

    // Add to thread messages
    setThreadMessages(prev => [...prev, reply]);

    // Update main messages with thread reply
    setMessages(prev => prev.map(msg => {
      if (msg.id === showThread.messageId) {
        return {
          ...msg,
          threadReplies: [...(msg.threadReplies || []), reply]
        };
      }
      return msg;
    }));
  };

  const quoteMessage = (content: string, author: string, messageId: string) => {
    // Set quoting metadata for the preview banner
    setQuotingTo({ messageId, username: author, content });
    setReplyingTo(null); // Clear reply if quoting

    // Focus input after a short delay to ensure state update
    setTimeout(() => {
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
    }, 0);
  };

  const copyMessage = (content: string) => {
    if (!content) return;
    navigator.clipboard.writeText(content)
      .then(() => safeAddToast('Message copied to clipboard', 'success'))
      .catch(() => safeAddToast('Failed to copy message', 'error'));
  };

  const handleRetractMessage = async (messageId: string) => {
    if (!window.confirm('Are you sure you want to retract this message? It will be removed for everyone.')) return;

    try {
      if (isViewingDM && selectedDM) {
        await deleteMessage(messageId, selectedDM);
      } else if (selectedChannel) {
        await deleteMessage(messageId, selectedChannel);
      }
      // Optimistic update handled in hook or backend response
      safeAddToast('Message retracted', 'success');
    } catch (error: any) {
      console.error('Failed to retract message:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to retract message';
      safeAddToast(errorMessage, 'error');
    }
  };

  const handleLocalDelete = (messageId: string) => {
    if (!window.confirm('Delete this message from your history? It will still be visible to others.')) return;
    hideMessage(messageId);
    safeAddToast('Message deleted from your history', 'success');
  };

  const toggleCategory = (categoryId: string) => {
    setChannelCategories((prev: ChannelCategory[]) =>
      prev.map((cat: ChannelCategory) =>
        cat.id === categoryId
          ? { ...cat, isCollapsed: !cat.isCollapsed }
          : cat
      )
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500';
      case 'moderator': return 'bg-blue-500';
      case 'holder': return 'bg-purple-500';
      case 'builder': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'moderator': return 'Mod';
      case 'holder': return 'Holder';
      case 'builder': return 'Builder';
      default: return 'Member';
    }
  };

  const reactionEmojis = ['👍', '❤️', '😂', '😮', '🔥', '🚀'];

  const [showReactionPicker, setShowReactionPicker] = useState<{ messageId: string; show: boolean }>({
    messageId: '',
    show: false
  });
  const [showThread, setShowThread] = useState<{ messageId: string; show: boolean }>({
    messageId: '',
    show: false
  });
  const [threadMessages, setThreadMessages] = useState<ChannelMessage[]>([]);
  const [replyingTo, setReplyingTo] = useState<{ messageId: string; username: string; content: string } | null>(null);
  const [quotingTo, setQuotingTo] = useState<{ messageId: string; username: string; content: string } | null>(null);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [showCrossChainBridge, setShowCrossChainBridge] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    general: true,
    mentions: true,
    reactions: false
  });
  const [reactionTooltip, setReactionTooltip] = useState<{
    messageId: string;
    emoji: string;
    show: boolean;
    position: { x: number; y: number };
  } | null>(null);
  const [inviteLinks, setInviteLinks] = useState<{ [channelId: string]: string }>({});
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [attachmentType, setAttachmentType] = useState<'nft' | 'transaction' | 'image' | 'file' | null>(null);

  // Attachment form state
  const [nftContract, setNftContract] = useState('');
  const [nftTokenId, setNftTokenId] = useState('');
  const [txHash, setTxHash] = useState('');

  // Right sidebar state
  const [rightSidebarTab, setRightSidebarTab] = useState<'members' | 'files'>('members');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');

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
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top - 10 // Position above the reaction
      }
    });
  };

  const hideReactionTooltip = () => {
    setReactionTooltip(null);
  };

  const generateInviteLink = (channelId: string) => {
    // Generate a unique invite link
    const inviteCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const inviteLink = `${window.location.origin}/invite/${inviteCode}?channel=${channelId}`;

    setInviteLinks(prev => ({
      ...prev,
      [channelId]: inviteLink
    }));

    setShowInviteModal(true);
    return inviteLink;
  };

  const copyInviteLink = (link: string) => {
    navigator.clipboard.writeText(link);
    // You could add a toast notification here
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !address) return;

    try {
      setIsUploading(true);
      console.log('Uploading file:', file.name, file.type);

      // Use the unified upload service
      const attachment = await unifiedMessagingService.uploadAttachment(file);

      // Send the message immediately with the attachment
      if (isViewingDM && selectedDM) {
        await sendMessage({
          conversationId: selectedDM,
          fromAddress: address,
          content: '', // Empty content - let attachment component handle display
          contentType: file.type.startsWith('image/') ? 'image' : 'file',
          attachments: [attachment]
        } as any);
      } else if (selectedChannel) {
        await sendMessage({
          conversationId: selectedChannel,
          fromAddress: address,
          content: '',
          contentType: file.type.startsWith('image/') ? 'image' : 'file',
          attachments: [attachment]
        } as any);
      }

      setShowAttachmentModal(false);
      safeAddToast('File shared successfully!', 'success');
    } catch (error) {
      console.error('File upload error:', error);
      safeAddToast('Failed to upload file. Please try again.', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const shareNFT = async (contractAddress: string, tokenId: string, price?: string) => {
    const attachment = {
      type: 'nft' as const,
      url: '#',
      name: `NFT #${tokenId}`,
      metadata: {
        contractAddress,
        tokenId,
        tokenName: `NFT #${tokenId}`,
        price
      }
    };

    if (isViewingDM && selectedDM && address) {
      await sendMessage({
        conversationId: selectedDM,
        fromAddress: address,
        content: `Shared an NFT: ${tokenId}`,
        contentType: 'text',
        attachments: [attachment]
      } as any);
    } else if (address) {
      const message: ChannelMessage = {
        id: `msg_${Date.now()}`,
        fromAddress: address,
        content: `Shared an NFT: ${tokenId}`,
        timestamp: new Date(),
        attachments: [attachment]
      };
      setMessages(prev => [...prev, message]);
    }

    console.log('NFT shared:', attachment);
    setShowAttachmentModal(false);
  };

  const shareTransaction = async (txHash: string, status: 'success' | 'failed' | 'pending' = 'success') => {
    const attachment = {
      type: 'transaction' as const,
      url: `https://etherscan.io/tx/${txHash}`,
      name: `Transaction ${txHash.slice(0, 10)}...`,
      metadata: {
        transactionHash: txHash,
        status
      }
    };

    if (isViewingDM && selectedDM && address) {
      await sendMessage({
        conversationId: selectedDM,
        fromAddress: address,
        content: `Shared a transaction: ${txHash.slice(0, 10)}...`,
        contentType: 'text',
        attachments: [attachment]
      } as any);
    } else if (address) {
      const message: ChannelMessage = {
        id: `msg_${Date.now()}`,
        fromAddress: address,
        content: `Shared a transaction: ${txHash.slice(0, 10)}...`,
        timestamp: new Date(),
        attachments: [attachment]
      };
      setMessages(prev => [...prev, message]);
    }

    console.log('Transaction shared:', attachment);
    setShowAttachmentModal(false);
  };

  const parseMentions = (content: string | undefined): JSX.Element => {
    // Guard against undefined content
    if (!content) {
      return <></>;
    }

    // Split by blockquotes first
    const blockquoteRegex = /^>\s(.*)$/gm;
    const parts = content.split(blockquoteRegex);

    // Check if content has any blockquotes
    const hasBlockquotes = content.match(blockquoteRegex);

    if (hasBlockquotes) {
      const lines = content.split('\n');
      const renderedLines: React.ReactNode[] = [];
      let currentBlockquote: string[] = [];
      let currentAuthor: string | null = null;

      lines.forEach((line, i) => {
        if (line.startsWith('>')) {
          let text = line.substring(1).trim();
          // Detect author header: **Name**:
          const authorMatch = text.match(/^\*\*(.*)\*\*:/);
          if (authorMatch) {
            // If we have an existing blockquote, render it first
            if (currentBlockquote.length > 0) {
              renderedLines.push(renderBlockquote(currentBlockquote, currentAuthor, `bq-${i}`));
              currentBlockquote = [];
            }
            currentAuthor = authorMatch[1];
            text = text.replace(/^\*\*(.*)\*\*:/, '').trim();
          }
          if (text) currentBlockquote.push(text);
        } else {
          if (currentBlockquote.length > 0) {
            renderedLines.push(renderBlockquote(currentBlockquote, currentAuthor, `bq-${i}`));
            currentBlockquote = [];
            currentAuthor = null;
          }
          if (line.trim() || i < lines.length - 1) {
            renderedLines.push(<div key={`l-${i}`} className="min-h-[1.2em]">{renderMentions(line)}</div>);
          }
        }
      });

      if (currentBlockquote.length > 0) {
        renderedLines.push(renderBlockquote(currentBlockquote, currentAuthor, "bq-final"));
      }

      return <>{renderedLines}</>;
    }

    return renderMentions(content);
  };

  const renderBlockquote = (lines: string[], author: string | null, key: string) => (
    <div key={key} className="my-2 flex flex-col gap-1">
      {author && (
        <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide ml-1">
          {author}
        </div>
      )}
      <div className="bg-gray-100 dark:bg-gray-800/80 border-l-4 border-gray-400 p-3 rounded-r-lg text-sm text-gray-600 dark:text-gray-300 italic shadow-inner transition-colors group-hover:bg-gray-200 dark:group-hover:bg-gray-750">
        {lines.map((line, idx) => (
          <div key={idx} className="whitespace-pre-wrap">{line}</div>
        ))}
      </div>
    </div>
  );

  const renderMentions = (text: string): JSX.Element => {
    // Simple regex to find @mentions (addresses or usernames)
    const mentionRegex = /(@[\w\d]+\.eth|@0x[a-fA-F0-9]{40}|@\w+)/g;
    const parts = text.split(mentionRegex);

    return (
      <>
        {parts.map((part, index) => {
          if (part.match(mentionRegex)) {
            // Check if this mention is for the current user
            const isCurrentUser = part === `@${address?.slice(0, 6)}...${address?.slice(-4)}` ||
              part === '@you' ||
              (address && part.toLowerCase() === `@${address.toLowerCase()}`);

            return (
              <span
                key={index}
                className={`font-semibold ${isCurrentUser ? 'bg-blue-500/20 text-blue-400 px-1 rounded' : 'text-blue-400'
                  }`}
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

  const checkForMentions = (content: string | undefined): boolean => {
    if (!address || !content) return false;

    const mentionPatterns = [
      `@${address.slice(0, 6)}...${address.slice(-4)}`,
      '@you',
      `@${address.toLowerCase()}`
    ];

    return mentionPatterns.some(pattern => content.toLowerCase().includes(pattern.toLowerCase()));
  };

  const sendNotification = (type: 'mention' | 'message', message: ChannelMessage) => {
    // In a real app, this would send a browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`LinkDAO - ${channels.find(c => c.id === selectedChannel)?.name}`, {
        body: type === 'mention' ? `You were mentioned: ${message.content}` : message.content,
        icon: '/favicon.ico'
      });
    }
  };

  const getMentionSuggestions = (query: string) => {
    const allUsers = channelMembers.map(member => ({
      address: member.address,
      name: member.name,
      ensName: member.ensName
    }));

    if (!query) return allUsers.slice(0, 5);

    return allUsers.filter(user =>
      user.name.toLowerCase().includes(query.toLowerCase()) ||
      user.address.toLowerCase().includes(query.toLowerCase()) ||
      (user.ensName && user.ensName.toLowerCase().includes(query.toLowerCase()))
    ).slice(0, 5);
  };

  const insertMention = (user: { address: string; name: string; ensName?: string }) => {
    const mention = `@${user.ensName || user.name}`;
    const beforeAt = newMessage.substring(0, newMessage.lastIndexOf('@'));
    const afterAt = newMessage.substring(newMessage.lastIndexOf('@') + mentionQuery.length + 1);
    setNewMessage(beforeAt + mention + ' ' + afterAt);
    setShowMentionSuggestions(false);
    setMentionQuery('');
  };

  const handleMessageChange = (value: string) => {
    setNewMessage(value);

    // Auto-resize textarea
    if (messageInputRef.current) {
      messageInputRef.current.style.height = 'auto';
      messageInputRef.current.style.height = `${Math.min(messageInputRef.current.scrollHeight, 200)}px`;
    }

    // Handle typing indicators
    if (isViewingDM && selectedDM) {
      // Start typing indicator for DM
      startDmTyping(selectedDM);
    } else if (selectedChannel) {
      // Handle channel typing (existing functionality)
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        // In a real implementation, you would notify the server that typing stopped
      }, 3000);
    }

    // Handle mention suggestions
    const cursorPos = (document.activeElement as HTMLTextAreaElement)?.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex !== -1) {
      const query = textBeforeCursor.substring(atIndex + 1);
      if (query.length >= 0 && !query.includes(' ')) {
        setMentionQuery(query);
        setShowMentionSuggestions(true);
      } else {
        setShowMentionSuggestions(false);
      }
    } else {
      setShowMentionSuggestions(false);
    }
  };

  // Add typing timeouts for DMs
  const dmTypingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Function to start typing indicator for a DM
  const startDmTyping = (dmId: string) => {
    // Clear existing timeout
    const existingTimeout = dmTypingTimeouts.current.get(dmId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Update DM to show typing
    setDmConversations(prev => prev.map(dm =>
      dm.id === dmId ? { ...dm, isTyping: true } : dm
    ));

    // Set timeout to stop typing
    const timeout = setTimeout(() => {
      setDmConversations(prev => prev.map(dm =>
        dm.id === dmId ? { ...dm, isTyping: false } : dm
      ));
      dmTypingTimeouts.current.delete(dmId);
    }, 5000); // Stop typing after 5 seconds

    dmTypingTimeouts.current.set(dmId, timeout);
  };

  // Function to stop typing indicator for a DM
  const stopDmTyping = (dmId: string) => {
    const timeout = dmTypingTimeouts.current.get(dmId);
    if (timeout) {
      clearTimeout(timeout);
      dmTypingTimeouts.current.delete(dmId);
    }

    setDmConversations(prev => prev.map(dm =>
      dm.id === dmId ? { ...dm, isTyping: false } : dm
    ));
  };

  // Function to update online status for a DM participant
  const updateDmParticipantStatus = (participantAddress: string, isOnline: boolean, lastSeen?: Date) => {
    setDmConversations(prev => prev.map(dm =>
      dm.participant === participantAddress
        ? { ...dm, isOnline, lastSeen: lastSeen || new Date() }
        : dm
    ));
  };

  // Function to sort DM conversations by recent activity
  const sortDmConversations = (conversations: DirectMessageConversation[]) => {
    return [...conversations].sort((a, b) => {
      // Pinned DMs first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // Unread DMs next
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;

      // Online users next
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;

      // Then by last activity
      const aTime = a.lastMessage?.timestamp.getTime() || 0;
      const bTime = b.lastMessage?.timestamp.getTime() || 0;
      return bTime - aTime;
    });
  };

  // Function to mark DM messages as read
  const markDmMessagesAsRead = (dmId: string) => {
    setDmConversations(prev => prev.map(dm =>
      dm.id === dmId ? { ...dm, unreadCount: 0 } : dm
    ));
  };

  // Function to add a new DM conversation
  const addNewDmConversation = (participantAddress: string, participantEnsName?: string) => {
    const newDm: DirectMessageConversation = {
      id: `dm_${Date.now()}`,
      participant: participantAddress,
      participantEnsName,
      isOnline: false,
      unreadCount: 0,
      isPinned: false
    };

    setDmConversations(prev => [newDm, ...prev]);
    return newDm.id;
  };

  // Function to update DM unread count
  const updateDmUnreadCount = (dmId: string, count: number) => {
    setDmConversations(prev => prev.map(dm =>
      dm.id === dmId ? { ...dm, unreadCount: count } : dm
    ));
  };

  // Function to pin/unpin a DM
  const toggleDmPin = (dmId: string) => {
    setDmConversations(prev => prev.map(dm =>
      dm.id === dmId ? { ...dm, isPinned: !dm.isPinned } : dm
    ));
  };

  return (
    <div className={`flex h-full bg-white dark:bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* Channels Sidebar - Hidden on mobile by default or when hideSidebar is true */}
      {!hideSidebar && (
        <div className={`w-60 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800 ${isMobile ? 'hidden md:block' : ''}`}>
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <MessageCircle size={20} className="mr-2" />
                LinkDAO Chat
                <div className="ml-2" title={isSocketConnected ? "Online" : "Offline"}>
                  {isSocketConnected ? (
                    <Wifi size={16} className="text-green-500" />
                  ) : (
                    <WifiOff size={16} className="text-red-500" />
                  )}
                </div>
              </h2>
              <button
                className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                onClick={onClose}
              >
                <X size={16} />
              </button>
            </div>

            <div className="relative">
              <Search size={16} className="absolute left-2 top-2.5 text-gray-500 dark:text-gray-400" />
              <input
                type="text"
                placeholder="Search channels..."
                className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded px-8 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* DMs Section */}
          <div className="px-2 py-3">
            <div
              className="flex items-center justify-between px-2 py-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              onClick={() => toggleCategory('direct')}
            >
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center">
                {channelCategories.find(c => c.id === 'direct')?.isCollapsed ?
                  <ChevronRight size={14} className="mr-1" /> :
                  <ChevronDown size={14} className="mr-1" />}
                Direct Messages
              </h3>
              <button className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <Plus size={14} />
              </button>
            </div>

            {!channelCategories.find(c => c.id === 'direct')?.isCollapsed && (
              <>
                {dmConversations
                  .sort((a, b) => {
                    // Pinned DMs first
                    if (a.isPinned && !b.isPinned) return -1;
                    if (!a.isPinned && b.isPinned) return 1;

                    // Online users next
                    if (a.isOnline && !b.isOnline) return -1;
                    if (!a.isOnline && b.isOnline) return 1;

                    // Then by last activity
                    const aTime = a.lastMessage?.timestamp.getTime() || 0;
                    const bTime = b.lastMessage?.timestamp.getTime() || 0;
                    return bTime - aTime;
                  })
                  .map(dm => (
                    <div
                      key={dm.id}
                      className={`flex items-center px-2 py-1.5 rounded cursor-pointer mb-1 ml-4 ${isViewingDM && selectedDM === dm.id ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      onClick={() => {
                        setIsViewingDM(true);
                        setSelectedDM(dm.id);
                        setSelectedChannel(null);
                      }}
                    >
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                          <User size={16} className="text-white" />
                        </div>
                        {/* Online status indicator */}
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-100 dark:border-gray-800 ${dm.isOnline ? 'bg-green-500' : 'bg-gray-500'
                          }`}></div>
                        {/* Typing indicator */}
                        {dm.isTyping && (
                          <div className="absolute -top-1 -right-1 flex space-x-1">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                          </div>
                        )}
                        {dm.unreadCount > 0 && !dm.isTyping && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-xs">
                            {dm.unreadCount}
                          </div>
                        )}
                      </div>
                      <div className="ml-2 flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {getParticipantDisplayName(dm.participant)}
                        </div>
                        {dm.lastMessage && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {dm.lastMessage.content}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </>
            )}
          </div>

          {/* Channels Section */}
          <div className="px-2 py-3 flex-1 overflow-y-auto">
            {channelCategories.filter(cat => cat.id !== 'direct').map(category => (
              <div key={category.id} className="mb-3">
                <div
                  className="flex items-center justify-between px-2 py-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  onClick={() => toggleCategory(category.id)}
                >
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center">
                    {category.isCollapsed ?
                      <ChevronRight size={14} className="mr-1" /> :
                      <ChevronDown size={14} className="mr-1" />}
                    {category.name}
                  </h3>
                  <button className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                    <Plus size={14} />
                  </button>
                </div>

                {!category.isCollapsed && (
                  <div className="ml-4 mt-1">
                    {channels
                      .filter(channel => channel.category === category.id)
                      .map(channel => (
                        <div
                          key={channel.id}
                          className={`flex items-center px-2 py-1.5 rounded cursor-pointer mb-1 ${!isViewingDM && selectedChannel === channel.id ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                          onClick={() => {
                            setIsViewingDM(false);
                            setSelectedDM(null);
                            setSelectedChannel(channel.id);
                          }}
                        >
                          <div className="flex items-center">
                            {channel.isGated ? (
                              <Tag size={16} className="text-yellow-400 mr-1" />
                            ) : channel.isPrivate ? (
                              <Lock size={16} className="text-gray-500 dark:text-gray-400 mr-1" />
                            ) : (
                              <Hash size={16} className="text-gray-500 dark:text-gray-400 mr-1" />
                            )}
                            <span className="text-sm text-gray-900 dark:text-white truncate">
                              {channel.icon && <span className="mr-1">{channel.icon}</span>}
                              #{channel.name}
                            </span>
                          </div>
                          {channel.unreadCount > 0 && (
                            <div className="ml-auto w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs">
                              {channel.unreadCount}
                            </div>
                          )}
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cross-Chain Bridge Panel */}
      {showCrossChainBridge && (
        <div className={`w-80 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 ${isMobile ? 'hidden lg:block' : ''}`}>
          <CrossChainBridge
            className="h-full"
            onBridgeMessage={(message) => {
              console.log('Bridge message:', message);
            }}
            onChannelSync={(channelId, chains) => {
              console.log('Channel sync:', channelId, chains);
            }}
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Channel Header */}
        {!isViewingDM && selectedChannel && (
          <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={onClose}
                className={`md:hidden mr-2 ${touchTargetClasses} text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white`}
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                  {channels.find(c => c.id === selectedChannel)?.icon &&
                    <span className="mr-2">{channels.find(c => c.id === selectedChannel)?.icon}</span>}
                  <Hash size={24} className="mr-2 text-gray-500 dark:text-gray-400" />
                  {channels.find(c => c.id === selectedChannel)?.name}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                  {channels.find(c => c.id === selectedChannel)?.topic}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 hidden sm:flex">
                <Users size={16} className="mr-1" />
                {channels.find(c => c.id === selectedChannel)?.memberCount}
              </div>

              {/* Cross-Chain Bridge Toggle - Hidden on mobile */}
              <button
                onClick={() => setShowCrossChainBridge(!showCrossChainBridge)}
                className={`flex items-center px-3 py-1 rounded text-sm hidden sm:flex ${showCrossChainBridge
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <ArrowLeftRight size={14} className="mr-1" />
                Bridge
              </button>
            </div>
          </div>
        )}

        {/* DM Header */}
        {isViewingDM && selectedDM && (
          <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={onClose}
                className={`md:hidden mr-2 ${touchTargetClasses} text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white`}
              >
                <ArrowLeft size={20} />
              </button>
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center overflow-hidden">
                  {participantAvatar ? (
                    <img
                      src={participantAvatar}
                      alt={participantName || "User"}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement?.classList.remove('overflow-hidden');
                        e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                        const icon = document.createElement('div');
                        icon.innerHTML = DOMPurify.sanitize('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'); e.currentTarget.parentElement?.appendChild(icon.firstChild!);
                      }}
                    />
                  ) : (
                    <User size={20} className="text-white" />
                  )}
                </div>
                {/* Online status indicator */}
                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-100 dark:border-gray-800 ${dmConversations.find(dm => dm.id === selectedDM)?.isOnline ? 'bg-green-500' : 'bg-gray-500'
                  }`}></div>
              </div>
              <div className="ml-3">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate max-w-[150px] sm:max-w-xs">
                  {getParticipantDisplayName(dmConversations.find(dm => dm.id === selectedDM)?.participant || participantAddress || '')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                  {dmConversations.find(dm => dm.id === selectedDM)?.isOnline
                    ? 'Online'
                    : dmConversations.find(dm => dm.id === selectedDM)?.lastSeen
                      ? `Last seen ${dmConversations.find(dm => dm.id === selectedDM)?.lastSeen?.toLocaleTimeString()}`
                      : 'Direct Message'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Voice/Video Call Buttons - Hidden on mobile */}
              <button className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white rounded-full p-2 hidden sm:block">
                <Phone size={16} />
              </button>
              <button className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white rounded-full p-2 hidden sm:block">
                <Video size={16} />
              </button>

              {/* Encryption Indicator */}
              <div className="flex items-center space-x-1 text-xs text-green-500 dark:text-green-400">
                <Shield size={14} />
                <span className="hidden sm:inline">Encrypted</span>
              </div>
            </div>
          </div>
        )}

        {/* Messages Area */}
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
              let senderProfile: UserProfile | undefined;
              let senderAvatarUrl: string | null = null;
              let senderDisplayName: string = message.fromAddress ? (message.fromAddress.slice(0, 6) + '...' + message.fromAddress.slice(-4)) : 'Unknown';

              if (message.fromAddress === address) {
                senderDisplayName = 'You';
                if (getParticipantProfile) {
                  senderProfile = getParticipantProfile(message.fromAddress);
                }
              } else if (getParticipantProfile) {
                senderProfile = getParticipantProfile(message.fromAddress);
              }

              if (senderProfile) {
                if (senderProfile.displayName) senderDisplayName = senderProfile.displayName;
                else if (senderProfile.handle) senderDisplayName = senderProfile.handle;
                else if (senderProfile.ens) senderDisplayName = senderProfile.ens;

                if (senderProfile.avatarCid) {
                  senderAvatarUrl = senderProfile.avatarCid.startsWith('http') ? senderProfile.avatarCid : `https://ipfs.io/ipfs/${senderProfile.avatarCid}`;
                } else if (senderProfile.avatarCid) {
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
                            {/* Reply Reference - Compact blue box at the top */}
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
                                {message.attachments.map((attachment, idx) => (
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
                            <div className={`flex flex-wrap mt-1 gap-1 ${message.fromAddress === address ? 'justify-end' : 'justify-start'}`}>
                              {message.reactions.map((reaction, idx) => (
                                <button
                                  key={idx}
                                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-1.5 py-0.5 text-[10px] flex items-center shadow-xs"
                                  onClick={() => addReaction(message.id, reaction.emoji)}
                                >
                                  <span className="mr-1">{reaction.emoji}</span>
                                  <span className="text-gray-500">{reaction.count}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Action Bar (Hidden by default, visible on hover) */}
                          <div className={`
                            flex items-center space-x-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity
                            ${message.fromAddress === address ? 'flex-row-reverse space-x-reverse' : 'flex-row'}
                          `}>
                            <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500" onClick={() => replyToMessage(message.id, senderDisplayName, message.content)}>
                              <CornerUpLeft size={12} />
                            </button>
                            <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500" onClick={() => quoteMessage(message.content, senderDisplayName, message.id)}>
                              <Quote size={12} />
                            </button>
                            <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500" onClick={() => toggleReactionPicker(message.id)}>
                              <span className="text-xs">+</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                          {/* Reactions */}
                          {message.reactions && message.reactions.length > 0 && (
                            <div className="flex mt-2 space-x-1 relative">
                              {message.reactions.map((reaction, idx) => (
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
                                        onClick={() => {
                                          addReaction(message.id, emoji);
                                          setShowReactionPicker({ messageId: '', show: false });
                                        }}
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
                                      const reaction = message.reactions?.find(r => r.emoji === reactionTooltip.emoji);
                                      if (!reaction) return null;

                                      const userNames = reaction.users.map(addr => {
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
                                    // Try to resolve using same logic as senderDisplayName above
                                    let p: UserProfile | undefined;
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
                                    // Try to resolve using same logic as senderDisplayName above
                                    let p: UserProfile | undefined;
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
                  </Web3SwipeGestureHandler>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Thread View Overlay */}
        {showThread.show && (
          <div className="absolute inset-0 bg-black/70 z-20 flex">
            <div className={`ml-auto w-full md:w-2/3 h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col ${isMobile ? 'w-full' : ''}`}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">Thread</h3>
                <button
                  onClick={closeThread}
                  className={`${touchTargetClasses} text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white`}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {threadMessages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`p-2 rounded ${index === 0 ? 'bg-gray-100 dark:bg-gray-750 mb-4' : 'hover:bg-gray-100 dark:hover:bg-gray-750'}`}
                  >
                    <div className="flex">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mr-2 flex-shrink-0">
                        <User size={16} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline">
                          <span className="font-semibold text-gray-900 dark:text-white text-sm mr-2">
                            {message.fromAddress === address ? 'You' : message.fromAddress.slice(0, 6) + '...' + message.fromAddress.slice(-4)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {/* Encryption indicator for DM thread messages */}
                          {isViewingDM && message.isEncrypted && (
                            <Lock size={12} className="ml-1 text-green-500 dark:text-green-400" />
                          )}
                        </div>
                        <p className="text-gray-700 dark:text-gray-200 text-sm">{parseMentions(message.content)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-end">
                  <textarea
                    placeholder="Reply to thread..."
                    className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none text-sm"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendThreadReply(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <button className={`ml-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-2 ${touchTargetClasses}`}>
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invite Link Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/70 z-30 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Channel Invite Link</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Share this link to invite others to join the channel.
              </p>

              {selectedChannel && inviteLinks[selectedChannel] && (
                <div className="mb-4">
                  <div className="bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded px-3 py-2 text-sm text-gray-700 dark:text-gray-300 font-mono break-all">
                    {inviteLinks[selectedChannel]}
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  className={`flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded ${touchTargetClasses}`}
                  onClick={() => selectedChannel && inviteLinks[selectedChannel] && copyInviteLink(inviteLinks[selectedChannel])}
                >
                  Copy Link
                </button>
                <button
                  className={`flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white text-sm py-2 rounded ${touchTargetClasses}`}
                  onClick={() => setShowInviteModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Attachment Modal */}
        {showAttachmentModal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Share Content</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                Directly upload files or share blockchain data in this channel.
              </p>

              <div className="space-y-3">
                <button
                  className={`w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-3 rounded-lg flex items-center justify-center transition-colors ${touchTargetClasses}`}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={18} className="mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Image size={18} className="mr-2" />
                      Upload Image or File
                    </>
                  )}
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    className={`bg-purple-600 hover:bg-purple-700 text-white text-xs py-3 rounded-lg flex items-center justify-center transition-colors ${touchTargetClasses}`}
                    onClick={() => setAttachmentType('nft')}
                  >
                    <Image size={14} className="mr-2" />
                    Share NFT
                  </button>

                  <button
                    className={`bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-3 rounded-lg flex items-center justify-center transition-colors ${touchTargetClasses}`}
                    onClick={() => setAttachmentType('transaction')}
                  >
                    <Wallet size={14} className="mr-2" />
                    Blockchain Tx
                  </button>
                </div>
              </div>

              {/* Form Areas for specific types */}
              <div className="mt-4">
                {/* NFT Form */}
                {attachmentType === 'nft' && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700 animate-fadeIn">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Share NFT</h4>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Contract Address"
                        value={nftContract}
                        onChange={(e) => setNftContract(e.target.value)}
                        className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Token ID"
                        value={nftTokenId}
                        onChange={(e) => setNftTokenId(e.target.value)}
                        className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        className={`w-full bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 rounded-lg ${touchTargetClasses}`}
                        onClick={() => {
                          if ((selectedDM || selectedChannel) && nftContract && nftTokenId) {
                            shareNFT(nftContract, nftTokenId);
                            setNftContract('');
                            setNftTokenId('');
                          }
                        }}
                        disabled={!nftContract || !nftTokenId}
                      >
                        Confirm NFT Share
                      </button>
                    </div>
                  </div>
                )}

                {/* Transaction Form */}
                {attachmentType === 'transaction' && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700 animate-fadeIn">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Share Transaction</h4>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Transaction Hash"
                        value={txHash}
                        onChange={(e) => setTxHash(e.target.value)}
                        className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        className={`w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm py-2 rounded-lg ${touchTargetClasses}`}
                        onClick={() => {
                          if ((selectedDM || selectedChannel) && txHash) {
                            shareTransaction(txHash, 'success');
                            setTxHash('');
                          }
                        }}
                        disabled={!txHash}
                      >
                        Confirm Tx Share
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center mt-6">
                <button
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium"
                  onClick={() => {
                    setShowAttachmentModal(false);
                    setAttachmentType(null);
                  }}
                >
                  Cancel
                </button>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* Message Input */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 relative bg-white dark:bg-gray-900">
          {/* Reply banner - Moved here for better visibility */}
          {replyingTo && (
            <div className="bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500 p-2 mb-2 rounded flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-2">
                <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-0.5">
                  Replying to {replyingTo.username}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                  {replyingTo.content}
                </div>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className={`${touchTargetClasses} text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white`}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Quote banner - Gray for quotes */}
          {quotingTo && (
            <div className="bg-gray-100 dark:bg-gray-800 border-l-4 border-gray-400 p-2 mb-2 rounded flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-2">
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-0.5">
                  Quoting {quotingTo.username}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                  {quotingTo.content}
                </div>
              </div>
              <button
                onClick={() => setQuotingTo(null)}
                className={`${touchTargetClasses} text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white`}
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div className="flex items-end">
            <textarea
              ref={messageInputRef}
              value={newMessage}
              onChange={(e) => handleMessageChange(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!isViewingDM && !selectedChannel}
              placeholder={
                isViewingDM && selectedDM
                  ? `Message ${dmConversations.find(dm => dm.id === selectedDM)?.participantEnsName || participantName || truncateAddress(dmConversations.find(dm => dm.id === selectedDM)?.participant || participantAddress || '')}`
                  : selectedChannel
                    ? `Message #${channels.find(c => c.id === selectedChannel)?.name || 'channel'}`
                    : 'Select a conversation to start messaging'
              }
              className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              rows={1}
            />

            {/* Mention Suggestions */}
            {showMentionSuggestions && (
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto z-10">
                {getMentionSuggestions(mentionQuery).map((user, index) => (
                  <button
                    key={user.address}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 ${touchTargetClasses}`}
                    onClick={() => insertMention(user)}
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <User size={12} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 dark:text-white truncate">{user.name}</div>
                      {user.ensName && user.ensName !== user.name && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.ensName}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={sendChannelMessage}
              disabled={!newMessage.trim() || (!isViewingDM && !selectedChannel)}
              className={`ml-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg p-3 ${touchTargetClasses}`}
            >
              <Send size={20} />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
              <span className="mr-4">⌘ Enter to send</span>
              <span className="mr-4">/ for commands</span>
            </div>
            <button
              className={`flex items-center text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white ${touchTargetClasses}`}
              onClick={() => setShowAttachmentModal(true)}
            >
              <Image size={14} className="mr-1" />
              <span className="hidden sm:inline">Attach</span>
            </button>
          </div>
        </div>
      </div>

      {/* Members Sidebar - visible for both channels and DMs */}
      <div className={`w-64 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hidden md:flex flex-col`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {rightSidebarTab === 'members' ? 'Members' : 'Shared Files'}
            </h3>
            {!isViewingDM && rightSidebarTab === 'members' && (
              <button
                className={`text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white ${touchTargetClasses}`}
                onClick={() => setShowChannelSettings(!showChannelSettings)}
              >
                <Settings size={16} />
              </button>
            )}
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setRightSidebarTab('members')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${rightSidebarTab === 'members'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              Members
            </button>
            <button
              onClick={() => setRightSidebarTab('files')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${rightSidebarTab === 'files'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              Files
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {rightSidebarTab === 'members' ? (
            <>
              {/* Channel Settings Panel (existing logic) */}
              {showChannelSettings && !isViewingDM && (
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-850">
                  {/* ... channel settings content ... */}
                </div>
              )}

              {/* Members List */}
              <div className="p-4">
                {isViewingDM ? (
                  /* DM Participant Info */
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mx-auto mb-3 overflow-hidden">
                        {participantAvatar ? (
                          <img src={participantAvatar} alt={participantName || "User"} className="w-full h-full object-cover" />
                        ) : (
                          <User size={40} className="text-white" />
                        )}
                      </div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-lg">
                        {participantName || truncateAddress(participantAddress || '')}
                      </h4>
                      {participantAddress && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">
                          {participantAddress}
                        </p>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Information</h5>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <Globe size={14} className="mr-2 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-300">Public Profile</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Shield size={14} className="mr-2 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-300">Verified Identity</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Channel Members */
                  <div className="space-y-3">
                    {channelMembers.length > 0 ? channelMembers.map(member => (
                      <div key={member.address} className="flex items-center group relative">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                            <User size={16} className="text-white" />
                          </div>
                          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-100 dark:border-gray-800 ${getStatusColor(member.status)}`}></div>
                        </div>
                        <div className="ml-2">
                          <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                            {member.name}
                            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] text-white ${getRoleColor(member.role)}`}>
                              {getRoleLabel(member.role)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{member.status}</div>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm italic">
                        No members found
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Files View */
            <div className="p-4">
              {(() => {
                const allFiles = messages.flatMap(m =>
                  (m.attachments || []).map(a => ({ ...a, timestamp: m.timestamp, fromAddress: m.fromAddress }))
                ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

                if (allFiles.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <Image size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">No files shared yet</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {allFiles.map((file, idx) => (
                      <div key={idx} className="group p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-all cursor-pointer"
                        onClick={() => file.url && file.url !== '#' && window.open(file.url, '_blank')}>
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${file.type === 'image' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                            file.type === 'transaction' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                              'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                            }`}>
                            {file.type === 'image' ? <Image size={16} /> :
                              file.type === 'transaction' ? <Wallet size={16} /> :
                                <LinkIcon size={16} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate" title={file.name || (file as any).filename}>
                              {file.name || (file as any).filename || 'Shared File'}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                {file.timestamp.toLocaleDateString()}
                              </span>
                              <span className="text-[10px] text-blue-500 dark:text-blue-400 group-hover:underline">
                                View
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagingInterface;