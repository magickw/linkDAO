/**
 * Message Delivery Status Component
 * Displays visual indicators for message delivery status (sent/delivered/read)
 */

import React from 'react';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { Message } from '@/types/messaging';

interface MessageDeliveryStatusProps {
  status: Message['deliveryStatus'];
  timestamp: Date;
  isOwnMessage: boolean;
  size?: number;
}

export const MessageDeliveryStatus: React.FC<MessageDeliveryStatusProps> = ({
  status,
  timestamp,
  isOwnMessage,
  size = 12
}) => {
  if (!isOwnMessage) return null;

  const getStatusIcon = () => {
    switch (status) {
      case 'sent':
        return <Check size={size} className="text-gray-400" />;
      case 'delivered':
        return <CheckCheck size={size} className="text-gray-400" />;
      case 'read':
        return <CheckCheck size={size} className="text-blue-400" />;
      default:
        return <Clock size={size} className="text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'sent':
        return 'Sent';
      case 'delivered':
        return 'Delivered';
      case 'read':
        return 'Read';
      default:
        return 'Sending';
    }
  };

  return (
    <div className="flex items-center space-x-1" title={`${getStatusText()} at ${timestamp.toLocaleTimeString()}`}>
      <span className="text-xs text-gray-400">
        {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
      {getStatusIcon()}
    </div>
  );
};

/**
 * Online Status Indicator Component
 * Shows online/offline/idle status with visual indicator
 */

interface OnlineStatusProps {
  isOnline: boolean;
  isIdle?: boolean;
  size?: number;
  showText?: boolean;
  lastSeen?: Date;
}

export const OnlineStatus: React.FC<OnlineStatusProps> = ({
  isOnline,
  isIdle = false,
  size = 12,
  showText = false,
  lastSeen
}) => {
  const getStatusColor = () => {
    if (isOnline) return isIdle ? 'bg-yellow-500' : 'bg-green-500';
    return 'bg-gray-500';
  };

  const getStatusText = () => {
    if (isOnline) return isIdle ? 'Idle' : 'Online';
    if (lastSeen) {
      const now = new Date();
      const diffMs = now.getTime() - lastSeen.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return lastSeen.toLocaleDateString();
    }
    return 'Offline';
  };

  return (
    <div className="flex items-center space-x-1">
      <div
        className={`rounded-full ${getStatusColor()}`}
        style={{ width: size, height: size }}
        title={getStatusText()}
      />
      {showText && (
        <span className="text-xs text-gray-400">{getStatusText()}</span>
      )}
    </div>
  );
};

/**
 * Read Receipts Component
 * Shows who has read a message with avatars
 */

interface ReadReceipt {
  address: string;
  ensName?: string;
  timestamp: Date;
  avatar?: string;
}

interface ReadReceiptsProps {
  receipts: ReadReceipt[];
  maxDisplay?: number;
}

export const ReadReceipts: React.FC<ReadReceiptsProps> = ({
  receipts,
  maxDisplay = 3
}) => {
  if (receipts.length === 0) return null;

  const displayReceipts = receipts.slice(0, maxDisplay);
  const remainingCount = receipts.length - maxDisplay;

  return (
    <div className="flex items-center space-x-1 mt-1">
      <div className="flex -space-x-2">
        {displayReceipts.map((receipt, index) => (
          <div
            key={receipt.address}
            className="relative group"
            style={{ zIndex: displayReceipts.length - index }}
          >
            {receipt.avatar ? (
              <img
                src={receipt.avatar}
                alt={receipt.ensName || receipt.address}
                className="w-5 h-5 rounded-full border-2 border-gray-800"
              />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-gray-800 bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <span className="text-xs text-white">
                  {(receipt.ensName || receipt.address).charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {receipt.ensName || `${receipt.address.slice(0, 6)}...${receipt.address.slice(-4)}`}
              <br />
              <span className="text-gray-400">
                Read {receipt.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        {remainingCount > 0 && (
          <div
            className="w-5 h-5 rounded-full border-2 border-gray-800 bg-gray-700 flex items-center justify-center"
            title={`+${remainingCount} more`}
          >
            <span className="text-xs text-white">+{remainingCount}</span>
          </div>
        )}
      </div>
      <span className="text-xs text-gray-400">
        Read by {receipts.length === 1 ? '1 person' : `${receipts.length} people`}
      </span>
    </div>
  );
};

/**
 * Typing Indicator Component
 * Shows animated dots when user is typing
 */

interface TypingIndicatorProps {
  users: Array<{ address: string; ensName?: string }>;
  maxDisplay?: number;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  users,
  maxDisplay = 2
}) => {
  if (users.length === 0) return null;

  const displayUsers = users.slice(0, maxDisplay);
  const remainingCount = users.length - maxDisplay;

  const getUsersText = () => {
    const names = displayUsers.map(u => u.ensName || `${u.address.slice(0, 6)}...${u.address.slice(-4)}`);

    if (remainingCount > 0) {
      names.push(`+${remainingCount} more`);
    }

    if (names.length === 1) return `${names[0]} is typing`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing`;
    return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]} are typing`;
  };

  return (
    <div className="flex items-center space-x-2 px-4 py-2 bg-gray-800/50">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
      </div>
      <span className="text-sm text-gray-400">{getUsersText()}</span>
    </div>
  );
};

/**
 * Message Status Badge Component
 * Combined status indicator for pinned/edited/encrypted messages
 */

interface MessageStatusBadgeProps {
  isPinned?: boolean;
  isEdited?: boolean;
  isEncrypted?: boolean;
  editedAt?: Date;
}

export const MessageStatusBadge: React.FC<MessageStatusBadgeProps> = ({
  isPinned,
  isEdited,
  isEncrypted,
  editedAt
}) => {
  return (
    <div className="flex items-center space-x-1 ml-2">
      {isPinned && (
        <span className="text-xs text-yellow-400" title="Pinned message">📌</span>
      )}
      {isEncrypted && (
        <span className="text-xs text-green-400" title="Encrypted">🔒</span>
      )}
      {isEdited && (
        <span className="text-xs text-gray-400" title={editedAt ? `Edited ${editedAt.toLocaleString()}` : 'Edited'}>
          (edited)
        </span>
      )}
    </div>
  );
};

export default {
  MessageDeliveryStatus,
  OnlineStatus,
  ReadReceipts,
  TypingIndicator,
  MessageStatusBadge
};
