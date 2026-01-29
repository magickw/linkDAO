/**
 * Live Comment Updates Component
 * Handles real-time comment and reaction updates for active posts
 * Requirements: 8.1, 8.5, 8.7
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Heart, 
  ThumbsUp, 
  ThumbsDown, 
  Eye, 
  Users,
  Zap,
  TrendingUp,
  Clock
} from 'lucide-react';
import { usePostRealTimeUpdates } from '../../../hooks/useCommunityRealTimeUpdates';
import { LiveContentUpdate } from '../../../services/communityRealTimeUpdateService';

interface LiveCommentUpdatesProps {
  postId: string;
  showViewerCount?: boolean;
  showRecentActivity?: boolean;
  maxRecentComments?: number;
  maxRecentReactions?: number;
  autoScroll?: boolean;
  className?: string;
}

interface RecentComment {
  id: string;
  author: string;
  authorAvatar?: string;
  content: string;
  timestamp: Date;
  isNew?: boolean;
}

interface RecentReaction {
  id: string;
  type: string;
  emoji: string;
  author: string;
  authorAvatar?: string;
  timestamp: Date;
  amount?: number;
  isNew?: boolean;
}

interface LiveActivity {
  id: string;
  type: 'comment' | 'reaction' | 'tip' | 'view';
  data: any;
  timestamp: Date;
  isNew?: boolean;
}

/**
 * Main Live Comment Updates Component
 */
export const LiveCommentUpdates: React.FC<LiveCommentUpdatesProps> = ({
  postId,
  showViewerCount = true,
  showRecentActivity = true,
  maxRecentComments = 5,
  maxRecentReactions = 10,
  autoScroll = false,
  className = ''
}) => {
  const {
    postUpdates,
    hasNewContent,
    connectionStatus,
    onCommentAdded,
    onReactionAdded,
    onTipReceived
  } = usePostRealTimeUpdates(postId);

  const [viewerCount, setViewerCount] = useState(0);
  const [recentComments, setRecentComments] = useState<RecentComment[]>([]);
  const [recentReactions, setRecentReactions] = useState<RecentReaction[]>([]);
  const [liveActivity, setLiveActivity] = useState<LiveActivity[]>([]);
  const [isActive, setIsActive] = useState(false);

  const activityRef = useRef<HTMLDivElement>(null);
  const newActivityTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle new comments
  const handleCommentAdded = useCallback((comment: any) => {
    const newComment: RecentComment = {
      id: comment.id,
      author: comment.author.handle,
      authorAvatar: comment.author.avatar,
      content: comment.content,
      timestamp: new Date(comment.timestamp),
      isNew: true
    };

    setRecentComments(prev => [newComment, ...prev.slice(0, maxRecentComments - 1)]);
    
    // Add to live activity
    setLiveActivity(prev => [{
      id: `comment_${comment.id}`,
      type: 'comment',
      data: newComment,
      timestamp: new Date(),
      isNew: true
    }, ...prev.slice(0, 19)]);

    setIsActive(true);
    
    // Remove "new" flag after 5 seconds
    setTimeout(() => {
      setRecentComments(prev => 
        prev.map(c => c.id === comment.id ? { ...c, isNew: false } : c)
      );
      setLiveActivity(prev => 
        prev.map(a => a.id === `comment_${comment.id}` ? { ...a, isNew: false } : a)
      );
    }, 5000);
  }, [maxRecentComments]);

  // Handle new reactions
  const handleReactionAdded = useCallback((reaction: any) => {
    const newReaction: RecentReaction = {
      id: reaction.id,
      type: reaction.type,
      emoji: reaction.emoji,
      author: reaction.author.handle,
      authorAvatar: reaction.author.avatar,
      timestamp: new Date(reaction.timestamp),
      amount: reaction.amount,
      isNew: true
    };

    setRecentReactions(prev => [newReaction, ...prev.slice(0, maxRecentReactions - 1)]);
    
    // Add to live activity
    setLiveActivity(prev => [{
      id: `reaction_${reaction.id}`,
      type: 'reaction',
      data: newReaction,
      timestamp: new Date(),
      isNew: true
    }, ...prev.slice(0, 19)]);

    setIsActive(true);
    
    // Remove "new" flag after 3 seconds
    setTimeout(() => {
      setRecentReactions(prev => 
        prev.map(r => r.id === reaction.id ? { ...r, isNew: false } : r)
      );
      setLiveActivity(prev => 
        prev.map(a => a.id === `reaction_${reaction.id}` ? { ...a, isNew: false } : a)
      );
    }, 3000);
  }, [maxRecentReactions]);

  // Handle tips received
  const handleTipReceived = useCallback((tip: any) => {
    // Add to live activity
    setLiveActivity(prev => [{
      id: `tip_${tip.id}`,
      type: 'tip',
      data: tip,
      timestamp: new Date(),
      isNew: true
    }, ...prev.slice(0, 19)]);

    setIsActive(true);
    
    // Remove "new" flag after 7 seconds (tips are more important)
    setTimeout(() => {
      setLiveActivity(prev => 
        prev.map(a => a.id === `tip_${tip.id}` ? { ...a, isNew: false } : a)
      );
    }, 7000);
  }, []);

  // Setup event listeners
  useEffect(() => {
    const unsubscribeComment = onCommentAdded(handleCommentAdded);
    const unsubscribeReaction = onReactionAdded(handleReactionAdded);
    const unsubscribeTip = onTipReceived(handleTipReceived);

    return () => {
      unsubscribeComment();
      unsubscribeReaction();
      unsubscribeTip();
    };
  }, [onCommentAdded, onReactionAdded, onTipReceived, handleCommentAdded, handleReactionAdded, handleTipReceived]);

  // Auto-scroll to new activity
  useEffect(() => {
    if (autoScroll && activityRef.current && liveActivity.length > 0 && liveActivity[0].isNew) {
      activityRef.current.scrollTop = 0;
    }
  }, [autoScroll, liveActivity]);

  // Reset activity indicator
  useEffect(() => {
    if (isActive) {
      if (newActivityTimeoutRef.current) {
        clearTimeout(newActivityTimeoutRef.current);
      }
      
      newActivityTimeoutRef.current = setTimeout(() => {
        setIsActive(false);
      }, 10000);
    }
    
    return () => {
      if (newActivityTimeoutRef.current) {
        clearTimeout(newActivityTimeoutRef.current);
      }
    };
  }, [isActive]);

  // Simulate viewer count updates (in real app, this would come from WebSocket)
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount(prev => {
        const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
        return Math.max(0, prev + change);
      });
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Get activity icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return MessageCircle;
      case 'reaction':
        return Heart;
      case 'tip':
        return Zap;
      case 'view':
        return Eye;
      default:
        return TrendingUp;
    }
  };

  // Get activity color
  const getActivityColor = (type: string) => {
    switch (type) {
      case 'comment':
        return 'text-blue-500';
      case 'reaction':
        return 'text-pink-500';
      case 'tip':
        return 'text-yellow-500';
      case 'view':
        return 'text-gray-500';
      default:
        return 'text-purple-500';
    }
  };

  if (!connectionStatus.isConnected && !hasNewContent) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Live Stats Bar */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center space-x-4">
          {showViewerCount && (
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Eye size={16} />
              <span>{viewerCount} viewing</span>
              {isActive && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                  className="w-2 h-2 bg-green-500 rounded-full"
                />
              )}
            </div>
          )}
          
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <MessageCircle size={16} />
            <span>{recentComments.length} recent</span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Heart size={16} />
            <span>{recentReactions.length} reactions</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus.isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {connectionStatus.isConnected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Recent Comments */}
      {showRecentActivity && recentComments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center space-x-2">
            <MessageCircle size={16} />
            <span>Recent Comments</span>
          </h4>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <AnimatePresence>
              {recentComments.map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`p-3 rounded-lg border ${
                    comment.isNew 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {comment.authorAvatar && (
                      <img
                        src={comment.authorAvatar}
                        alt={comment.author}
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {comment.author}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {comment.timestamp.toLocaleTimeString()}
                        </span>
                        {comment.isNew && (
                          <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Recent Reactions */}
      {showRecentActivity && recentReactions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center space-x-2">
            <Heart size={16} />
            <span>Recent Reactions</span>
          </h4>
          
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {recentReactions.slice(0, 8).map((reaction) => (
                <motion.div
                  key={reaction.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                    reaction.isNew
                      ? 'bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  <span className="text-lg">{reaction.emoji}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {reaction.author}
                  </span>
                  {reaction.amount && (
                    <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                      {reaction.amount}
                    </span>
                  )}
                  {reaction.isNew && (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.5 }}
                      className="w-1.5 h-1.5 bg-pink-500 rounded-full"
                    />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Live Activity Feed */}
      {showRecentActivity && liveActivity.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center space-x-2">
            <TrendingUp size={16} />
            <span>Live Activity</span>
            {isActive && (
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-2 h-2 bg-green-500 rounded-full"
              />
            )}
          </h4>
          
          <div 
            ref={activityRef}
            className="space-y-1 max-h-32 overflow-y-auto"
          >
            <AnimatePresence>
              {liveActivity.slice(0, 10).map((activity) => {
                const IconComponent = getActivityIcon(activity.type);
                const colorClass = getActivityColor(activity.type);
                
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className={`flex items-center space-x-3 p-2 rounded ${
                      activity.isNew 
                        ? 'bg-gray-100 dark:bg-gray-700' 
                        : 'bg-gray-50 dark:bg-gray-800'
                    }`}
                  >
                    <IconComponent size={14} className={colorClass} />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {activity.type === 'comment' && `${activity.data.author} commented`}
                        {activity.type === 'reaction' && `${activity.data.author} reacted ${activity.data.emoji}`}
                        {activity.type === 'tip' && `${activity.data.tipper} tipped ${activity.data.amount} ${activity.data.token}`}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {activity.timestamp.toLocaleTimeString()}
                    </span>
                    {activity.isNew && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.5 }}
                        className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                      />
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveCommentUpdates;