import { useEffect, useCallback, useState } from 'react';

export interface KeyboardShortcut {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    description: string;
    action: () => void;
    category?: string;
}

interface UseKeyboardShortcutsOptions {
    shortcuts: KeyboardShortcut[];
    enabled?: boolean;
}

export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
    const [showHelp, setShowHelp] = useState(false);

    const handleKeyPress = useCallback(
        (event: KeyboardEvent) => {
            if (!enabled) return;

            // Check for help shortcut (?)
            if (event.key === '?' && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                event.preventDefault();
                setShowHelp(true);
                return;
            }

            // Find matching shortcut
            const shortcut = shortcuts.find(
                (s) =>
                    s.key.toLowerCase() === event.key.toLowerCase() &&
                    !!s.ctrl === event.ctrlKey &&
                    !!s.shift === event.shiftKey &&
                    !!s.alt === event.altKey
            );

            if (shortcut) {
                event.preventDefault();
                shortcut.action();
            }
        },
        [shortcuts, enabled]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [handleKeyPress]);

    return { showHelp, setShowHelp };
}

// Keyboard Shortcuts Help Modal Component
interface KeyboardShortcutsHelpProps {
    shortcuts: KeyboardShortcut[];
    isOpen: boolean;
    onClose: () => void;
}

export function KeyboardShortcutsHelp({ shortcuts, isOpen, onClose }: KeyboardShortcutsHelpProps) {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Group shortcuts by category
    const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
        const category = shortcut.category || 'General';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(shortcut);
        return acc;
    }, {} as Record<string, KeyboardShortcut[]>);

    const formatShortcut = (shortcut: KeyboardShortcut) => {
        const parts = [];
        if (shortcut.ctrl) parts.push('Ctrl');
        if (shortcut.shift) parts.push('Shift');
        if (shortcut.alt) parts.push('Alt');
        parts.push(shortcut.key.toUpperCase());
        return parts.join(' + ');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">Keyboard Shortcuts</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <span className="text-2xl">&times;</span>
                    </button>
                </div>

                <div className="space-y-6">
                    {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                        <div key={category}>
                            <h3 className="text-lg font-semibold text-gray-300 mb-3">{category}</h3>
                            <div className="space-y-2">
                                {categoryShortcuts.map((shortcut, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                                    >
                                        <span className="text-gray-300">{shortcut.description}</span>
                                        <kbd className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white font-mono text-sm">
                                            {formatShortcut(shortcut)}
                                        </kbd>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-700">
                    <p className="text-gray-400 text-sm text-center">
                        Press <kbd className="px-2 py-1 bg-gray-700 rounded text-white font-mono text-xs">?</kbd> anytime to show this help
                    </p>
                </div>
            </div>
        </div>
    );
}

// Command Palette Component
interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    commands: Array<{
        id: string;
        label: string;
        description?: string;
        action: () => void;
        icon?: React.ReactNode;
        category?: string;
    }>;
}

export function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);

    const filteredCommands = commands.filter(
        (cmd) =>
            cmd.label.toLowerCase().includes(search.toLowerCase()) ||
            cmd.description?.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            switch (e.key) {
                case 'Escape':
                    onClose();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex((prev) => Math.max(prev - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (filteredCommands[selectedIndex]) {
                        filteredCommands[selectedIndex].action();
                        onClose();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, filteredCommands, onClose]);

    useEffect(() => {
        if (isOpen) {
            setSearch('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl mx-4 shadow-2xl">
                {/* Search Input */}
                <div className="p-4 border-b border-gray-700">
                    <input
                        type="text"
                        placeholder="Type a command or search..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setSelectedIndex(0);
                        }}
                        className="w-full bg-transparent text-white text-lg placeholder-gray-400 focus:outline-none"
                        autoFocus
                    />
                </div>

                {/* Commands List */}
                <div className="max-h-96 overflow-y-auto">
                    {filteredCommands.length > 0 ? (
                        filteredCommands.map((cmd, index) => (
                            <button
                                key={cmd.id}
                                onClick={() => {
                                    cmd.action();
                                    onClose();
                                }}
                                className={`w-full text-left p-4 flex items-center gap-3 transition-colors ${index === selectedIndex
                                        ? 'bg-blue-900/30 border-l-2 border-blue-500'
                                        : 'hover:bg-gray-800'
                                    }`}
                            >
                                {cmd.icon && <div className="text-gray-400">{cmd.icon}</div>}
                                <div className="flex-1">
                                    <div className="text-white font-medium">{cmd.label}</div>
                                    {cmd.description && (
                                        <div className="text-gray-400 text-sm">{cmd.description}</div>
                                    )}
                                </div>
                                {cmd.category && (
                                    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                                        {cmd.category}
                                    </span>
                                )}
                            </button>
                        ))
                    ) : (
                        <div className="p-8 text-center text-gray-400">
                            No commands found for "{search}"
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-gray-700 flex items-center justify-between text-xs text-gray-400">
                    <div className="flex gap-4">
                        <span>
                            <kbd className="px-2 py-1 bg-gray-800 rounded">↑↓</kbd> Navigate
                        </span>
                        <span>
                            <kbd className="px-2 py-1 bg-gray-800 rounded">Enter</kbd> Select
                        </span>
                        <span>
                            <kbd className="px-2 py-1 bg-gray-800 rounded">Esc</kbd> Close
                        </span>
                    </div>
                    <span>{filteredCommands.length} commands</span>
                </div>
            </div>
        </div>
    );
}
