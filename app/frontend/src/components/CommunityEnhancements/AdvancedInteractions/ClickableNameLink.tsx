/**
 * Clickable Name Link Component
 * Makes ENS/SNS names clickable with mini-profile card integration
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ensService, ResolvedName } from '../../../services/ensService';
import MiniProfileCard from '../SharedComponents/MiniProfileCard';

export interface ClickableNameLinkProps {
  name: string;
  className?: string;
  showMiniProfile?: boolean;
  onNameClick?: (resolvedName: ResolvedName) => void;
  fallbackToAddress?: boolean;
}

const ClickableNameLink: React.FC<ClickableNameLinkProps> = ({
  name,
  className = '',
  showMiniProfile = true,
  onNameClick,
  fallbackToAddress = true,
}) => {
  const [resolvedName, setResolvedName] = useState<ResolvedName | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve name on mount
  useEffect(() => {
    const resolveName = async () => {
      if (!name || name.length === 0) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await ensService.resolveName(name);
        setResolvedName(result);
      } catch (err) {
        setError('Failed to resolve name');
        console.error('Name resolution error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    resolveName();
  }, [name]);

  // Handle click
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    if (resolvedName) {
      onNameClick?.(resolvedName);
    }
  }, [resolvedName, onNameClick]);

  // Determine display text and styling
  const getDisplayInfo = () => {
    if (isLoading) {
      return {
        text: name,
        isClickable: false,
        nameType: 'loading' as const,
      };
    }

    if (error || !resolvedName) {
      return {
        text: name,
        isClickable: false,
        nameType: 'error' as const,
      };
    }

    const isValidName = resolvedName.isValid && resolvedName.type !== 'address';
    
    return {
      text: resolvedName.original,
      isClickable: isValidName || (fallbackToAddress && ensService.isEthereumAddress(name)),
      nameType: resolvedName.type,
    };
  };

  const { text, isClickable, nameType } = getDisplayInfo();

  // Create the clickable element
  const createClickableElement = () => {
    const baseClasses = `ce-clickable-name ${className}`;
    const typeClasses = {
      ens: 'ce-name-ens',
      sns: 'ce-name-sns',
      address: 'ce-name-address',
      loading: 'ce-name-loading',
      error: 'ce-name-error',
    };

    const finalClasses = `${baseClasses} ${typeClasses[nameType]} ${
      isClickable ? 'ce-name-clickable' : 'ce-name-static'
    }`;

    if (!isClickable) {
      return (
        <span className={finalClasses} title={error || 'Name not resolvable'}>
          {text}
          {isLoading && <span className="ce-name-loading-indicator">...</span>}
        </span>
      );
    }

    return (
      <button
        className={finalClasses}
        onClick={handleClick}
        title={`Click to view profile for ${text}`}
        type="button"
      >
        {text}
        {nameType === 'ens' && <span className="ce-name-type-indicator">⟠</span>}
        {nameType === 'sns' && <span className="ce-name-type-indicator">◎</span>}
      </button>
    );
  };

  const clickableElement = createClickableElement();

  // Wrap with mini profile card if enabled and name is valid
  if (showMiniProfile && isClickable && resolvedName?.isValid) {
    return (
      <MiniProfileCard
        userId={resolvedName.resolved || resolvedName.original}
        trigger={clickableElement}
        position="top"
        showWalletInfo={true}
        showMutualConnections={true}
      />
    );
  }

  return (
    <>
      {clickableElement}
      
      <style jsx>{`
        .ce-clickable-name {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          font-family: inherit;
          font-size: inherit;
          line-height: inherit;
          text-decoration: none;
          border: none;
          background: none;
          padding: 0;
          margin: 0;
          cursor: inherit;
        }
        
        .ce-name-clickable {
          cursor: pointer;
          color: var(--ce-color-primary);
          text-decoration: underline;
          text-decoration-color: transparent;
          transition: all 0.2s ease;
        }
        
        .ce-name-clickable:hover {
          color: var(--ce-color-primary-dark);
          text-decoration-color: currentColor;
        }
        
        .ce-name-clickable:focus {
          outline: 2px solid var(--ce-color-primary);
          outline-offset: 2px;
          border-radius: 2px;
        }
        
        .ce-name-static {
          color: inherit;
          cursor: default;
        }
        
        .ce-name-ens {
          color: var(--ce-color-ens, #627eea);
        }
        
        .ce-name-sns {
          color: var(--ce-color-sns, #9945ff);
        }
        
        .ce-name-address {
          font-family: var(--ce-font-mono, 'SF Mono', 'Monaco', 'Inconsolata', monospace);
          font-size: 0.9em;
          color: var(--ce-text-secondary);
        }
        
        .ce-name-loading {
          color: var(--ce-text-tertiary);
          opacity: 0.7;
        }
        
        .ce-name-error {
          color: var(--ce-text-secondary);
          opacity: 0.6;
        }
        
        .ce-name-type-indicator {
          font-size: 0.8em;
          opacity: 0.7;
          margin-left: 2px;
        }
        
        .ce-name-loading-indicator {
          animation: ce-pulse 1.5s ease-in-out infinite;
          margin-left: 2px;
        }
        
        @keyframes ce-pulse {
          0%, 100% {
            opacity: 0.4;
          }
          50% {
            opacity: 1;
          }
        }
        
        /* Dark mode adjustments */
        @media (prefers-color-scheme: dark) {
          .ce-name-ens {
            color: var(--ce-color-ens-dark, #7c9aff);
          }
          
          .ce-name-sns {
            color: var(--ce-color-sns-dark, #b565ff);
          }
        }
        
        /* High contrast mode */
        @media (prefers-contrast: high) {
          .ce-name-clickable {
            text-decoration: underline;
          }
          
          .ce-name-clickable:focus {
            outline: 3px solid currentColor;
          }
        }
        
        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .ce-name-clickable {
            transition: none;
          }
          
          .ce-name-loading-indicator {
            animation: none;
          }
        }
      `}</style>
    </>
  );
};

export default ClickableNameLink;