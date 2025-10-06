/**
 * CommunityPerformanceOptimizer Component
 * Optimizes community page performance with intelligent loading and caching
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { communityCacheService } from '../../services/communityCacheService';

interface CommunityPerformanceOptimizerProps {
  communityId: string;
  userId?: string;
  children: React.ReactNode;
}

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  cacheHitRate: number;
  memoryUsage: number;
  networkRequests: number;
}

export const CommunityPerformanceOptimizer: React.FC<CommunityPerformanceOptimizerProps> = ({
  communityId,
  userId,
  children
}) => {
  const performanceRef = useRef<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    cacheHitRate: 0,
    memoryUsage: 0,
    networkRequests: 0
  });
  
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const imageObserverRef = useRef<IntersectionObserver | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Initialize performance monitoring
  useEffect(() => {
    startTimeRef.current = Date.now();
    
    // Track user behavior for predictive loading
    if (userId) {
      communityCacheService.trackUserBehavior(userId, 'visit_community', {
        communityId,
        timestamp: Date.now()
      });
    }

    // Preload related content
    preloadCommunityContent();

    // Setup intersection observers for lazy loading
    setupIntersectionObservers();

    // Measure initial load time
    const loadTime = Date.now() - startTimeRef.current;
    performanceRef.current.loadTime = loadTime;

    return () => {
      cleanupObservers();
    };
  }, [communityId, userId]);

  // Preload community content based on user behavior
  const preloadCommunityContent = useCallback(async () => {
    if (!userId) return;

    try {
      // Preload based on user patterns
      await communityCacheService.preloadCommunityData(userId, communityId);
      
      // Warm cache with frequently accessed data
      const relatedCommunities = await fetchRelatedCommunities();
      if (relatedCommunities.length > 0) {
        await communityCacheService.warmCache(relatedCommunities.map(c => c.id));
      }
    } catch (error) {
      console.warn('Failed to preload community content:', error);
    }
  }, [userId, communityId]);

  // Setup intersection observers for performance optimization
  const setupIntersectionObservers = useCallback(() => {
    // Observer for lazy loading content sections
    intersectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            const dataType = element.dataset.lazyType;
            
            switch (dataType) {
              case 'community-posts':
                loadCommunityPosts(element);
                break;
              case 'community-members':
                loadCommunityMembers(element);
                break;
              case 'community-stats':
                loadCommunityStats(element);
                break;
            }
            
            intersectionObserverRef.current?.unobserve(element);
          }
        });
      },
      {
        rootMargin: '100px', // Start loading 100px before element is visible
        threshold: 0.1
      }
    );

    // Observer for image optimization
    imageObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            optimizeImage(img);
            imageObserverRef.current?.unobserve(img);
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    // Observe all lazy-loadable elements
    document.querySelectorAll('[data-lazy-type]').forEach((element) => {
      intersectionObserverRef.current?.observe(element);
    });

    // Observe all images for optimization
    document.querySelectorAll('img[data-optimize]').forEach((img) => {
      imageObserverRef.current?.observe(img);
    });
  }, []);

  // Load community posts with caching
  const loadCommunityPosts = useCallback(async (element: HTMLElement) => {
    const sort = element.dataset.sort || 'hot';
    const page = parseInt(element.dataset.page || '1');
    
    // Check cache first
    const cacheKey = `community:${communityId}:posts:${sort}:page:${page}`;
    let posts = communityCacheService.get(cacheKey);
    
    if (!posts) {
      try {
        const response = await fetch(`/api/communities/${communityId}/posts?sort=${sort}&page=${page}&limit=20`);
        if (response.ok) {
          const data = await response.json();
          posts = data.posts;
          
          // Cache the posts
          communityCacheService.cacheCommunityPosts(communityId, posts, page, sort);
          performanceRef.current.networkRequests++;
        }
      } catch (error) {
        console.error('Failed to load community posts:', error);
        return;
      }
    }

    // Render posts
    renderPosts(element, posts);
  }, [communityId]);

  // Load community members with caching
  const loadCommunityMembers = useCallback(async (element: HTMLElement) => {
    const filters = JSON.parse(element.dataset.filters || '{}');
    
    // Check cache first
    const cacheKey = `community:${communityId}:members:${JSON.stringify(filters)}`;
    let members = communityCacheService.get(cacheKey);
    
    if (!members) {
      try {
        const params = new URLSearchParams(filters);
        const response = await fetch(`/api/communities/${communityId}/members?${params}`);
        if (response.ok) {
          const data = await response.json();
          members = data.members;
          
          // Cache the members
          communityCacheService.cacheCommunityMembers(communityId, members, filters);
          performanceRef.current.networkRequests++;
        }
      } catch (error) {
        console.error('Failed to load community members:', error);
        return;
      }
    }

    // Render members
    renderMembers(element, members);
  }, [communityId]);

  // Load community stats with caching
  const loadCommunityStats = useCallback(async (element: HTMLElement) => {
    // Check cache first
    const cacheKey = `community:${communityId}:stats`;
    let stats = communityCacheService.get(cacheKey);
    
    if (!stats) {
      try {
        const response = await fetch(`/api/communities/${communityId}/stats`);
        if (response.ok) {
          stats = await response.json();
          
          // Cache the stats
          communityCacheService.set(cacheKey, stats, {
            ttl: 2 * 60 * 1000, // 2 minutes
            tags: ['community-stats', `community:${communityId}`]
          });
          performanceRef.current.networkRequests++;
        }
      } catch (error) {
        console.error('Failed to load community stats:', error);
        return;
      }
    }

    // Render stats
    renderStats(element, stats);
  }, [communityId]);

  // Optimize images for better performance
  const optimizeImage = useCallback((img: HTMLImageElement) => {
    const originalSrc = img.dataset.src || img.src;
    
    // Check if we have cached optimization data
    const cacheKey = `image:${originalSrc}`;
    const cachedMetadata = communityCacheService.get(cacheKey);
    
    if (cachedMetadata?.optimizedUrl) {
      img.src = cachedMetadata.optimizedUrl;
      return;
    }

    // Generate optimized image URL based on container size
    const container = img.parentElement;
    if (container) {
      const { width, height } = container.getBoundingClientRect();
      const devicePixelRatio = window.devicePixelRatio || 1;
      
      const targetWidth = Math.ceil(width * devicePixelRatio);
      const targetHeight = Math.ceil(height * devicePixelRatio);
      
      // Use image optimization service (placeholder implementation)
      const optimizedUrl = `${originalSrc}?w=${targetWidth}&h=${targetHeight}&q=80&f=webp`;
      
      // Cache the optimization metadata
      communityCacheService.cacheImageMetadata(originalSrc, {
        optimizedUrl,
        dimensions: { width: targetWidth, height: targetHeight },
        format: 'webp'
      });
      
      img.src = optimizedUrl;
    }
  }, []);

  // Fetch related communities for preloading
  const fetchRelatedCommunities = useCallback(async () => {
    try {
      const response = await fetch(`/api/communities/${communityId}/related?limit=5`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Failed to fetch related communities:', error);
    }
    return [];
  }, [communityId]);

  // Render functions (simplified implementations)
  const renderPosts = (element: HTMLElement, posts: any[]) => {
    element.innerHTML = posts.map(post => `
      <div class="post-item" data-post-id="${post.id}">
        <h4>${post.title || 'Post'}</h4>
        <p>${post.content.slice(0, 100)}...</p>
      </div>
    `).join('');
    
    element.classList.add('loaded');
  };

  const renderMembers = (element: HTMLElement, members: any[]) => {
    element.innerHTML = members.map(member => `
      <div class="member-item" data-member-id="${member.id}">
        <span>${member.ensName || member.address.slice(0, 8)}...</span>
      </div>
    `).join('');
    
    element.classList.add('loaded');
  };

  const renderStats = (element: HTMLElement, stats: any) => {
    element.innerHTML = `
      <div class="stats-grid">
        <div class="stat">
          <span class="stat-value">${stats.memberCount || 0}</span>
          <span class="stat-label">Members</span>
        </div>
        <div class="stat">
          <span class="stat-value">${stats.postCount || 0}</span>
          <span class="stat-label">Posts</span>
        </div>
      </div>
    `;
    
    element.classList.add('loaded');
  };

  // Cleanup observers
  const cleanupObservers = () => {
    intersectionObserverRef.current?.disconnect();
    imageObserverRef.current?.disconnect();
  };

  // Performance monitoring
  useEffect(() => {
    const measureRenderTime = () => {
      const renderTime = Date.now() - startTimeRef.current;
      performanceRef.current.renderTime = renderTime;
      
      // Report performance metrics
      if (process.env.NODE_ENV === 'development') {
        console.log('Community Performance Metrics:', performanceRef.current);
      }
    };

    // Measure after initial render
    const timer = setTimeout(measureRenderTime, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="community-performance-optimizer">
      {children}
      
      <style jsx>{`
        .community-performance-optimizer {
          position: relative;
        }

        /* Loading states for lazy-loaded content */
        [data-lazy-type]:not(.loaded) {
          min-height: 200px;
          background: linear-gradient(90deg, 
            var(--bg-secondary) 25%, 
            var(--bg-tertiary) 50%, 
            var(--bg-secondary) 75%
          );
          background-size: 200% 100%;
          animation: loading-shimmer 1.5s infinite;
          border-radius: 0.5rem;
        }

        @keyframes loading-shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        /* Optimized image loading */
        img[data-optimize] {
          transition: opacity 0.3s ease;
        }

        img[data-optimize]:not([src]) {
          opacity: 0;
        }

        img[data-optimize][src] {
          opacity: 1;
        }

        /* Performance indicators (development only) */
        .performance-indicator {
          position: fixed;
          top: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          z-index: 9999;
          display: none;
        }

        .performance-indicator.show {
          display: block;
        }

        /* Lazy-loaded content styles */
        .post-item {
          padding: 1rem;
          border: 1px solid var(--border-light);
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          background: var(--bg-secondary);
        }

        .post-item h4 {
          margin: 0 0 0.5rem 0;
          color: var(--text-primary);
        }

        .post-item p {
          margin: 0;
          color: var(--text-secondary);
        }

        .member-item {
          padding: 0.5rem;
          border: 1px solid var(--border-light);
          border-radius: 0.25rem;
          margin-bottom: 0.5rem;
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 1rem;
        }

        .stat {
          text-align: center;
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: 0.5rem;
        }

        .stat-value {
          display: block;
          font-size: 1.5rem;
          font-weight: bold;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Responsive optimizations */
        @media (max-width: 768px) {
          [data-lazy-type]:not(.loaded) {
            min-height: 150px;
          }
          
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          [data-lazy-type]:not(.loaded) {
            animation: none;
            background: var(--bg-secondary);
          }
          
          img[data-optimize] {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
};

export default CommunityPerformanceOptimizer;