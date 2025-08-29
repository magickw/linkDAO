import React, { useState, useEffect } from 'react';
import { useNavigation } from '@/context/NavigationContext';
import { useWeb3 } from '@/context/Web3Context';

interface FloatingActionDockProps {
  onCreatePost?: () => void;
  className?: string;
}

export default function FloatingActionDock({ onCreatePost, className = '' }: FloatingActionDockProps) {
  const { navigationState } = useNavigation();
  const { isConnected } = useWeb3();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Hide/show FAB based on scroll direction
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down - hide FAB
        setIsVisible(false);
        setIsExpanded(false);
      } else {
        // Scrolling up - show FAB
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Close expanded state when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (isExpanded) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isExpanded]);

  if (!isConnected) {
    return null;
  }

  const actions = [
    {
      id: 'post',
      label: 'Create Post',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      action: onCreatePost,
      color: 'bg-primary-600 hover:bg-primary-700'
    },
    {
      id: 'photo',
      label: 'Add Photo',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      action: () => {
        // Trigger file input or photo capture
        console.log('Photo action');
        setIsExpanded(false);
      },
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      id: 'nft',
      label: 'Share NFT',
      icon: (
        <span className="text-xl">🎨</span>
      ),
      action: () => {
        // Open NFT sharing modal
        console.log('NFT action');
        setIsExpanded(false);
      },
      color: 'bg-purple-600 hover:bg-purple-700'
    }
  ];

  return (
    <div className={`fixed bottom-20 right-4 z-40 md:hidden ${className}`}>
      {/* Action buttons (shown when expanded) */}
      <div className={`flex flex-col space-y-3 mb-3 transition-all duration-300 ${
        isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}>
        {actions.slice(1).map((action, index) => (
          <div
            key={action.id}
            className={`flex items-center transition-all duration-300 ${
              isExpanded ? 'translate-x-0' : 'translate-x-16'
            }`}
            style={{ transitionDelay: `${index * 50}ms` }}
          >
            {/* Action label */}
            <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg mr-3 whitespace-nowrap shadow-lg">
              {action.label}
            </div>
            
            {/* Action button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                action.action?.();
              }}
              className={`w-12 h-12 rounded-full text-white shadow-lg transition-all duration-200 transform hover:scale-110 active:scale-95 ${action.color}`}
            >
              {action.icon}
            </button>
          </div>
        ))}
      </div>

      {/* Main FAB */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (isExpanded) {
            // If expanded, trigger main action (create post)
            actions[0].action?.();
            setIsExpanded(false);
          } else {
            // If not expanded, expand the dock
            setIsExpanded(true);
          }
        }}
        className={`w-14 h-14 rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-lg transition-all duration-300 transform hover:scale-110 active:scale-95 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'
        } ${isExpanded ? 'rotate-45' : 'rotate-0'}`}
        aria-label={isExpanded ? 'Close actions' : 'Open actions'}
      >
        <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Backdrop */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
}