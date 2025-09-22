/**
 * Preview Modal
 * Modal component for expanded content previews
 */

import React, { useEffect, useRef } from 'react';
import { PreviewableContent, PreviewType } from '../../../types/communityEnhancements';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: PreviewableContent;
  previewType: PreviewType;
  title?: string;
}

const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  content,
  previewType,
  title,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === modalRef.current) {
      onClose();
    }
  };

  // Focus management
  useEffect(() => {
    if (isOpen && contentRef.current) {
      contentRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const renderPreviewContent = () => {
    switch (previewType) {
      case 'nft':
        return content.nft ? <NFTPreviewContent nft={content.nft} /> : null;
      case 'proposal':
        return content.proposal ? <ProposalPreviewContent proposal={content.proposal} /> : null;
      case 'defi':
        return content.defi ? <DeFiPreviewContent defi={content.defi} /> : null;
      case 'link':
        return content.link ? <LinkPreviewContent link={content.link} /> : null;
      default:
        return <div>Preview not available</div>;
    }
  };

  return (
    <div 
      className="ce-preview-modal-backdrop"
      ref={modalRef}
      onClick={handleBackdropClick}
    >
      <div 
        className="ce-preview-modal"
        ref={contentRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
      >
        {/* Header */}
        <div className="ce-modal-header">
          {title && (
            <h2 id="modal-title" className="ce-modal-title">{title}</h2>
          )}
          <button 
            className="ce-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="ce-modal-content">
          {renderPreviewContent()}
        </div>
      </div>

      <style jsx>{`
        .ce-preview-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: var(--ce-z-modal);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--ce-space-lg);
          animation: ce-fadeIn 0.2s ease-out;
        }
        
        .ce-preview-modal {
          background: var(--ce-bg-primary);
          border-radius: var(--ce-radius-xl);
          box-shadow: var(--ce-shadow-xl);
          max-width: 90vw;
          max-height: 90vh;
          width: 100%;
          max-width: 800px;
          display: flex;
          flex-direction: column;
          animation: ce-slideIn 0.3s ease-out;
          outline: none;
        }
        
        .ce-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--ce-space-lg);
          border-bottom: 1px solid var(--ce-border-light);
        }
        
        .ce-modal-title {
          margin: 0;
          font-size: var(--ce-font-size-xl);
          font-weight: 600;
          color: var(--ce-text-primary);
        }
        
        .ce-modal-close {
          background: none;
          border: none;
          font-size: var(--ce-font-size-xl);
          color: var(--ce-text-secondary);
          cursor: pointer;
          padding: var(--ce-space-sm);
          border-radius: var(--ce-radius-md);
          transition: all var(--ce-transition-fast);
        }
        
        .ce-modal-close:hover {
          background: var(--ce-bg-secondary);
          color: var(--ce-text-primary);
        }
        
        .ce-modal-content {
          flex: 1;
          overflow-y: auto;
          padding: var(--ce-space-lg);
        }
        
        @keyframes ce-fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes ce-slideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        @media (max-width: 768px) {
          .ce-preview-modal-backdrop {
            padding: var(--ce-space-md);
          }
          
          .ce-preview-modal {
            max-width: 100%;
            max-height: 100%;
          }
          
          .ce-modal-header {
            padding: var(--ce-space-md);
          }
          
          .ce-modal-content {
            padding: var(--ce-space-md);
          }
        }
      `}</style>
    </div>
  );
};

// NFT Preview Content Component
const NFTPreviewContent: React.FC<{ nft: NonNullable<PreviewableContent['nft']> }> = ({ nft }) => (
  <div className="ce-nft-preview">
    <div className="ce-nft-image-container">
      <img src={nft.image} alt={`NFT ${nft.tokenId}`} className="ce-nft-image" />
    </div>
    <div className="ce-nft-details">
      <h3 className="ce-nft-collection">{nft.collection}</h3>
      <p className="ce-nft-token-id">Token ID: {nft.tokenId}</p>
      {nft.floorPrice && (
        <p className="ce-nft-floor-price">Floor Price: {nft.floorPrice} ETH</p>
      )}
      {nft.rarity && (
        <p className="ce-nft-rarity">Rarity: {nft.rarity}</p>
      )}
      {nft.marketData && (
        <div className="ce-nft-market-data">
          <p>Last Sale: {nft.marketData.lastSale} ETH</p>
          <p>24h Volume: {nft.marketData.volume24h} ETH</p>
        </div>
      )}
    </div>
    
    <style jsx>{`
      .ce-nft-preview {
        display: flex;
        flex-direction: column;
        gap: var(--ce-space-lg);
      }
      
      .ce-nft-image-container {
        text-align: center;
      }
      
      .ce-nft-image {
        max-width: 100%;
        max-height: 400px;
        border-radius: var(--ce-radius-lg);
        box-shadow: var(--ce-shadow-md);
      }
      
      .ce-nft-details {
        display: flex;
        flex-direction: column;
        gap: var(--ce-space-sm);
      }
      
      .ce-nft-collection {
        margin: 0;
        font-size: var(--ce-font-size-lg);
        font-weight: 600;
        color: var(--ce-text-primary);
      }
      
      .ce-nft-token-id,
      .ce-nft-floor-price,
      .ce-nft-rarity {
        margin: 0;
        color: var(--ce-text-secondary);
      }
      
      .ce-nft-market-data {
        display: flex;
        gap: var(--ce-space-lg);
        padding: var(--ce-space-md);
        background: var(--ce-bg-secondary);
        border-radius: var(--ce-radius-md);
      }
      
      .ce-nft-market-data p {
        margin: 0;
        color: var(--ce-text-secondary);
        font-size: var(--ce-font-size-sm);
      }
    `}</style>
  </div>
);

// Proposal Preview Content Component
const ProposalPreviewContent: React.FC<{ proposal: NonNullable<PreviewableContent['proposal']> }> = ({ proposal }) => (
  <div className="ce-proposal-preview">
    <h3 className="ce-proposal-title">{proposal.title}</h3>
    <div className="ce-proposal-status">
      <span className={`ce-status-badge ce-status-${proposal.currentStatus}`}>
        {proposal.currentStatus.toUpperCase()}
      </span>
      <span className="ce-proposal-time">
        {proposal.timeRemaining > 0 ? `${Math.floor(proposal.timeRemaining / 3600)}h remaining` : 'Voting ended'}
      </span>
    </div>
    
    <div className="ce-proposal-progress">
      <div className="ce-progress-bar">
        <div 
          className="ce-progress-fill"
          style={{ width: `${proposal.votingProgress}%` }}
        />
      </div>
      <div className="ce-progress-stats">
        <span>Progress: {proposal.votingProgress}%</span>
        <span>Participation: {proposal.participationRate}%</span>
      </div>
    </div>
    
    <style jsx>{`
      .ce-proposal-preview {
        display: flex;
        flex-direction: column;
        gap: var(--ce-space-lg);
      }
      
      .ce-proposal-title {
        margin: 0;
        font-size: var(--ce-font-size-xl);
        font-weight: 600;
        color: var(--ce-text-primary);
      }
      
      .ce-proposal-status {
        display: flex;
        align-items: center;
        gap: var(--ce-space-md);
      }
      
      .ce-status-badge {
        padding: var(--ce-space-xs) var(--ce-space-sm);
        border-radius: var(--ce-radius-full);
        font-size: var(--ce-font-size-xs);
        font-weight: 600;
        text-transform: uppercase;
      }
      
      .ce-status-active {
        background: var(--ce-accent);
        color: white;
      }
      
      .ce-status-passed {
        background: #10b981;
        color: white;
      }
      
      .ce-status-failed {
        background: #ef4444;
        color: white;
      }
      
      .ce-status-pending {
        background: var(--ce-secondary);
        color: white;
      }
      
      .ce-proposal-time {
        color: var(--ce-text-secondary);
        font-size: var(--ce-font-size-sm);
      }
      
      .ce-proposal-progress {
        display: flex;
        flex-direction: column;
        gap: var(--ce-space-sm);
      }
      
      .ce-progress-bar {
        height: 8px;
        background: var(--ce-bg-secondary);
        border-radius: var(--ce-radius-full);
        overflow: hidden;
      }
      
      .ce-progress-fill {
        height: 100%;
        background: var(--ce-accent);
        transition: width var(--ce-transition-normal);
      }
      
      .ce-progress-stats {
        display: flex;
        justify-content: space-between;
        font-size: var(--ce-font-size-sm);
        color: var(--ce-text-secondary);
      }
    `}</style>
  </div>
);

// DeFi Preview Content Component
const DeFiPreviewContent: React.FC<{ defi: NonNullable<PreviewableContent['defi']> }> = ({ defi }) => (
  <div className="ce-defi-preview">
    <h3 className="ce-defi-protocol">{defi.protocol}</h3>
    <div className="ce-defi-stats">
      <div className="ce-defi-stat">
        <span className="ce-stat-label">APY</span>
        <span className="ce-stat-value">{defi.apy}%</span>
      </div>
      <div className="ce-defi-stat">
        <span className="ce-stat-label">TVL</span>
        <span className="ce-stat-value">${defi.tvl.toLocaleString()}</span>
      </div>
      <div className="ce-defi-stat">
        <span className="ce-stat-label">Risk</span>
        <span className={`ce-risk-badge ce-risk-${defi.riskLevel}`}>
          {defi.riskLevel.toUpperCase()}
        </span>
      </div>
    </div>
    
    <style jsx>{`
      .ce-defi-preview {
        display: flex;
        flex-direction: column;
        gap: var(--ce-space-lg);
      }
      
      .ce-defi-protocol {
        margin: 0;
        font-size: var(--ce-font-size-xl);
        font-weight: 600;
        color: var(--ce-text-primary);
      }
      
      .ce-defi-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: var(--ce-space-lg);
      }
      
      .ce-defi-stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: var(--ce-space-lg);
        background: var(--ce-bg-secondary);
        border-radius: var(--ce-radius-lg);
      }
      
      .ce-stat-label {
        font-size: var(--ce-font-size-sm);
        color: var(--ce-text-tertiary);
        margin-bottom: var(--ce-space-sm);
      }
      
      .ce-stat-value {
        font-size: var(--ce-font-size-xl);
        font-weight: 600;
        color: var(--ce-text-primary);
      }
      
      .ce-risk-badge {
        padding: var(--ce-space-xs) var(--ce-space-sm);
        border-radius: var(--ce-radius-full);
        font-size: var(--ce-font-size-xs);
        font-weight: 600;
      }
      
      .ce-risk-low {
        background: #10b981;
        color: white;
      }
      
      .ce-risk-medium {
        background: #f59e0b;
        color: white;
      }
      
      .ce-risk-high {
        background: #ef4444;
        color: white;
      }
    `}</style>
  </div>
);

// Link Preview Content Component
const LinkPreviewContent: React.FC<{ link: NonNullable<PreviewableContent['link']> }> = ({ link }) => (
  <div className="ce-link-preview">
    {link.image && (
      <div className="ce-link-image-container">
        <img src={link.image} alt={link.title} className="ce-link-image" />
      </div>
    )}
    <div className="ce-link-details">
      <h3 className="ce-link-title">{link.title}</h3>
      <p className="ce-link-description">{link.description}</p>
      <div className="ce-link-meta">
        <span className="ce-link-domain">{link.domain}</span>
        <a 
          href={link.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="ce-button ce-button-primary"
        >
          Visit Link
        </a>
      </div>
    </div>
    
    <style jsx>{`
      .ce-link-preview {
        display: flex;
        flex-direction: column;
        gap: var(--ce-space-lg);
      }
      
      .ce-link-image-container {
        text-align: center;
      }
      
      .ce-link-image {
        max-width: 100%;
        max-height: 300px;
        border-radius: var(--ce-radius-lg);
        box-shadow: var(--ce-shadow-md);
      }
      
      .ce-link-title {
        margin: 0;
        font-size: var(--ce-font-size-xl);
        font-weight: 600;
        color: var(--ce-text-primary);
      }
      
      .ce-link-description {
        margin: 0;
        color: var(--ce-text-secondary);
        line-height: 1.6;
      }
      
      .ce-link-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--ce-space-md);
        background: var(--ce-bg-secondary);
        border-radius: var(--ce-radius-md);
      }
      
      .ce-link-domain {
        color: var(--ce-text-tertiary);
        font-size: var(--ce-font-size-sm);
      }
    `}</style>
  </div>
);

export default PreviewModal;