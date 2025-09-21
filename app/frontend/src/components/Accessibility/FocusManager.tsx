import React, { useEffect, useRef, ReactNode } from 'react';
import { useAccessibilityContext } from './AccessibilityProvider';

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
  const { manageFocus, trapFocus: trapFocusUtil, restoreFocus: restoreFocusUtil } = useAccessibilityContext();

  useEffect(() => {
    if (!containerRef.current) return;

    let cleanup: (() => void) | undefined;

    if (autoFocus) {
      const firstFocusable = containerRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      
      if (firstFocusable) {
        manageFocus(firstFocusable);
      }
    }

    if (trapFocus) {
      cleanup = trapFocusUtil(containerRef.current);
    }

    return () => {
      if (cleanup) cleanup();
      if (restoreFocus) {
        restoreFocusUtil();
      }
    };
  }, [autoFocus, restoreFocus, trapFocus, manageFocus, trapFocusUtil, restoreFocusUtil]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
};