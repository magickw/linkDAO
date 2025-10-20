import React, { useState, useRef } from 'react';
import { useSwipeGestures } from '../../../hooks/useSwipeGestures';
import { TouchOptimizedButton } from './TouchOptimizedButton';
import { useMobileOptimization } from '../../../hooks/useMobileOptimization';

interface SwipeableSellerCardProps {
  listing: {
    id: string;
    title: string;
    price: string;
    images: string[];
    status: string;
  };
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  onShare?: () => void;
}

export const SwipeableSellerCard: React.FC<SwipeableSellerCardProps> = ({
  listing,
  onEdit,
  onDelete,
  onView,
  onShare,
}) => {
  const { isMobile, getOptimalFontSize } = useMobileOptimization();
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const maxSwipeDistance = 120; // Maximum swipe distance to reveal actions

  const { swipeHandlers, swipeState } = useSwipeGestures({
    onSwipeMove: (event, deltaX, deltaY) => {
      // Only handle horizontal swipes
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        const clampedDelta = Math.max(-maxSwipeDistance, Math.min(0, deltaX));
        setSwipeOffset(clampedDelta);
      }
    },
    onSwipeEnd: () => {
      // Determine if we should reveal actions or snap back
      if (swipeOffset < -maxSwipeDistance / 2) {
        setSwipeOffset(-maxSwipeDistance);
        setIsRevealed(true);
      } else {
        setSwipeOffset(0);
        setIsRevealed(false);
      }
    },
    onSwipeLeft: () => {
      setSwipeOffset(-maxSwipeDistance);
      setIsRevealed(true);
    },
    onSwipeRight: () => {
      setSwipeOffset(0);
      setIsRevealed(false);
    },
  }, {
    threshold: 20,
    preventDefaultTouchmoveEvent: true,
  });

  const handleActionClick = (action: () => void) => {
    action();
    // Close the swipe actions after clicking
    setSwipeOffset(0);
    setIsRevealed(false);
  };

  if (!isMobile) {
    // Fallback to regular card for desktop
    return (
      <div className="seller-card-desktop">
        <div className="card-content">
          <div className="listing-image">
            {listing.images[0] ? (
              <img src={listing.images[0]} alt={listing.title} />
            ) : (
              <div className="image-placeholder">📷</div>
            )}
          </div>
          <div className="listing-details">
            <h3>{listing.title}</h3>
            <p className="price">{listing.price}</p>
            <p className="status">{listing.status}</p>
          </div>
          <div className="card-actions">
            {onView && <button onClick={onView}>View</button>}
            {onEdit && <button onClick={onEdit}>Edit</button>}
            {onShare && <button onClick={onShare}>Share</button>}
            {onDelete && <button onClick={onDelete}>Delete</button>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="swipeable-card-container">
      {/* Hidden Action Buttons */}
      <div className="swipe-actions">
        {onShare && (
          <TouchOptimizedButton
            variant="secondary"
            size="medium"
            onClick={() => handleActionClick(onShare)}
            className="action-button share-button"
          >
            📤
          </TouchOptimizedButton>
        )}
        {onEdit && (
          <TouchOptimizedButton
            variant="outline"
            size="medium"
            onClick={() => handleActionClick(onEdit)}
            className="action-button edit-button"
          >
            ✏️
          </TouchOptimizedButton>
        )}
        {onDelete && (
          <TouchOptimizedButton
            variant="secondary"
            size="medium"
            onClick={() => handleActionClick(onDelete)}
            className="action-button delete-button"
          >
            🗑️
          </TouchOptimizedButton>
        )}
      </div>

      {/* Swipeable Card */}
      <div
        ref={cardRef}
        className="swipeable-card"
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: swipeState.isSwiping ? 'none' : 'transform 0.3s ease',
        }}
        {...swipeHandlers}
      >
        <div className="card-content">
          <div className="listing-image">
            {listing.images[0] ? (
              <img src={listing.images[0]} alt={listing.title} />
            ) : (
              <div className="image-placeholder">📷</div>
            )}
          </div>
          
          <div className="listing-details">
            <h3 style={{ fontSize: getOptimalFontSize(16) }}>
              {listing.title}
            </h3>
            <p className="price" style={{ fontSize: getOptimalFontSize(18) }}>
              {listing.price}
            </p>
            <p className="status" style={{ fontSize: getOptimalFontSize(14) }}>
              {listing.status}
            </p>
          </div>

          <div className="card-indicator">
            <TouchOptimizedButton
              variant="ghost"
              size="small"
              onClick={() => onView?.()}
              className="view-button"
            >
              👁️
            </TouchOptimizedButton>
          </div>
        </div>

        {/* Swipe Hint */}
        {!isRevealed && (
          <div className="swipe-hint">
            <span>← Swipe for actions</span>
          </div>
        )}
      </div>

      <style jsx>{`
        .swipeable-card-container {
          position: relative;
          margin-bottom: 12px;
          overflow: hidden;
          border-radius: 12px;
          background: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .swipe-actions {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 16px;
          background: #f8f9fa;
          z-index: 1;
        }

        .action-button {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }

        .share-button {
          background: #17a2b8;
          color: white;
        }

        .edit-button {
          background: #ffc107;
          color: #212529;
        }

        .delete-button {
          background: #dc3545;
          color: white;
        }

        .swipeable-card {
          position: relative;
          z-index: 2;
          background: white;
          border-radius: 12px;
          overflow: hidden;
        }

        .card-content {
          display: flex;
          align-items: center;
          padding: 16px;
          gap: 12px;
        }

        .listing-image {
          width: 60px;
          height: 60px;
          border-radius: 8px;
          overflow: hidden;
          flex-shrink: 0;
        }

        .listing-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-placeholder {
          width: 100%;
          height: 100%;
          background: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: #6c757d;
        }

        .listing-details {
          flex: 1;
          min-width: 0;
        }

        .listing-details h3 {
          margin: 0 0 4px 0;
          color: #212529;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .price {
          margin: 0 0 4px 0;
          color: #007bff;
          font-weight: bold;
        }

        .status {
          margin: 0;
          color: #6c757d;
          text-transform: capitalize;
        }

        .card-indicator {
          flex-shrink: 0;
        }

        .view-button {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          font-size: 16px;
        }

        .swipe-hint {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #6c757d;
          font-size: 12px;
          opacity: 0.7;
          pointer-events: none;
          animation: pulse 2s infinite;
        }

        .seller-card-desktop {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-bottom: 12px;
        }

        .seller-card-desktop .card-content {
          display: flex;
          align-items: center;
          padding: 16px;
          gap: 12px;
        }

        .seller-card-desktop .listing-image {
          width: 60px;
          height: 60px;
          border-radius: 8px;
          overflow: hidden;
          flex-shrink: 0;
        }

        .seller-card-desktop .listing-details {
          flex: 1;
        }

        .seller-card-desktop .card-actions {
          display: flex;
          gap: 8px;
        }

        .seller-card-desktop .card-actions button {
          padding: 6px 12px;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          background: white;
          color: #495057;
          font-size: 12px;
          cursor: pointer;
        }

        .seller-card-desktop .card-actions button:hover {
          background: #f8f9fa;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 0.3; }
        }

        /* Touch feedback */
        .swipeable-card:active {
          transform: scale(0.98) translateX(${swipeOffset}px);
        }
      `}</style>
    </div>
  );
};

export default SwipeableSellerCard;