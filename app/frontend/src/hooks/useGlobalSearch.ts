/**
 * useGlobalSearch Hook
 * Custom hook for global search functionality
 * Implements requirements 4.1, 4.4, 5.1 from the interconnected social platform spec
 */

import { useState, useCallback, useRef } from 'react';
import { SearchQuery, SearchResult } from '../components/Search/GlobalSearchInterface';
import { globalSearchService } from '../services/globalSearchService';

interface SearchHistoryItem {
  query: string;
  timestamp: Date;
  resultCount?: number;
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: Record<string, any>;
  createdAt: Date;
}

interface UseGlobalSearchReturn {
  results: SearchResult[];
  suggestions: string[];
  history: SearchHistoryItem[];
  savedSearches: SavedSearch[];
  loading: boolean;
  error: string | null;
  search: (query: SearchQuery) => Promise<void>;
  getSuggestions: (query: string) => Promise<void>;
  addToHistory: (query: string, resultCount?: number) => void;
  clearHistory: () => void;
  saveSearch: (query: SearchQuery, name: string) => Promise<void>;
  deleteSavedSearch: (id: string) => Promise<void>;
  getSearchAnalytics: () => Promise<any>;
}

const MAX_HISTORY_ITEMS = 50;
const HISTORY_STORAGE_KEY = 'search_history';
const SAVED_SEARCHES_STORAGE_KEY = 'saved_searches';

export const useGlobalSearch = (): UseGlobalSearchReturn => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [history, setHistory] = useState<SearchHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      return stored ? JSON.parse(stored).map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      })) : [];
    } catch {
      return [];
    }
  });
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => {
    try {
      const stored = localStorage.getItem(SAVED_SEARCHES_STORAGE_KEY);
      return stored ? JSON.parse(stored).map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt)
      })) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs to track current requests and avoid race conditions
  const searchAbortController = useRef<AbortController | null>(null);
  const suggestionsAbortController = useRef<AbortController | null>(null);

  /**
   * Perform search
   */
  const search = useCallback(async (query: SearchQuery) => {
    if (!query.query.trim()) {
      setResults([]);
      return;
    }

    // Cancel previous search request
    if (searchAbortController.current) {
      searchAbortController.current.abort();
    }

    // Create new abort controller
    searchAbortController.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const searchResults = await globalSearchService.search(query, {
        signal: searchAbortController.current.signal
      });

      setResults(searchResults.results);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Search error:', err);
        setError(err.message || 'Search failed');
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get search suggestions
   */
  const getSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    // Cancel previous suggestions request
    if (suggestionsAbortController.current) {
      suggestionsAbortController.current.abort();
    }

    // Create new abort controller
    suggestionsAbortController.current = new AbortController();

    try {
      const searchSuggestions = await globalSearchService.getSuggestions(query, {
        signal: suggestionsAbortController.current.signal
      });

      setSuggestions(searchSuggestions);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Suggestions error:', err);
        setSuggestions([]);
      }
    }
  }, []);

  /**
   * Add query to search history
   */
  const addToHistory = useCallback((query: string, resultCount?: number) => {
    if (!query.trim()) return;

    setHistory(prevHistory => {
      // Remove existing entry if it exists
      const filteredHistory = prevHistory.filter(item => item.query !== query);
      
      // Add new entry at the beginning
      const newHistory = [
        { query, timestamp: new Date(), resultCount },
        ...filteredHistory
      ].slice(0, MAX_HISTORY_ITEMS);

      // Save to localStorage
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
      } catch (error) {
        console.error('Error saving search history:', error);
      }

      return newHistory;
    });
  }, []);

  /**
   * Clear search history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  }, []);

  /**
   * Save search for later
   */
  const saveSearch = useCallback(async (query: SearchQuery, name: string) => {
    try {
      const savedSearch: SavedSearch = {
        id: Date.now().toString(),
        name,
        query: query.query,
        filters: query.filters,
        createdAt: new Date()
      };

      setSavedSearches(prevSaved => {
        const newSaved = [savedSearch, ...prevSaved];
        
        // Save to localStorage
        try {
          localStorage.setItem(SAVED_SEARCHES_STORAGE_KEY, JSON.stringify(newSaved));
        } catch (error) {
          console.error('Error saving search:', error);
        }

        return newSaved;
      });

      // Also save to backend if user is authenticated
      await globalSearchService.saveSearch(savedSearch);
    } catch (error) {
      console.error('Error saving search:', error);
      throw error;
    }
  }, []);

  /**
   * Delete saved search
   */
  const deleteSavedSearch = useCallback(async (id: string) => {
    try {
      setSavedSearches(prevSaved => {
        const newSaved = prevSaved.filter(search => search.id !== id);
        
        // Update localStorage
        try {
          localStorage.setItem(SAVED_SEARCHES_STORAGE_KEY, JSON.stringify(newSaved));
        } catch (error) {
          console.error('Error updating saved searches:', error);
        }

        return newSaved;
      });

      // Also delete from backend
      await globalSearchService.deleteSavedSearch(id);
    } catch (error) {
      console.error('Error deleting saved search:', error);
      throw error;
    }
  }, []);

  /**
   * Get search analytics
   */
  const getSearchAnalytics = useCallback(async () => {
    try {
      return await globalSearchService.getSearchAnalytics();
    } catch (error) {
      console.error('Error getting search analytics:', error);
      throw error;
    }
  }, []);

  return {
    results,
    suggestions,
    history,
    savedSearches,
    loading,
    error,
    search,
    getSuggestions,
    addToHistory,
    clearHistory,
    saveSearch,
    deleteSavedSearch,
    getSearchAnalytics
  };
};