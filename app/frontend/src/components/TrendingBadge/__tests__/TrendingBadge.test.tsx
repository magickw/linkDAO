import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TrendingBadge, { calculateTrendingLevel } from '../TrendingBadge';

describe('TrendingBadge', () => {
  it('renders hot trending badge correctly', () => {
    render(<TrendingBadge level="hot" />);
    
    expect(screen.getByText('🔥')).toBeInTheDocument();
    expect(screen.getByText('Hot')).toBeInTheDocument();
  });

  it('renders rising trending badge correctly', () => {
    render(<TrendingBadge level="rising" />);
    
    expect(screen.getByText('📈')).toBeInTheDocument();
    expect(screen.getByText('Rising')).toBeInTheDocument();
  });

  it('renders viral trending badge correctly', () => {
    render(<TrendingBadge level="viral" />);
    
    expect(screen.getByText('🚀')).toBeInTheDocument();
    expect(screen.getByText('Viral')).toBeInTheDocument();
  });

  it('renders breaking trending badge correctly', () => {
    render(<TrendingBadge level="breaking" />);
    
    expect(screen.getByText('⚡')).toBeInTheDocument();
    expect(screen.getByText('Breaking')).toBeInTheDocument();
  });

  it('shows score when showScore is true', () => {
    render(<TrendingBadge level="hot" score={1500} showScore />);
    
    expect(screen.getByText('1.5K')).toBeInTheDocument();
  });

  it('formats large scores correctly', () => {
    render(<TrendingBadge level="viral" score={2500000} showScore />);
    
    expect(screen.getByText('2500.0K')).toBeInTheDocument();
  });

  it('does not show score when showScore is false', () => {
    render(<TrendingBadge level="hot" score={1500} showScore={false} />);
    
    expect(screen.queryByText('1.5K')).not.toBeInTheDocument();
  });

  it('applies correct CSS classes for different levels', () => {
    const { rerender } = render(<TrendingBadge level="hot" />);
    let badge = screen.getByText('Hot').closest('div');
    expect(badge).toHaveClass('bg-gradient-to-r', 'from-orange-500', 'to-red-500');

    rerender(<TrendingBadge level="viral" />);
    badge = screen.getByText('Viral').closest('div');
    expect(badge).toHaveClass('bg-gradient-to-r', 'from-purple-500', 'to-pink-500');
  });
});

describe('calculateTrendingLevel', () => {
  const baseDate = new Date('2023-01-01T12:00:00Z');

  it('returns breaking for very high engagement in short time', () => {
    const recentDate = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
    const level = calculateTrendingLevel(1500, recentDate, 100, 50, 25);
    expect(level).toBe('breaking');
  });

  it('returns viral for extremely high engagement', () => {
    const level = calculateTrendingLevel(6000, baseDate, 600, 100, 50);
    expect(level).toBe('viral');
  });

  it('returns hot for high recent engagement', () => {
    const recentDate = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago
    const level = calculateTrendingLevel(750, recentDate, 50, 25, 10);
    expect(level).toBe('hot');
  });

  it('returns rising for moderate recent engagement', () => {
    const recentDate = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours ago
    const level = calculateTrendingLevel(200, recentDate, 20, 10, 5);
    expect(level).toBe('rising');
  });

  it('returns null for low engagement', () => {
    const level = calculateTrendingLevel(50, baseDate, 5, 2, 1);
    expect(level).toBeNull();
  });

  it('returns null for old content with moderate engagement', () => {
    const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
    const level = calculateTrendingLevel(200, oldDate, 20, 10, 5);
    expect(level).toBeNull();
  });
});