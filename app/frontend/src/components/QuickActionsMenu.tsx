import React from 'react';

interface QuickActionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
  postId: string;
}

export default function QuickActionsMenu({ 
  isOpen, 
  onClose, 
  onAction,
  postId
}: QuickActionsMenuProps) {
  if (!isOpen) return null;

  const actions = [
    { id: 'hot', emoji: '🔥', label: 'Hot Take (1 $LDAO)' },
    { id: 'diamond', emoji: '💎', label: 'Diamond Hands (1 $LDAO)' },
    { id: 'bullish', emoji: '🚀', label: 'Bullish (1 $LDAO)' },
    { id: 'governance', emoji: '⚖️', label: 'Governance (1 $LDAO)' },
    { id: 'art', emoji: '🎨', label: 'Art Appreciation (1 $LDAO)' },
    { id: 'tip', emoji: '💸', label: 'Quick Tip (1 USDC)' },
    { id: 'share', emoji: '📤', label: 'Share Post' },
    { id: 'save', emoji: '💾', label: 'Save Post' },
  ];

  const handleAction = (actionId: string) => {
    onAction(actionId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Menu */}
      <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden transform transition-transform duration-300 ease-out">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
        </div>
        
        <div className="p-2 max-h-[60vh] overflow-y-auto">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              className="flex items-center w-full p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 touch-target"
            >
              <span className="text-2xl mr-4">{action.emoji}</span>
              <span className="text-gray-900 dark:text-white">{action.label}</span>
            </button>
          ))}
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors duration-150 touch-target"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}