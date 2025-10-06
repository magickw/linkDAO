import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccessibilityTestUtils, accessibilityMatchers } from './AccessibilityTestUtils';
import { AccessibilityProvider } from '../../components/Accessibility/AccessibilityProvider';
import { SkipLinks } from '../../components/Accessibility/SkipLinks';
import { AccessibleForm } from '../../components/Accessibility/AccessibleForm';

// Extend Jest matchers
expect.extend(accessibilityMatchers);

// Mock components for testing
const MockApp: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AccessibilityProvider>
    <div>
      <SkipLinks />
      <header id="navigation">
        <nav>Navigation</nav>
      </header>
      <main id="main-content">
        {children}
      </main>
      <footer id="footer">Footer</footer>
    </div>
  </AccessibilityProvider>
);

const MockPostCard: React.FC = () => (
  <article 
    role="article"
    aria-labelledby="post-title"
    aria-describedby="post-metadata"
    data-testid="post-card"
  >
    <h2 id="post-title">Test Post Title</h2>
    <div id="post-metadata">Posted by Test User 2 hours ago</div>
    <p>This is the post content for accessibility testing.</p>
    <div role="group" aria-label="Post actions">
      <button 
        aria-label="Like post"
        aria-pressed="false"
        data-testid="like-button"
      >
        👍 Like
      </button>
      <button 
        aria-label="Comment on post"
        data-testid="comment-button"
      >
        💬 Comment
      </button>
      <button 
        aria-label="Share post"
        data-testid="share-button"
      >
        🔗 Share
      </button>
    </div>
  </article>
);

const MockModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
      data-testid="modal"
    >
      <div>
        <h2 id="modal-title">Test Modal</h2>
        <p id="modal-description">This is a test modal for accessibility testing.</p>
        <button onClick={onClose} data-close-on-escape="true">
          Close
        </button>
      </div>
    </div>
  );
};

describe('Accessibility Integration Tests', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    
    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  describe('WCAG Compliance', () => {
    it('should pass axe accessibility tests', async () => {
      const component = (
        <MockApp>
          <MockPostCard />
        </MockApp>
      );

      await AccessibilityTestUtils.testWCAGCompliance(component);
    });

    it('should have proper color contrast', () => {
      render(
        <MockApp>
          <div 
            data-testid="contrast-test"
            style={{ color: '#000000', backgroundColor: '#ffffff' }}
          >
            High contrast text
          </div>
        </MockApp>
      );

      const element = screen.getByTestId('contrast-test');
      AccessibilityTestUtils.testColorContrast(element, 4.5);
    });

    it('should have minimum touch target sizes', () => {
      render(
        <MockApp>
          <MockPostCard />
        </MockApp>
      );

      const likeButton = screen.getByTestId('like-button');
      AccessibilityTestUtils.testTouchTargetSize(likeButton, 44);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support full keyboard navigation', async () => {
      render(
        <MockApp>
          <MockPostCard />
        </MockApp>
      );

      const expectedFocusOrder = [
        'like-button',
        'comment-button', 
        'share-button'
      ];

      await AccessibilityTestUtils.testKeyboardNavigation(
        <MockPostCard />, 
        expectedFocusOrder
      );
    });

    it('should handle escape key in modals', async () => {
      const MockModalContainer: React.FC = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        
        return (
          <MockApp>
            <button onClick={() => setIsOpen(true)} data-testid="open-modal">
              Open Modal
            </button>
            <MockModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
          </MockApp>
        );
      };

      await AccessibilityTestUtils.testModalAccessibility(
        <MockModalContainer />,
        async () => {
          const openButton = screen.getByTestId('open-modal');
          fireEvent.click(openButton);
        }
      );
    });

    it('should support arrow key navigation in lists', async () => {
      const MockList: React.FC = () => (
        <div role="listbox" aria-label="Test list">
          <div role="option" data-testid="option-1" tabIndex={0}>Option 1</div>
          <div role="option" data-testid="option-2" tabIndex={-1}>Option 2</div>
          <div role="option" data-testid="option-3" tabIndex={-1}>Option 3</div>
        </div>
      );

      render(
        <MockApp>
          <MockList />
        </MockApp>
      );

      const firstOption = screen.getByTestId('option-1');
      firstOption.focus();

      // Test arrow down navigation
      fireEvent.keyDown(firstOption, { key: 'ArrowDown' });
      await waitFor(() => {
        expect(screen.getByTestId('option-2')).toHaveFocus();
      });

      // Test arrow up navigation
      fireEvent.keyDown(screen.getByTestId('option-2'), { key: 'ArrowUp' });
      await waitFor(() => {
        expect(screen.getByTestId('option-1')).toHaveFocus();
      });
    });
  });

  describe('Screen Reader Support', () => {
    it('should announce dynamic content changes', async () => {
      const MockDynamicContent: React.FC = () => {
        const [count, setCount] = React.useState(0);
        
        return (
          <MockApp>
            <div>
              <span aria-live="polite" data-testid="count-display">
                Count: {count}
              </span>
              <button 
                onClick={() => setCount(c => c + 1)}
                data-testid="increment-button"
              >
                Increment
              </button>
            </div>
          </MockApp>
        );
      };

      await AccessibilityTestUtils.testScreenReaderAnnouncements(
        <MockDynamicContent />,
        async () => {
          const button = screen.getByTestId('increment-button');
          fireEvent.click(button);
        },
        'Count: 1'
      );
    });

    it('should have proper ARIA labels and descriptions', () => {
      render(
        <MockApp>
          <MockPostCard />
        </MockApp>
      );

      AccessibilityTestUtils.testARIAAttributes(
        <MockPostCard />,
        {
          '[role="article"]': {
            'aria-labelledby': 'post-title',
            'aria-describedby': 'post-metadata'
          },
          '[data-testid="like-button"]': {
            'aria-label': 'Like post',
            'aria-pressed': 'false'
          }
        }
      );
    });

    it('should provide meaningful error messages', async () => {
      const formFields = [
        {
          id: 'email',
          name: 'email',
          label: 'Email',
          type: 'email' as const,
          required: true,
          validation: (value: string) => 
            !value.includes('@') ? 'Please enter a valid email address' : null
        }
      ];

      render(
        <MockApp>
          <AccessibleForm
            fields={formFields}
            onSubmit={() => {}}
            data-testid="test-form"
          />
        </MockApp>
      );

      const emailInput = screen.getByLabelText('Email *');
      const submitButton = screen.getByRole('button', { name: /submit/i });

      // Enter invalid email
      await userEvent.type(emailInput, 'invalid-email');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });

  describe('Focus Management', () => {
    it('should manage focus properly in modals', async () => {
      const MockModalWithFocus: React.FC = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        
        return (
          <MockApp>
            <button 
              onClick={() => setIsOpen(true)} 
              data-testid="trigger-button"
            >
              Open Modal
            </button>
            {isOpen && (
              <div 
                role="dialog"
                aria-modal="true"
                data-testid="modal"
              >
                <button data-testid="first-button">First</button>
                <button data-testid="second-button">Second</button>
                <button 
                  onClick={() => setIsOpen(false)}
                  data-testid="close-button"
                >
                  Close
                </button>
              </div>
            )}
          </MockApp>
        );
      };

      await AccessibilityTestUtils.testFocusManagement(
        <MockModalWithFocus />,
        async () => {
          const triggerButton = screen.getByTestId('trigger-button');
          fireEvent.click(triggerButton);
        },
        'first-button'
      );
    });

    it('should restore focus after modal closes', async () => {
      const MockModalWithRestore: React.FC = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        
        return (
          <MockApp>
            <button 
              onClick={() => setIsOpen(true)} 
              data-testid="trigger-button"
            >
              Open Modal
            </button>
            {isOpen && (
              <div role="dialog" aria-modal="true">
                <button 
                  onClick={() => setIsOpen(false)}
                  data-testid="close-button"
                >
                  Close
                </button>
              </div>
            )}
          </MockApp>
        );
      };

      render(<MockModalWithRestore />);

      const triggerButton = screen.getByTestId('trigger-button');
      triggerButton.focus();
      fireEvent.click(triggerButton);

      const closeButton = screen.getByTestId('close-button');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(triggerButton).toHaveFocus();
      });
    });
  });

  describe('Form Accessibility', () => {
    it('should have proper form accessibility', () => {
      const formFields = [
        {
          id: 'name',
          name: 'name',
          label: 'Full Name',
          type: 'text' as const,
          required: true
        },
        {
          id: 'email',
          name: 'email',
          label: 'Email Address',
          type: 'email' as const,
          required: true,
          description: 'We will never share your email'
        }
      ];

      render(
        <MockApp>
          <AccessibleForm
            fields={formFields}
            onSubmit={() => {}}
            title="Contact Form"
            description="Please fill out this form"
          />
        </MockApp>
      );

      const form = screen.getByRole('form') || screen.getByTestId('test-form');
      if (form) {
        AccessibilityTestUtils.testFormAccessibility(form);
      }

      // Test specific form elements
      const nameInput = screen.getByLabelText('Full Name *');
      expect(nameInput).toHaveAttribute('aria-required', 'true');

      const emailInput = screen.getByLabelText('Email Address *');
      expect(emailInput).toHaveAttribute('aria-describedby');
      
      const description = screen.getByText('We will never share your email');
      expect(description).toBeInTheDocument();
    });
  });

  describe('High Contrast Mode', () => {
    it('should adapt to high contrast preferences', async () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      await AccessibilityTestUtils.testHighContrastMode(
        <MockApp>
          <MockPostCard />
        </MockApp>
      );
    });
  });

  describe('Reduced Motion', () => {
    it('should respect reduced motion preferences', async () => {
      // Mock reduced motion media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      await AccessibilityTestUtils.testReducedMotion(
        <MockApp>
          <div data-testid="animated-element" className="animate-bounce">
            Animated Content
          </div>
        </MockApp>
      );
    });
  });

  describe('Skip Links', () => {
    it('should provide functional skip links', async () => {
      render(
        <MockApp>
          <MockPostCard />
        </MockApp>
      );

      // Focus first skip link
      const skipToMain = screen.getByText('Skip to main content');
      skipToMain.focus();
      expect(skipToMain).toHaveFocus();

      // Activate skip link
      fireEvent.click(skipToMain);

      await waitFor(() => {
        const mainContent = document.getElementById('main-content');
        expect(mainContent).toHaveFocus();
      });
    });
  });

  describe('Responsive Text Scaling', () => {
    it('should support browser zoom up to 200%', async () => {
      const viewports = [
        { width: 1200, height: 800, name: 'desktop' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 390, height: 844, name: 'mobile' }
      ];

      await AccessibilityTestUtils.testResponsiveDesign(
        <MockApp>
          <MockPostCard />
        </MockApp>,
        viewports
      );
    });
  });
});

describe('Accessibility Provider', () => {
  it('should provide accessibility context', () => {
    const TestComponent: React.FC = () => {
      const { settings, announceToScreenReader } = React.useContext(
        require('../../components/Accessibility/AccessibilityProvider').AccessibilityContext
      );
      
      return (
        <div>
          <span data-testid="high-contrast">
            {settings.highContrast ? 'High Contrast On' : 'High Contrast Off'}
          </span>
          <button 
            onClick={() => announceToScreenReader('Test announcement')}
            data-testid="announce-button"
          >
            Announce
          </button>
        </div>
      );
    };

    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    expect(screen.getByTestId('high-contrast')).toHaveTextContent('High Contrast Off');
    expect(screen.getByTestId('announce-button')).toBeInTheDocument();
  });
});