/**
 * InfiniteScroll Component
 * Handles infinite scrolling with intersection observer
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface InfiniteScrollProps {
  children: React.ReactNode;
  hasMore: boolean;
  loadMore: () => void;
  loading: boolean;
  threshold?: number;
  className?: string;
}

export const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  children,
  hasMore,
  loadMore,
  loading,
  threshold = 0.1,
  className = ''
}) => {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasMore && !loading) {
      loadMore();
    }
  }, [hasMore, loading, loadMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleIntersection, {
      threshold,
      rootMargin: '100px'
    });

    observer.observe(sentinel);

    return () => {
      observer.unobserve(sentinel);
    };
  }, [handleIntersection, threshold]);

  return (
    <div className={`infinite-scroll ${className}`}>
      {children}
      
      {hasMore && (
        <div ref={sentinelRef} className="sentinel">
          {loading && (
            <div className="loading-more">
              <LoadingSpinner size="medium" />
              <span>Loading more...</span>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .infinite-scroll {
          width: 100%;
        }

        .sentinel {
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .loading-more {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 2rem;
          color: var(--text-secondary);
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
};

export default InfiniteScroll;