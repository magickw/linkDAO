import React, { useEffect } from 'react';
import { useBreakpoints } from '@/hooks/useMediaQuery';

interface MobileNavigationOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  position?: 'left' | 'right';
  className?: string;
}

/**
 * Mobile navigation overlay component for sidebar content
 */
export default function MobileNavigationOverlay({
  isOpen,
  onClose,
  children,
  title,
  position = 'left',
  className = ''
}: MobileNavigationOverlayProps) {
  const { isMobile } = useBreakpoints();

  // Handle escape key press
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when overlay is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Don't render on desktop
  if (!isMobile) {
    return null;
  }

  if (!isOpen) {
    return null;
  }

  const slideDirection = position === 'left' ? 'translate-x-0' : 'translate-x-0';
  const initialPosition = position === 'left' ? '-translate-x-full' : 'translate-x-full';

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Overlay Panel */}
      <div 
        className={`fixed top-0 ${position === 'left' ? 'left-0' : 'right-0'} h-full w-80 max-w-sm bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? slideDirection : initialPosition
        } ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'overlay-title' : undefined}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          {title && (
            <h2 
              id="overlay-title"
              className="text-lg font-semibold text-gray-900 dark:text-white"
            >
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
            aria-label="Close overlay"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for managing mobile overlay state
 */
export function useMobileOverlay(initialState = false) {
  const [isOpen, setIsOpen] = React.useState(initialState);
  const { isMobile } = useBreakpoints();

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen(prev => !prev);

  // Auto-close when switching to desktop
  React.useEffect(() => {
    if (!isMobile && isOpen) {
      setIsOpen(false);
    }
  }, [isMobile, isOpen]);

  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen
  };
}