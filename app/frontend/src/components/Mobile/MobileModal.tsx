import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useMobileAccessibility } from '@/hooks/useMobileAccessibility';

interface MobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  position?: 'center' | 'bottom' | 'top';
  allowSwipeClose?: boolean;
  allowBackdropClose?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

export const MobileModal: React.FC<MobileModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  position = 'bottom',
  allowSwipeClose = true,
  allowBackdropClose = true,
  showCloseButton = true,
  className = ''
}) => {
  const {
    triggerHapticFeedback,
    safeAreaInsets,
    createSwipeHandler,
    mobileOptimizedClasses,
    touchTargetClasses
  } = useMobileOptimization();

  const {
    manageFocus,
    announceToScreenReader,
    accessibilityClasses
  } = useMobileAccessibility();

  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setTimeout(() => {
        if (modalRef.current) {
          manageFocus(modalRef.current);
        }
      }, 100);
      announceToScreenReader(`Modal opened: ${title || 'Dialog'}`);
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [isOpen, title, manageFocus, announceToScreenReader]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '0px'; // Prevent layout shift
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  const handleSwipeClose = createSwipeHandler({
    onSwipeDown: (info: PanInfo) => {
      if (allowSwipeClose && (info.velocity.y > 500 || info.offset.y > 100)) {
        triggerHapticFeedback('light');
        onClose();
      }
    },
    onSwipeUp: (info: PanInfo) => {
      if (allowSwipeClose && position === 'top' && (info.velocity.y < -500 || info.offset.y < -100)) {
        triggerHapticFeedback('light');
        onClose();
      }
    }
  });

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (allowBackdropClose && e.target === e.currentTarget) {
      triggerHapticFeedback('light');
      onClose();
    }
  };

  const handleClose = () => {
    triggerHapticFeedback('light');
    onClose();
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'max-w-sm';
      case 'md': return 'max-w-md';
      case 'lg': return 'max-w-lg';
      case 'xl': return 'max-w-xl';
      case 'full': return 'w-full h-full';
      default: return 'max-w-md';
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'center': return 'items-center justify-center p-4';
      case 'bottom': return 'items-end justify-center';
      case 'top': return 'items-start justify-center';
      default: return 'items-end justify-center';
    }
  };

  const getAnimationProps = () => {
    switch (position) {
      case 'center':
        return {
          initial: { scale: 0.8, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          exit: { scale: 0.8, opacity: 0 }
        };
      case 'bottom':
        return {
          initial: { y: '100%' },
          animate: { y: 0 },
          exit: { y: '100%' }
        };
      case 'top':
        return {
          initial: { y: '-100%' },
          animate: { y: 0 },
          exit: { y: '-100%' }
        };
      default:
        return {
          initial: { y: '100%' },
          animate: { y: 0 },
          exit: { y: '100%' }
        };
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`
          fixed inset-0 z-50 flex ${getPositionClasses()}
          bg-black/50 backdrop-blur-sm
        `}
        onClick={handleBackdropClick}
      >
        <motion.div
          ref={modalRef}
          {...getAnimationProps()}
          transition={{ type: 'spring' as any, damping: 25, stiffness: 300 }}
          className={`
            relative bg-white dark:bg-gray-900 shadow-2xl
            ${position === 'center' ? 'rounded-2xl' : ''}
            ${position === 'bottom' ? 'rounded-t-3xl w-full' : ''}
            ${position === 'top' ? 'rounded-b-3xl w-full' : ''}
            ${getSizeClasses()}
            ${size === 'full' ? '' : 'max-h-[90vh]'}
            ${mobileOptimizedClasses}
            ${className}
          `}
          style={{
            paddingTop: position === 'top' ? safeAreaInsets.top : 0,
            paddingBottom: position === 'bottom' ? safeAreaInsets.bottom : 0,
          }}
          {...(allowSwipeClose ? handleSwipeClose : {})}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
        >
          {/* Drag Handle (for bottom/top modals) */}
          {(position === 'bottom' || position === 'top') && allowSwipeClose && (
            <div className="flex justify-center py-3">
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>
          )}

          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              {title && (
                <h2 
                  id="modal-title"
                  className="text-lg font-semibold text-gray-900 dark:text-white"
                >
                  {title}
                </h2>
              )}
              
              {showCloseButton && (
                <button
                  onClick={handleClose}
                  className={`
                    p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                    rounded-full hover:bg-gray-100 dark:hover:bg-gray-800
                    ${touchTargetClasses} ${accessibilityClasses}
                  `}
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className={`
            ${size === 'full' ? 'flex-1' : ''} 
            ${title || showCloseButton ? '' : 'pt-4'}
            overflow-y-auto
          `}>
            {children}
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
  
  return createPortal(modalContent, document.body);
};

// Specialized modal variants
export const MobileBottomSheet: React.FC<Omit<MobileModalProps, 'position'>> = (props) => (
  <MobileModal {...props} position="bottom" />
);

export const MobileFullScreenModal: React.FC<Omit<MobileModalProps, 'size' | 'position'>> = (props) => (
  <MobileModal {...props} size="full" position="center" allowSwipeClose={false} />
);

export const MobileCenterModal: React.FC<Omit<MobileModalProps, 'position'>> = (props) => (
  <MobileModal {...props} position="center" />
);