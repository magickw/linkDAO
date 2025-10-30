import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, ChevronRightIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { useContacts } from '@/contexts/ContactContext';
import { Contact, ContactGroup } from '@/types/contacts';
import ContactCard from './ContactCard';
import AddContactModal from './AddContactModal';

interface ContactListProps {
  className?: string;
  flat?: boolean; // render single-column without group sections
}

const ContactList: React.FC<ContactListProps> = ({ className = '', flat = false }) => {
  const { contacts, groups, searchFilters } = useContacts();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['favorites', 'friends']));
  const [showAddModal, setShowAddModal] = useState(false);

  // Filter contacts based on search criteria
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      // Text search
      if (searchFilters.query) {
        const query = searchFilters.query.toLowerCase();
        const matchesQuery = 
          contact.nickname.toLowerCase().includes(query) ||
          contact.walletAddress.toLowerCase().includes(query) ||
          contact.ensName?.toLowerCase().includes(query) ||
          contact.tags.some(tag => tag.toLowerCase().includes(query));
        
        if (!matchesQuery) return false;
      }

      // Group filter
      if (searchFilters.groups.length > 0) {
        const hasMatchingGroup = contact.groups.some(group => 
          searchFilters.groups.includes(group.id)
        );
        if (!hasMatchingGroup) return false;
      }

      // Tag filter
      if (searchFilters.tags.length > 0) {
        const hasMatchingTag = searchFilters.tags.some(tag => 
          contact.tags.includes(tag)
        );
        if (!hasMatchingTag) return false;
      }

      // Status filter
      if (searchFilters.status.length > 0) {
        if (!searchFilters.status.includes(contact.status)) return false;
      }

      return true;
    });
  }, [contacts, searchFilters]);

  // Group contacts by their groups (only when not flat)
  const groupedContacts = useMemo(() => {
    if (flat) return {} as Record<string, Contact[]>;
    const grouped: Record<string, Contact[]> = {};
    groups.forEach(group => {
      grouped[group.id] = filteredContacts.filter(contact =>
        contact.groups.some(contactGroup => contactGroup.id === group.id)
      );
    });
    return grouped;
  }, [filteredContacts, groups, flat]);

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">MY CONTACTS</h2>
          <span className="text-sm text-gray-400">({filteredContacts.length})</span>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          title="Add Contact"
        >
          <UserPlusIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {flat ? (
          <div className="space-y-1 p-2">
            {filteredContacts.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No contacts found</div>
            ) : (
              filteredContacts.map(contact => (
                <ContactCard key={contact.id} contact={contact} className="mx-1" />
              ))
            )}
          </div>
        ) : (
          groups.map(group => {
          const groupContacts = groupedContacts[group.id] || [];
          const isExpanded = expandedGroups.has(group.id);

          if (groupContacts.length === 0 && searchFilters.query) {
            return null;
          }

          return (
            <div key={group.id} className="border-b border-gray-800 last:border-b-0">
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-lg">{group.icon}</span>
                  <span className="text-sm font-medium text-gray-300 uppercase tracking-wide">
                    {group.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({groupContacts.length})
                  </span>
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    {groupContacts.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No contacts in this group
                      </div>
                    ) : (
                      <div className="space-y-1 pb-2">
                        {groupContacts.map(contact => (
                          <ContactCard
                            key={contact.id}
                            contact={contact}
                            className="mx-2"
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
          })
        )}

        {/* Empty State */}
        {!flat && contacts.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6">
              <span className="text-3xl">📱</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Contacts Yet</h3>
            <p className="text-gray-400 text-sm mb-6 max-w-sm">
              Start building your Web3 network by adding contacts.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Add Your First Contact
            </button>
          </div>
        )}
      </div>

      <AddContactModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
};

export default ContactList;