import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { useResponsive } from '../../../design-system/hooks/useResponsive';
import { PreviewableContent, PreviewType } from '../../../types/communityEnhancements';
import { MobilePreviewModal } from './MobilePreviewModal';

interface MobileInlinePreviewSystemProps {
  content: PreviewableContent;
  previewType: PreviewType;
  onPreviewClick?: () => void;
  loadingState?: boolean;
  className?: string;
}

/**
 * MobileInlinePreviewSystem Component
 * 
 * Mobile-optimized inline preview system with touch-friendly interactions,
 * gesture-based dismissal, and appropriately sized previews for mobile screens.
 */
export const MobileInlinePreviewSystem: React.FC<MobileInlinePreviewSystemProps> = ({
  content,
  previewType,
  onPreviewClick,
  loadingState = false,
  className = ''
}) => {
  const { isMobile } = useResponsive();
  const [showModal, setShowModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Handle preview tap
  const handlePreviewTap = useCallback(() => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    if (onPreviewClick) {
      onPreviewClick();
    } else {
      setShowModal(true);
    }
  }, [onPreviewClick]);

  // Handle swipe to dismiss
  const swipeHandlers = useSwipeable({
    onSwipedUp: () => {
      setIsDismissed(true);
      if ('vibrate' in navigator) {
        navigator.vibrate(30);
      }
    },
    onSwipedDown: () => {
      handlePreviewTap();
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: false,
    delta: 50
  });

  if (!isMobile || isDismissed) {
    return null;
  }

  if (loadingState) {
    return <MobilePreviewSkeleton />;
  }

  return (
    <>
      <motion.div
        {...swipeHandlers}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`mobile-inline-preview ${className}`}
      >
        {previewType === 'nft' && content.nft && (
          <MobileNFTPreview
            nft={content.nft}
            onTap={handlePreviewTap}
          />
        )}
        
        {previewType === 'proposal' && content.proposal && (
          <MobileProposalPreview
            proposal={content.proposal}
            onTap={handlePreviewTap}
          />
        )}
        
        {previewType === 'defi' && content.defi && (
          <MobileDeFiPreview
            defi={content.defi}
            onTap={handlePreviewTap}
          />
        )}
        
        {previewType === 'link' && content.link && (
          <MobileLinkPreview
            link={content.link}
            onTap={handlePreviewTap}
          />
        )}

        {/* Swipe hint */}
        <div className="flex justify-center mt-2">
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
          </div>
        </div>
      </motion.div>

      {/* Modal for expanded view */}
      <MobilePreviewModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        content={content}
        previewType={previewType}
      />
    </>
  );
};

interface MobileNFTPreviewProps {
  nft: NonNullable<PreviewableContent['nft']>;
  onTap: () => void;
}

const MobileNFTPreview: React.FC<MobileNFTPreviewProps> = ({ nft, onTap }) => {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onTap}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
    >
      <div className="aspect-square relative">
        <img
          src={nft.image}
          alt={`NFT ${nft.tokenId}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs font-medium">
          NFT
        </div>
        {nft.rarity && (
          <div className="absolute bottom-2 left-2 bg-purple-500 text-white px-2 py-1 rounded-md text-xs font-medium">
            {nft.rarity}
          </div>
        )}
      </div>
      
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900 dark:text-white truncate">
              {nft.collection}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              #{nft.tokenId}
            </p>
          </div>
          
          {nft.floorPrice && (
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {nft.floorPrice} ETH
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Floor Price
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

interface MobileProposalPreviewProps {
  proposal: NonNullable<PreviewableContent['proposal']>;
  onTap: () => void;
}

const MobileProposalPreview: React.FC<MobileProposalPreviewProps> = ({ proposal, onTap }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'passed': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onTap}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(proposal.currentStatus)}`}>
            {proposal.currentStatus.toUpperCase()}
          </span>
        </div>
        
        <div className="text-right">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {Math.floor(proposal.timeRemaining / (1000 * 60 * 60))}h left
          </p>
        </div>
      </div>

      <h4 className="font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">
        {proposal.title}
      </h4>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>Progress</span>
          <span>{Math.round(proposal.votingProgress)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${proposal.votingProgress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">Tap to vote</span>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </motion.div>
  );
};

interface MobileDeFiPreviewProps {
  defi: NonNullable<PreviewableContent['defi']>;
  onTap: () => void;
}

const MobileDeFiPreview: React.FC<MobileDeFiPreviewProps> = ({ defi, onTap }) => {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onTap}
      className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl border border-green-200 dark:border-green-700 p-4 shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <span className="font-medium text-gray-900 dark:text-white">
            DeFi Protocol
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">APY</p>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            {defi.apy}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">TVL</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            ${defi.tvl}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">Tap to interact</span>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </motion.div>
  );
};

interface MobileLinkPreviewProps {
  link: NonNullable<PreviewableContent['link']>;
  onTap: () => void;
}

const MobileLinkPreview: React.FC<MobileLinkPreviewProps> = ({ link, onTap }) => {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onTap}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
    >
      {link.image && (
        <div className="aspect-video relative">
          <img
            src={link.image}
            alt={link.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs font-medium">
            LINK
          </div>
        </div>
      )}
      
      <div className="p-3">
        <h4 className="font-medium text-gray-900 dark:text-white mb-1 line-clamp-2">
          {link.title}
        </h4>
        
        {link.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
            {link.description}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {link.domain}
          </span>
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </div>
      </div>
    </motion.div>
  );
};

const MobilePreviewSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm animate-pulse">
      <div className="flex items-center space-x-3 mb-3">
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
      
      <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg mb-3"></div>
      
      <div className="flex justify-between">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
      </div>
    </div>
  );
};

export default MobileInlinePreviewSystem;