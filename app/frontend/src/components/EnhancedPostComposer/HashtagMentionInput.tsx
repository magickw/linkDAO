import React, { useState, useRef, useEffect, useCallback } from 'react';
import { HashtagSuggestion, MentionSuggestion, AutoCompleteConfig } from '../../types/enhancedPost';

interface HashtagMentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onHashtagsChange: (hashtags: string[]) => void;
  onMentionsChange: (mentions: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  config?: Partial<AutoCompleteConfig>;
  className?: string;
}

const DEFAULT_CONFIG: AutoCompleteConfig = {
  hashtags: {
    enabled: true,
    minChars: 1,
    maxSuggestions: 10,
    showTrending: true
  },
  mentions: {
    enabled: true,
    minChars: 2,
    maxSuggestions: 8,
    showMutualConnections: true
  }
};

// Mock data - in real app, these would come from API
const MOCK_HASHTAG_SUGGESTIONS: HashtagSuggestion[] = [
  { tag: 'web3', count: 1250, trending: true, category: 'technology' },
  { tag: 'defi', count: 890, trending: true, category: 'finance' },
  { tag: 'nft', count: 2100, trending: false, category: 'art' },
  { tag: 'dao', count: 450, trending: true, category: 'governance' },
  { tag: 'ethereum', count: 3200, trending: false, category: 'blockchain' },
  { tag: 'bitcoin', count: 2800, trending: false, category: 'blockchain' },
  { tag: 'crypto', count: 1800, trending: true, category: 'finance' },
  { tag: 'blockchain', count: 1600, trending: false, category: 'technology' }
];

const MOCK_MENTION_SUGGESTIONS: MentionSuggestion[] = [
  {
    address: '0x1234567890123456789012345678901234567890',
    username: 'vitalik',
    displayName: 'Vitalik Buterin',
    avatar: 'https://avatars.githubusercontent.com/u/2230894?v=4',
    reputation: 9500,
    verified: true,
    mutualConnections: 12
  },
  {
    address: '0x0987654321098765432109876543210987654321',
    username: 'alice_dev',
    displayName: 'Alice Developer',
    reputation: 7200,
    verified: false,
    mutualConnections: 5
  },
  {
    address: '0x1111222233334444555566667777888899990000',
    username: 'bob_trader',
    displayName: 'Bob the Trader',
    reputation: 6800,
    verified: true,
    mutualConnections: 8
  }
];

export default function HashtagMentionInput({
  value,
  onChange,
  onHashtagsChange,
  onMentionsChange,
  placeholder = "What's happening in Web3?",
  disabled = false,
  config = {},
  className = ''
}: HashtagMentionInputProps) {
  const [suggestions, setSuggestions] = useState<(HashtagSuggestion | MentionSuggestion)[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentQuery, setCurrentQuery] = useState('');
  const [queryType, setQueryType] = useState<'hashtag' | 'mention' | null>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Extract hashtags and mentions from text
  const extractHashtagsAndMentions = useCallback((text: string) => {
    const hashtagRegex = /#(\w+)/g;
    const mentionRegex = /@(\w+)/g;
    
    const hashtags = Array.from(text.matchAll(hashtagRegex), m => m[1]);
    const mentions = Array.from(text.matchAll(mentionRegex), m => m[1]);
    
    onHashtagsChange(hashtags);
    onMentionsChange(mentions);
  }, [onHashtagsChange, onMentionsChange]);

  // Handle text change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursor = e.target.selectionStart;
    
    onChange(newValue);
    setCursorPosition(cursor);
    extractHashtagsAndMentions(newValue);
    
    // Check for hashtag or mention trigger
    const textBeforeCursor = newValue.slice(0, cursor);
    const lastHashtag = textBeforeCursor.lastIndexOf('#');
    const lastMention = textBeforeCursor.lastIndexOf('@');
    const lastSpace = Math.max(textBeforeCursor.lastIndexOf(' '), textBeforeCursor.lastIndexOf('\n'));
    
    if (lastHashtag > lastSpace && finalConfig.hashtags.enabled) {
      const query = textBeforeCursor.slice(lastHashtag + 1);
      if (query.length >= finalConfig.hashtags.minChars) {
        setQueryType('hashtag');
        setCurrentQuery(query);
        searchHashtags(query);
      } else {
        setShowSuggestions(false);
      }
    } else if (lastMention > lastSpace && finalConfig.mentions.enabled) {
      const query = textBeforeCursor.slice(lastMention + 1);
      if (query.length >= finalConfig.mentions.minChars) {
        setQueryType('mention');
        setCurrentQuery(query);
        searchMentions(query);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  }, [onChange, extractHashtagsAndMentions, finalConfig]);

  // Search hashtags
  const searchHashtags = useCallback((query: string) => {
    const filtered = MOCK_HASHTAG_SUGGESTIONS
      .filter(tag => tag.tag.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => {
        // Sort by trending first, then by count
        if (a.trending && !b.trending) return -1;
        if (!a.trending && b.trending) return 1;
        return b.count - a.count;
      })
      .slice(0, finalConfig.hashtags.maxSuggestions);
    
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setSelectedIndex(0);
  }, [finalConfig.hashtags.maxSuggestions]);

  // Search mentions
  const searchMentions = useCallback((query: string) => {
    const filtered = MOCK_MENTION_SUGGESTIONS
      .filter(user => 
        user.username?.toLowerCase().includes(query.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(query.toLowerCase())
      )
      .sort((a, b) => {
        // Sort by verified first, then by reputation
        if (a.verified && !b.verified) return -1;
        if (!a.verified && b.verified) return 1;
        return (b.reputation || 0) - (a.reputation || 0);
      })
      .slice(0, finalConfig.mentions.maxSuggestions);
    
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setSelectedIndex(0);
  }, [finalConfig.mentions.maxSuggestions]);

  // Handle suggestion selection
  const selectSuggestion = useCallback((index: number) => {
    const suggestion = suggestions[index];
    if (!suggestion || !textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const text = textarea.value;
    const cursor = cursorPosition;
    
    let replacement = '';
    let searchStart = 0;
    
    if (queryType === 'hashtag' && 'tag' in suggestion) {
      searchStart = text.lastIndexOf('#', cursor - 1);
      replacement = `#${suggestion.tag} `;
    } else if (queryType === 'mention' && 'username' in suggestion) {
      searchStart = text.lastIndexOf('@', cursor - 1);
      replacement = `@${suggestion.username} `;
    }
    
    const newText = text.slice(0, searchStart) + replacement + text.slice(cursor);
    const newCursor = searchStart + replacement.length;
    
    onChange(newText);
    setShowSuggestions(false);
    
    // Set cursor position after update
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursor, newCursor);
    }, 0);
  }, [suggestions, cursorPosition, queryType, onChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        selectSuggestion(selectedIndex);
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  }, [showSuggestions, suggestions.length, selectedIndex, selectSuggestion]);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // Format hashtag suggestion
  const renderHashtagSuggestion = (suggestion: HashtagSuggestion, index: number) => (
    <div
      key={`hashtag-${suggestion.tag}`}
      className={`px-4 py-2 cursor-pointer flex items-center justify-between ${
        index === selectedIndex ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
      }`}
      onClick={() => selectSuggestion(index)}
    >
      <div className="flex items-center space-x-3">
        <span className="text-primary-600 dark:text-primary-400 font-medium">
          #{suggestion.tag}
        </span>
        {suggestion.trending && (
          <span className="text-xs bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-1 rounded-full">
            🔥 Trending
          </span>
        )}
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {suggestion.count.toLocaleString()} posts
      </span>
    </div>
  );

  // Format mention suggestion
  const renderMentionSuggestion = (suggestion: MentionSuggestion, index: number) => (
    <div
      key={`mention-${suggestion.address}`}
      className={`px-4 py-2 cursor-pointer flex items-center space-x-3 ${
        index === selectedIndex ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
      }`}
      onClick={() => selectSuggestion(index)}
    >
      <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center">
        {suggestion.avatar ? (
          <img src={suggestion.avatar} alt={suggestion.displayName} className="w-8 h-8 rounded-full" />
        ) : (
          <span className="text-white text-sm font-bold">
            {suggestion.displayName?.charAt(0) || suggestion.username?.charAt(0) || '?'}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-gray-900 dark:text-white truncate">
            {suggestion.displayName || suggestion.username}
          </span>
          {suggestion.verified && (
            <span className="text-blue-500">✓</span>
          )}
        </div>
        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
          <span>@{suggestion.username}</span>
          {suggestion.reputation && (
            <span>• {suggestion.reputation} rep</span>
          )}
          {suggestion.mutualConnections && finalConfig.mentions.showMutualConnections && (
            <span>• {suggestion.mutualConnections} mutual</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white resize-none overflow-hidden transition-colors duration-200 text-base"
        style={{ minHeight: '120px' }}
        rows={4}
      />
      
      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => {
            if ('tag' in suggestion) {
              return renderHashtagSuggestion(suggestion, index);
            } else {
              return renderMentionSuggestion(suggestion, index);
            }
          })}
        </div>
      )}
      
      {/* Helper Text */}
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-4">
          {finalConfig.hashtags.enabled && (
            <span>Use # for hashtags</span>
          )}
          {finalConfig.mentions.enabled && (
            <span>Use @ for mentions</span>
          )}
        </div>
        <span>{value.length} characters</span>
      </div>
    </div>
  );
}