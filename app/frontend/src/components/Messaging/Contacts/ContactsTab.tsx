import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserGroupIcon, UserPlusIcon, TagIcon, FolderPlusIcon } from '@heroicons/react/24/outline';
import ContactSearch from './ContactSearch';
import ContactList from './ContactList';
import AddContactModal from './AddContactModal';

const ContactsTab: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Contacts</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
          >
            <UserPlusIcon className="w-4 h-4" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-700">
        <ContactSearch />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Info Banner */}
        <div className="p-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-b border-gray-700">
          <div className="flex items-start gap-3">
            <UserGroupIcon className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-white">Custom Contact Groups</h3>
              <p className="text-sm text-gray-300 mt-1">
                Create your own groups to organize contacts. No default groups are provided.
              </p>
            </div>
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1">
          <ContactList />
        </div>
      </div>

      {/* Add Contact Modal */}
      <AddContactModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
};

export default ContactsTab;