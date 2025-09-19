import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipGuideProps {
  children: React.ReactNode;
  content: string | React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'click' | 'focus';
  delay?: number;
  className?: string;
  disabled?: boolean;
  maxWidth?: number;
}

export const TooltipGuide: React.FC<TooltipGuideProps> = ({
  children,
  content,
  position = 'top',
  trigger = 'hover',
  delay = 300,
  className = '',
  disabled = false,
  maxWidth = 300
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const showTooltip = () => {
    if (disabled) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      updatePosition();
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - 8;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + 8;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - 8;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + 8;
        break;
    }

    // Adjust for viewport boundaries
    if (left < 8) left = 8;
    if (left + tooltipRect.width > viewportWidth - 8) {
      left = viewportWidth - tooltipRect.width - 8;
    }
    if (top < 8) top = 8;
    if (top + tooltipRect.height > viewportHeight - 8) {
      top = viewportHeight - tooltipRect.height - 8;
    }

    setTooltipPosition({ top, left });
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
    }
  }, [isVisible]);

  useEffect(() => {
    const handleResize = () => {
      if (isVisible) {
        updatePosition();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isVisible]);

  const triggerProps: any = {};

  if (trigger === 'hover') {
    triggerProps.onMouseEnter = showTooltip;
    triggerProps.onMouseLeave = hideTooltip;
  } else if (trigger === 'click') {
    triggerProps.onClick = () => {
      if (isVisible) {
        hideTooltip();
      } else {
        showTooltip();
      }
    };
  } else if (trigger === 'focus') {
    triggerProps.onFocus = showTooltip;
    triggerProps.onBlur = hideTooltip;
  }

  const tooltip = isVisible && (
    <div
      ref={tooltipRef}
      className={`fixed z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg pointer-events-none ${className}`}
      style={{
        top: tooltipPosition.top,
        left: tooltipPosition.left,
        maxWidth: `${maxWidth}px`
      }}
    >
      {content}
      <div
        className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
          position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' :
          position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' :
          position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' :
          'left-[-4px] top-1/2 -translate-y-1/2'
        }`}
      />
    </div>
  );

  return (
    <>
      <div ref={triggerRef} className="inline-block" {...triggerProps}>
        {children}
      </div>
      {typeof document !== 'undefined' && createPortal(tooltip, document.body)}
    </>
  );
};

// ENS Setup Guide Component
export const ENSSetupGuide: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <TooltipGuide
      content={
        <div className="space-y-2">
          <div className="font-semibold">ENS Handle Setup</div>
          <div className="text-xs space-y-1">
            <div>• ENS handles are optional but recommended</div>
            <div>• Format: yourname.eth</div>
            <div>• Must own the ENS name to use it</div>
            <div>• Leave empty if you don't have one</div>
          </div>
        </div>
      }
      position="right"
      maxWidth={250}
      className={className}
    >
      <div className="inline-flex items-center justify-center w-4 h-4 text-xs text-blue-600 bg-blue-100 rounded-full cursor-help">
        ?
      </div>
    </TooltipGuide>
  );
};

// Payment Method Guide Component
export const PaymentMethodGuide: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <TooltipGuide
      content={
        <div className="space-y-2">
          <div className="font-semibold">Payment Methods</div>
          <div className="text-xs space-y-1">
            <div><strong>Crypto:</strong> Direct wallet payment</div>
            <div><strong>Fiat:</strong> Credit card, no crypto needed</div>
            <div><strong>Escrow:</strong> Protected crypto payment</div>
            <div>• Choose based on your preference</div>
            <div>• Fiat works without crypto balance</div>
          </div>
        </div>
      }
      position="top"
      maxWidth={280}
      className={className}
    >
      <div className="inline-flex items-center justify-center w-4 h-4 text-xs text-green-600 bg-green-100 rounded-full cursor-help">
        ?
      </div>
    </TooltipGuide>
  );
};

// Image Upload Guide Component
export const ImageUploadGuide: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <TooltipGuide
      content={
        <div className="space-y-2">
          <div className="font-semibold">Image Upload Tips</div>
          <div className="text-xs space-y-1">
            <div>• Max size: 10MB</div>
            <div>• Formats: JPG, PNG, WebP</div>
            <div>• Recommended: 1920x1080 or smaller</div>
            <div>• Images are stored securely on IPFS</div>
            <div>• Auto-compressed for web display</div>
          </div>
        </div>
      }
      position="top"
      maxWidth={250}
      className={className}
    >
      <div className="inline-flex items-center justify-center w-4 h-4 text-xs text-purple-600 bg-purple-100 rounded-full cursor-help">
        ?
      </div>
    </TooltipGuide>
  );
};