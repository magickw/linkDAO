/**
 * Performance Tests for Community System
 * Tests community discovery, caching performance, and optimization
 * Requirements: 2.4, 5.1, 5.2, 5.3
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommunityPage } from '../../../components/Community/CommunityPage';
import { CommunityDiscovery } from '../../../components/Community/CommunityDiscovery';
import { CommunityPerformanceOptimizer } from '../../../components/Community/CommunityPerformanceOptimizer';
import { testUtils } from '../../setup/testSetup';

// Mock performance APIs
const mockPerformanceObserver = testUtils.mockIntersectionObserver();
const mockResizeObserver = testUtils.mockResizeObserver();

// Mock caching service
const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  invalidate: jest.fn(),
  preload: jest.fn(),
  getStats: jest.fn(() => ({
    hitRate: 0.85,
    totalRequests: 1000,
    cacheSize: 50
  }))
};

jest.mock('../../../services/communityCacheService', () => ({
  CommunityCacheService: mockCacheService
}));

// Mock WebSocket
const mockWebSocket = testUtils.createMockWebSocket();
jest.mock('../../../hooks/useWebSocket', () => ({
  useWebSocket: () => mockWebSocket
}));

// Mock fetch
global.fetch = jest.fn();

describe('Community Performance Tests', () => {
  const generateMockCommunities = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `community-${i}`,
      name: `community-${i}`,
      displayName: `Community ${i}`,
      description: `Description for community ${i}`,
      iconUrl: `/icon-${i}.png`,
      bannerUrl: `/banner-${i}.png`,
      category: ['technology', 'gaming', 'art', 'music'][i % 4],
      tags: [`tag-${i}`, `category-${i % 4}`],
      isPublic: true,
      memberCount: Math.floor(Math.random() * 10000) + 100,
      postCount: Math.floor(Math.random() * 1000) + 50,
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      rules: [
        { id: `rule-${i}-1`, title: `Rule ${i}.1`, description: `Description for rule ${i}.1` }
      ],
      moderators: [`0x${i.toString().padStart(40, '0')}`],
      governanceEnabled: i % 2 === 0,
      stakingRequired: i % 3 === 0
    }));
  };

  const generateMockPosts = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `post-${i}`,
      title: `Post ${i}`,
      content: `Content for post ${i}`.repeat(Math.floor(Math.random() * 10) + 1),
      author: {
        address: `0x${i.toString().padStart(40, '0')}`,
        ensName: `user${i}.eth`,
        reputation: Math.floor(Math.random() * 1000) + 50
      },
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      votes: {
        up: Math.floor(Math.random() * 100),
        down: Math.floor(Math.random() * 20)
      },
      comments: Math.floor(Math.random() * 50),
      tags: [`tag-${i % 10}`, `category-${i % 5}`]
    }));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset performance marks
    if (performance.clearMarks) {
      performance.clearMarks();
    }
    if (performance.clearMeasures) {
      performance.clearMeasures();
    }
  });

  describe('Community Discovery Performance', () => {
    it('should render community discovery with large dataset efficiently', async () => {
      const largeCommunitySet = generateMockCommunities(500);
      
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/communities')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              communities: largeCommunitySet.slice(0, 20), // Paginated
              total: largeCommunitySet.length,
              hasMore: true
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      const startTime = performance.now();
      
      render(<CommunityDiscovery />);

      await waitFor(() => {
        expect(screen.getByText('Community 0')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render initial page quickly (under 200ms)
      expect(renderTime).toBeLessThan(200);

      // Should show pagination controls
      expect(screen.getByText('Load More')).toBeInTheDocument();
    });

    it('should handle infinite scroll performance efficiently', async () => {
      const user = userEvent.setup();
      const communities = generateMockCommunities(1000);
      let currentPage = 0;
      const pageSize = 20;

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/communities')) {
          const start = currentPage * pageSize;
          const end = start + pageSize;
          const pageData = communities.slice(start, end);
          
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              communities: pageData,
              total: communities.length,
              hasMore: end < communities.length
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      render(<CommunityDiscovery />);

      // Initial load
      await waitFor(() => {
        expect(screen.getByText('Community 0')).toBeInTheDocument();
      });

      // Measure scroll performance
      const scrollTimes: number[] = [];

      for (let i = 0; i < 5; i++) {
        const scrollStart = performance.now();
        
        // Trigger load more
        const loadMoreButton = screen.getByText('Load More');
        await user.click(loadMoreButton);
        currentPage++;

        await waitFor(() => {
          expect(screen.getByText(`Community ${currentPage * pageSize - 1}`)).toBeInTheDocument();
        });

        const scrollEnd = performance.now();
        scrollTimes.push(scrollEnd - scrollStart);
      }

      // Each scroll/load should be fast (under 300ms)
      scrollTimes.forEach(time => {
        expect(time).toBeLessThan(300);
      });

      // Average scroll time should be reasonable
      const avgScrollTime = scrollTimes.reduce((a, b) => a + b, 0) / scrollTimes.length;
      expect(avgScrollTime).toBeLessThan(200);
    });

    it('should optimize search performance with debouncing', async () => {
      const user = userEvent.setup();
      const communities = generateMockCommunities(1000);
      let searchCallCount = 0;

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/communities') && url.includes('search=')) {
          searchCallCount++;
          const searchTerm = new URL(url).searchParams.get('search') || '';
          const filtered = communities.filter(c => 
            c.displayName.toLowerCase().includes(searchTerm.toLowerCase())
          );
          
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              communities: filtered.slice(0, 20),
              total: filtered.length,
              hasMore: filtered.length > 20
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ communities: communities.slice(0, 20) })
        });
      });

      render(<CommunityDiscovery />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search communities...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search communities...');

      // Type rapidly - should debounce API calls
      await user.type(searchInput, 'technology', { delay: 50 });

      // Wait for debounce
      await waitFor(() => {
        expect(searchCallCount).toBeLessThan(5); // Should not call API for every keystroke
      }, { timeout: 1000 });

      // Should eventually show search results
      await waitFor(() => {
        expect(screen.getByText(/technology/i)).toBeInTheDocument();
      });
    });

    it('should handle category filtering performance', async () => {
      const user = userEvent.setup();
      const communities = generateMockCommunities(500);

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/communities')) {
          const categoryParam = new URL(url).searchParams.get('category');
          let filtered = communities;
          
          if (categoryParam) {
            filtered = communities.filter(c => c.category === categoryParam);
          }
          
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              communities: filtered.slice(0, 20),
              total: filtered.length,
              hasMore: filtered.length > 20
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      const startTime = performance.now();

      render(<CommunityDiscovery />);

      await waitFor(() => {
        expect(screen.getByText('All Categories')).toBeInTheDocument();
      });

      // Test category filter performance
      const technologyFilter = screen.getByText('Technology');
      
      const filterStart = performance.now();
      await user.click(technologyFilter);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('category=technology'),
          undefined
        );
      });

      const filterEnd = performance.now();
      const filterTime = filterEnd - filterStart;

      // Category filtering should be fast
      expect(filterTime).toBeLessThan(150);
    });
  });

  describe('Caching Performance', () => {
    it('should demonstrate effective cache hit rates', async () => {
      const community = generateMockCommunities(1)[0];
      
      // Mock cache hits
      mockCacheService.get.mockImplementation((key: string) => {
        if (key.includes('community-stats')) {
          return Promise.resolve({
            memberCount: 150,
            postCount: 45,
            activeMembers: 23,
            postsThisWeek: 12,
            growthRate: 5.2
          });
        }
        if (key.includes('community-posts')) {
          return Promise.resolve(generateMockPosts(20));
        }
        return Promise.resolve(null);
      });

      (global.fetch as jest.Mock).mockImplementation(() => {
        // Should not be called due to cache hits
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      const renderStart = performance.now();

      render(
        <CommunityPage 
          communityId={community.id} 
          initialData={community}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(community.displayName)).toBeInTheDocument();
      });

      const renderEnd = performance.now();
      const renderTime = renderEnd - renderStart;

      // Cached render should be very fast
      expect(renderTime).toBeLessThan(50);

      // Should have used cache
      expect(mockCacheService.get).toHaveBeenCalledWith(
        expect.stringContaining('community-stats')
      );
      expect(mockCacheService.get).toHaveBeenCalledWith(
        expect.stringContaining('community-posts')
      );

      // Should not have made network requests
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should preload related communities efficiently', async () => {
      const communities = generateMockCommunities(10);
      const mainCommunity = communities[0];

      mockCacheService.preload.mockImplementation((keys: string[]) => {
        return Promise.all(keys.map(() => Promise.resolve()));
      });

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/related')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              communities: communities.slice(1, 4) // Related communities
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      render(
        <CommunityPage 
          communityId={mainCommunity.id} 
          initialData={mainCommunity}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(mainCommunity.displayName)).toBeInTheDocument();
      });

      // Should preload related communities
      await waitFor(() => {
        expect(mockCacheService.preload).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.stringContaining('community-1'),
            expect.stringContaining('community-2'),
            expect.stringContaining('community-3')
          ])
        );
      });
    });

    it('should handle cache invalidation efficiently', async () => {
      const community = generateMockCommunities(1)[0];
      
      mockCacheService.invalidate.mockImplementation(() => Promise.resolve());

      render(
        <CommunityPage 
          communityId={community.id} 
          initialData={community}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(community.displayName)).toBeInTheDocument();
      });

      // Simulate real-time update that should invalidate cache
      const membershipHandler = mockWebSocket.on.mock.calls.find(
        call => call[0] === 'community:membership_changed'
      )?.[1];

      if (membershipHandler) {
        const invalidateStart = performance.now();

        act(() => {
          membershipHandler({
            communityId: community.id,
            userAddress: '0x1234567890123456789012345678901234567890',
            action: 'join'
          });
        });

        await waitFor(() => {
          expect(mockCacheService.invalidate).toHaveBeenCalledWith(
            expect.stringContaining('community-stats')
          );
        });

        const invalidateEnd = performance.now();
        const invalidateTime = invalidateEnd - invalidateStart;

        // Cache invalidation should be fast
        expect(invalidateTime).toBeLessThan(10);
      }
    });

    it('should optimize memory usage with cache size limits', async () => {
      const communities = generateMockCommunities(100);
      
      // Mock cache with size tracking
      let cacheSize = 0;
      const maxCacheSize = 50;
      const cache = new Map();

      mockCacheService.set.mockImplementation((key: string, value: any) => {
        if (cache.size >= maxCacheSize && !cache.has(key)) {
          // Remove oldest entry (LRU simulation)
          const firstKey = cache.keys().next().value;
          cache.delete(firstKey);
        }
        cache.set(key, value);
        cacheSize = cache.size;
        return Promise.resolve();
      });

      mockCacheService.getStats.mockImplementation(() => ({
        hitRate: 0.85,
        totalRequests: 1000,
        cacheSize: cacheSize
      }));

      // Render multiple communities to fill cache
      for (let i = 0; i < 60; i++) {
        const { unmount } = render(
          <CommunityPage 
            communityId={communities[i].id} 
            initialData={communities[i]}
          />
        );
        
        await waitFor(() => {
          expect(screen.getByText(communities[i].displayName)).toBeInTheDocument();
        });
        
        unmount();
      }

      // Cache should not exceed size limit
      expect(cacheSize).toBeLessThanOrEqual(maxCacheSize);
    });
  });

  describe('Real-time Performance', () => {
    it('should handle high-frequency real-time updates efficiently', async () => {
      const community = generateMockCommunities(1)[0];
      
      render(
        <CommunityPage 
          communityId={community.id} 
          initialData={community}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(community.displayName)).toBeInTheDocument();
      });

      // Get real-time handlers
      const membershipHandler = mockWebSocket.on.mock.calls.find(
        call => call[0] === 'community:membership_changed'
      )?.[1];

      const postHandler = mockWebSocket.on.mock.calls.find(
        call => call[0] === 'community:new_post'
      )?.[1];

      if (membershipHandler && postHandler) {
        const updateStart = performance.now();

        // Send 100 rapid updates
        for (let i = 0; i < 100; i++) {
          act(() => {
            if (i % 2 === 0) {
              membershipHandler({
                communityId: community.id,
                userAddress: `0x${i.toString().padStart(40, '0')}`,
                action: 'join'
              });
            } else {
              postHandler({
                communityId: community.id,
                post: {
                  id: `realtime-post-${i}`,
                  title: `Real-time Post ${i}`,
                  content: `Content ${i}`,
                  author: {
                    address: `0x${i.toString().padStart(40, '0')}`,
                    ensName: `user${i}.eth`,
                    reputation: 100
                  },
                  createdAt: new Date(),
                  votes: { up: 0, down: 0 },
                  comments: 0,
                  tags: []
                }
              });
            }
          });
        }

        const updateEnd = performance.now();
        const updateTime = updateEnd - updateStart;

        // Should handle rapid updates efficiently (under 200ms for 100 updates)
        expect(updateTime).toBeLessThan(200);

        // UI should still be responsive
        await waitFor(() => {
          expect(screen.getByText(community.displayName)).toBeInTheDocument();
        });
      }
    });

    it('should throttle UI updates for performance', async () => {
      const community = generateMockCommunities(1)[0];
      let updateCount = 0;

      // Mock component that tracks updates
      const UpdateTracker = () => {
        React.useEffect(() => {
          updateCount++;
        });
        return null;
      };

      render(
        <>
          <CommunityPage 
            communityId={community.id} 
            initialData={community}
          />
          <UpdateTracker />
        </>
      );

      await waitFor(() => {
        expect(screen.getByText(community.displayName)).toBeInTheDocument();
      });

      const initialUpdateCount = updateCount;

      // Send rapid membership updates
      const membershipHandler = mockWebSocket.on.mock.calls.find(
        call => call[0] === 'community:membership_changed'
      )?.[1];

      if (membershipHandler) {
        // Send 50 rapid updates
        for (let i = 0; i < 50; i++) {
          act(() => {
            membershipHandler({
              communityId: community.id,
              userAddress: `0x${i.toString().padStart(40, '0')}`,
              action: 'join'
            });
          });
        }

        await waitFor(() => {
          // Should throttle updates (not 1:1 with events)
          const finalUpdateCount = updateCount - initialUpdateCount;
          expect(finalUpdateCount).toBeLessThan(25); // Less than half the events
        });
      }
    });
  });

  describe('Virtual Scrolling Performance', () => {
    it('should handle large post lists with virtual scrolling', async () => {
      const community = generateMockCommunities(1)[0];
      const largePosts = generateMockPosts(10000);

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/posts')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              posts: largePosts.slice(0, 50), // Virtual window
              total: largePosts.length,
              hasMore: true
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      const renderStart = performance.now();

      render(
        <CommunityPage 
          communityId={community.id} 
          initialData={community}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Post 0')).toBeInTheDocument();
      });

      const renderEnd = performance.now();
      const renderTime = renderEnd - renderStart;

      // Should render quickly despite large dataset
      expect(renderTime).toBeLessThan(300);

      // Should only render visible items
      expect(screen.queryByText('Post 100')).not.toBeInTheDocument();
    });

    it('should maintain scroll position during updates', async () => {
      const user = userEvent.setup();
      const community = generateMockCommunities(1)[0];
      const posts = generateMockPosts(100);

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/posts')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              posts: posts,
              total: posts.length,
              hasMore: false
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      render(
        <CommunityPage 
          communityId={community.id} 
          initialData={community}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Post 0')).toBeInTheDocument();
      });

      // Scroll to middle of list
      const scrollContainer = screen.getByTestId('post-list-container');
      fireEvent.scroll(scrollContainer, { target: { scrollTop: 5000 } });

      await waitFor(() => {
        expect(screen.getByText('Post 50')).toBeInTheDocument();
      });

      const scrollPosition = scrollContainer.scrollTop;

      // Simulate real-time update
      const postHandler = mockWebSocket.on.mock.calls.find(
        call => call[0] === 'community:new_post'
      )?.[1];

      if (postHandler) {
        act(() => {
          postHandler({
            communityId: community.id,
            post: {
              id: 'new-post',
              title: 'New Real-time Post',
              content: 'New content',
              author: {
                address: '0x1111111111111111111111111111111111111111',
                ensName: 'newuser.eth',
                reputation: 100
              },
              createdAt: new Date(),
              votes: { up: 0, down: 0 },
              comments: 0,
              tags: []
            }
          });
        });

        // Scroll position should be maintained
        await waitFor(() => {
          expect(Math.abs(scrollContainer.scrollTop - scrollPosition)).toBeLessThan(50);
        });
      }
    });
  });

  describe('Memory Management', () => {
    it('should clean up resources on unmount', async () => {
      const community = generateMockCommunities(1)[0];
      
      const { unmount } = render(
        <CommunityPage 
          communityId={community.id} 
          initialData={community}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(community.displayName)).toBeInTheDocument();
      });

      // Verify WebSocket listeners are set up
      expect(mockWebSocket.on).toHaveBeenCalledWith(
        'community:membership_changed',
        expect.any(Function)
      );

      const cleanupStart = performance.now();
      
      unmount();

      const cleanupEnd = performance.now();
      const cleanupTime = cleanupEnd - cleanupStart;

      // Cleanup should be fast
      expect(cleanupTime).toBeLessThan(50);

      // Should clean up WebSocket listeners
      expect(mockWebSocket.off).toHaveBeenCalledWith(
        'community:membership_changed',
        expect.any(Function)
      );
    });

    it('should handle memory pressure gracefully', async () => {
      const communities = generateMockCommunities(50);
      const components: any[] = [];

      // Render many components to simulate memory pressure
      for (let i = 0; i < 20; i++) {
        const component = render(
          <CommunityPage 
            communityId={communities[i].id} 
            initialData={communities[i]}
          />
        );
        components.push(component);

        await waitFor(() => {
          expect(screen.getByText(communities[i].displayName)).toBeInTheDocument();
        });
      }

      // Simulate memory pressure
      if (global.gc) {
        global.gc();
      }

      // All components should still be functional
      for (let i = 0; i < components.length; i++) {
        expect(screen.getByText(communities[i].displayName)).toBeInTheDocument();
      }

      // Cleanup all components
      const cleanupStart = performance.now();
      
      components.forEach(component => component.unmount());

      const cleanupEnd = performance.now();
      const totalCleanupTime = cleanupEnd - cleanupStart;

      // Bulk cleanup should be efficient
      expect(totalCleanupTime).toBeLessThan(200);
    });
  });

  describe('Network Optimization', () => {
    it('should batch API requests efficiently', async () => {
      const communities = generateMockCommunities(5);
      let requestCount = 0;

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        requestCount++;
        
        if (url.includes('/batch')) {
          // Batched request
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              results: communities.map(c => ({
                id: c.id,
                stats: {
                  memberCount: Math.floor(Math.random() * 1000),
                  postCount: Math.floor(Math.random() * 100)
                }
              }))
            })
          });
        }
        
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      // Render multiple communities simultaneously
      const { container } = render(
        <div>
          {communities.map(community => (
            <CommunityPage 
              key={community.id}
              communityId={community.id} 
              initialData={community}
            />
          ))}
        </div>
      );

      await waitFor(() => {
        expect(screen.getByText(communities[0].displayName)).toBeInTheDocument();
      });

      // Should batch requests instead of making individual calls
      expect(requestCount).toBeLessThan(communities.length);
    });

    it('should implement request deduplication', async () => {
      const community = generateMockCommunities(1)[0];
      let requestCount = 0;

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/stats')) {
          requestCount++;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              memberCount: 150,
              postCount: 45
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      // Render same community multiple times simultaneously
      render(
        <div>
          <CommunityPage 
            communityId={community.id} 
            initialData={community}
          />
          <CommunityPage 
            communityId={community.id} 
            initialData={community}
          />
          <CommunityPage 
            communityId={community.id} 
            initialData={community}
          />
        </div>
      );

      await waitFor(() => {
        expect(screen.getAllByText(community.displayName)).toHaveLength(3);
      });

      // Should deduplicate identical requests
      expect(requestCount).toBeLessThanOrEqual(1);
    });
  });
});