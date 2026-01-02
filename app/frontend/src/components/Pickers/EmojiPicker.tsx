import React, { useState } from 'react';

// Web3 & Crypto Themed Emoji Categories
const EMOJI_CATEGORIES = [
    {
        id: 'crypto',
        name: 'Web3 & Crypto',
        icon: '₿',
        emojis: [
            '₿', 'Ξ', '💎', '🚀', '🌙', '⚡', '🔥', '💰', '💸', '🪙',
            '🔐', '🔓', '🔑', '🔗', '✨', '⭐', '🌟', '💫', '💪', '👑',
            '🏆', '🧠', '🤖', '👾'
        ]
    },
    {
        id: 'trading',
        name: 'Market',
        icon: '📈',
        emojis: [
            '📊', '📈', '📉', '💹', '💲', '💵', '💴', '💶', '💷', '🏦',
            '🏧', '💳', '⚙️', '🔧', '🔨', '🛠️', '⛏️', '🎲', '🎰', '🃏',
            '🥇', '🥈', '🥉'
        ]
    },
    {
        id: 'defi',
        name: 'DeFi & NFT',
        icon: '🎨',
        emojis: [
            '🎨', '🖼️', '🖌️', '🎭', '🎯', '🎴', '💍', '📿', '💠', '🔷',
            '🔶', '🔸', '🔹', '🔺', '🔻', '💥', '🌈'
        ]
    },
    {
        id: 'community',
        name: 'DAO',
        icon: '🤝',
        emojis: [
            '🤝', '🙌', '👏', '👍', '✊', '👥', '👤', '🫱', '🫲', '🦾',
            '🗣️', '👂', '👃'
        ]
    },
    {
        id: 'reactions',
        name: 'Reactions',
        icon: '😀',
        emojis: [
            '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🔥', '❤️',
            '💯', '🙏', '👀', '🤔', '😎', '😢', '😍', '🥰', '😡', '🤯'
        ]
    }
];

interface EmojiPickerProps {
    onSelect: (emoji: string) => void;
    onClose: () => void;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, onClose }) => {
    const [activeCategory, setActiveCategory] = useState('crypto');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCategories = searchQuery
        ? EMOJI_CATEGORIES.map(cat => ({
            ...cat,
            emojis: cat.emojis.filter(e => true) // Simple filter, requires emoji keywords map for real search
        })).filter(cat => cat.emojis.length > 0)
        : EMOJI_CATEGORIES;

    // In a real implementation, we'd map emojis to keywords for search.
    // For now, search is disabled/hidden or basic.

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 w-80 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                <input
                    type="text"
                    placeholder="Search emojis..."
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Category Tabs */}
            <div className="flex overflow-x-auto p-2 gap-1 border-b border-gray-100 dark:border-gray-700 no-scrollbar">
                {EMOJI_CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`p-2 rounded-lg text-lg transition-colors whitespace-nowrap ${activeCategory === cat.id
                                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                        title={cat.name}
                    >
                        {cat.icon}
                    </button>
                ))}
            </div>

            {/* Emoji Grid */}
            <div className="h-64 overflow-y-auto p-3 overscroll-contain">
                {activeCategory && (
                    <div className="grid grid-cols-6 gap-2">
                        {EMOJI_CATEGORIES.find(c => c.id === activeCategory)?.emojis.map((emoji, index) => (
                            <button
                                key={index}
                                onClick={() => onSelect(emoji)}
                                className="w-10 h-10 flex items-center justify-center text-xl rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
