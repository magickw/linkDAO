import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, UserPlus, X, Check, Users, AtSign, Loader2 } from 'lucide-react';
import { Button } from '../../design-system';
import { PresenceIndicator } from './PresenceIndicator';

interface SearchResult {
  address: string;
  nickname?: string;
  displayName?: string;
  avatarUrl?: string;
  isOnline?: boolean;
  lastSeen?: Date;
}

interface MemberInviteSearchProps {
  onInvite: (addresses: string[]) => Promise<void>;
  onClose: () => void;
  excludeAddresses?: string[]; // Already in group
  groupName?: string;
  maxSelections?: number;
}

export const MemberInviteSearch: React.FC<MemberInviteSearchProps> = ({
  onInvite,
  onClose,
  excludeAddresses = [],
  groupName,
  maxSelections = 50
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedAddresses, setSelectedAddresses] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentContacts, setRecentContacts] = useState<SearchResult[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Load recent contacts on mount
  useEffect(() => {
    loadRecentContacts();
  }, []);

  const loadRecentContacts = async () => {
    try {
      // This would fetch from the backend in a real implementation
      // For now, we'll return an empty array or mock data
      const mockRecents: SearchResult[] = [];
      setRecentContacts(mockRecents.filter(
        c => !excludeAddresses.includes(c.address.toLowerCase())
      ));
    } catch (err) {
      console.error('Failed to load recent contacts:', err);
    }
  };

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      // Check if it's a valid wallet address
      if (query.startsWith('0x') && query.length === 42) {
        // Direct address input - add as a result
        setSearchResults([{
          address: query,
          displayName: `${query.slice(0, 6)}...${query.slice(-4)}`
        }]);
      } else {
        // Search by username/nickname
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=10`);
        if (response.ok) {
          const data = await response.json();
          const results = (data.users || data || [])
            .filter((u: SearchResult) => !excludeAddresses.includes(u.address.toLowerCase()))
            .slice(0, 10);
          setSearchResults(results);
        } else {
          // If search API doesn't exist, just show address if valid
          setSearchResults([]);
        }
      }
    } catch (err) {
      console.error('Search failed:', err);
      // If search fails but it's a valid address, show it
      if (query.startsWith('0x') && query.length === 42) {
        setSearchResults([{
          address: query,
          displayName: `${query.slice(0, 6)}...${query.slice(-4)}`
        }]);
      } else {
        setSearchResults([]);
      }
    } finally {
      setIsSearching(false);
    }
  }, [excludeAddresses]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, searchUsers]);

  const toggleSelection = (address: string) => {
    setSelectedAddresses(prev => {
      const next = new Set(prev);
      if (next.has(address)) {
        next.delete(address);
      } else if (next.size < maxSelections) {
        next.add(address);
      }
      return next;
    });
  };

  const handleInvite = async () => {
    if (selectedAddresses.size === 0) return;

    setIsInviting(true);
    setError(null);

    try {
      await onInvite(Array.from(selectedAddresses));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invites');
    } finally {
      setIsInviting(false);
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const renderUserItem = (user: SearchResult, selected: boolean) => (
    <div
      key={user.address}
      onClick={() => toggleSelection(user.address)}
      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
        selected
          ? 'bg-blue-500/20 border border-blue-500/40'
          : 'bg-gray-100 dark:bg-gray-700/30 hover:bg-gray-200 dark:hover:bg-gray-700/50'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-medium text-white">
                {user.address.slice(2, 4).toUpperCase()}
              </span>
            )}
          </div>
          {user.isOnline !== undefined && (
            <div className="absolute bottom-0 right-0">
              <PresenceIndicator isOnline={user.isOnline} size="sm" />
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {user.displayName || user.nickname || truncateAddress(user.address)}
          </p>
          {(user.displayName || user.nickname) && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{truncateAddress(user.address)}</p>
          )}
        </div>
      </div>
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          selected
            ? 'bg-blue-500 border-blue-500'
            : 'border-gray-400 dark:border-gray-500'
        }`}
      >
        {selected && <Check size={12} className="text-white" />}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Invite Members</h2>
              {groupName && (
                <p className="text-sm text-gray-500 dark:text-gray-400">to {groupName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            {isSearching ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
            )}
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-sm bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Search by username or paste address..."
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
            <AtSign size={12} />
            Tip: Paste a wallet address (0x...) to add directly
          </p>
        </div>

        {/* Selected Count */}
        {selectedAddresses.size > 0 && (
          <div className="px-4 py-2 bg-blue-500/10 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              {selectedAddresses.size} selected
              {maxSelections && ` (max ${maxSelections})`}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400">
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Search Results */}
          {searchQuery && searchResults.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                Search Results
              </label>
              <div className="space-y-2">
                {searchResults.map(user =>
                  renderUserItem(user, selectedAddresses.has(user.address))
                )}
              </div>
            </div>
          )}

          {/* No Results */}
          {searchQuery && !isSearching && searchResults.length === 0 && (
            <div className="text-center py-8">
              <Search className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-2" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">No users found</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                Try pasting a wallet address directly
              </p>
            </div>
          )}

          {/* Recent Contacts (when no search) */}
          {!searchQuery && recentContacts.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                Recent Contacts
              </label>
              <div className="space-y-2">
                {recentContacts.map(user =>
                  renderUserItem(user, selectedAddresses.has(user.address))
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!searchQuery && recentContacts.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-2" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Search for users to invite</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                Enter a username or wallet address
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleInvite}
            disabled={selectedAddresses.size === 0 || isInviting}
          >
            {isInviting ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Inviting...
              </>
            ) : (
              <>
                <UserPlus size={16} className="mr-2" />
                Invite {selectedAddresses.size > 0 && `(${selectedAddresses.size})`}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MemberInviteSearch;
