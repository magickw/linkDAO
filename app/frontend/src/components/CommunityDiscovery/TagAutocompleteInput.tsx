import React, { useState, useEffect, useRef } from 'react';
import { Hash, X, Plus } from 'lucide-react';

interface Tag {
  id: string;
  label: string;
  count: number;
  trending?: boolean;
  category?: string;
}

interface TagAutocompleteInputProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  allowCustomTags?: boolean;
}

const POPULAR_TAGS: Tag[] = [
  { id: 'defi', label: 'defi', count: 1250, trending: true, category: 'finance' },
  { id: 'nft', label: 'nft', count: 980, trending: true, category: 'collectibles' },
  { id: 'governance', label: 'governance', count: 750, category: 'dao' },
  { id: 'gaming', label: 'gaming', count: 650, trending: true, category: 'entertainment' },
  { id: 'dao', label: 'dao', count: 580, category: 'governance' },
  { id: 'web3', label: 'web3', count: 520, category: 'technology' },
  { id: 'metaverse', label: 'metaverse', count: 480, category: 'virtual' },
  { id: 'trading', label: 'trading', count: 420, category: 'finance' },
  { id: 'staking', label: 'staking', count: 380, category: 'finance' },
  { id: 'yield-farming', label: 'yield-farming', count: 340, category: 'finance' },
  { id: 'layer2', label: 'layer2', count: 320, category: 'technology' },
  { id: 'ethereum', label: 'ethereum', count: 890, category: 'blockchain' },
  { id: 'bitcoin', label: 'bitcoin', count: 780, category: 'blockchain' },
  { id: 'polygon', label: 'polygon', count: 450, category: 'blockchain' },
  { id: 'solana', label: 'solana', count: 420, category: 'blockchain' },
  { id: 'avalanche', label: 'avalanche', count: 380, category: 'blockchain' },
  { id: 'arbitrum', label: 'arbitrum', count: 350, category: 'blockchain' },
  { id: 'optimism', label: 'optimism', count: 320, category: 'blockchain' },
  { id: 'binance', label: 'binance', count: 680, category: 'exchange' },
  { id: 'uniswap', label: 'uniswap', count: 520, category: 'dex' },
  { id: 'aave', label: 'aave', count: 380, category: 'lending' },
  { id: 'compound', label: 'compound', count: 340, category: 'lending' },
  { id: 'opensea', label: 'opensea', count: 450, category: 'marketplace' },
  { id: 'art', label: 'art', count: 380, category: 'creative' },
  { id: 'music', label: 'music', count: 320, category: 'creative' },
  { id: 'photography', label: 'photography', count: 280, category: 'creative' }
];

export const TagAutocompleteInput: React.FC<TagAutocompleteInputProps> = ({
  selectedTags,
  onTagsChange,
  placeholder = "Add tags...",
  maxTags = 10,
  allowCustomTags = true
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input
  useEffect(() => {
    if (inputValue.length > 0) {
      const filtered = POPULAR_TAGS
        .filter(tag => 
          tag.label.toLowerCase().includes(inputValue.toLowerCase()) &&
          !selectedTags.includes(tag.id)
        )
        .sort((a, b) => {
          // Prioritize trending tags and exact matches
          if (a.trending && !b.trending) return -1;
          if (!a.trending && b.trending) return 1;
          if (a.label.toLowerCase().startsWith(inputValue.toLowerCase())) return -1;
          if (b.label.toLowerCase().startsWith(inputValue.toLowerCase())) return 1;
          return b.count - a.count;
        })
        .slice(0, 8);
      
      setSuggestions(filtered);
      setShowSuggestions(true);
      setFocusedIndex(-1);
    } else {
      // Show trending tags when input is empty
      const trending = POPULAR_TAGS
        .filter(tag => tag.trending && !selectedTags.includes(tag.id))
        .slice(0, 6);
      setSuggestions(trending);
      setShowSuggestions(false);
    }
  }, [inputValue, selectedTags]);

  // Handle tag selection
  const selectTag = (tag: Tag | string) => {
    const tagId = typeof tag === 'string' ? tag : tag.id;
    
    if (!selectedTags.includes(tagId) && selectedTags.length < maxTags) {
      onTagsChange([...selectedTags, tagId]);
      setInputValue('');
      setShowSuggestions(false);
      inputRef.current?.focus();
    }
  };

  // Handle tag removal
  const removeTag = (tagId: string) => {
    onTagsChange(selectedTags.filter(id => id !== tagId));
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
        selectTag(suggestions[focusedIndex]);
      } else if (inputValue.trim() && allowCustomTags) {
        selectTag(inputValue.trim().toLowerCase());
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setFocusedIndex(-1);
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    }
  };

  // Get tag display info
  const getTagInfo = (tagId: string): Tag | null => {
    return POPULAR_TAGS.find(tag => tag.id === tagId) || null;
  };

  const formatCount = (count: number): string => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  return (
    <div className="relative">
      {/* Selected Tags and Input */}
      <div className="flex flex-wrap items-center gap-2 p-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
        {/* Selected Tags */}
        {selectedTags.map(tagId => {
          const tagInfo = getTagInfo(tagId);
          return (
            <span
              key={tagId}
              className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              <Hash className="w-3 h-3 mr-1" />
              {tagInfo?.label || tagId}
              <button
                onClick={() => removeTag(tagId)}
                className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
        
        {/* Input */}
        {selectedTags.length < maxTags && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            placeholder={selectedTags.length === 0 ? placeholder : ""}
            className="flex-1 min-w-0 outline-none bg-transparent"
          />
        )}
      </div>

      {/* Suggestions Dropdown */}
      {(showSuggestions || inputValue.length > 0) && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto"
        >
          {inputValue.length === 0 && (
            <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
              Trending Tags
            </div>
          )}
          
          {suggestions.map((tag, index) => (
            <button
              key={tag.id}
              onClick={() => selectTag(tag)}
              className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between transition-colors ${
                index === focusedIndex ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center space-x-2">
                <Hash className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-900">{tag.label}</span>
                {tag.trending && (
                  <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
                    Trending
                  </span>
                )}
              </div>
              <span className="text-sm text-gray-500">
                {formatCount(tag.count)}
              </span>
            </button>
          ))}
          
          {/* Custom tag option */}
          {allowCustomTags && inputValue.trim() && 
           !suggestions.some(tag => tag.label.toLowerCase() === inputValue.toLowerCase()) && (
            <button
              onClick={() => selectTag(inputValue.trim().toLowerCase())}
              className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 border-t border-gray-100 transition-colors ${
                focusedIndex === suggestions.length ? 'bg-blue-50' : ''
              }`}
            >
              <Plus className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">
                Create "<span className="font-medium">#{inputValue.trim()}</span>"
              </span>
            </button>
          )}
        </div>
      )}

      {/* Tag limit indicator */}
      {selectedTags.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          {selectedTags.length}/{maxTags} tags selected
        </div>
      )}
    </div>
  );
};

export default TagAutocompleteInput;