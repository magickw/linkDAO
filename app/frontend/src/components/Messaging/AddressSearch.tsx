/**
 * Address Search Component
 * Multichain address search with ENS resolution and suggestions
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  User,
  ExternalLink,
  Check,
  X,
  Globe,
  Star,
  Clock,
  Loader,
  AlertCircle
} from 'lucide-react';
import { Button } from '../../design-system';
import multichainResolver, { ResolvedAddress, AddressSearchResult } from '../../services/multichainResolver';
import messagingService from '../../services/messagingService';

interface AddressSearchProps {
  onAddressSelect: (address: ResolvedAddress) => void;
  onClose: () => void;
  className?: string;
  placeholder?: string;
  initialQuery?: string;
}

const AddressSearch: React.FC<AddressSearchProps> = ({
  onAddressSelect,
  onClose,
  className = '',
  placeholder = 'Search addresses (EVM, SVM, ENS)...',
  initialQuery = ''
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<AddressSearchResult>({
    addresses: [],
    suggestions: []
  });
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [recentAddresses, setRecentAddresses] = useState<ResolvedAddress[]>([]);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
    
    // Load recent addresses
    loadRecentAddresses();

    // Initial search if query provided
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, []);

  useEffect(() => {
    // Debounced search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(query);
      }, 300);
    } else if (query.trim().length === 0) {
      setSearchResults({ addresses: [], suggestions: [] });
      setError(null);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const loadRecentAddresses = () => {
    try {
      const conversations = messagingService.getConversations();
      const addresses: ResolvedAddress[] = [];
      
      // Extract unique addresses from recent conversations
      const uniqueAddresses = new Set<string>();
      conversations.slice(0, 5).forEach((conv: any) => {
        conv.participants.forEach((addr: string) => {
          if (!uniqueAddresses.has(addr)) {
            uniqueAddresses.add(addr);
            // Create a basic resolved address (in real app, these would be cached)
            addresses.push({
              address: addr,
              chain: {
                chainId: '1',
                name: 'Ethereum',
                type: 'EVM',
                explorer: 'https://etherscan.io',
                currency: 'ETH'
              },
              isValid: true,
              normalizedAddress: addr.toLowerCase()
            });
          }
        });
      });

      setRecentAddresses(addresses);
    } catch (error) {
      console.error('Failed to load recent addresses:', error);
    }
  };

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const results = await multichainResolver.searchAddresses(searchQuery);
      setSearchResults(results);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Search failed:', error);
      setError('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = searchResults.addresses.length + searchResults.suggestions.length;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % totalItems);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev <= 0 ? totalItems - 1 : prev - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.addresses.length) {
          handleAddressSelect(searchResults.addresses[selectedIndex]);
        } else if (selectedIndex >= searchResults.addresses.length) {
          const suggestionIndex = selectedIndex - searchResults.addresses.length;
          const suggestion = searchResults.suggestions[suggestionIndex];
          if (suggestion) {
            setQuery(suggestion);
            performSearch(suggestion);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  const handleAddressSelect = (address: ResolvedAddress) => {
    // Save to recent addresses
    saveToRecent(address);
    onAddressSelect(address);
    onClose();
  };

  const saveToRecent = (address: ResolvedAddress) => {
    try {
      const recent = [address, ...recentAddresses.filter(a => a.address !== address.address)].slice(0, 10);
      setRecentAddresses(recent);
      // In a real app, you'd save to localStorage or backend
    } catch (error) {
      console.error('Failed to save recent address:', error);
    }
  };

  const formatAddress = (address: string, chain: string): string => {
    if (chain === 'SVM') {
      return `${address.slice(0, 4)}...${address.slice(-4)}`;
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getChainIcon = (chainType: string) => {
    switch (chainType) {
      case 'EVM': return '⟁';
      case 'SVM': return '◎';
      default: return '🌐';
    }
  };

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-lg shadow-xl ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">Search Addresses</h3>
          <Button variant="outline" size="small" onClick={onClose} className="p-2">
            <X size={16} />
          </Button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-10 pr-10 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
          {isLoading && (
            <Loader size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-400 animate-spin" />
          )}
        </div>

        {/* Supported Chains */}
        <div className="flex items-center space-x-2 mt-2 text-xs text-gray-400">
          <span>Supported:</span>
          <span className="flex items-center space-x-1">
            <span>⟁ EVM</span>
            <span>•</span>
            <span>◎ Solana</span>
            <span>•</span>
            <span>🌐 ENS</span>
          </span>
        </div>
      </div>

      {/* Results */}
      <div className="max-h-96 overflow-y-auto">
        {error && (
          <div className="p-4 text-red-400 flex items-center space-x-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Resolved Addresses */}
        {searchResults.addresses.length > 0 && (
          <div className="p-2">
            <h4 className="text-sm font-medium text-gray-300 px-2 py-1">Addresses</h4>
            {searchResults.addresses.map((address: ResolvedAddress, index: number) => (
              <motion.div
                key={address.address}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedIndex === index ? 'bg-blue-600/20 border border-blue-600/30' : 'hover:bg-gray-800'
                }`}
                onClick={() => handleAddressSelect(address)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {getChainIcon(address.chain.type)}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-white">
                        {address.ensName || formatAddress(address.address, address.chain.type)}
                      </p>
                      <span className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300">
                        {address.chain.name}
                      </span>
                    </div>
                    
                    {address.ensName && (
                      <p className="text-sm text-gray-400">
                        {formatAddress(address.address, address.chain.type)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="small"
                      className="p-1"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        window.open(multichainResolver.getExplorerUrl(address), '_blank');
                      }}
                    >
                      <ExternalLink size={12} />
                    </Button>
                    <Check size={16} className="text-green-400" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Suggestions */}
        {searchResults.suggestions.length > 0 && (
          <div className="p-2 border-t border-gray-700">
            <h4 className="text-sm font-medium text-gray-300 px-2 py-1">Suggestions</h4>
            {searchResults.suggestions.map((suggestion: string, index: number) => {
              const globalIndex = searchResults.addresses.length + index;
              return (
                <motion.div
                  key={suggestion}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (searchResults.addresses.length + index) * 0.05 }}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedIndex === globalIndex ? 'bg-blue-600/20 border border-blue-600/30' : 'hover:bg-gray-800'
                  }`}
                  onClick={() => {
                    setQuery(suggestion);
                    performSearch(suggestion);
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <Search size={16} className="text-gray-400" />
                    <span className="text-white">{suggestion}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Recent Addresses */}
        {recentAddresses.length > 0 && query.trim().length === 0 && (
          <div className="p-2">
            <h4 className="text-sm font-medium text-gray-300 px-2 py-1 flex items-center space-x-2">
              <Clock size={14} />
              <span>Recent</span>
            </h4>
            {recentAddresses.slice(0, 5).map((address, index) => (
              <motion.div
                key={address.address}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-3 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors"
                onClick={() => handleAddressSelect(address)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center">
                    <span className="text-gray-300 text-xs">
                      {getChainIcon(address.chain.type)}
                    </span>
                  </div>
                  <span className="text-gray-300">
                    {address.ensName || formatAddress(address.address, address.chain.type)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* No Results */}
        {query.trim().length >= 3 && 
         searchResults.addresses.length === 0 && 
         searchResults.suggestions.length === 0 && 
         !isLoading && !error && (
          <div className="p-8 text-center text-gray-400">
            <Search size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No addresses found</p>
            <p className="text-sm">
              Try searching for:
              <br />• Ethereum address (0x...)
              <br />• ENS name (.eth)
              <br />• Solana address
            </p>
          </div>
        )}

        {/* Empty State */}
        {query.trim().length === 0 && recentAddresses.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            <Globe size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">Search Multichain Addresses</p>
            <p className="text-sm">
              Find and message any EVM or SVM address
              <br />Supports ENS names and direct addresses
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-700 text-xs text-gray-400 text-center">
        Use ↑↓ to navigate, Enter to select, Esc to close
      </div>
    </div>
  );
};

export default AddressSearch;