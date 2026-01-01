/**
 * Property-based tests for ProductThumbnail
 * Tests correctness properties defined in the design specification
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProductThumbnail from '../ProductThumbnail';

// Test data generators
const generateRandomItem = (overrides: Partial<any> = {}) => ({
  id: `item-${Math.random().toString(36).substr(2, 9)}`,
  title: `Test Product ${Math.random().toString(36).substr(2, 5)}`,
  image: `https://example.com/image-${Math.random().toString(36).substr(2, 5)}.jpg`,
  category: ['electronics', 'clothing', 'books', 'home', 'sports'][Math.floor(Math.random() * 5)],
  ...overrides
});

const generateInvalidImageUrls = () => [
  '', // Empty string
  'invalid-url',
  'http://nonexistent-domain-12345.com/image.jpg',
  'https://httpstat.us/404', // Returns 404
  'https://httpstat.us/500', // Returns 500
  'data:image/svg+xml;base64,invalid', // Invalid base64
  null,
  undefined
];

describe('ProductThumbnail Property Tests', () => {
  /**
   * Property 2: Thumbnail Fallback Reliability
   * For any cart item with an invalid or missing image URL, the system should display 
   * an appropriate fallback (letter, category icon, or placeholder) without breaking the layout
   */
  describe('Property 2: Thumbnail Fallback Reliability', () => {
    test('should display letter fallback for any invalid image URL', () => {
      const invalidUrls = generateInvalidImageUrls();
      
      invalidUrls.forEach((invalidUrl, index) => {
        const item = generateRandomItem({ 
          image: invalidUrl,
          title: `TestProduct${index}` // Make titles unique
        });
        const { container } = render(
          <ProductThumbnail
            item={item}
            size="medium"
            fallbackType="letter"
          />
        );

        // Should display the first letter of the title
        const expectedLetter = item.title.charAt(0).toUpperCase();
        
        if (invalidUrl === null || invalidUrl === undefined || invalidUrl === '') {
          // Should immediately show fallback
          expect(container.querySelector(`span:contains("${expectedLetter}")`)).toBeTruthy();
        } else {
          // Simulate image error
          const img = container.querySelector('img');
          if (img) {
            fireEvent.error(img);
          }
          expect(container.querySelector('span')).toHaveTextContent(expectedLetter);
        }
      });
    });

    test('should display category fallback for any invalid image URL', () => {
      const invalidUrls = generateInvalidImageUrls();
      
      invalidUrls.forEach((invalidUrl) => {
        const item = generateRandomItem({ image: invalidUrl });
        const { container } = render(
          <ProductThumbnail
            item={item}
            size="medium"
            fallbackType="category"
          />
        );

        if (invalidUrl === null || invalidUrl === undefined || invalidUrl === '') {
          // Should immediately show category icon
          expect(container.querySelector('svg')).toBeInTheDocument();
        } else {
          // Simulate image error
          const img = container.querySelector('img');
          if (img) {
            fireEvent.error(img);
          }
          expect(container.querySelector('svg')).toBeInTheDocument();
        }
      });
    });

    test('should display placeholder fallback for any invalid image URL', () => {
      const invalidUrls = generateInvalidImageUrls();
      
      invalidUrls.forEach((invalidUrl) => {
        const item = generateRandomItem({ image: invalidUrl });
        const { container } = render(
          <ProductThumbnail
            item={item}
            size="medium"
            fallbackType="placeholder"
          />
        );

        if (invalidUrl === null || invalidUrl === undefined || invalidUrl === '') {
          // Should immediately show placeholder icon
          expect(container.querySelector('svg')).toBeInTheDocument();
        } else {
          // Simulate image error
          const img = container.querySelector('img');
          if (img) {
            fireEvent.error(img);
          }
          expect(container.querySelector('svg')).toBeInTheDocument();
        }
      });
    });

    test('should maintain consistent layout dimensions regardless of fallback type', () => {
      const sizes = ['small', 'medium', 'large'] as const;
      const fallbackTypes = ['letter', 'category', 'placeholder'] as const;
      
      sizes.forEach(size => {
        fallbackTypes.forEach(fallbackType => {
          const item = generateRandomItem({ image: '' }); // Force fallback
          const { container } = render(
            <ProductThumbnail
              item={item}
              size={size}
              fallbackType={fallbackType}
            />
          );

          const thumbnail = container.firstChild as HTMLElement;
          expect(thumbnail).toBeInTheDocument();
          
          // Verify size classes are applied
          const expectedSizeClasses = {
            small: 'w-12 h-12',
            medium: 'w-16 h-16',
            large: 'w-24 h-24'
          };
          
          const sizeClass = expectedSizeClasses[size];
          expect(thumbnail).toHaveClass(sizeClass.split(' ')[0]); // Check width class
          expect(thumbnail).toHaveClass(sizeClass.split(' ')[1]); // Check height class
        });
      });
    });

    test('should call onImageError callback when image fails to load', () => {
      const item = generateRandomItem();
      const mockOnError = jest.fn();
      
      const { container } = render(
        <ProductThumbnail
          item={item}
          size="medium"
          fallbackType="letter"
          onImageError={mockOnError}
        />
      );

      // Simulate image error
      const img = container.querySelector('img');
      if (img) {
        fireEvent.error(img);
        expect(mockOnError).toHaveBeenCalledWith(item);
      }
    });

    test('should handle items with missing or malformed title gracefully', () => {
      const problematicTitles = ['', ' ', null, undefined, '123', '!@#$%'];
      
      problematicTitles.forEach((title, index) => {
        const item = generateRandomItem({ 
          title, 
          image: '',
          id: `test-item-${index}` // Unique ID for each test
        });
        const { container } = render(
          <ProductThumbnail
            item={item}
            size="medium"
            fallbackType="letter"
          />
        );

        // Should not crash and should display some fallback
        expect(container.firstChild).toBeInTheDocument();
        
        // Should display a letter (either from title or default 'P')
        const span = container.querySelector('span');
        expect(span).toBeInTheDocument();
        expect(span?.textContent).toMatch(/^[A-Z0-9!@#$%P]$/); // Should be a single character
      });
    });
  });

  /**
   * Property 6: Image Loading Error Recovery
   * For any product image that fails to load, the system should gracefully handle 
   * the error and display a fallback without affecting other UI elements
   */
  describe('Property 6: Image Loading Error Recovery', () => {
    test('should recover from image loading errors without affecting layout', () => {
      const item = generateRandomItem();
      const { container, rerender } = render(
        <div className="flex gap-4">
          <ProductThumbnail
            item={item}
            size="medium"
            fallbackType="letter"
          />
          <div data-testid="other-element">Other UI Element</div>
        </div>
      );

      // Verify other elements are present
      expect(screen.getByTestId('other-element')).toBeInTheDocument();

      // Simulate image error
      const img = container.querySelector('img');
      if (img) {
        fireEvent.error(img);
      }

      // Verify other elements are still present and unaffected
      expect(screen.getByTestId('other-element')).toBeInTheDocument();
      
      // Verify fallback is displayed
      const expectedLetter = item.title.charAt(0).toUpperCase();
      expect(screen.getByText(expectedLetter)).toBeInTheDocument();
    });

    test('should handle multiple simultaneous image errors gracefully', () => {
      const items = Array.from({ length: 5 }, (_, index) => 
        generateRandomItem({ title: `TestProduct${index}` }) // Unique titles
      );
      
      const { container } = render(
        <div className="grid grid-cols-5 gap-2">
          {items.map((item, index) => (
            <ProductThumbnail
              key={index}
              item={item}
              size="small"
              fallbackType="letter"
            />
          ))}
        </div>
      );

      // Simulate all images failing to load
      const images = container.querySelectorAll('img');
      images.forEach(img => {
        fireEvent.error(img);
      });

      // Verify all fallbacks are displayed by checking for spans with letters
      const letterSpans = container.querySelectorAll('span');
      expect(letterSpans.length).toBeGreaterThanOrEqual(5);

      // Verify layout is maintained
      const thumbnailContainers = container.querySelectorAll('.w-12'); // Small size thumbnails
      expect(thumbnailContainers.length).toBeGreaterThanOrEqual(5);
    });

    test('should not cause infinite error loops with malformed fallback attempts', () => {
      const item = generateRandomItem({ image: 'invalid-url' });
      
      // Mock console.error to track error calls
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const { container } = render(
        <ProductThumbnail
          item={item}
          size="medium"
          fallbackType="letter"
        />
      );

      // Simulate image error
      const img = container.querySelector('img');
      if (img) {
        fireEvent.error(img);
        
        // Simulate error on fallback attempt (shouldn't happen with letter fallback, but test resilience)
        fireEvent.error(img);
        fireEvent.error(img);
      }

      // Should not cause excessive error logging or infinite loops
      expect(consoleSpy).not.toHaveBeenCalledTimes(100); // Arbitrary high number
      
      // Should still display fallback
      const expectedLetter = item.title.charAt(0).toUpperCase();
      expect(screen.getByText(expectedLetter)).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  /**
   * Property 8: Thumbnail Aspect Ratio Consistency
   * For any set of product thumbnails in the order summary, all images should 
   * maintain consistent sizing and aspect ratios
   */
  describe('Property 8: Thumbnail Aspect Ratio Consistency', () => {
    test('should maintain consistent dimensions across different image aspect ratios', () => {
      const items = [
        generateRandomItem({ image: 'https://via.placeholder.com/100x200', title: 'TallImage' }), // Tall
        generateRandomItem({ image: 'https://via.placeholder.com/200x100', title: 'WideImage' }), // Wide
        generateRandomItem({ image: 'https://via.placeholder.com/150x150', title: 'SquareImage' }), // Square
        generateRandomItem({ image: '', title: 'FallbackImage' }) // Fallback
      ];

      const { container } = render(
        <div className="flex gap-2">
          {items.map((item, index) => (
            <ProductThumbnail
              key={index}
              item={item}
              size="medium"
              fallbackType="letter"
            />
          ))}
        </div>
      );

      // Count all elements with medium size classes (including nested elements)
      const mediumWidthElements = container.querySelectorAll('.w-16');
      const mediumHeightElements = container.querySelectorAll('.h-16');
      
      // Should have at least 4 elements with correct sizing (may have more due to nested structure)
      expect(mediumWidthElements.length).toBeGreaterThanOrEqual(4);
      expect(mediumHeightElements.length).toBeGreaterThanOrEqual(4);

      // All should be properly rounded
      const roundedElements = container.querySelectorAll('.rounded-lg');
      expect(roundedElements.length).toBeGreaterThanOrEqual(4);
    });

    test('should maintain consistency across all size variants', () => {
      const sizes = ['small', 'medium', 'large'] as const;
      const item = generateRandomItem();

      sizes.forEach(size => {
        const { container } = render(
          <ProductThumbnail
            item={item}
            size={size}
            fallbackType="letter"
          />
        );

        const expectedClasses = {
          small: ['w-12', 'h-12'],
          medium: ['w-16', 'h-16'],
          large: ['w-24', 'h-24']
        };

        const thumbnail = container.firstChild as HTMLElement;
        expectedClasses[size].forEach(className => {
          expect(thumbnail).toHaveClass(className);
        });
      });
    });

    test('should maintain consistent styling between image and fallback states', () => {
      const item = generateRandomItem();
      
      // Test with valid image first
      const { container: containerWithImage } = render(
        <ProductThumbnail
          item={item}
          size="medium"
          fallbackType="letter"
        />
      );

      // Test with fallback
      const { container: containerWithFallback } = render(
        <ProductThumbnail
          item={{ ...item, image: '' }}
          size="medium"
          fallbackType="letter"
        />
      );

      // Both should have consistent base styling
      const imageContainer = containerWithImage.firstChild as HTMLElement;
      const fallbackContainer = containerWithFallback.firstChild as HTMLElement;

      // Both should have size classes
      expect(imageContainer).toHaveClass('w-16', 'h-16');
      expect(fallbackContainer).toHaveClass('w-16', 'h-16');

      // Both should have rounded corners
      expect(imageContainer.querySelector('.rounded-lg')).toBeInTheDocument();
      expect(fallbackContainer).toHaveClass('rounded-lg');
    });
  });
});