import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChatBubbleLeftIcon, PencilIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';
import { Contact } from '@/types/contacts';
import { useContacts } from '@/contexts/ContactContext';

interface ContactCardProps {
  contact: Contact;
  className?: string;
  onContactMessage?: (contact: Contact) => void;
  onContactEdit?: (contact: Contact) => void;
}

const ContactCard: React.FC<ContactCardProps> = ({ contact, className = '', onContactMessage, onContactEdit }) => {
  const { selectContact, startChat } = useContacts();
  const [isHovered, setIsHovered] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatLastSeen = (lastSeen?: Date) => {
    if (!lastSeen) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - lastSeen.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return lastSeen.toLocaleDateString();
  };

  const handleClick = () => {
    selectContact(contact);
  };

  const handleMessage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onContactMessage) {
      onContactMessage(contact);
    } else {
      startChat(contact);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onContactEdit) {
      onContactEdit(contact);
    }
  };

  return (
    <motion.div
      className={`relative p-3 rounded-lg cursor-pointer transition-colors ${className} ${
        isHovered ? 'bg-gray-700' : 'hover:bg-gray-800'
      }`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
            {contact.avatar ? (
              <img
                src={contact.avatar}
                alt={contact.nickname}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              contact.nickname.charAt(0).toUpperCase()
            )}
          </div>
          
          {/* Status indicator */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900 ${getStatusColor(contact.status)}`} />
        </div>

        {/* Contact Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-white truncate">
              {contact.nickname}
            </h3>
            {contact.isVerified && (
              <CheckBadgeIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
            )}
          </div>
          
          <p className="text-sm text-gray-400 truncate">
            {contact.ensName || formatAddress(contact.walletAddress)}
          </p>
          
          <p className="text-xs text-gray-500">
            Last seen: {formatLastSeen(contact.lastSeen)}
          </p>
        </div>

        {/* Quick Actions */}
        <motion.div
          className="flex items-center gap-1"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : 10 }}
          transition={{ duration: 0.2 }}
        >
          <button
            onClick={handleMessage}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Message"
            disabled={!contact.walletAddress}
          >
            <ChatBubbleLeftIcon className="w-4 h-4" />
          </button>
          {onContactEdit && (
            <button
              onClick={handleEdit}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors"
              title="Edit"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
          )}
        </motion.div>
      </div>

      {/* Tags */}
      {contact.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {contact.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded-full"
            >
              {tag}
            </span>
          ))}
          {contact.tags.length > 3 && (
            <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-400 rounded-full">
              +{contact.tags.length - 3}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default ContactCard;