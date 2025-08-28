import React, { useState, useEffect, useRef } from 'react';
import { useWeb3 } from '@/context/Web3Context';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const { isConnected } = useWeb3();

  // Handle drag to close
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStartY(clientY);
    setCurrentY(0);
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - dragStartY;
    
    if (deltaY > 0) {
      setCurrentY(deltaY);
    }
  };

  const handleDragEnd = () => {
    if (isDragging) {
      if (currentY > 100) {
        // Close sheet if dragged down enough
        onClose();
      } else {
        // Snap back to position
        setCurrentY(0);
      }
      setIsDragging(false);
    }
  };

  // Close sheet when clicking outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when sheet is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 transition-opacity"></div>
      
      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`relative w-full max-w-md bg-white dark:bg-gray-800 rounded-t-2xl shadow-xl transition-transform duration-300 ease-out ${
          isDragging ? 'transition-none' : ''
        }`}
        style={{
          transform: `translateY(${currentY}px)`,
          maxHeight: '90vh'
        }}
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
        </div>
        
        {/* Header */}
        {title && (
          <div className="px-4 pb-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white text-center">
              {title}
            </h2>
          </div>
        )}
        
        {/* Content */}
        <div className="overflow-y-auto max-h-[70vh]">
          {children}
        </div>
      </div>
    </div>
  );
}

// Wallet Actions Component
interface WalletActionsProps {
  onAction: (action: string) => void;
}

export function WalletActions({ onAction }: WalletActionsProps) {
  const { isConnected, address, balance, connectWallet, disconnectWallet } = useWeb3();
  
  const actions = [
    { id: 'send', icon: '📤', label: 'Send', description: 'Send tokens to another wallet' },
    { id: 'receive', icon: '📥', label: 'Receive', description: 'Receive tokens to your wallet' },
    { id: 'swap', icon: '🔄', label: 'Swap', description: 'Exchange tokens' },
    { id: 'bridge', icon: '🌉', label: 'Bridge', description: 'Transfer tokens between chains' },
    { id: 'stake', icon: '🔒', label: 'Stake', description: 'Stake tokens for rewards' },
    { id: 'history', icon: '📜', label: 'History', description: 'View transaction history' },
  ];

  return (
    <div className="p-4">
      {!isConnected ? (
        <div className="text-center py-8">
          <div className="mx-auto bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Connect Wallet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Connect your wallet to access all features
          </p>
          <button
            onClick={() => connectWallet()}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <>
          {/* Wallet Info */}
          <div className="bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl p-4 text-white mb-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-80">Total Balance</p>
                <p className="text-2xl font-bold mt-1">{parseFloat(balance).toFixed(4)} ETH</p>
                <p className="text-sm opacity-80 mt-1">$2,450.75 USD</p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-80">Wallet</p>
                <p className="text-sm font-medium mt-1">
                  {address?.substring(0, 6)}...{address?.substring(38)}
                </p>
              </div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <button 
              onClick={() => onAction('buy')}
              className="flex flex-col items-center justify-center p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="text-2xl mb-1">+</div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Buy</span>
            </button>
            <button 
              onClick={() => onAction('send')}
              className="flex flex-col items-center justify-center p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="text-2xl mb-1">📤</div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Send</span>
            </button>
            <button 
              onClick={() => onAction('swap')}
              className="flex flex-col items-center justify-center p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="text-2xl mb-1">🔄</div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Swap</span>
            </button>
          </div>
          
          {/* Action List */}
          <div className="space-y-2">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => onAction(action.id)}
                className="w-full flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="text-2xl mr-3">{action.icon}</div>
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-white">{action.label}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{action.description}</p>
                </div>
                <div className="ml-auto">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
          
          {/* Disconnect Button */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => disconnectWallet()}
              className="w-full flex items-center justify-center p-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Disconnect Wallet
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Post Creation Actions Component
interface PostActionsProps {
  onAction: (action: string) => void;
}

export function PostActions({ onAction }: PostActionsProps) {
  const postTypes = [
    { id: 'standard', icon: '📝', label: 'Standard Post', description: 'Share your thoughts' },
    { id: 'proposal', icon: '🏛️', label: 'Governance Proposal', description: 'Create a DAO proposal' },
    { id: 'defi', icon: '💱', label: 'DeFi Analysis', description: 'Share DeFi strategies' },
    { id: 'nft', icon: '🎨', label: 'NFT Showcase', description: 'Showcase your NFTs' },
    { id: 'question', icon: '❓', label: 'Ask Question', description: 'Get help from the community' },
  ];

  return (
    <div className="p-4">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Create Post</h3>
      
      <div className="space-y-3">
        {postTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => onAction(type.id)}
            className="w-full flex items-center p-4 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <div className="text-2xl mr-4">{type.icon}</div>
            <div className="text-left">
              <p className="font-medium text-gray-900 dark:text-white">{type.label}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{type.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}