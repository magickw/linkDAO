/**
 * Community Page Enhanced - Main Component
 * Foundation component that orchestrates all community page enhancements
 */

import React, { useState, useEffect, useMemo } from 'react';
import { CommunityEnhancementErrorBoundary } from './ErrorBoundaries';
import { EnhancedCommunityData, FilterConfiguration, SortOption } from '../../types/communityEnhancements';

interface CommunityPageEnhancedProps {
  communityId?: string;
  initialData?: EnhancedCommunityData[];
  className?: string;
  onCommunityChange?: (communityId: string) => void;
  onFilterChange?: (filters: FilterConfiguration) => void;
}

const CommunityPageEnhanced: React.FC<CommunityPageEnhancedProps> = ({
  communityId,
  initialData = [],
  className = '',
  onCommunityChange,
  onFilterChange,
}) => {
  // State management
  const [selectedCommunity, setSelectedCommunity] = useState<string | undefined>(communityId);
  const [communities, setCommunities] = useState<EnhancedCommunityData[]>(initialData);
  const [currentFilters, setCurrentFilters] = useState<FilterConfiguration>({
    id: 'default',
    name: 'Default',
    filters: [],
    sortOrder: 'hot' as SortOption,
    isDefault: true,
    isCustom: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Memoized computed values
  const selectedCommunityData = useMemo(() => {
    return communities.find(c => c.id === selectedCommunity);
  }, [communities, selectedCommunity]);

  // Effects
  useEffect(() => {
    if (communityId && communityId !== selectedCommunity) {
      setSelectedCommunity(communityId);
    }
  }, [communityId, selectedCommunity]);

  useEffect(() => {
    if (selectedCommunity && onCommunityChange) {
      onCommunityChange(selectedCommunity);
    }
  }, [selectedCommunity, onCommunityChange]);

  useEffect(() => {
    if (onFilterChange) {
      onFilterChange(currentFilters);
    }
  }, [currentFilters, onFilterChange]);

  // Event handlers
  const handleCommunitySelect = (communityId: string) => {
    setSelectedCommunity(communityId);
  };

  const handleFilterChange = (filters: FilterConfiguration) => {
    setCurrentFilters(filters);
  };

  const handleError = (error: Error) => {
    setError(error);
    console.error('Community Page Enhanced Error:', error);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`ce-community-page-enhanced ce-loading ${className}`}>
        <div className="ce-loading-content">
          <div className="ce-skeleton ce-skeleton-header"></div>
          <div className="ce-skeleton ce-skeleton-content"></div>
        </div>
        
        <style jsx>{`
          .ce-community-page-enhanced {
            min-height: 100vh;
            background: var(--ce-bg-primary);
          }
          
          .ce-loading-content {
            padding: var(--ce-space-lg);
          }
          
          .ce-skeleton-header {
            height: 60px;
            margin-bottom: var(--ce-space-lg);
          }
          
          .ce-skeleton-content {
            height: 400px;
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`ce-community-page-enhanced ce-error ${className}`}>
        <CommunityEnhancementErrorBoundary>
          <div className="ce-error-content">
            <h2>Unable to load community page</h2>
            <p>{error.message}</p>
            <button 
              className="ce-button ce-button-primary"
              onClick={() => {
                setError(null);
                setIsLoading(true);
                // Trigger reload logic here
              }}
            >
              Retry
            </button>
          </div>
        </CommunityEnhancementErrorBoundary>
      </div>
    );
  }

  return (
    <CommunityEnhancementErrorBoundary onError={handleError}>
      <div className={`ce-community-page-enhanced ${className}`}>
        {/* Enhanced Layout Structure */}
        <div className="ce-layout-container">
          {/* Enhanced Left Sidebar */}
          <aside className="ce-left-sidebar">
            <CommunityEnhancementErrorBoundary fallbackComponent={SidebarFallback}>
              {/* Left sidebar components will be implemented in subsequent tasks */}
              <div className="ce-sidebar-placeholder">
                <h3>Enhanced Left Sidebar</h3>
                <p>Community icons, filters, and navigation will be implemented here.</p>
              </div>
            </CommunityEnhancementErrorBoundary>
          </aside>

          {/* Enhanced Central Feed */}
          <main className="ce-central-feed">
            <CommunityEnhancementErrorBoundary>
              {/* Central feed components will be implemented in subsequent tasks */}
              <div className="ce-feed-placeholder">
                <h3>Enhanced Central Feed</h3>
                <p>Post type indicators, inline previews, and enhanced interactions will be implemented here.</p>
                {selectedCommunityData && (
                  <div className="ce-community-info">
                    <h4>Selected Community: {selectedCommunityData.name}</h4>
                    <p>Members: {selectedCommunityData.memberCount}</p>
                  </div>
                )}
              </div>
            </CommunityEnhancementErrorBoundary>
          </main>

          {/* Enhanced Right Sidebar */}
          <aside className="ce-right-sidebar">
            <CommunityEnhancementErrorBoundary fallbackComponent={SidebarFallback}>
              {/* Right sidebar components will be implemented in subsequent tasks */}
              <div className="ce-sidebar-placeholder">
                <h3>Enhanced Right Sidebar</h3>
                <p>Governance widgets, wallet activity, and suggestions will be implemented here.</p>
              </div>
            </CommunityEnhancementErrorBoundary>
          </aside>
        </div>

        <style jsx>{`
          .ce-community-page-enhanced {
            min-height: 100vh;
            background: var(--ce-bg-primary);
            color: var(--ce-text-primary);
          }
          
          .ce-layout-container {
            display: grid;
            grid-template-columns: 280px 1fr 320px;
            gap: var(--ce-space-lg);
            max-width: 1400px;
            margin: 0 auto;
            padding: var(--ce-space-lg);
          }
          
          .ce-left-sidebar,
          .ce-right-sidebar {
            position: sticky;
            top: var(--ce-space-lg);
            height: fit-content;
            max-height: calc(100vh - 2 * var(--ce-space-lg));
            overflow-y: auto;
          }
          
          .ce-central-feed {
            min-height: 600px;
          }
          
          .ce-sidebar-placeholder,
          .ce-feed-placeholder {
            padding: var(--ce-space-lg);
            background: var(--ce-bg-secondary);
            border: 1px solid var(--ce-border-light);
            border-radius: var(--ce-radius-lg);
            text-align: center;
          }
          
          .ce-sidebar-placeholder h3,
          .ce-feed-placeholder h3 {
            margin: 0 0 var(--ce-space-md) 0;
            color: var(--ce-text-primary);
          }
          
          .ce-sidebar-placeholder p,
          .ce-feed-placeholder p {
            margin: 0;
            color: var(--ce-text-secondary);
            font-size: var(--ce-font-size-sm);
          }
          
          .ce-community-info {
            margin-top: var(--ce-space-lg);
            padding: var(--ce-space-md);
            background: var(--ce-bg-tertiary);
            border-radius: var(--ce-radius-md);
          }
          
          .ce-community-info h4 {
            margin: 0 0 var(--ce-space-sm) 0;
            color: var(--ce-text-primary);
          }
          
          .ce-community-info p {
            margin: 0;
            color: var(--ce-text-secondary);
          }
          
          /* Responsive Design */
          @media (max-width: 1200px) {
            .ce-layout-container {
              grid-template-columns: 240px 1fr 280px;
              gap: var(--ce-space-md);
            }
          }
          
          @media (max-width: 968px) {
            .ce-layout-container {
              grid-template-columns: 1fr;
              gap: var(--ce-space-md);
            }
            
            .ce-left-sidebar,
            .ce-right-sidebar {
              position: static;
              max-height: none;
            }
          }
          
          @media (max-width: 768px) {
            .ce-layout-container {
              padding: var(--ce-space-md);
              gap: var(--ce-space-sm);
            }
            
            .ce-sidebar-placeholder,
            .ce-feed-placeholder {
              padding: var(--ce-space-md);
            }
          }
        `}</style>
      </div>
    </CommunityEnhancementErrorBoundary>
  );
};

// Fallback component for sidebar errors
const SidebarFallback: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="ce-sidebar-fallback">
    <p>Sidebar temporarily unavailable</p>
    <button className="ce-button ce-button-secondary" onClick={retry}>
      Retry
    </button>
    
    <style jsx>{`
      .ce-sidebar-fallback {
        padding: var(--ce-space-md);
        text-align: center;
        background: var(--ce-bg-secondary);
        border: 1px solid var(--ce-border-light);
        border-radius: var(--ce-radius-md);
      }
      
      .ce-sidebar-fallback p {
        margin: 0 0 var(--ce-space-md) 0;
        color: var(--ce-text-secondary);
        font-size: var(--ce-font-size-sm);
      }
    `}</style>
  </div>
);

export default CommunityPageEnhanced;