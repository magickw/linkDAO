import React from 'react';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';

type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

interface MessageStatusProps {
  status: DeliveryStatus;
  isOwn?: boolean;
  showLabel?: boolean;
  className?: string;
}

export const MessageStatus: React.FC<MessageStatusProps> = ({
  status,
  isOwn = true,
  showLabel = false,
  className = ''
}) => {
  // Only show status for own messages
  if (!isOwn) return null;

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <Clock size={14} className="text-gray-400" />;
      case 'sent':
        return <Check size={14} className="text-gray-400" />;
      case 'delivered':
        return <CheckCheck size={14} className="text-gray-400" />;
      case 'read':
        return <CheckCheck size={14} className="text-blue-500" />;
      case 'failed':
        return <AlertCircle size={14} className="text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'pending':
        return 'Sending...';
      case 'sent':
        return 'Sent';
      case 'delivered':
        return 'Delivered';
      case 'read':
        return 'Read';
      case 'failed':
        return 'Failed';
      default:
        return '';
    }
  };

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {getStatusIcon()}
      {showLabel && (
        <span className="text-xs text-gray-400">{getStatusLabel()}</span>
      )}
    </span>
  );
};

export default MessageStatus;
