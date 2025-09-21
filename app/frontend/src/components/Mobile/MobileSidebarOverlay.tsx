import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMobileSidebar } from '@/hooks/useMobileSidebar';

interface MobileSidebarOverlayProps {
  children: React.ReactNode;
  side: 'left' | 'right';
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
}

export function MobileSidebarOverlay({
  children,
  side,
  isOpen,
  onClose,
  title,
  className = ''
}: MobileSidebarOverlayProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { focusManagement } = useMobileSidebar();

  // Set up focus trap when sidebar opens
  useEffect(() => {
    if (isOpen && sidebarRef.current) {
      const cleanup = focusManagement.trapFocus(sidebarRef.current);
      return cleanup;
    }
  }, [isOpen, focusManagement]);

  // Animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const sidebarVariants = {
    hidden: {
      x: side === 'left' ? '-100%' : '100%',
      opacity: 0
    },
    visible: {
      x: 0,
      opacity: 1
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={overlayVariants}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sidebar */}
          <motion.div
            ref={sidebarRef}
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={sidebarVariants}
            transition={{ 
              type: 'spring',
              damping: 25,
              stiffness: 200,
              duration: 0.3
            }}
            className={`
              fixed top-0 ${side === 'left' ? 'left-0' : 'right-0'} 
              h-full w-80 max-w-[85vw] 
              bg-white dark:bg-gray-800 
              shadow-xl z-50 
              flex flex-col
              ${className}
            `}
            role="dialog"
            aria-modal="true"
            aria-label={title || `${side} sidebar`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title || `${side.charAt(0).toUpperCase() + side.slice(1)} Menu`}
              </h2>
              
              <div className="flex items-center space-x-2">
                {/* Navigation hint */}
                <div className="hidden sm:flex items-center text-xs text-gray-500 dark:text-gray-400">
                  {side === 'left' ? (
                    <>
                      <ChevronLeft className="w-3 h-3 mr-1" />
                      Swipe or tap to close
                    </>
                  ) : (
                    <>
                      Swipe or tap to close
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </>
                  )}
                </div>

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Close sidebar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="p-4">
                {children}
              </div>
            </div>

            {/* Footer with accessibility info */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Press Escape or tap outside to close
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Specialized components for left and right sidebars
export function LeftSidebarOverlay(props: Omit<MobileSidebarOverlayProps, 'side'>) {
  return <MobileSidebarOverlay {...props} side="left" />;
}

export function RightSidebarOverlay(props: Omit<MobileSidebarOverlayProps, 'side'>) {
  return <MobileSidebarOverlay {...props} side="right" />;
}