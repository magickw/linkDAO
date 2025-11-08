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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
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
    // Only show custom groups
    const customGroups = groups.filter(group => group.type === 'custom');
    customGroups.forEach(group => {
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

  // Only show custom groups in the UI
  const customGroups = groups.filter(group => group.type === 'custom');

  return (
    <>
      <div className={`flex flex-col h-full ${className}`}>
        {/* Add Contact Button */}
        <div className="p-3 border-b border-gray-700">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <UserPlusIcon className="w-4 h-4" />
            <span>Add Contact</span>
          </button>
        </div>

        {/* Contact Groups */}
        {!flat && customGroups.length > 0 ? (
          <div className="flex-1 overflow-y-auto">
            {customGroups.map(group => {
              const groupContacts = groupedContacts[group.id] || [];
              const isExpanded = expandedGroups.has(group.id);
              
              return (
                <div key={group.id} className="border-b border-gray-700 last:border-b-0">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{group.icon}</span>
                      <div>
                        <h3 className="font-medium text-white">{group.name}</h3>
                        <p className="text-xs text-gray-400">{groupContacts.length} contacts</p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  {/* Group Contacts */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pb-2">
                          {groupContacts.map(contact => (
                            <ContactCard key={contact.id} contact={contact} />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ) : !flat ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
            <UserPlusIcon className="w-12 h-12 text-gray-500 mb-3" />
            <h3 className="text-lg font-medium text-white mb-1">No Groups Yet</h3>
            <p className="text-sm text-gray-400 mb-4">
              Create custom groups to organize your contacts
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              Add Contact
            </button>
          </div>
        ) : null}

        {/* Flat List View */}
        {flat && (
          <div className="flex-1 overflow-y-auto">
            {filteredContacts.length > 0 ? (
              filteredContacts.map(contact => (
                <ContactCard key={contact.id} contact={contact} />
              ))
            ) : (
              <div className="p-4 text-center">
                <UserPlusIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-white mb-1">No Contacts Found</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Add your first contact to get started
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  Add Contact
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      <AddContactModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onContactAdded={() => {
          // Refresh or any other logic after adding contact
        }}
      />
    </>
  );
};

export default ContactList;