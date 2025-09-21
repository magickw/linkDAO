import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { AccessibilityProvider } from '@/components/Accessibility/AccessibilityProvider';
import { SkipLinks } from '@/components/Accessibility/SkipLinks';
import { useAccessibility } from '@/hooks/useAccessibility';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';

// Test component that uses accessibility features
const TestComponent: React.FC = () => {
  const { announceToScreenReader, generateId } = useAccessibility();
  const buttonId = generateId('test-button');

  const handleClick = () => {
    announceToScreenReader('Button clicked successfully');
  };

  return (
    <div>
      <button id={buttonId} onClick={handleClick} aria-label="Test button">
        Click me
      </button>
      <div id="main-content" tabIndex={-1}>
        Main content area
      </div>
    </div>
  );
};

describe('Basic Accessibility Features', () => {
  it('should render AccessibilityProvider without errors', () => {
    render(
      <AccessibilityProvider>
        <div>Test content</div>
      </AccessibilityProvider>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should render SkipLinks with default links', () => {
    render(<SkipLinks />);

    const skipToMain = screen.getByText('Skip to main content');
    expect(skipToMain).toBeInTheDocument();
    expect(skipToMain).toHaveAttribute('href', '#main-content');
  });

  it('should generate unique IDs', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('id');
    expect(button.id).toMatch(/^test-button-\d+$/);
  });

  it('should create live region for announcements', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    const liveRegion = document.getElementById('accessibility-live-region');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
  });

  it('should handle button click and announcement', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // The announcement should be made to the live region
    const liveRegion = document.getElementById('accessibility-live-region');
    expect(liveRegion).toBeInTheDocument();
  });

  it('should have proper ARIA attributes', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Test button');
  });
});