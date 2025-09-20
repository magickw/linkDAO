import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RealTimeNotification, NotificationCategory } from '../../types/realTimeNotifications';

interface LiveCommentUpdatesProps {
  postId: string;
  onNewComment: (comment: Comment) => void;
  onReactionUpdate: (commentId: string, reactions: ReactionUpdate) => void;
  className?: string;
}

interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorUsername: string;
  authorAvatar?: string;
  content: string;
  timestamp: Date;
  reactions: CommentReaction[];
  replies: Comment[];
  isNew?: boolean;
}

interface CommentReaction {
  type: string;
  emoji: string;
  count: number;
  users: string[];
  tokenAmount?: number;
}

interface ReactionUpdate {
  commentId: string;
  reactionType: string;
  emoji: string;
  count: number;
  userReacted: boolean;
  tokenAmount?: number;
}

interface LiveUpdateBanner {
  type: 'new_comments' | 'new_reactions';
  count: number;
  lastUpdate: Date;
  visible: boolean;
}

const LiveCommentUpdates: React.FC<LiveCommentUpdatesProps> = ({
  postId,
  onNewComment,
  onReactionUpdate,
  className = ''
}) => {
  const [liveComments, setLiveComments] = useState<Comment[]>([]);
  const [updateBanner, setUpdateBanner] = useState<LiveUpdateBanner | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const [autoScroll, setAutoScroll] = useState(true);
  
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);

  // Subscribe to live updates for this post
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).realTimeNotificationService) {
      const service = (window as any).realTimeNotificationService;
      
      service.subscribeToPost(postId);
      setIsSubscribed(true);

      return () => {
        service.unsubscribeFromPost(postId);
        setIsSubscribed(false);
      };
    }
  }, [postId]);

  // Handle live comment notifications
  const handleLiveNotification = useCallback((notification: RealTimeNotification) => {
    if (notification.category === NotificationCategory.COMMENT && 
        notification.metadata?.postId === postId) {
      
      const newComment: Comment = {
        id: notification.metadata.commentId,
        postId: postId,
        authorId: notification.metadata.authorId,
        authorUsername: notification.metadata.authorUsername,
        authorAvatar: notification.metadata.authorAvatar,
        content: notification.metadata.content,
        timestamp: new Date(notification.timestamp),
        reactions: [],
        replies: [],
        isNew: true
      };

      setLiveComments(prev => {
        // Avoid duplicates
        const exists = prev.some(c => c.id === newComment.id);
        if (exists) return prev;
        
        const updated = [...prev, newComment];
        onNewComment(newComment);
        
        // Show update banner
        setUpdateBanner({
          type: 'new_comments',
          count: 1,
          lastUpdate: new Date(),
          visible: true
        });

        return updated;
      });
    }

    if (notification.category === NotificationCategory.REACTION && 
        notification.metadata?.postId === postId &&
        notification.metadata?.commentId) {
      
      const reactionUpdate: ReactionUpdate = {
        commentId: notification.metadata.commentId as string,
        reactionType: notification.metadata.reactionType,
        emoji: notification.metadata.reactionEmoji,
        count: notification.metadata.count || 1,
        userReacted: notification.metadata.userReacted || false,
        tokenAmount: notification.metadata.tokenAmount
      };

      onReactionUpdate(reactionUpdate.commentId, reactionUpdate);
      
      // Show update banner
      setUpdateBanner({
        type: 'new_reactions',
        count: 1,
        lastUpdate: new Date(),
        visible: true
      });
    }
  }, [postId, onNewComment, onReactionUpdate]);

  // Set up notification listeners
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).realTimeNotificationService) {
      const service = (window as any).realTimeNotificationService;
      
      service.on('notification:comment', handleLiveNotification);
      service.on('notification:reaction', handleLiveNotification);
      
      service.on('connection', (data: { status: string }) => {
        setConnectionStatus(data.status as any);
      });

      return () => {
        service.off('notification:comment', handleLiveNotification);
        service.off('notification:reaction', handleLiveNotification);
      };
    }
  }, [handleLiveNotification]);

  // Auto-scroll to new comments
  useEffect(() => {
    if (autoScroll && liveComments.length > 0) {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveComments, autoScroll]);

  // Handle scroll to detect if user is at bottom
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
    
    setAutoScroll(isAtBottom);
    lastScrollTop.current = scrollTop;
  }, []);

  // Hide update banner after delay
  useEffect(() => {
    if (updateBanner?.visible) {
      const timer = setTimeout(() => {
        setUpdateBanner(prev => prev ? { ...prev, visible: false } : null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [updateBanner?.visible]);

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setAutoScroll(true);
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(diff / 60000);

    if (seconds < 30) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderComment = (comment: Comment) => (
    <div 
      key={comment.id}
      className={`
        flex space-x-3 p-3 rounded-lg transition-all duration-300
        ${comment.isNew ? 'bg-blue-50 border border-blue-200 animate-pulse' : 'hover:bg-gray-50'}
      `}
    >
      <img 
        src={comment.authorAvatar || '/default-avatar.png'} 
        alt={comment.authorUsername}
        className="w-8 h-8 rounded-full flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <span className="font-medium text-sm text-gray-900">
            {comment.authorUsername}
          </span>
          <span className="text-xs text-gray-500">
            {formatTimestamp(comment.timestamp)}
          </span>
          {comment.isNew && (
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full animate-bounce">
              New
            </span>
          )}
        </div>
        <p className="text-sm text-gray-700 break-words">
          {comment.content}
        </p>
        
        {/* Reactions */}
        {comment.reactions.length > 0 && (
          <div className="flex items-center space-x-2 mt-2">
            {comment.reactions.map(reaction => (
              <button
                key={reaction.type}
                className="flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 rounded-full px-2 py-1 text-xs transition-colors"
              >
                <span>{reaction.emoji}</span>
                <span>{reaction.count}</span>
                {reaction.tokenAmount && (
                  <span className="text-green-600 font-medium">
                    {reaction.tokenAmount}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center justify-between mb-4 p-2 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' :
            connectionStatus === 'reconnecting' ? 'bg-yellow-500 animate-pulse' :
            'bg-red-500'
          }`} />
          <span className="text-sm text-gray-600">
            {connectionStatus === 'connected' ? 'Live updates active' :
             connectionStatus === 'reconnecting' ? 'Reconnecting...' :
             'Disconnected'}
          </span>
        </div>
        
        {isSubscribed && (
          <span className="text-xs text-green-600 font-medium">
            📡 Subscribed to updates
          </span>
        )}
      </div>

      {/* Update Banner */}
      {updateBanner?.visible && (
        <div className={`
          mb-4 p-3 rounded-lg border-l-4 transition-all duration-300
          ${updateBanner.type === 'new_comments' ? 'bg-blue-50 border-blue-500' : 'bg-pink-50 border-pink-500'}
        `}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg">
                {updateBanner.type === 'new_comments' ? '💬' : '❤️'}
              </span>
              <span className="text-sm font-medium">
                {updateBanner.type === 'new_comments' ? 
                  `${updateBanner.count} new comment${updateBanner.count > 1 ? 's' : ''}` :
                  `${updateBanner.count} new reaction${updateBanner.count > 1 ? 's' : ''}`
                }
              </span>
            </div>
            <button
              onClick={() => setUpdateBanner(prev => prev ? { ...prev, visible: false } : null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Comments Container */}
      <div 
        ref={containerRef}
        className="max-h-96 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-4"
        onScroll={handleScroll}
      >
        {liveComments.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">💬</div>
            <p>No live comments yet</p>
            <p className="text-sm">Comments will appear here in real-time</p>
          </div>
        ) : (
          <>
            {liveComments.map(renderComment)}
            <div ref={commentsEndRef} />
          </>
        )}
      </div>

      {/* Scroll to Bottom Button */}
      {!autoScroll && liveComments.length > 0 && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full shadow-lg transition-colors"
          title="Scroll to latest comments"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}

      {/* Live Indicator */}
      {connectionStatus === 'connected' && liveComments.length > 0 && (
        <div className="absolute top-2 right-2 flex items-center space-x-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
          <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
          <span>LIVE</span>
        </div>
      )}
    </div>
  );
};

export default LiveCommentUpdates;