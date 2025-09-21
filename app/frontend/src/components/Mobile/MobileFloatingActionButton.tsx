import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useMobileAccessibility } from '@/hooks/useMobileAccessibility';

interface FloatingAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

interface MobileFloatingActionButtonProps {
  primaryAction: FloatingAction;
  secondaryActions?: FloatingAction[];
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  className?: string;
}

export const MobileFloatingActionButton: React.FC<MobileFloatingActionButtonProps> = ({
  primaryAction,
  secondaryActions = [],
  position = 'bottom-right',
  className = ''
}) => {
  const {
    triggerHapticFeedback,
    safeAreaInsets,
    touchTargetClasses,
    mobileOptimizedClasses
  } = useMobileOptimization();

  const {
    announceToScreenReader,
    accessibilityClasses
  } = useMobileAccessibility();

  const [isExpanded, setIsExpanded] = useState(false);

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-left':
        return 'bottom-6 left-6';
      case 'bottom-center':
        return 'bottom-6 left-1/2 transform -translate-x-1/2';
      case 'bottom-right':
      default:
        return 'bottom-6 right-6';
    }
  };

  const handlePrimaryAction = () => {
    if (secondaryActions.length > 0) {
      setIsExpanded(!isExpanded);
      triggerHapticFeedback('light');
      announceToScreenReader(isExpanded ? 'Collapsed action menu' : 'Expanded action menu');
    } else {
      triggerHapticFeedback('medium');
      primaryAction.onClick();
      announceToScreenReader(`${primaryAction.label} activated`);
    }
  };

  const handleSecondaryAction = (action: FloatingAction) => {
    triggerHapticFeedback('medium');
    action.onClick();
    setIsExpanded(false);
    announceToScreenReader(`${action.label} activated`);
  };

  const handleBackdropClick = () => {
    if (isExpanded) {
      setIsExpanded(false);
      triggerHapticFeedback('light');
    }
  };

  return (
    <>
      {/* Backdrop for expanded state */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={handleBackdropClick}
          />
        )}
      </AnimatePresence>

      {/* FAB Container */}
      <div
        className={`
          fixed z-50 ${getPositionClasses()} ${className}
        `}
        style={{
          bottom: position.includes('bottom') ? safeAreaInsets.bottom + 24 : undefined,
        }}
      >
        {/* Secondary Actions */}
        <AnimatePresence>
          {isExpanded && secondaryActions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute bottom-16 right-0 space-y-3"
            >
              {secondaryActions.map((action, index) => (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center space-x-3"
                >
                  {/* Action Label */}
                  <div className="bg-black/80 text-white px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap">
                    {action.label}
                  </div>

                  {/* Action Button */}
                  <motion.button
                    onClick={() => handleSecondaryAction(action)}
                    className={`
                      w-12 h-12 rounded-full shadow-lg flex items-center justify-center
                      ${touchTargetClasses} ${accessibilityClasses} ${mobileOptimizedClasses}
                    `}
                    style={{ backgroundColor: action.color }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={action.label}
                  >
                    {action.icon}
                  </motion.button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Primary FAB */}
        <motion.button
          onClick={handlePrimaryAction}
          className={`
            w-14 h-14 rounded-full shadow-lg flex items-center justify-center
            ${touchTargetClasses} ${accessibilityClasses} ${mobileOptimizedClasses}
          `}
          style={{ backgroundColor: primaryAction.color }}
          whileTap={{ scale: 0.95 }}
          animate={{ rotate: isExpanded ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          aria-label={
            secondaryActions.length > 0
              ? `${primaryAction.label}. ${isExpanded ? 'Collapse' : 'Expand'} menu`
              : primaryAction.label
          }
          aria-expanded={secondaryActions.length > 0 ? isExpanded : undefined}
        >
          {secondaryActions.length > 0 ? (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          ) : (
            primaryAction.icon
          )}
        </motion.button>

        {/* Ripple Effect */}
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ backgroundColor: primaryAction.color }}
          initial={{ scale: 1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0 }}
          whileTap={{ scale: 1.2, opacity: 0.3 }}
          transition={{ duration: 0.2 }}
        />
      </div>
    </>
  );
};

// Predefined FAB configurations
export const CreatePostFAB: React.FC<{
  onCreatePost: () => void;
  onCreatePoll?: () => void;
  onCreateProposal?: () => void;
  onUploadMedia?: () => void;
}> = ({ onCreatePost, onCreatePoll, onCreateProposal, onUploadMedia }) => {
  const secondaryActions: FloatingAction[] = [];

  if (onCreatePoll) {
    secondaryActions.push({
      id: 'poll',
      label: 'Create Poll',
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: '#10b981',
      onClick: onCreatePoll
    });
  }

  if (onCreateProposal) {
    secondaryActions.push({
      id: 'proposal',
      label: 'Create Proposal',
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: '#8b5cf6',
      onClick: onCreateProposal
    });
  }

  if (onUploadMedia) {
    secondaryActions.push({
      id: 'media',
      label: 'Upload Media',
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: '#f59e0b',
      onClick: onUploadMedia
    });
  }

  return (
    <MobileFloatingActionButton
      primaryAction={{
        id: 'create',
        label: 'Create Post',
        icon: (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        ),
        color: '#3b82f6',
        onClick: onCreatePost
      }}
      secondaryActions={secondaryActions}
    />
  );
};