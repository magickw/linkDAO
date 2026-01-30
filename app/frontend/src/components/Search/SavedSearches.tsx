/**
 * SavedSearches Component
 * Manages saved searches with CRUD operations and organization
 */

import React, { useState, useEffect } from 'react';
import { SearchQuery } from './GlobalSearchInterface';

interface SavedSearch {
  id: string;
  name: string;
  query: SearchQuery;
  createdAt: Date;
  lastUsed?: Date;
  usageCount: number;
}

interface SavedSearchesProps {
  className?: string;
  onSearchSelect?: (search: SavedSearch) => void;
  maxItems?: number;
}

export const SavedSearches: React.FC<SavedSearchesProps> = ({
  className = '',
  onSearchSelect,
  maxItems = 10
}) => {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Load saved searches from localStorage
  useEffect(() => {
    const loadSavedSearches = () => {
      try {
        const stored = localStorage.getItem('saved_searches');
        if (stored) {
          const parsed = JSON.parse(stored);
          // Convert date strings back to Date objects
          const searches = parsed.map((search: any) => ({
            ...search,
            createdAt: new Date(search.createdAt),
            lastUsed: search.lastUsed ? new Date(search.lastUsed) : undefined
          }));
          setSavedSearches(searches);
        }
      } catch (error) {
        console.error('Error loading saved searches:', error);
      }
    };

    loadSavedSearches();
  }, []);

  // Save searches to localStorage
  const saveSearches = (searches: SavedSearch[]) => {
    try {
      localStorage.setItem('saved_searches', JSON.stringify(searches));
    } catch (error) {
      console.error('Error saving searches:', error);
    }
  };

  // Add a new saved search
  const addSavedSearch = (query: SearchQuery, name: string) => {
    const newSearch: SavedSearch = {
      id: `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      query,
      createdAt: new Date(),
      usageCount: 0
    };

    const updatedSearches = [newSearch, ...savedSearches].slice(0, maxItems);
    setSavedSearches(updatedSearches);
    saveSearches(updatedSearches);
  };

  // Update saved search name
  const updateSavedSearch = (id: string, newName: string) => {
    const updatedSearches = savedSearches.map(search => 
      search.id === id ? { ...search, name: newName } : search
    );
    setSavedSearches(updatedSearches);
    saveSearches(updatedSearches);
    setIsEditing(false);
    setEditingId(null);
    setEditName('');
  };

  // Delete a saved search
  const deleteSavedSearch = (id: string) => {
    const updatedSearches = savedSearches.filter(search => search.id !== id);
    setSavedSearches(updatedSearches);
    saveSearches(updatedSearches);
  };

  // Use a saved search
  const useSavedSearch = (search: SavedSearch) => {
    const updatedSearches = savedSearches.map(s => 
      s.id === search.id 
        ? { ...s, lastUsed: new Date(), usageCount: s.usageCount + 1 }
        : s
    );
    setSavedSearches(updatedSearches);
    saveSearches(updatedSearches);
    
    if (onSearchSelect) {
      onSearchSelect(search);
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  if (savedSearches.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-gray-400 dark:text-gray-500 mb-2">
          <svg className="w-12 h-12 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No saved searches yet
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
          Save searches to quickly access them later
        </p>
      </div>
    );
  }

  return (
    <div className={`saved-searches ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Saved Searches
        </h3>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {isEditing ? 'Done' : 'Edit'}
        </button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {savedSearches.map((search) => (
          <div
            key={search.id}
            className="group flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex-1 min-w-0">
              {editingId === search.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      updateSavedSearch(search.id, editName);
                    } else if (e.key === 'Escape') {
                      setIsEditing(false);
                      setEditingId(null);
                      setEditName('');
                    }
                  }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => useSavedSearch(search)}
                  className="w-full text-left"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {search.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-2">
                        <span>
                          {search.query.filters.type !== 'all' 
                            ? search.query.filters.type 
                            : 'All types'}
                        </span>
                        {search.lastUsed && (
                          <span>• Used {formatDate(search.lastUsed)}</span>
                        )}
                        {search.usageCount > 0 && (
                          <span>• {search.usageCount} uses</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )}
            </div>

            {isEditing && editingId !== search.id && (
              <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                <button
                  onClick={() => {
                    setEditingId(search.id);
                    setEditName(search.name);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => deleteSavedSearch(search.id)}
                  className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}

            {editingId === search.id && (
              <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                <button
                  onClick={() => updateSavedSearch(search.id, editName)}
                  className="p-1 text-green-600 hover:text-green-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setEditingId(null);
                    setEditName('');
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {savedSearches.length >= maxItems && (
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
          Maximum {maxItems} saved searches. Delete some to add more.
        </div>
      )}
    </div>
  );
};

export default SavedSearches;