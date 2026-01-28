import React, { useEffect, useRef, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  height?: 'auto' | 'half' | 'full';
  className?: string;
  showHandle?: boolean;
  closeOnBackdrop?: boolean;
  closeOnSwipeDown?: boolean;
}

export default function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  height = 'auto',
  className = '',
  showHandle = true,
  closeOnBackdrop = true,
  closeOnSwipeDown = true
}: BottomSheetProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [startY, setStartY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Handle open/close animations
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => {
        setIsVisible(false);
        document.body.style.overflow = '';
      }, 300);
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Touch/drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!closeOnSwipeDown) return;
    
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setDragY(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !closeOnSwipeDown) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;
    
    // Only allow dragging down
    if (deltaY > 0) {
      setDragY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging || !closeOnSwipeDown) return;

    setIsDragging(false);
    
    // Close if dragged down more than 100px
    if (dragY > 100) {
      onClose();
    }
    
    setDragY(0);
  };

  // Mouse handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!closeOnSwipeDown) return;
    
    setIsDragging(true);
    setStartY(e.clientY);
    setDragY(0);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !closeOnSwipeDown) return;

    const deltaY = e.clientY - startY;
    
    if (deltaY > 0) {
      setDragY(deltaY);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging || !closeOnSwipeDown) return;

    setIsDragging(false);
    
    if (dragY > 100) {
      onClose();
    }
    
    setDragY(0);
  };

  // Add mouse move and up listeners when dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragY, startY]);

  const getHeightClass = () => {
    switch (height) {
      case 'full':
        return 'h-full';
      case 'half':
        return 'h-1/2';
      default:
        // On desktop, allow the sheet to be taller to accommodate more content
        return 'max-h-[95vh] md:max-h-[85vh]';
    }
  };

  const getTransform = () => {
    if (isDragging && dragY > 0) {
      return `translateY(${dragY}px)`;
    }
    return isOpen ? 'translateY(0)' : 'translateY(100%)';
  };

  if (!isVisible) {
    return null;
  }

  const content = (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${
          isOpen ? 'opacity-50' : 'opacity-0'
        }`}
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={`relative w-full bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out flex flex-col ${getHeightClass()} ${className}`}
        style={{
          transform: getTransform(),
          willChange: 'transform'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        {/* Handle */}
        {showHandle && (
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full cursor-grab active:cursor-grabbing" />
          </div>
        )}

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className={`flex-1 overflow-y-auto pb-4 ${title ? '' : 'pt-2'}`}>
          {children}
        </div>
      </div>
    </div>
  );

  // Render in portal to ensure proper z-index stacking
  return createPortal(content, document.body);
}