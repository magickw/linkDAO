/**
 * Component Performance Tests
 * Tests for React component rendering performance, virtual scrolling, and UI responsiveness
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedPage } from '@/components/Feed/FeedPage';
import { EnhancedPostCard } from '@/components/Feed/EnhancedPostCard';
import { PostComposer } from '@/components/Feed/PostComposer';
import { VirtualScrolling } from '@/components/VirtualScrolling';
import { CommunityPage } from '@/components/Community/CommunityPage';
import testUtils from '../setup/testSetup';

// Performance measurement utilities
class ComponentPerformanceMonitor {
  private renderTimes: Map<string, number[]> = new Map();
  private interactionTimes: Map<string, number[]> = new Map();

  measureRender<T>(componentName: string, renderFn: () => T): T {
    const startTime = performance.now();
    const result = renderFn();
    const endTime = performance.now();
    
    if (!this.renderTimes.has(componentName)) {
      this.renderTimes.set(componentName, []);
    }
    this.renderTimes.get(componentName)!.push(endTime - startTime);
    
    return result;
  }

  measureInteraction(interactionName: string, interactionFn: () => Promise<void> | void): Promise<void> {
    const startTime = performance.now();
    
    const result = interactionFn();
    
    if (result instanceof Promise) {
      return result.then(() => {
        const endTime = performance.now();
        this.recordInteractionTime(interactionName, endTime - startTime);
      });
    } else {
      const endTime = performance.now();
      this.recordInteractionTime(interactionName, endTime - startTime);
      return Promise.resolve();
    }
  }

  private recordInteractionTime(name: string, time: number) {
    if (!this.interactionTimes.has(name)) {
      this.interactionTimes.set(name, []);
    }
    this.interactionTimes.get(name)!.push(time);
  }

  getRenderStats(componentName: string) {
    const times = this.renderTimes.get(componentName) || [];
    return this.calculateStats(times);
  }

  getInteractionStats(interactionName: string) {
    const times = this.interactionTimes.get(interactionName) || [];
    return this.calculateStats(times);
  }

  private calculateStats(times: number[]) {
    if (times.length === 0) return null;
    
    const sorted = [...times].sort((a, b) => a - b);
    return {
      count: times.length,
      average: times.reduce((sum, time) => sum + time, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  clear() {
    this.renderTimes.clear();
    this.interactionTimes.clear();
  }
}

const perfMonitor = new ComponentPerformanceMonitor();

// Mock React Profiler for detailed performance analysis
const mockProfiler = {
  onRender: jest.fn()
};

const ProfiledComponent: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  return (
    <React.Profiler id={id} onRender={mockProfiler.onRender}>
      {children}
    </React.Profiler>
  );
};

describe('Component Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    perfMonitor.clear();
    
    // Mock IntersectionObserver for virtual scrolling
    testUtils.mockIntersectionObserver();
    
    // Mock ResizeObserver
    testUtils.mockResizeObserver();
  });

  describe('Feed Component Performance', () => {
    it('should render FeedPage within performance budget', async () => {
      const mockPosts = Array.from({ length: 50 }, (_, i) => 
        testUtils.createMockPost({ id: `post-${i}` })
      );

      const iterations = 10;
      const renderTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const { unmount } = perfMonitor.measureRender('FeedPage', () =>
          render(
            <ProfiledComponent id="FeedPage">
              <FeedPage initialPosts={mockPosts} />
            </ProfiledComponent>
          )
        );

        await waitFor(() => {
          expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
        });

        unmount();
      }

      const stats = perfMonitor.getRenderStats('FeedPage');
      
      // Feed page should render quickly
      expect(stats!.average).toBeLessThan(100); // Average under 100ms
      expect(stats!.p95).toBeLessThan(200); // 95th percentile under 200ms
      expect(stats!.max).toBeLessThan(500); // No render over 500ms

      console.log(`FeedPage Render Performance:
        Iterations: ${iterations}
        Average: ${stats!.average.toFixed(2)}ms
        P95: ${stats!.p95.toFixed(2)}ms
        Max: ${stats!.max.toFixed(2)}ms`);
    });

    it('should handle large datasets with virtual scrolling efficiently', async () => {
      const largeFeed = Array.from({ length: 10000 }, (_, i) => 
        testUtils.createMockPost({ id: `large-post-${i}` })
      );

      const renderStart = performance.now();
      
      const { container } = render(
        <ProfiledComponent id="LargeFeed">
          <VirtualScrolling
            items={largeFeed}
            itemHeight={200}
            containerHeight={800}
            renderItem={(post) => (
              <EnhancedPostCard key={post.id} post={post} />
            )}
          />
        </ProfiledComponent>
      );
      
      const renderEnd = performance.now();
      const renderTime = renderEnd - renderStart;

      await waitFor(() => {
        expect(screen.getByTestId('virtual-scroll-container')).toBeInTheDocument();
      });

      // Should only render visible items
      const renderedPosts = container.querySelectorAll('[data-testid="post-card"]');
      
      // Virtual scrolling should be efficient
      expect(renderTime).toBeLessThan(200); // Initial render under 200ms
      expect(renderedPosts.length).toBeLessThan(50); // Much less than total items
      expect(renderedPosts.length).toBeGreaterThan(0); // But some items rendered

      console.log(`Virtual Scrolling Performance:
        Total Items: ${largeFeed.length}
        Rendered Items: ${renderedPosts.length}
        Render Time: ${renderTime.toFixed(2)}ms
        Efficiency: ${((largeFeed.length - renderedPosts.length) / largeFeed.length * 100).toFixed(1)}% items virtualized`);
    });

    it('should maintain smooth scrolling performance', async () => {
      const mockPosts = Array.from({ length: 100 }, (_, i) => 
        testUtils.createMockPost({ id: `scroll-post-${i}` })
      );

      render(
        <VirtualScrolling
          items={mockPosts}
          itemHeight={200}
          containerHeight={800}
          renderItem={(post) => (
            <EnhancedPostCard key={post.id} post={post} />
          )}
        />
      );

      const virtualContainer = screen.getByTestId('virtual-scroll-container');
      const scrollTimes: number[] = [];

      // Simulate rapid scrolling
      for (let i = 0; i < 20; i++) {
        await perfMonitor.measureInteraction('scroll', async () => {
          act(() => {
            fireEvent.scroll(virtualContainer, { 
              target: { scrollTop: i * 100 } 
            });
          });
        });
      }

      const scrollStats = perfMonitor.getInteractionStats('scroll');
      
      // Scroll operations should be fast
      expect(scrollStats!.average).toBeLessThan(16); // Under 16ms for 60fps
      expect(scrollStats!.max).toBeLessThan(50); // No scroll over 50ms

      console.log(`Scroll Performance:
        Scroll Events: ${scrollStats!.count}
        Average: ${scrollStats!.average.toFixed(2)}ms
        Max: ${scrollStats!.max.toFixed(2)}ms
        60fps Target: ${scrollStats!.average < 16 ? '✓' : '✗'}`);
    });
  });

  describe('Post Component Performance', () => {
    it('should render individual post cards efficiently', async () => {
      const mockPost = testUtils.createMockPost({
        reactions: Array.from({ length: 10 }, (_, i) => ({
          type: '🔥',
          users: Array.from({ length: 20 }, (_, j) => ({
            address: `0xuser${i}-${j}`,
            username: `user${i}-${j}`,
            avatar: `/avatar${i}-${j}.png`,
            amount: 1,
            timestamp: new Date()
          })),
          totalAmount: 20,
          tokenType: 'LDAO'
        }))
      });

      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        const { unmount } = perfMonitor.measureRender('PostCard', () =>
          render(
            <ProfiledComponent id="PostCard">
              <EnhancedPostCard post={mockPost} />
            </ProfiledComponent>
          )
        );

        await waitFor(() => {
          expect(screen.getByTestId('post-card')).toBeInTheDocument();
        });

        unmount();
      }

      const stats = perfMonitor.getRenderStats('PostCard');
      
      // Individual post cards should render very quickly
      expect(stats!.average).toBeLessThan(20); // Average under 20ms
      expect(stats!.max).toBeLessThan(100); // No render over 100ms

      console.log(`PostCard Render Performance:
        Iterations: ${iterations}
        Average: ${stats!.average.toFixed(2)}ms
        Max: ${stats!.max.toFixed(2)}ms`);
    });

    it('should handle post interactions responsively', async () => {
      const mockPost = testUtils.createMockPost();
      const mockOnReaction = jest.fn().mockResolvedValue(undefined);

      render(
        <EnhancedPostCard 
          post={mockPost} 
          onReaction={mockOnReaction}
        />
      );

      const reactionButton = screen.getByRole('button', { name: /🔥/ });
      const shareButton = screen.getByRole('button', { name: /share/i });
      const commentButton = screen.getByRole('button', { name: /comment/i });

      const interactions = [
        { name: 'reaction', element: reactionButton },
        { name: 'share', element: shareButton },
        { name: 'comment', element: commentButton }
      ];

      for (const interaction of interactions) {
        const iterations = 10;
        
        for (let i = 0; i < iterations; i++) {
          await perfMonitor.measureInteraction(interaction.name, async () => {
            await userEvent.click(interaction.element);
          });
        }
      }

      // All interactions should be responsive
      interactions.forEach(interaction => {
        const stats = perfMonitor.getInteractionStats(interaction.name);
        expect(stats!.average).toBeLessThan(50); // Average under 50ms
        
        console.log(`${interaction.name} Interaction Performance:
          Average: ${stats!.average.toFixed(2)}ms
          Max: ${stats!.max.toFixed(2)}ms`);
      });
    });

    it('should optimize post composer performance', async () => {
      const { container } = render(
        <ProfiledComponent id="PostComposer">
          <PostComposer />
        </ProfiledComponent>
      );

      const textArea = screen.getByPlaceholderText("What's on your mind?");
      
      // Test typing performance
      const typingIterations = 50;
      const longText = 'A'.repeat(1000);

      for (let i = 0; i < typingIterations; i++) {
        await perfMonitor.measureInteraction('typing', async () => {
          const chunk = longText.substring(0, (i + 1) * 20);
          await userEvent.clear(textArea);
          await userEvent.type(textArea, chunk);
        });
      }

      const typingStats = perfMonitor.getInteractionStats('typing');
      
      // Typing should be responsive
      expect(typingStats!.average).toBeLessThan(100); // Average under 100ms
      expect(typingStats!.max).toBeLessThan(300); // No typing event over 300ms

      console.log(`Post Composer Typing Performance:
        Iterations: ${typingIterations}
        Average: ${typingStats!.average.toFixed(2)}ms
        Max: ${typingStats!.max.toFixed(2)}ms`);
    });
  });

  describe('Community Component Performance', () => {
    it('should render community page efficiently', async () => {
      const mockCommunity = testUtils.createMockCommunity({
        posts: Array.from({ length: 30 }, (_, i) => 
          testUtils.createMockPost({ id: `community-post-${i}` })
        )
      });

      const iterations = 5;

      for (let i = 0; i < iterations; i++) {
        const { unmount } = perfMonitor.measureRender('CommunityPage', () =>
          render(
            <ProfiledComponent id="CommunityPage">
              <CommunityPage community={mockCommunity} />
            </ProfiledComponent>
          )
        );

        await waitFor(() => {
          expect(screen.getByTestId('community-header')).toBeInTheDocument();
        });

        unmount();
      }

      const stats = perfMonitor.getRenderStats('CommunityPage');
      
      // Community page should render reasonably quickly
      expect(stats!.average).toBeLessThan(200); // Average under 200ms
      expect(stats!.max).toBeLessThan(500); // No render over 500ms

      console.log(`CommunityPage Render Performance:
        Iterations: ${iterations}
        Average: ${stats!.average.toFixed(2)}ms
        Max: ${stats!.max.toFixed(2)}ms`);
    });

    it('should handle community interactions efficiently', async () => {
      const mockCommunity = testUtils.createMockCommunity();
      const mockOnJoin = jest.fn().mockResolvedValue(undefined);

      render(
        <CommunityPage 
          community={mockCommunity} 
          onJoin={mockOnJoin}
        />
      );

      const joinButton = screen.getByRole('button', { name: /join/i });
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        await perfMonitor.measureInteraction('community-join', async () => {
          await userEvent.click(joinButton);
        });
      }

      const joinStats = perfMonitor.getInteractionStats('community-join');
      
      // Community interactions should be responsive
      expect(joinStats!.average).toBeLessThan(50); // Average under 50ms

      console.log(`Community Join Performance:
        Iterations: ${iterations}
        Average: ${joinStats!.average.toFixed(2)}ms`);
    });
  });

  describe('Memory Performance', () => {
    it('should manage component memory efficiently', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const components: any[] = [];

      // Create and destroy many components
      for (let i = 0; i < 100; i++) {
        const mockPost = testUtils.createMockPost({ id: `memory-test-${i}` });
        
        const { unmount } = render(
          <EnhancedPostCard post={mockPost} />
        );
        
        components.push(unmount);
        
        // Unmount every 10 components
        if (i % 10 === 9) {
          components.forEach(unmountFn => unmountFn());
          components.length = 0;
          
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
        }
      }

      // Clean up remaining components
      components.forEach(unmountFn => unmountFn());

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryGrowth = finalMemory - initialMemory;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);

      // Memory growth should be reasonable
      expect(memoryGrowthMB).toBeLessThan(10); // Less than 10MB growth

      console.log(`Component Memory Management:
        Components Created: 100
        Memory Growth: ${memoryGrowthMB.toFixed(2)}MB
        Memory Efficiency: ${memoryGrowthMB < 5 ? 'Good' : 'Needs Improvement'}`);
    });

    it('should handle component updates without memory leaks', async () => {
      const mockPost = testUtils.createMockPost();
      
      const { rerender } = render(
        <EnhancedPostCard post={mockPost} />
      );

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Perform many updates
      for (let i = 0; i < 100; i++) {
        const updatedPost = {
          ...mockPost,
          engagementScore: mockPost.engagementScore + i,
          reactions: [
            ...mockPost.reactions,
            {
              type: '👍',
              users: [{
                address: `0xuser${i}`,
                username: `user${i}`,
                avatar: `/avatar${i}.png`,
                amount: 1,
                timestamp: new Date()
              }],
              totalAmount: 1,
              tokenType: 'LDAO'
            }
          ]
        };

        rerender(<EnhancedPostCard post={updatedPost} />);
      }

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryGrowth = finalMemory - initialMemory;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);

      // Memory growth from updates should be minimal
      expect(memoryGrowthMB).toBeLessThan(5); // Less than 5MB growth

      console.log(`Component Update Memory:
        Updates: 100
        Memory Growth: ${memoryGrowthMB.toFixed(2)}MB`);
    });
  });

  describe('Concurrent Rendering Performance', () => {
    it('should handle concurrent component renders efficiently', async () => {
      const concurrentRenders = 20;
      const mockPosts = Array.from({ length: concurrentRenders }, (_, i) => 
        testUtils.createMockPost({ id: `concurrent-${i}` })
      );

      const renderStart = performance.now();
      
      // Render multiple components concurrently
      const renderPromises = mockPosts.map((post, i) =>
        new Promise<void>(resolve => {
          setTimeout(() => {
            render(
              <ProfiledComponent id={`ConcurrentPost-${i}`}>
                <EnhancedPostCard post={post} />
              </ProfiledComponent>
            );
            resolve();
          }, Math.random() * 10); // Random delay up to 10ms
        })
      );

      await Promise.all(renderPromises);
      
      const renderEnd = performance.now();
      const totalTime = renderEnd - renderStart;
      const averageTime = totalTime / concurrentRenders;

      // Concurrent rendering should be efficient
      expect(totalTime).toBeLessThan(1000); // Total under 1 second
      expect(averageTime).toBeLessThan(100); // Average under 100ms per component

      console.log(`Concurrent Rendering Performance:
        Components: ${concurrentRenders}
        Total Time: ${totalTime.toFixed(2)}ms
        Average per Component: ${averageTime.toFixed(2)}ms`);
    });

    it('should maintain performance under rapid state changes', async () => {
      const mockPost = testUtils.createMockPost();
      const [post, setPost] = React.useState(mockPost);

      const TestComponent = () => (
        <EnhancedPostCard post={post} />
      );

      const { rerender } = render(<TestComponent />);

      const stateChanges = 50;
      const changeStart = performance.now();

      // Rapid state changes
      for (let i = 0; i < stateChanges; i++) {
        const updatedPost = {
          ...mockPost,
          engagementScore: mockPost.engagementScore + i,
          views: mockPost.views + i * 10
        };

        act(() => {
          rerender(<EnhancedPostCard post={updatedPost} />);
        });
      }

      const changeEnd = performance.now();
      const totalTime = changeEnd - changeStart;
      const averageTime = totalTime / stateChanges;

      // Rapid state changes should be handled efficiently
      expect(averageTime).toBeLessThan(10); // Average under 10ms per change
      expect(totalTime).toBeLessThan(500); // Total under 500ms

      console.log(`Rapid State Changes Performance:
        Changes: ${stateChanges}
        Total Time: ${totalTime.toFixed(2)}ms
        Average per Change: ${averageTime.toFixed(2)}ms`);
    });
  });

  describe('React Profiler Analysis', () => {
    it('should analyze component render phases', async () => {
      const mockPosts = Array.from({ length: 10 }, (_, i) => 
        testUtils.createMockPost({ id: `profiler-${i}` })
      );

      render(
        <ProfiledComponent id="ProfilerAnalysis">
          <FeedPage initialPosts={mockPosts} />
        </ProfiledComponent>
      );

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      // Analyze profiler data
      expect(mockProfiler.onRender).toHaveBeenCalled();
      
      const profilerCalls = mockProfiler.onRender.mock.calls;
      const renderPhases = profilerCalls.map(call => ({
        id: call[0],
        phase: call[1], // 'mount' or 'update'
        actualDuration: call[2],
        baseDuration: call[3],
        startTime: call[4],
        commitTime: call[5]
      }));

      // Analyze render performance
      const mountPhases = renderPhases.filter(p => p.phase === 'mount');
      const updatePhases = renderPhases.filter(p => p.phase === 'update');

      if (mountPhases.length > 0) {
        const avgMountTime = mountPhases.reduce((sum, p) => sum + p.actualDuration, 0) / mountPhases.length;
        expect(avgMountTime).toBeLessThan(100); // Average mount under 100ms
        
        console.log(`React Profiler Analysis:
          Mount Phases: ${mountPhases.length}
          Update Phases: ${updatePhases.length}
          Average Mount Time: ${avgMountTime.toFixed(2)}ms`);
      }
    });
  });
});