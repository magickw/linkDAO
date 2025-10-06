import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileTestUtils, mobileMatchers, MOBILE_DEVICES, NETWORK_CONDITIONS } from './MobileTestUtils';
import { MobileLayout } from '../../components/Mobile/MobileLayout';
import { MobileBottomNavigation } from '../../components/Mobile/MobileBottomNavigation';
import { MobileDataSavingProvider, DataSavingSettings } from '../../components/Mobile/MobileDataSavingMode';
import { MobileProgressiveImage } from '../../components/Mobile/MobileProgressiveImage';
import { MobileTouchGestureHandler, SwipeActions } from '../../components/Mobile/MobileTouchGestureHandler';

// Extend Jest matchers
expect.extend(mobileMatchers);

// Mock components for testing
const MockMobileApp: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MobileDataSavingProvider>
    <MobileLayout
      currentPath="/"
      onNavigate={() => {}}
      userAddress="0x1234567890123456789012345678901234567890"
      userName="Test User"
    >
      {children}
    </MobileLayout>
  </MobileDataSavingProvider>
);

const MockPostCard: React.FC<{ onLike?: () => void; onBookmark?: () => void }> = ({ 
  onLike, 
  onBookmark 
}) => (
  <MobileTouchGestureHandler
    rightSwipeAction={{
      ...SwipeActions.like,
      action: onLike || (() => {})
    }}
    leftSwipeAction={{
      ...SwipeActions.bookmark,
      action: onBookmark || (() => {})
    }}
  >
    <div 
      data-testid="post-card"
      className="p-4 border border-gray-200 rounded-lg"
    >
      <h3>Test Post</h3>
      <p>This is a test post for mobile testing.</p>
      <div className="flex space-x-2 mt-2">
        <button 
          data-testid="like-button"
          className="px-4 py-2 bg-blue-500 text-white rounded"
          onClick={onLike}
        >
          Like
        </button>
        <button 
          data-testid="bookmark-button"
          className="px-4 py-2 bg-gray-500 text-white rounded"
          onClick={onBookmark}
        >
          Bookmark
        </button>
      </div>
    </div>
  </MobileTouchGestureHandler>
);

const MockImageGallery: React.FC = () => (
  <div data-testid="image-gallery" className="grid grid-cols-2 gap-4">
    {[1, 2, 3, 4].map(i => (
      <MobileProgressiveImage
        key={i}
        src={`https://example.com/image-${i}.jpg`}
        alt={`Test image ${i}`}
        width={200}
        height={200}
        data-testid={`image-${i}`}
      />
    ))}
  </div>
);

describe('Mobile Integration Tests', () => {
  beforeEach(() => {
    // Reset DOM and mocks
    document.body.innerHTML = '';
    jest.clearAllMocks();
    
    // Mock IntersectionObserver
    global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));

    // Mock ResizeObserver
    global.ResizeObserver = jest.fn().mockImplementation((callback) => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
  });

  describe('Device Compatibility', () => {
    it('should render correctly on iPhone 12', async () => {
      const device = MobileTestUtils.mockMobileDevice('iPhone12');
      
      render(
        <MockMobileApp>
          <MockPostCard />
        </MockMobileApp>
      );

      await waitFor(() => {
        const postCard = screen.getByTestId('post-card');
        expect(postCard).toBeResponsive(0, device.width);
      });
    });

    it('should render correctly on Galaxy S21', async () => {
      const device = MobileTestUtils.mockMobileDevice('galaxyS21');
      
      render(
        <MockMobileApp>
          <MockPostCard />
        </MockMobileApp>
      );

      await waitFor(() => {
        const postCard = screen.getByTestId('post-card');
        expect(postCard).toBeResponsive(0, device.width);
      });
    });

    it('should adapt to different screen sizes', async () => {
      const devices: Array<keyof typeof MOBILE_DEVICES> = [
        'iPhone12Mini',
        'iPhone12',
        'iPhone12ProMax',
        'galaxyS21',
        'iPad'
      ];

      await MobileTestUtils.testResponsiveDesign(
        <MockMobileApp>
          <MockPostCard />
        </MockMobileApp>,
        devices,
        (deviceName, deviceConfig) => {
          const postCard = screen.getByTestId('post-card');
          expect(postCard).toBeInTheDocument();
          expect(postCard).toBeResponsive(0, deviceConfig.width);
        }
      );
    });
  });

  describe('Touch Interactions', () => {
    it('should handle tap interactions', async () => {
      const mockOnLike = jest.fn();
      
      MobileTestUtils.mockMobileDevice('iPhone12');
      
      await MobileTestUtils.testTouchInteractions(
        <MockMobileApp>
          <MockPostCard onLike={mockOnLike} />
        </MockMobileApp>,
        [
          {
            element: 'like-button',
            type: 'tap',
            expectedResult: undefined
          }
        ]
      );

      expect(mockOnLike).toHaveBeenCalled();
    });

    it('should handle swipe gestures', async () => {
      const mockOnLike = jest.fn();
      const mockOnBookmark = jest.fn();
      
      MobileTestUtils.mockMobileDevice('iPhone12');
      
      await MobileTestUtils.testTouchInteractions(
        <MockMobileApp>
          <MockPostCard onLike={mockOnLike} onBookmark={mockOnBookmark} />
        </MockMobileApp>,
        [
          {
            element: 'post-card',
            type: 'swipeRight'
          },
          {
            element: 'post-card',
            type: 'swipeLeft'
          }
        ]
      );

      expect(mockOnLike).toHaveBeenCalled();
      expect(mockOnBookmark).toHaveBeenCalled();
    });

    it('should handle long press interactions', async () => {
      MobileTestUtils.mockMobileDevice('iPhone12');
      
      const MockLongPressComponent: React.FC = () => {
        const [longPressed, setLongPressed] = React.useState(false);
        
        return (
          <MockMobileApp>
            <MobileTouchGestureHandler
              onLongPress={() => setLongPressed(true)}
            >
              <div data-testid="long-press-target">
                {longPressed ? 'Long pressed!' : 'Press and hold'}
              </div>
            </MobileTouchGestureHandler>
          </MockMobileApp>
        );
      };

      await MobileTestUtils.testTouchInteractions(
        <MockLongPressComponent />,
        [
          {
            element: 'long-press-target',
            type: 'longPress',
            expectedResult: 'Long pressed!'
          }
        ]
      );
    });

    it('should have touch-friendly button sizes', () => {
      MobileTestUtils.mockMobileDevice('iPhone12');
      
      render(
        <MockMobileApp>
          <MockPostCard />
        </MockMobileApp>
      );

      const likeButton = screen.getByTestId('like-button');
      const bookmarkButton = screen.getByTestId('bookmark-button');

      expect(likeButton).toHaveTouchFriendlySize(44);
      expect(bookmarkButton).toHaveTouchFriendlySize(44);
    });
  });

  describe('Performance Optimization', () => {
    it('should render within performance budget', async () => {
      MobileTestUtils.mockMobileDevice('iPhone12');
      
      const { renderTime } = await MobileTestUtils.testMobilePerformance(
        <MockMobileApp>
          <MockImageGallery />
        </MockMobileApp>,
        {
          maxRenderTime: 100,
          maxMemoryUsage: 50 * 1024 * 1024
        }
      );

      expect(renderTime).toBeLessThan(100);
    });

    it('should lazy load images', async () => {
      MobileTestUtils.mockMobileDevice('iPhone12');
      
      render(
        <MockMobileApp>
          <MockImageGallery />
        </MockMobileApp>
      );

      // Initially, images should not be loaded
      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(4);

      // Simulate intersection observer triggering
      const mockIntersectionObserver = global.IntersectionObserver as jest.Mock;
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      
      act(() => {
        observerCallback([{ isIntersecting: true }]);
      });

      await waitFor(() => {
        // Images should start loading
        const loadingImages = screen.getAllByAltText(/Test image/);
        expect(loadingImages.length).toBeGreaterThan(0);
      });
    });

    it('should optimize for slow networks', async () => {
      MobileTestUtils.mockMobileDevice('iPhone12');
      MobileTestUtils.mockNetworkCondition('slow2G');
      
      render(
        <MockMobileApp>
          <DataSavingSettings />
        </MockMobileApp>
      );

      await waitFor(() => {
        // Data saving should be automatically enabled
        expect(screen.getByText(/Slow connection detected/)).toBeInTheDocument();
      });
    });
  });

  describe('Network Conditions', () => {
    it('should handle offline state', async () => {
      MobileTestUtils.mockMobileDevice('iPhone12');
      
      const MockOfflineComponent: React.FC = () => {
        const [isOnline, setIsOnline] = React.useState(navigator.onLine);
        
        React.useEffect(() => {
          const handleOnline = () => setIsOnline(true);
          const handleOffline = () => setIsOnline(false);
          
          window.addEventListener('online', handleOnline);
          window.addEventListener('offline', handleOffline);
          
          return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
          };
        }, []);
        
        return (
          <MockMobileApp>
            <div data-testid="network-status">
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </MockMobileApp>
        );
      };

      await MobileTestUtils.testOfflineFunctionality(
        <MockOfflineComponent />,
        [
          {
            action: async () => {
              // Network condition is already set to offline by testOfflineFunctionality
            },
            expectedBehavior: 'Offline'
          }
        ]
      );
    });

    it('should adapt to different network speeds', async () => {
      const networkConditions: Array<keyof typeof NETWORK_CONDITIONS> = [
        'slow2G',
        'regular2G', 
        'regular3G',
        'regular4G',
        'wifi'
      ];

      for (const condition of networkConditions) {
        MobileTestUtils.mockMobileDevice('iPhone12');
        MobileTestUtils.mockNetworkCondition(condition);
        
        render(
          <MockMobileApp>
            <DataSavingSettings />
          </MockMobileApp>
        );

        const networkConfig = NETWORK_CONDITIONS[condition];
        
        await waitFor(() => {
          expect(screen.getByText(networkConfig.name)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Data Saving Mode', () => {
    it('should enable data saving features', async () => {
      MobileTestUtils.mockMobileDevice('iPhone12');
      
      await MobileTestUtils.testDataSavingMode(
        <MockMobileApp>
          <DataSavingSettings />
        </MockMobileApp>,
        [
          {
            setting: 'reduceImageQuality',
            enabled: true,
            expectedBehavior: () => {
              const toggle = screen.getByLabelText(/Reduce Image Quality/);
              expect(toggle).toBeChecked();
            }
          },
          {
            setting: 'disableAutoplay',
            enabled: true,
            expectedBehavior: () => {
              const toggle = screen.getByLabelText(/Disable Autoplay/);
              expect(toggle).toBeChecked();
            }
          }
        ]
      );
    });

    it('should show data usage estimates', async () => {
      MobileTestUtils.mockMobileDevice('iPhone12');
      
      render(
        <MockMobileApp>
          <DataSavingSettings />
        </MockMobileApp>
      );

      await waitFor(() => {
        expect(screen.getByText(/Est\. Usage:/)).toBeInTheDocument();
      });
    });
  });

  describe('Virtual Keyboard', () => {
    it('should adapt layout when virtual keyboard opens', async () => {
      MobileTestUtils.mockMobileDevice('iPhone12');
      
      const MockFormComponent: React.FC = () => (
        <MockMobileApp>
          <div data-testid="container" className="h-screen">
            <input 
              data-testid="text-input"
              type="text" 
              placeholder="Type here..."
            />
          </div>
        </MockMobileApp>
      );

      await MobileTestUtils.testVirtualKeyboard(
        <MockFormComponent />,
        'text-input'
      );
    });
  });

  describe('Haptic Feedback', () => {
    it('should provide haptic feedback for interactions', () => {
      MobileTestUtils.mockMobileDevice('iPhone12');
      
      MobileTestUtils.testHapticFeedback(
        <MockMobileApp>
          <MockPostCard />
        </MockMobileApp>,
        [
          {
            element: 'like-button',
            expectedHapticType: 'light'
          },
          {
            element: 'bookmark-button', 
            expectedHapticType: 'medium'
          }
        ]
      );
    });
  });

  describe('Safe Area Handling', () => {
    it('should respect safe area insets', () => {
      MobileTestUtils.mockMobileDevice('iPhone12');
      
      MobileTestUtils.testSafeAreaHandling(
        <MockMobileApp>
          <div data-testid="safe-area-content">Content</div>
        </MockMobileApp>
      );
    });
  });

  describe('Bottom Navigation', () => {
    it('should render bottom navigation correctly', () => {
      MobileTestUtils.mockMobileDevice('iPhone12');
      
      const mockOnNavigate = jest.fn();
      const mockOnCreatePost = jest.fn();
      
      render(
        <MobileBottomNavigation
          currentPath="/"
          onNavigate={mockOnNavigate}
          onCreatePost={mockOnCreatePost}
          unreadMessages={3}
        />
      );

      expect(screen.getByLabelText('Home')).toBeInTheDocument();
      expect(screen.getByLabelText('Search')).toBeInTheDocument();
      expect(screen.getByLabelText('Create')).toBeInTheDocument();
      expect(screen.getByLabelText('Messages')).toBeInTheDocument();
      expect(screen.getByLabelText('Communities')).toBeInTheDocument();
      
      // Check unread message badge
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should handle navigation interactions', async () => {
      MobileTestUtils.mockMobileDevice('iPhone12');
      
      const mockOnNavigate = jest.fn();
      const mockOnCreatePost = jest.fn();
      
      render(
        <MobileBottomNavigation
          currentPath="/"
          onNavigate={mockOnNavigate}
          onCreatePost={mockOnCreatePost}
        />
      );

      const searchButton = screen.getByLabelText('Search');
      fireEvent.click(searchButton);
      
      expect(mockOnNavigate).toHaveBeenCalledWith('/search');

      const createButton = screen.getByLabelText('Create');
      fireEvent.click(createButton);
      
      expect(mockOnCreatePost).toHaveBeenCalled();
    });
  });

  describe('Progressive Image Loading', () => {
    it('should load images progressively', async () => {
      MobileTestUtils.mockMobileDevice('iPhone12');
      MobileTestUtils.mockNetworkCondition('regular3G');
      
      render(
        <MobileProgressiveImage
          src="https://example.com/large-image.jpg"
          alt="Test image"
          width={400}
          height={300}
          data-testid="progressive-image"
        />
      );

      const image = screen.getByAltText('Test image');
      expect(image).toBeInTheDocument();

      // Should start with low quality
      await waitFor(() => {
        expect(image).toHaveAttribute('src');
      });
    });

    it('should show loading states', async () => {
      MobileTestUtils.mockMobileDevice('iPhone12');
      
      render(
        <MobileProgressiveImage
          src="https://example.com/image.jpg"
          alt="Test image"
          width={200}
          height={200}
        />
      );

      // Should show skeleton loader initially
      await waitFor(() => {
        const skeleton = document.querySelector('.animate-pulse');
        expect(skeleton).toBeInTheDocument();
      });
    });
  });

  describe('Orientation Changes', () => {
    it('should handle orientation changes', async () => {
      MobileTestUtils.mockMobileDevice('iPhone12');
      
      render(
        <MockMobileApp>
          <MockPostCard />
        </MockMobileApp>
      );

      // Simulate orientation change to landscape
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 844,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 390,
      });

      fireEvent(window, new Event('orientationchange'));
      fireEvent(window, new Event('resize'));

      await waitFor(() => {
        const postCard = screen.getByTestId('post-card');
        expect(postCard).toBeInTheDocument();
      });
    });
  });
});