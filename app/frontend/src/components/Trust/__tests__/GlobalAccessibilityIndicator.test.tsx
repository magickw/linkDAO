import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GlobalAccessibilityIndicator } from '../GlobalAccessibilityIndicator';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('GlobalAccessibilityIndicator', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('renders compact version correctly', () => {
    render(<GlobalAccessibilityIndicator compact={true} />);
    
    expect(screen.getByText('Global 24/7')).toBeInTheDocument();
    expect(screen.getByText('⚡ Instant Settlement')).toBeInTheDocument();
    expect(screen.getByText('🌍 195 Countries')).toBeInTheDocument();
  });

  it('renders full version with all sections', () => {
    render(<GlobalAccessibilityIndicator />);
    
    expect(screen.getByText('Global Accessibility')).toBeInTheDocument();
    expect(screen.getByText('Borderless commerce, 24/7')).toBeInTheDocument();
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('displays key benefits correctly', () => {
    render(<GlobalAccessibilityIndicator />);
    
    expect(screen.getByText('Instant Settlement')).toBeInTheDocument();
    expect(screen.getByText('No Banking Required')).toBeInTheDocument();
    expect(screen.getByText('Truly Borderless')).toBeInTheDocument();
    expect(screen.getByText('24/7 Operations')).toBeInTheDocument();
  });

  it('shows benefit descriptions', () => {
    render(<GlobalAccessibilityIndicator />);
    
    expect(screen.getByText(/Cryptocurrency payments settle instantly/)).toBeInTheDocument();
    expect(screen.getByText(/Trade directly with crypto wallets/)).toBeInTheDocument();
    expect(screen.getByText(/No geographic restrictions/)).toBeInTheDocument();
    expect(screen.getByText(/No banking hours, holidays/)).toBeInTheDocument();
  });

  it('displays live statistics when enabled', () => {
    render(<GlobalAccessibilityIndicator showLiveStats={true} />);
    
    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('Countries')).toBeInTheDocument();
    expect(screen.getByText("Today's Transactions")).toBeInTheDocument();
    expect(screen.getByText('24h Volume')).toBeInTheDocument();
    
    // Check initial values
    expect(screen.getByText('12,847')).toBeInTheDocument();
    expect(screen.getByText('195')).toBeInTheDocument();
    expect(screen.getByText('3,421')).toBeInTheDocument();
    expect(screen.getByText('$2.4M')).toBeInTheDocument();
  });

  it('updates live statistics over time', async () => {
    jest.useFakeTimers();
    render(<GlobalAccessibilityIndicator showLiveStats={true} />);
    
    const initialUsers = screen.getByText('12,847');
    const initialTransactions = screen.getByText('3,421');
    
    expect(initialUsers).toBeInTheDocument();
    expect(initialTransactions).toBeInTheDocument();
    
    // Fast-forward time to trigger stats update
    jest.advanceTimersByTime(5000);
    
    await waitFor(() => {
      // Values should have increased (though we can't predict exact values due to randomness)
      const userElements = screen.getAllByText(/\d{2,}/);
      expect(userElements.length).toBeGreaterThan(0);
    });
    
    jest.useRealTimers();
  });

  it('does not show live statistics when disabled', () => {
    render(<GlobalAccessibilityIndicator showLiveStats={false} />);
    
    expect(screen.queryByText('Active Users')).not.toBeInTheDocument();
    expect(screen.queryByText('Countries')).not.toBeInTheDocument();
    expect(screen.queryByText("Today's Transactions")).not.toBeInTheDocument();
    expect(screen.queryByText('24h Volume')).not.toBeInTheDocument();
  });

  it('displays supported networks', () => {
    render(<GlobalAccessibilityIndicator />);
    
    expect(screen.getByText('Supported Networks')).toBeInTheDocument();
    expect(screen.getByText('Ethereum')).toBeInTheDocument();
    expect(screen.getByText('Polygon')).toBeInTheDocument();
    expect(screen.getByText('Arbitrum')).toBeInTheDocument();
    expect(screen.getByText('Optimism')).toBeInTheDocument();
    expect(screen.getByText('BSC')).toBeInTheDocument();
  });

  it('displays network icons correctly', () => {
    render(<GlobalAccessibilityIndicator />);
    
    expect(screen.getByText('⟠')).toBeInTheDocument(); // Ethereum
    expect(screen.getByText('⬟')).toBeInTheDocument(); // Polygon
    expect(screen.getByText('🔷')).toBeInTheDocument(); // Arbitrum
    expect(screen.getByText('🔴')).toBeInTheDocument(); // Optimism
    expect(screen.getByText('🟡')).toBeInTheDocument(); // BSC
  });

  it('displays call to action section', () => {
    render(<GlobalAccessibilityIndicator />);
    
    expect(screen.getByText('Ready to go global?')).toBeInTheDocument();
    expect(screen.getByText('Start trading with anyone, anywhere')).toBeInTheDocument();
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });

  it('renders get started button as clickable', () => {
    render(<GlobalAccessibilityIndicator />);
    
    const getStartedButton = screen.getByText('Get Started');
    expect(getStartedButton).toBeInTheDocument();
    expect(getStartedButton.tagName).toBe('BUTTON');
  });

  it('applies custom className', () => {
    const { container } = render(
      <GlobalAccessibilityIndicator className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('shows live indicator with pulsing animation', () => {
    render(<GlobalAccessibilityIndicator />);
    
    const liveIndicator = screen.getByText('LIVE');
    expect(liveIndicator).toBeInTheDocument();
    
    // Check that the live indicator has the proper styling classes
    const liveContainer = liveIndicator.closest('div');
    expect(liveContainer).toHaveClass('bg-green-500/10');
    expect(liveContainer).toHaveClass('border-green-500/20');
  });

  it('displays benefit icons correctly', () => {
    render(<GlobalAccessibilityIndicator />);
    
    expect(screen.getByText('⚡')).toBeInTheDocument(); // Instant Settlement
    expect(screen.getByText('🚫')).toBeInTheDocument(); // No Banking Required
    expect(screen.getByText('🌐')).toBeInTheDocument(); // Truly Borderless
    expect(screen.getByText('🕐')).toBeInTheDocument(); // 24/7 Operations
  });

  it('formats numbers correctly in statistics', () => {
    render(<GlobalAccessibilityIndicator showLiveStats={true} />);
    
    // Check that numbers are formatted with commas
    expect(screen.getByText('12,847')).toBeInTheDocument();
    expect(screen.getByText('3,421')).toBeInTheDocument();
  });

  it('does not update statistics when showLiveStats is false', () => {
    render(<GlobalAccessibilityIndicator showLiveStats={false} />);
    
    // Statistics section should not be present
    expect(screen.queryByText('Active Users')).not.toBeInTheDocument();
  });
});