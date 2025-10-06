import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactElement } from 'react';

// Mobile device configurations for testing
export const MOBILE_DEVICES = {
  iPhone12: {
    name: 'iPhone 12',
    width: 390,
    height: 844,
    pixelRatio: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
  },
  iPhone12Mini: {
    name: 'iPhone 12 Mini',
    width: 360,
    height: 780,
    pixelRatio: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
  },
  iPhone12Pro: {
    name: 'iPhone 12 Pro',
    width: 390,
    height: 844,
    pixelRatio: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
  },
  iPhone12ProMax: {
    name: 'iPhone 12 Pro Max',
    width: 428,
    height: 926,
    pixelRatio: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
  },
  galaxyS21: {
    name: 'Galaxy S21',
    width: 360,
    height: 800,
    pixelRatio: 3,
    userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.72 Mobile Safari/537.36'
  },
  galaxyS21Ultra: {
    name: 'Galaxy S21 Ultra',
    width: 384,
    height: 854,
    pixelRatio: 3.5,
    userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.72 Mobile Safari/537.36'
  },
  pixel5: {
    name: 'Pixel 5',
    width: 393,
    height: 851,
    pixelRatio: 2.75,
    userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.72 Mobile Safari/537.36'
  },
  iPad: {
    name: 'iPad',
    width: 768,
    height: 1024,
    pixelRatio: 2,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
  },
  iPadPro: {
    name: 'iPad Pro',
    width: 1024,
    height: 1366,
    pixelRatio: 2,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
  }
};

// Network conditions for testing
export const NETWORK_CONDITIONS = {
  offline: {
    name: 'Offline',
    online: false,
    effectiveType: 'slow-2g' as const,
    downlink: 0,
    rtt: Infinity
  },
  slow2G: {
    name: 'Slow 2G',
    online: true,
    effectiveType: 'slow-2g' as const,
    downlink: 0.05,
    rtt: 2000
  },
  regular2G: {
    name: '2G',
    online: true,
    effectiveType: '2g' as const,
    downlink: 0.25,
    rtt: 1400
  },
  regular3G: {
    name: '3G',
    online: true,
    effectiveType: '3g' as const,
    downlink: 0.7,
    rtt: 400
  },
  regular4G: {
    name: '4G',
    online: true,
    effectiveType: '4g' as const,
    downlink: 10,
    rtt: 100
  },
  wifi: {
    name: 'WiFi',
    online: true,
    effectiveType: '4g' as const,
    downlink: 50,
    rtt: 20
  }
};

// Mobile testing utilities
export class MobileTestUtils {
  /**
   * Mock mobile device environment
   */
  static mockMobileDevice(device: keyof typeof MOBILE_DEVICES) {
    const deviceConfig = MOBILE_DEVICES[device];
    
    // Mock viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: deviceConfig.width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: deviceConfig.height,
    });

    // Mock device pixel ratio
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      configurable: true,
      value: deviceConfig.pixelRatio,
    });

    // Mock user agent
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: deviceConfig.userAgent,
    });

    // Mock touch support
    Object.defineProperty(window, 'ontouchstart', {
      writable: true,
      configurable: true,
      value: () => {},
    });

    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 5,
    });

    // Trigger resize event
    fireEvent(window, new Event('resize'));
    
    return deviceConfig;
  }

  /**
   * Mock network conditions
   */
  static mockNetworkCondition(condition: keyof typeof NETWORK_CONDITIONS) {
    const networkConfig = NETWORK_CONDITIONS[condition];
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: networkConfig.online,
    });

    // Mock connection API
    Object.defineProperty(navigator, 'connection', {
      writable: true,
      configurable: true,
      value: {
        effectiveType: networkConfig.effectiveType,
        downlink: networkConfig.downlink,
        rtt: networkConfig.rtt,
        saveData: condition === 'slow2G' || condition === 'regular2G',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      },
    });

    return networkConfig;
  }

  /**
   * Test touch interactions
   */
  static async testTouchInteractions(
    component: ReactElement,
    interactions: Array<{
      element: string;
      type: 'tap' | 'longPress' | 'swipeLeft' | 'swipeRight' | 'swipeUp' | 'swipeDown';
      expectedResult?: string;
    }>
  ) {
    render(component);

    for (const interaction of interactions) {
      const element = screen.getByTestId(interaction.element) ||
                     screen.getByRole(interaction.element) ||
                     screen.getByLabelText(interaction.element);

      switch (interaction.type) {
        case 'tap':
          fireEvent.touchStart(element, {
            touches: [{ clientX: 100, clientY: 100 }]
          });
          fireEvent.touchEnd(element, {
            changedTouches: [{ clientX: 100, clientY: 100 }]
          });
          break;

        case 'longPress':
          fireEvent.touchStart(element, {
            touches: [{ clientX: 100, clientY: 100 }]
          });
          
          // Wait for long press duration
          await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 500));
          });
          
          fireEvent.touchEnd(element, {
            changedTouches: [{ clientX: 100, clientY: 100 }]
          });
          break;

        case 'swipeLeft':
          fireEvent.touchStart(element, {
            touches: [{ clientX: 200, clientY: 100 }]
          });
          fireEvent.touchMove(element, {
            touches: [{ clientX: 50, clientY: 100 }]
          });
          fireEvent.touchEnd(element, {
            changedTouches: [{ clientX: 50, clientY: 100 }]
          });
          break;

        case 'swipeRight':
          fireEvent.touchStart(element, {
            touches: [{ clientX: 50, clientY: 100 }]
          });
          fireEvent.touchMove(element, {
            touches: [{ clientX: 200, clientY: 100 }]
          });
          fireEvent.touchEnd(element, {
            changedTouches: [{ clientX: 200, clientY: 100 }]
          });
          break;

        case 'swipeUp':
          fireEvent.touchStart(element, {
            touches: [{ clientX: 100, clientY: 200 }]
          });
          fireEvent.touchMove(element, {
            touches: [{ clientX: 100, clientY: 50 }]
          });
          fireEvent.touchEnd(element, {
            changedTouches: [{ clientX: 100, clientY: 50 }]
          });
          break;

        case 'swipeDown':
          fireEvent.touchStart(element, {
            touches: [{ clientX: 100, clientY: 50 }]
          });
          fireEvent.touchMove(element, {
            touches: [{ clientX: 100, clientY: 200 }]
          });
          fireEvent.touchEnd(element, {
            changedTouches: [{ clientX: 100, clientY: 200 }]
          });
          break;
      }

      // Wait for interaction to complete
      await waitFor(() => {
        if (interaction.expectedResult) {
          expect(screen.getByText(interaction.expectedResult)).toBeInTheDocument();
        }
      });
    }
  }

  /**
   * Test responsive design across multiple devices
   */
  static async testResponsiveDesign(
    component: ReactElement,
    devices: Array<keyof typeof MOBILE_DEVICES>,
    assertions: (deviceName: string, deviceConfig: any) => void
  ) {
    for (const deviceName of devices) {
      const deviceConfig = this.mockMobileDevice(deviceName);
      const { container, rerender } = render(component);
      
      // Wait for responsive changes
      await waitFor(() => {
        assertions(deviceName, deviceConfig);
      });

      // Clean up for next device
      container.remove();
    }
  }

  /**
   * Test performance on mobile devices
   */
  static async testMobilePerformance(
    component: ReactElement,
    performanceMetrics: {
      maxRenderTime?: number;
      maxMemoryUsage?: number;
      maxBundleSize?: number;
    } = {}
  ) {
    const {
      maxRenderTime = 100,
      maxMemoryUsage = 50 * 1024 * 1024, // 50MB
      maxBundleSize = 1024 * 1024 // 1MB
    } = performanceMetrics;

    // Mock performance API
    const mockPerformance = {
      now: jest.fn(() => Date.now()),
      mark: jest.fn(),
      measure: jest.fn(),
      getEntriesByType: jest.fn(() => []),
      getEntriesByName: jest.fn(() => []),
    };
    Object.defineProperty(window, 'performance', {
      writable: true,
      configurable: true,
      value: mockPerformance,
    });

    const startTime = performance.now();
    const { container } = render(component);
    const endTime = performance.now();

    const renderTime = endTime - startTime;
    expect(renderTime).toBeLessThan(maxRenderTime);

    // Test memory usage (simplified)
    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory;
      expect(memoryInfo.usedJSHeapSize).toBeLessThan(maxMemoryUsage);
    }

    return {
      renderTime,
      container
    };
  }

  /**
   * Test offline functionality
   */
  static async testOfflineFunctionality(
    component: ReactElement,
    offlineActions: Array<{
      action: () => Promise<void> | void;
      expectedBehavior: string;
    }>
  ) {
    // Mock offline state
    this.mockNetworkCondition('offline');
    
    render(component);

    for (const { action, expectedBehavior } of offlineActions) {
      await action();
      
      await waitFor(() => {
        expect(screen.getByText(expectedBehavior)).toBeInTheDocument();
      });
    }

    // Test coming back online
    this.mockNetworkCondition('wifi');
    fireEvent(window, new Event('online'));

    await waitFor(() => {
      // Should sync offline actions
      expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
    });
  }

  /**
   * Test data saving mode
   */
  static async testDataSavingMode(
    component: ReactElement,
    dataSavingTests: Array<{
      setting: string;
      enabled: boolean;
      expectedBehavior: () => void;
    }>
  ) {
    render(component);

    for (const test of dataSavingTests) {
      // Mock data saving setting
      const mockDataSaving = {
        settings: { [test.setting]: test.enabled },
        updateSetting: jest.fn(),
      };

      // Apply setting and test behavior
      await act(async () => {
        test.expectedBehavior();
      });
    }
  }

  /**
   * Test virtual keyboard behavior
   */
  static async testVirtualKeyboard(
    component: ReactElement,
    inputElement: string
  ) {
    render(component);

    const input = screen.getByTestId(inputElement) ||
                 screen.getByRole('textbox') ||
                 screen.getByLabelText(inputElement);

    // Mock visual viewport API
    const mockVisualViewport = {
      height: 400, // Reduced height when keyboard is open
      width: 390,
      scale: 1,
      offsetTop: 0,
      offsetLeft: 0,
      pageTop: 0,
      pageLeft: 0,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    Object.defineProperty(window, 'visualViewport', {
      writable: true,
      configurable: true,
      value: mockVisualViewport,
    });

    // Focus input to trigger virtual keyboard
    fireEvent.focus(input);

    // Simulate keyboard opening
    mockVisualViewport.height = 400; // Reduced height
    fireEvent(window.visualViewport!, new Event('resize'));

    await waitFor(() => {
      // Check that layout adapts to keyboard
      const container = input.closest('[data-testid*="container"]');
      if (container) {
        const rect = container.getBoundingClientRect();
        expect(rect.bottom).toBeLessThanOrEqual(400);
      }
    });

    // Simulate keyboard closing
    fireEvent.blur(input);
    mockVisualViewport.height = 844; // Full height
    fireEvent(window.visualViewport!, new Event('resize'));

    await waitFor(() => {
      // Check that layout returns to normal
      const container = input.closest('[data-testid*="container"]');
      if (container) {
        const rect = container.getBoundingClientRect();
        expect(rect.bottom).toBeLessThanOrEqual(844);
      }
    });
  }

  /**
   * Test haptic feedback
   */
  static testHapticFeedback(
    component: ReactElement,
    interactions: Array<{
      element: string;
      expectedHapticType: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
    }>
  ) {
    // Mock vibration API
    const mockVibrate = jest.fn();
    Object.defineProperty(navigator, 'vibrate', {
      writable: true,
      configurable: true,
      value: mockVibrate,
    });

    render(component);

    interactions.forEach(({ element, expectedHapticType }) => {
      const targetElement = screen.getByTestId(element) ||
                           screen.getByRole(element) ||
                           screen.getByLabelText(element);

      fireEvent.click(targetElement);

      // Check that vibration was called with correct pattern
      const expectedPatterns = {
        light: [10],
        medium: [20],
        heavy: [30],
        success: [10, 50, 10],
        warning: [20, 100, 20],
        error: [50, 100, 50]
      };

      expect(mockVibrate).toHaveBeenCalledWith(expectedPatterns[expectedHapticType]);
    });
  }

  /**
   * Test safe area handling
   */
  static testSafeAreaHandling(component: ReactElement) {
    // Mock safe area insets
    const mockSafeAreaInsets = {
      top: 44,
      bottom: 34,
      left: 0,
      right: 0
    };

    // Mock CSS env() function
    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = jest.fn().mockImplementation((element) => {
      const style = originalGetComputedStyle(element);
      return {
        ...style,
        getPropertyValue: (prop: string) => {
          if (prop === 'env(safe-area-inset-top)') return `${mockSafeAreaInsets.top}px`;
          if (prop === 'env(safe-area-inset-bottom)') return `${mockSafeAreaInsets.bottom}px`;
          if (prop === 'env(safe-area-inset-left)') return `${mockSafeAreaInsets.left}px`;
          if (prop === 'env(safe-area-inset-right)') return `${mockSafeAreaInsets.right}px`;
          return style.getPropertyValue(prop);
        }
      };
    });

    const { container } = render(component);

    // Check that safe areas are respected
    const safeAreaElements = container.querySelectorAll('[data-testid*="safe-area"]');
    safeAreaElements.forEach(element => {
      const computedStyle = window.getComputedStyle(element);
      expect(computedStyle.paddingTop).toBe(`${mockSafeAreaInsets.top}px`);
      expect(computedStyle.paddingBottom).toBe(`${mockSafeAreaInsets.bottom}px`);
    });

    // Restore original function
    window.getComputedStyle = originalGetComputedStyle;
  }
}

// Custom Jest matchers for mobile testing
export const mobileMatchers = {
  toBeResponsive: (received: HTMLElement, minWidth: number, maxWidth: number) => {
    const rect = received.getBoundingClientRect();
    const pass = rect.width >= minWidth && rect.width <= maxWidth;
    
    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to be responsive between ${minWidth}px and ${maxWidth}px`
          : `Expected element to be responsive between ${minWidth}px and ${maxWidth}px, but got ${rect.width}px`
    };
  },

  toHaveTouchFriendlySize: (received: HTMLElement, minSize: number = 44) => {
    const rect = received.getBoundingClientRect();
    const pass = rect.width >= minSize && rect.height >= minSize;
    
    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to have touch-friendly size of at least ${minSize}px`
          : `Expected element to have touch-friendly size of at least ${minSize}px, but got ${rect.width}x${rect.height}px`
    };
  },

  toSupportGestures: (received: HTMLElement, gestures: string[]) => {
    const supportedGestures = gestures.filter(gesture => {
      return received.getAttribute(`data-gesture-${gesture}`) === 'true';
    });
    
    const pass = supportedGestures.length === gestures.length;
    
    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to support all gestures: ${gestures.join(', ')}`
          : `Expected element to support gestures: ${gestures.join(', ')}, but only supports: ${supportedGestures.join(', ')}`
    };
  }
};

export default MobileTestUtils;