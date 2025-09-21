import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GracefulDegradation from '../GracefulDegradation';

describe('GracefulDegradation', () => {
  const mockOnEnableFeature = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when no degradation needed', () => {
    render(
      <GracefulDegradation feature="test-feature" severity="low" showFallback={false}>
        <div>Normal content</div>
      </GracefulDegradation>
    );

    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('renders web3 features degradation correctly', () => {
    render(
      <GracefulDegradation 
        feature="web3-features" 
        severity="medium"
        onEnableFeature={mockOnEnableFeature}
      >
        <div>Fallback content</div>
      </GracefulDegradation>
    );

    expect(screen.getByText('Web3 Features Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/Blockchain features are currently unavailable/)).toBeInTheDocument();
    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
  });

  it('renders governance features degradation correctly', () => {
    render(
      <GracefulDegradation feature="governance" severity="medium">
        <div>Fallback content</div>
      </GracefulDegradation>
    );

    expect(screen.getByText('Governance Features Limited')).toBeInTheDocument();
    expect(screen.getByText(/Voting and governance features are temporarily unavailable/)).toBeInTheDocument();
  });

  it('renders real-time updates degradation correctly', () => {
    render(
      <GracefulDegradation feature="real-time-updates" severity="low">
        <div>Fallback content</div>
      </GracefulDegradation>
    );

    expect(screen.getByText('Real-time Updates Disabled')).toBeInTheDocument();
    expect(screen.getByText(/Live updates are currently disabled/)).toBeInTheDocument();
  });

  it('renders notifications degradation correctly', () => {
    render(
      <GracefulDegradation feature="notifications" severity="medium">
        <div>Fallback content</div>
      </GracefulDegradation>
    );

    expect(screen.getByText('Notifications Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/Push notifications are currently disabled/)).toBeInTheDocument();
  });

  it('renders default degradation for unknown features', () => {
    render(
      <GracefulDegradation feature="unknown-feature" severity="medium">
        <div>Fallback content</div>
      </GracefulDegradation>
    );

    expect(screen.getByText('Feature Temporarily Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/This feature is currently unavailable/)).toBeInTheDocument();
  });

  it('handles high severity correctly', () => {
    render(
      <GracefulDegradation 
        feature="test-feature" 
        severity="high"
        fallbackContent={<div>High severity fallback</div>}
      >
        <div>Normal content</div>
      </GracefulDegradation>
    );

    expect(screen.getByText('Feature Temporarily Unavailable')).toBeInTheDocument();
    expect(screen.getByText('High severity fallback')).toBeInTheDocument();
  });

  it('handles medium severity correctly', () => {
    render(
      <GracefulDegradation 
        feature="test-feature" 
        severity="medium"
        fallbackContent={<div>Medium severity fallback</div>}
      >
        <div>Normal content</div>
      </GracefulDegradation>
    );

    expect(screen.getByText('Feature Temporarily Unavailable')).toBeInTheDocument();
    expect(screen.getByText('Medium severity fallback')).toBeInTheDocument();
  });

  it('handles low severity with showFallback=false', () => {
    render(
      <GracefulDegradation 
        feature="test-feature" 
        severity="low" 
        showFallback={false}
        fallbackContent={<div>Low severity fallback</div>}
      >
        <div>Normal content</div>
      </GracefulDegradation>
    );

    expect(screen.getByText('Low severity fallback')).toBeInTheDocument();
    expect(screen.queryByText('Feature Temporarily Unavailable')).not.toBeInTheDocument();
  });

  it('handles low severity with showFallback=true', () => {
    render(
      <GracefulDegradation 
        feature="test-feature" 
        severity="low" 
        showFallback={true}
        fallbackContent={<div>Low severity fallback</div>}
      >
        <div>Normal content</div>
      </GracefulDegradation>
    );

    expect(screen.getByText('Feature Temporarily Unavailable')).toBeInTheDocument();
    expect(screen.getByText('Low severity fallback')).toBeInTheDocument();
  });

  it('calls onEnableFeature when action button is clicked', () => {
    render(
      <GracefulDegradation 
        feature="web3-features" 
        severity="medium"
        onEnableFeature={mockOnEnableFeature}
      >
        <div>Fallback content</div>
      </GracefulDegradation>
    );

    fireEvent.click(screen.getByText('Connect Wallet'));
    expect(mockOnEnableFeature).toHaveBeenCalled();
  });

  it('does not show action button when onEnableFeature is not provided', () => {
    render(
      <GracefulDegradation feature="web3-features" severity="medium">
        <div>Fallback content</div>
      </GracefulDegradation>
    );

    expect(screen.queryByText('Connect Wallet')).not.toBeInTheDocument();
  });

  it('renders fallback content when provided', () => {
    const fallbackContent = <div>Custom fallback content</div>;
    
    render(
      <GracefulDegradation 
        feature="test-feature" 
        severity="medium"
        fallbackContent={fallbackContent}
      >
        <div>Normal content</div>
      </GracefulDegradation>
    );

    expect(screen.getByText('Custom fallback content')).toBeInTheDocument();
  });

  it('renders children when fallbackContent is not provided', () => {
    render(
      <GracefulDegradation feature="test-feature" severity="medium">
        <div>Normal content</div>
      </GracefulDegradation>
    );

    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('applies correct styling for high severity', () => {
    const { container } = render(
      <GracefulDegradation feature="test-feature" severity="high">
        <div>Content</div>
      </GracefulDegradation>
    );

    const errorDiv = container.querySelector('.bg-red-50');
    expect(errorDiv).toBeInTheDocument();
  });

  it('applies correct styling for medium severity', () => {
    const { container } = render(
      <GracefulDegradation feature="test-feature" severity="medium">
        <div>Content</div>
      </GracefulDegradation>
    );

    const errorDiv = container.querySelector('.bg-yellow-50');
    expect(errorDiv).toBeInTheDocument();
  });

  it('applies correct styling for low severity', () => {
    const { container } = render(
      <GracefulDegradation feature="test-feature" severity="low" showFallback={true}>
        <div>Content</div>
      </GracefulDegradation>
    );

    const errorDiv = container.querySelector('.bg-gray-50');
    expect(errorDiv).toBeInTheDocument();
  });

  it('shows appropriate icons for different features', () => {
    const { rerender } = render(
      <GracefulDegradation feature="web3-features" severity="medium">
        <div>Content</div>
      </GracefulDegradation>
    );

    // Web3 features should show Zap icon (we can't easily test the icon itself, but we can test the structure)
    expect(screen.getByText('Web3 Features Unavailable')).toBeInTheDocument();

    rerender(
      <GracefulDegradation feature="governance" severity="medium">
        <div>Content</div>
      </GracefulDegradation>
    );

    expect(screen.getByText('Governance Features Limited')).toBeInTheDocument();
  });
});