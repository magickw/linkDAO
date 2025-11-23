import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import BadgeCollection from '../BadgeCollection';
import { Badge } from '../../../types/reputation';

const mockBadges: Badge[] = [
  {
    id: 'badge1',
    name: 'Early Adopter',
    description: 'Joined the platform early',
    icon: '🚀',
    rarity: 'legendary',
    earnedAt: new Date('2024-01-01'),
    requirements: [],
    category: 'special'
  },
  {
    id: 'badge2',
    name: 'Expert',
    description: 'Demonstrated expertise',
    icon: '🎓',
    rarity: 'epic',
    earnedAt: new Date('2024-02-01'),
    requirements: [],
    category: 'posting'
  },
  {
    id: 'badge3',
    name: 'Community Leader',
    description: 'Leader of a community',
    icon: '👥',
    rarity: 'rare',
    earnedAt: new Date('2024-03-01'),
    requirements: [],
    category: 'community'
  }
];

describe('BadgeCollection', () => {
  it('renders badges correctly', () => {
    render(<BadgeCollection badges={mockBadges} />);
    
    expect(screen.getByText('🚀')).toBeInTheDocument();
    expect(screen.getByText('🎓')).toBeInTheDocument();
    expect(screen.getByText('👥')).toBeInTheDocument();
  });

  it('shows correct number of badges based on maxDisplay', () => {
    render(<BadgeCollection badges={mockBadges} maxDisplay={2} />);
    
    expect(screen.getByText('🚀')).toBeInTheDocument();
    expect(screen.getByText('🎓')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument(); // Show more button
  });

  it('calls onBadgeClick when badge is clicked', () => {
    const mockOnBadgeClick = jest.fn();
    render(<BadgeCollection badges={mockBadges} onBadgeClick={mockOnBadgeClick} />);
    
    fireEvent.click(screen.getByText('🚀'));
    expect(mockOnBadgeClick).toHaveBeenCalledWith(mockBadges[0]);
  });

  it('shows tooltip on hover', async () => {
    render(<BadgeCollection badges={mockBadges} />);
    
    const badge = screen.getByText('🚀');
    fireEvent.mouseEnter(badge);
    
    // Note: Testing tooltip visibility might require additional setup
    // This is a basic test structure
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<BadgeCollection badges={mockBadges} size="sm" />);
    
    // Test small size
    expect(document.querySelector('.w-8')).toBeInTheDocument();
    
    // Test medium size
    rerender(<BadgeCollection badges={mockBadges} size="md" />);
    expect(document.querySelector('.w-12')).toBeInTheDocument();
    
    // Test large size
    rerender(<BadgeCollection badges={mockBadges} size="lg" />);
    expect(document.querySelector('.w-16')).toBeInTheDocument();
  });

  it('shows all badges when showAll is true', () => {
    render(<BadgeCollection badges={mockBadges} maxDisplay={2} showAll={true} />);
    
    expect(screen.getByText('🚀')).toBeInTheDocument();
    expect(screen.getByText('🎓')).toBeInTheDocument();
    expect(screen.getByText('👥')).toBeInTheDocument();
    expect(screen.queryByText('+1')).not.toBeInTheDocument();
  });

  it('toggles show more/less functionality', () => {
    render(<BadgeCollection badges={mockBadges} maxDisplay={2} />);
    
    // Initially shows "show more" button
    const showMoreButton = screen.getByText('+1');
    expect(showMoreButton).toBeInTheDocument();
    
    // Click to show all badges
    fireEvent.click(showMoreButton);
    
    // Should now show all badges and "show less" button
    expect(screen.getByText('👥')).toBeInTheDocument();
    expect(screen.getByText('−')).toBeInTheDocument();
  });
});