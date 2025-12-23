import React from 'react';
import { motion } from 'framer-motion';
import ContactSearch from './ContactSearch';
import ContactList from './ContactList';
import ContactDetail from './ContactDetail';
import { useContacts } from '@/contexts/ContactContext';

interface ContactsTabProps {
  className?: string;
}

const ContactsTab: React.FC<ContactsTabProps> = ({ className = '' }) => {
  const { selectedContact, startChat } = useContacts();

  const handleStartChat = (contact: any) => {
    startChat(contact);
  };

  return (
    <div className={`flex h-full ${className}`}>
      {/* Left Panel - Contact List */}
      <div className="w-80 flex flex-col border-r border-gray-700 bg-gray-900">
        {/* Search */}
        <div className="p-4 border-b border-gray-700">
          <ContactSearch />
        </div>

        {/* Contact List */}
        <ContactList className="flex-1" onContactMessage={handleStartChat} />
      </div>

      {/* Right Panel - Contact Detail or Empty State */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <ContactDetail contact={selectedContact} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md"
            >
              {/* Icon */}
              <div className="w-24 h-24 mx-auto mb-6 bg-gray-800 rounded-full flex items-center justify-center">
                <span className="text-4xl">📱</span>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-semibold text-white mb-3">
                Manage Your Contacts
              </h2>

              {/* Description */}
              <p className="text-gray-400 text-lg leading-relaxed">
                Organize your Web3 connections with custom nicknames, groups, 
                and tags. Click on any contact to start a conversation or edit their 
                details.
              </p>

              {/* Features */}
              <div className="mt-8 space-y-3 text-left">
                <div className="flex items-center gap-3 text-gray-300">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span>Add wallet addresses and ENS names</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Organize contacts into custom groups</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  <span>Tag contacts by interests and roles</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  <span>One-click messaging and quick actions</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactsTab;