import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useMobileOptimization } from '../../../../hooks/useMobileOptimization';
import { TouchOptimizedButton } from '../TouchOptimizedButton';
import { MobileOptimizedForm } from '../MobileOptimizedForm';

// Mock the mobile optimization hook
jest.mock('../../../../hooks/useMobileOptimization');
const mockUseMobileOptimization = useMobileOptimization as jest.MockedFunction<typeof useMobileOptimization>;

describe('Mobile Seller Optimizations', () => {
  beforeEach(() => {
    mockUseMobileOptimization.mockReturnValue({
      isMobile: true,
      isTablet: false,
      orientation: 'portrait',
      screenSize: 'medium',
      touchSupported: true,
      devicePixelRatio: 2,
      isMobileSmall: false,
      isMobileMedium: true,
      isMobileLarge: false,
      getOptimalImageSize: () => ({ width: 600, height: 400 }),
      shouldUseCompactLayout: () => true,
      getOptimalFontSize: (baseSize: number) => baseSize,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('useMobileOptimization Hook', () => {
    it('should detect mobile device correctly', () => {
      const TestComponent = () => {
        const { isMobile, touchSupported } = useMobileOptimization();
        return (
          <div>
            <span data-testid="is-mobile">{isMobile ? 'mobile' : 'desktop'}</span>
            <span data-testid="touch-supported">{touchSupported ? 'touch' : 'no-touch'}</span>
          </div>
        );
      };

      render(<TestComponent />);
      
      expect(screen.getByTestId('is-mobile')).toHaveTextContent('mobile');
      expect(screen.getByTestId('touch-supported')).toHaveTextContent('touch');
    });

    it('should provide optimal image size', () => {
      const TestComponent = () => {
        const { getOptimalImageSize } = useMobileOptimization();
        const size = getOptimalImageSize();
        return <span data-testid="image-size">{`${size.width}x${size.height}`}</span>;
      };

      render(<TestComponent />);
      
      expect(screen.getByTestId('image-size')).toHaveTextContent('600x400');
    });
  });

  describe('TouchOptimizedButton', () => {
    it('should render with correct mobile optimizations', () => {
      const handleClick = jest.fn();
      
      render(
        <TouchOptimizedButton onClick={handleClick} variant="primary" size="md">
          Test Button
        </TouchOptimizedButton>
      );

      const button = screen.getByRole('button', { name: 'Test Button' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveStyle({ minHeight: '44px', minWidth: '44px' });
    });

    it('should handle click events', () => {
      const handleClick = jest.fn();
      
      render(
        <TouchOptimizedButton onClick={handleClick}>
          Click Me
        </TouchOptimizedButton>
      );

      const button = screen.getByRole('button', { name: 'Click Me' });
      fireEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should show loading state', () => {
      render(
        <TouchOptimizedButton onClick={() => {}} loading={true}>
          Loading Button
        </TouchOptimizedButton>
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should be disabled when disabled prop is true', () => {
      render(
        <TouchOptimizedButton onClick={() => {}} disabled={true}>
          Disabled Button
        </TouchOptimizedButton>
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('MobileOptimizedForm', () => {
    const mockFields = [
      {
        id: 'title',
        type: 'text' as const,
        label: 'Title',
        placeholder: 'Enter title',
        required: true,
      },
      {
        id: 'description',
        type: 'textarea' as const,
        label: 'Description',
        placeholder: 'Enter description',
        required: false,
      },
      {
        id: 'price',
        type: 'number' as const,
        label: 'Price',
        placeholder: '0.00',
        required: true,
        validation: (value: string) => {
          const num = parseFloat(value);
          if (isNaN(num) || num <= 0) {
            return 'Please enter a valid price';
          }
          return null;
        },
      },
    ];

    it('should render form fields correctly', () => {
      const handleSubmit = jest.fn();
      
      render(
        <MobileOptimizedForm
          fields={mockFields}
          onSubmit={handleSubmit}
          submitLabel="Submit"
        />
      );

      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    });

    it('should handle form submission with valid data', async () => {
      const handleSubmit = jest.fn();
      
      render(
        <MobileOptimizedForm
          fields={mockFields}
          onSubmit={handleSubmit}
          submitLabel="Submit"
        />
      );

      // Fill in the form
      fireEvent.change(screen.getByLabelText(/title/i), {
        target: { value: 'Test Product' },
      });
      fireEvent.change(screen.getByLabelText(/price/i), {
        target: { value: '10.5' },
      });

      // Submit the form
      fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledWith({
          title: 'Test Product',
          description: '',
          price: '10.5',
        });
      });
    });

    it('should show validation errors for required fields', async () => {
      const handleSubmit = jest.fn();
      
      render(
        <MobileOptimizedForm
          fields={mockFields}
          onSubmit={handleSubmit}
          submitLabel="Submit"
        />
      );

      // Submit without filling required fields
      fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument();
        expect(screen.getByText('Price is required')).toBeInTheDocument();
      });

      expect(handleSubmit).not.toHaveBeenCalled();
    });

    it('should show custom validation errors', async () => {
      const handleSubmit = jest.fn();
      
      render(
        <MobileOptimizedForm
          fields={mockFields}
          onSubmit={handleSubmit}
          submitLabel="Submit"
        />
      );

      // Fill in invalid price
      fireEvent.change(screen.getByLabelText(/title/i), {
        target: { value: 'Test Product' },
      });
      fireEvent.change(screen.getByLabelText(/price/i), {
        target: { value: '-5' },
      });

      // Submit the form
      fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid price')).toBeInTheDocument();
      });

      expect(handleSubmit).not.toHaveBeenCalled();
    });

    it('should apply mobile-specific styling', () => {
      const handleSubmit = jest.fn();
      
      render(
        <MobileOptimizedForm
          fields={mockFields}
          onSubmit={handleSubmit}
          submitLabel="Submit"
        />
      );

      const titleInput = screen.getByLabelText(/title/i);
      expect(titleInput).toHaveStyle({ minHeight: '44px' });
    });
  });

  describe('Mobile Responsive Behavior', () => {
    it('should adapt to different screen sizes', () => {
      // Test small screen
      mockUseMobileOptimization.mockReturnValue({
        isMobile: true,
        isTablet: false,
        orientation: 'portrait',
        screenSize: 'small',
        touchSupported: true,
        devicePixelRatio: 2,
        isMobileSmall: true,
        isMobileMedium: false,
        isMobileLarge: false,
        getOptimalImageSize: () => ({ width: 300, height: 200 }),
        shouldUseCompactLayout: () => true,
        getOptimalFontSize: (baseSize: number) => Math.max(baseSize * 0.9, 14),
      });

      const TestComponent = () => {
        const { screenSize, getOptimalFontSize } = useMobileOptimization();
        return (
          <div>
            <span data-testid="screen-size">{screenSize}</span>
            <span data-testid="font-size">{getOptimalFontSize(16)}</span>
          </div>
        );
      };

      render(<TestComponent />);
      
      expect(screen.getByTestId('screen-size')).toHaveTextContent('small');
      expect(screen.getByTestId('font-size')).toHaveTextContent('14.4');
    });

    it('should handle orientation changes', () => {
      mockUseMobileOptimization.mockReturnValue({
        isMobile: true,
        isTablet: false,
        orientation: 'landscape',
        screenSize: 'medium',
        touchSupported: true,
        devicePixelRatio: 1,
        isMobileSmall: false,
        isMobileMedium: true,
        isMobileLarge: false,
        getOptimalImageSize: () => ({ width: 400, height: 300 }),
        shouldUseCompactLayout: () => false,
        getOptimalFontSize: (baseSize: number) => baseSize,
      });

      const TestComponent = () => {
        const { orientation, shouldUseCompactLayout } = useMobileOptimization();
        return (
          <div>
            <span data-testid="orientation">{orientation}</span>
            <span data-testid="compact-layout">{shouldUseCompactLayout() ? 'compact' : 'full'}</span>
          </div>
        );
      };

      render(<TestComponent />);
      
      expect(screen.getByTestId('orientation')).toHaveTextContent('landscape');
      expect(screen.getByTestId('compact-layout')).toHaveTextContent('full');
    });
  });
});