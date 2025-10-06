import React, { useEffect, useRef, ReactNode } from 'react';
import { useAccessibility } from './AccessibilityProvider';

interface FocusManagerProps {
  children: ReactNode;
  autoFocus?: boolean;
  restoreFocus?: boolean;
  trapFocus?: boolean;
  className?: string;
}

export const FocusManager: React.FC<FocusManagerProps> = ({
  children,
  autoFocus = false,
  restoreFocus = false,
  trapFocus = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const { manageFocus } = useAccessibility();

  useEffect(() => {
    if (!containerRef.current) return;

    // Store the previously focused element for restoration
    if (restoreFocus) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    }

    if (autoFocus) {
      const firstFocusable = containerRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      
      if (firstFocusable) {
        manageFocus(firstFocusable);
      }
    }

    // Simple focus trap implementation
    let trapHandler: ((e: KeyboardEvent) => void) | undefined;
    
    if (trapFocus) {
      trapHandler = (e: KeyboardEvent) => {
        if (e.key === 'Tab' && containerRef.current) {
          const focusableElements = containerRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement?.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement?.focus();
            }
          }
        }
      };
      
      document.addEventListener('keydown', trapHandler);
    }

    return () => {
      if (trapHandler) {
        document.removeEventListener('keydown', trapHandler);
      }
      
      if (restoreFocus && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [autoFocus, restoreFocus, trapFocus, manageFocus]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
};