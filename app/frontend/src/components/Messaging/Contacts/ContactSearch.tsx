import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useContacts } from '@/contexts/ContactContext';
import { CONTACT_TAGS } from '@/types/contacts';

interface ContactSearchProps {
  className?: string;
}

const ContactSearch: React.FC<ContactSearchProps> = ({ className = '' }) => {
  const { searchFilters, searchContacts, groups } = useContacts();
  const [showFilters, setShowFilters] = useState(false);
  const [localQuery, setLocalQuery] = useState(searchFilters.query);
  const searchRef = useRef<HTMLInputElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);

  // Update local query when searchFilters change
  useEffect(() => {
    setLocalQuery(searchFilters.query);
  }, [searchFilters.query]);

  // Handle search input with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      searchContacts({ query: localQuery });
    }, 300);

    return () => clearTimeout(timer);
  }, [localQuery, searchContacts]);

  // Close filters when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilters]);

  const handleGroupFilter = (groupId: string) => {
    const newGroups = searchFilters.groups.includes(groupId)
      ? searchFilters.groups.filter(id => id !== groupId)
      : [...searchFilters.groups, groupId];
    
    searchContacts({ groups: newGroups });
  };

  const handleTagFilter = (tag: string) => {
    const newTags = searchFilters.tags.includes(tag)
      ? searchFilters.tags.filter(t => t !== tag)
      : [...searchFilters.tags, tag];
    
    searchContacts({ tags: newTags });
  };

  const handleStatusFilter = (status: 'online' | 'idle' | 'busy' | 'offline') => {
    const newStatus = searchFilters.status.includes(status)
      ? searchFilters.status.filter(s => s !== status)
      : [...searchFilters.status, status];
    
    searchContacts({ status: newStatus });
  };

  const clearAllFilters = () => {
    searchContacts({
      query: '',
      groups: [],
      tags: [],
      status: []
    });
    setLocalQuery('');
  };

  const hasActiveFilters = searchFilters.groups.length > 0 || 
                          searchFilters.tags.length > 0 || 
                          searchFilters.status.length > 0 ||
                          searchFilters.query.length > 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={searchRef}
          type="text"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          placeholder="Search contacts..."
          className="w-full pl-10 pr-12 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="absolute inset-y-0 right-0 flex items-center">
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="p-1 mr-1 text-gray-400 hover:text-white rounded transition-colors"
              title="Clear filters"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 mr-1 rounded transition-colors ${
              showFilters || hasActiveFilters
                ? 'text-blue-400 bg-blue-900/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            title="Filters"
          >
            <FunnelIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            ref={filtersRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 p-4 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10"
          >
            {/* Groups Filter */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Groups</h4>
              <div className="flex flex-wrap gap-2">
                {groups.map(group => (
                  <button
                    key={group.id}
                    onClick={() => handleGroupFilter(group.id)}
                    className={`flex items-center gap-1 px-3 py-1 text-xs rounded-full border transition-colors ${
                      searchFilters.groups.includes(group.id)
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <span>{group.icon}</span>
                    <span>{group.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Status</h4>
              <div className="flex flex-wrap gap-2">
                {(['online', 'idle', 'busy', 'offline'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => handleStatusFilter(status)}
                    className={`flex items-center gap-2 px-3 py-1 text-xs rounded-full border transition-colors ${
                      searchFilters.status.includes(status)
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
                    <span className="capitalize">{status}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tags Filter */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {CONTACT_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleTagFilter(tag)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      searchFilters.tags.includes(tag)
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear All */}
            {hasActiveFilters && (
              <div className="mt-4 pt-3 border-t border-gray-700">
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ContactSearch;