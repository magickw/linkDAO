/**
 * ShareModal Component
 * Modal for sharing content to direct messages and communities
 * Implements requirements 4.2, 4.5, 4.6 from the interconnected social platform spec
 */

import React, { useState, useEffect } from 'react';
import { ShareableContent, ShareToMessageOptions, CrossPostOptions } from '../../services/contentSharingService';
import { contentSharingService } from '../../services/contentSharingService';
import { Conversation } from '../../types/messaging';
import { Community } from '../../models/Community';
import { useWalletAuth } from '../../hooks/useWalletAuth';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: ShareableContent;
  onShareComplete?: (shareType: string, target: string) => void;
}

type ShareTab = 'direct_message' | 'cross_post' | 'external';

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  content,
  onShareComplete
}) => {
  const { walletInfo: { address } } = useWalletAuth();
  const [activeTab, setActiveTab] = useState<ShareTab>('direct_message');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Direct Message sharing state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [messageText, setMessageText] = useState('');

  // Cross-posting state
  const [userCommunities, setUserCommunities] = useState<Community[]>([]);
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);
  const [crossPostMessage, setCrossPostMessage] = useState('');

  // Load user data when modal opens
  useEffect(() => {
    if (isOpen && address) {
      loadUserData();
    }
  }, [isOpen, address]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Load conversations and communities in parallel
      const [conversationsResponse, communitiesResponse] = await Promise.all([
        fetch('/api/conversations', {
          headers: { 'Authorization': `Bearer ${address}` }
        }),
        fetch('/api/communities/user-memberships', {
          headers: { 'Authorization': `Bearer ${address}` }
        })
      ]);

      if (conversationsResponse.ok) {
        const conversationsData = await conversationsResponse.json();
        setConversations(conversationsData.conversations || []);
      }

      if (communitiesResponse.ok) {
        const communitiesData = await communitiesResponse.json();
        setUserCommunities(communitiesData.communities || []);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setError('Failed to load sharing options');
    } finally {
      setLoading(false);
    }
  };

  const handleShareToDirectMessage = async () => {
    if (!address) return;

    try {
      setLoading(true);
      setError(null);

      const shareOptions: ShareToMessageOptions = {
        conversationId: selectedConversation || undefined,
        recipientAddress: selectedConversation ? undefined : recipientAddress,
        message: messageText,
      };

      await contentSharingService.shareToDirectMessage(content, shareOptions, address);
      
      // Track sharing event
      await contentSharingService.trackSharingEvent(
        content.id,
        content.type,
        'direct_message',
        address,
        { conversationId: selectedConversation, recipientAddress }
      );

      onShareComplete?.('direct_message', selectedConversation || recipientAddress);
      onClose();
    } catch (error) {
      console.error('Error sharing to direct message:', error);
      setError('Failed to share content');
    } finally {
      setLoading(false);
    }
  };

  const handleCrossPost = async () => {
    if (!address || selectedCommunities.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      const crossPostOptions: CrossPostOptions = {
        targetCommunityIds: selectedCommunities,
        attribution: {
          originalCommunityId: content.metadata?.communityId,
          originalAuthor: content.authorAddress || address,
          originalPostId: content.id,
        },
        customMessage: crossPostMessage,
      };

      const result = await contentSharingService.crossPostToCommunities(
        content.id,
        crossPostOptions,
        address
      );

      // Track sharing event
      await contentSharingService.trackSharingEvent(
        content.id,
        content.type,
        'community_cross_post',
        address,
        { targetCommunities: selectedCommunities, successCount: result.success.length }
      );

      onShareComplete?.('cross_post', `${result.success.length} communities`);
      onClose();
    } catch (error) {
      console.error('Error cross-posting:', error);
      setError('Failed to cross-post content');
    } finally {
      setLoading(false);
    }
  };

  const handleExternalShare = async (platform: string) => {
    const shareUrl = `${window.location.origin}${content.url}`;
    const shareText = `Check out: ${content.title}`;

    try {
      if (platform === 'copy_link') {
        await navigator.clipboard.writeText(shareUrl);
        onShareComplete?.('external', 'clipboard');
      } else if (platform === 'twitter') {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, '_blank');
        onShareComplete?.('external', 'twitter');
      } else if (platform === 'native_share' && navigator.share) {
        await navigator.share({
          title: content.title,
          text: content.description,
          url: shareUrl,
        });
        onShareComplete?.('external', 'native');
      }

      // Track sharing event
      await contentSharingService.trackSharingEvent(
        content.id,
        content.type,
        'external_share',
        address || 'anonymous',
        { platform }
      );

      onClose();
    } catch (error) {
      console.error('Error sharing externally:', error);
      setError('Failed to share content');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Share Content
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Preview */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start space-x-3">
            {content.imageUrl && (
              <img
                src={content.imageUrl}
                alt={content.title}
                className="w-12 h-12 rounded-lg object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {content.title}
              </h3>
              {content.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                  {content.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('direct_message')}
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              activeTab === 'direct_message'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Direct Message
          </button>
          <button
            onClick={() => setActiveTab('cross_post')}
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              activeTab === 'cross_post'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Cross-post
          </button>
          <button
            onClick={() => setActiveTab('external')}
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              activeTab === 'external'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            External
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {activeTab === 'direct_message' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Send to:
                </label>
                
                {/* Existing Conversations */}
                {conversations.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Recent conversations:</p>
                    {conversations.slice(0, 5).map((conversation) => (
                      <label key={conversation.id} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                        <input
                          type="radio"
                          name="conversation"
                          value={conversation.id}
                          checked={selectedConversation === conversation.id}
                          onChange={(e) => {
                            setSelectedConversation(e.target.value);
                            setRecipientAddress('');
                          }}
                          className="text-blue-600"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {conversation.participants
                              .filter(p => p !== address)
                              .map(p => p.slice(0, 6) + '...' + p.slice(-4))
                              .join(', ')}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {/* New Recipient */}
                <div>
                  <label className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="conversation"
                      checked={!selectedConversation && recipientAddress !== ''}
                      onChange={() => {
                        setSelectedConversation(null);
                      }}
                      className="text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      New conversation
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter wallet address or ENS name"
                    value={recipientAddress}
                    onChange={(e) => {
                      setRecipientAddress(e.target.value);
                      if (e.target.value) setSelectedConversation(null);
                    }}
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Add a message (optional):
                </label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Say something about this content..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <button
                onClick={handleShareToDirectMessage}
                disabled={loading || (!selectedConversation && !recipientAddress)}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? <LoadingSpinner size="small" /> : 'Send Message'}
              </button>
            </div>
          )}

          {activeTab === 'cross_post' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select communities to cross-post to:
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {userCommunities.map((community) => (
                    <label key={community.id} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCommunities.includes(community.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCommunities(prev => [...prev, community.id]);
                          } else {
                            setSelectedCommunities(prev => prev.filter(id => id !== community.id));
                          }
                        }}
                        className="text-blue-600"
                      />
                      <img
                        src={community.avatar || '/default-community-icon.svg'}
                        alt={community.displayName}
                        className="w-6 h-6 rounded"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {community.displayName}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Add a message (optional):
                </label>
                <textarea
                  value={crossPostMessage}
                  onChange={(e) => setCrossPostMessage(e.target.value)}
                  placeholder="Add context for the cross-post..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <button
                onClick={handleCrossPost}
                disabled={loading || selectedCommunities.length === 0}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? <LoadingSpinner size="small" /> : `Cross-post to ${selectedCommunities.length} communities`}
              </button>
            </div>
          )}

          {activeTab === 'external' && (
            <div className="space-y-3">
              <button
                onClick={() => handleExternalShare('copy_link')}
                className="w-full flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="text-gray-900 dark:text-white">Copy Link</span>
              </button>

              <button
                onClick={() => handleExternalShare('twitter')}
                className="w-full flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
                <span className="text-gray-900 dark:text-white">Share on Twitter</span>
              </button>

              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={() => handleExternalShare('native_share')}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  <span className="text-gray-900 dark:text-white">Share via...</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;