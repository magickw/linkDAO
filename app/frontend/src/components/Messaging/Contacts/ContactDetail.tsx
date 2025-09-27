import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ChatBubbleLeftIcon, 
  PencilIcon, 
  TrashIcon, 
  CheckBadgeIcon,
  ClipboardDocumentIcon,
  PhoneIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';
import { Contact } from '@/types/contacts';
import { useContacts } from '@/contexts/ContactContext';

interface ContactDetailProps {
  contact: Contact;
  className?: string;
}

const ContactDetail: React.FC<ContactDetailProps> = ({ contact, className = '' }) => {
  const { startChat, deleteContact } = useContacts();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'idle': return 'Away';
      case 'busy': return 'Busy';
      default: return 'Offline';
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // TODO: Show toast notification
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteContact(contact.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete contact:', error);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-700">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-semibold">
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
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-gray-900 ${getStatusColor(contact.status)}`} />
          </div>

          {/* Basic Info */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-white">{contact.nickname}</h1>
              {contact.isVerified && (
                <CheckBadgeIcon className="w-6 h-6 text-blue-400" />
              )}
            </div>
            <p className="text-gray-400">{getStatusText(contact.status)}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => startChat(contact)}
            className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            title="Message"
          >
            <ChatBubbleLeftIcon className="w-5 h-5" />
          </button>
          <button
            className="p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            title="Voice Call"
          >
            <PhoneIcon className="w-5 h-5" />
          </button>
          <button
            className="p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            title="Video Call"
          >
            <VideoCameraIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Contact Information */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
          
          <div className="space-y-3">
            {/* Wallet Address */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Wallet Address
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-700 rounded text-gray-300 font-mono text-sm">
                  {contact.walletAddress}
                </code>
                <button
                  onClick={() => copyToClipboard(contact.walletAddress)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors"
                  title="Copy address"
                >
                  <ClipboardDocumentIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ENS Name */}
            {contact.ensName && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  ENS Name
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-gray-700 rounded text-gray-300 font-mono text-sm">
                    {contact.ensName}
                  </code>
                  <button
                    onClick={() => copyToClipboard(contact.ensName!)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors"
                    title="Copy ENS name"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Groups */}
        {contact.groups.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Groups</h3>
            <div className="flex flex-wrap gap-2">
              {contact.groups.map(group => (
                <div
                  key={group.id}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-700 rounded-full text-sm text-gray-300"
                >
                  <span>{group.icon}</span>
                  <span>{group.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {contact.tags.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {contact.tags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-blue-600/20 text-blue-300 rounded-full text-sm border border-blue-600/30"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {contact.notes && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Notes</h3>
            <p className="text-gray-300 leading-relaxed">{contact.notes}</p>
          </div>
        )}

        {/* Activity */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Activity</h3>
          <div className="space-y-2 text-sm text-gray-400">
            <div>Added: {contact.createdAt.toLocaleDateString()}</div>
            <div>Last updated: {contact.updatedAt.toLocaleDateString()}</div>
            {contact.lastSeen && (
              <div>Last seen: {contact.lastSeen.toLocaleDateString()}</div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-6 border-t border-gray-700">
        <div className="flex gap-3">
          <button
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <PencilIcon className="w-4 h-4" />
            Edit Contact
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-lg p-6 max-w-sm mx-4 border border-gray-700"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Delete Contact</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete {contact.nickname}? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ContactDetail;