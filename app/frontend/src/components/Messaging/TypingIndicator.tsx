import React from 'react';

interface TypingIndicatorProps {
  users: string[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users }) => {
  const truncateAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getTypingText = () => {
    if (users.length === 0) return '';
    if (users.length === 1) return `${truncateAddress(users[0])} is typing`;
    if (users.length === 2) return `${truncateAddress(users[0])} and ${truncateAddress(users[1])} are typing`;
    return `${truncateAddress(users[0])} and ${users.length - 1} others are typing`;
  };

  if (users.length === 0) return null;

  return (
    <div className="flex items-start space-x-2 mt-2">
      {/* Avatar */}
      <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white font-medium text-xs">
        {users[0].slice(2, 4).toUpperCase()}
      </div>
      
      {/* Typing Bubble */}
      <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl rounded-bl-md px-4 py-2 max-w-xs">
        <div className="flex items-center space-x-1">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {getTypingText()}
          </span>
          
          {/* Animated Dots */}
          <div className="flex space-x-1 ml-2">
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};