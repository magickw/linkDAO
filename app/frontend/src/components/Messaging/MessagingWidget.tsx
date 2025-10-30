/**
 * Messaging Widget - Compact floating messaging interface
 * Now uses the new FloatingChatWidget design
 */

import React from 'react';
import FloatingChatWidget from './FloatingChatWidget';

interface MessagingWidgetProps {
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

const MessagingWidget: React.FC<MessagingWidgetProps> = ({
  className = '',
  position = 'bottom-right'
}) => {
  // Simply render the new FloatingChatWidget with the same props
  return <FloatingChatWidget className={className} position={position} />;
};

export default MessagingWidget;