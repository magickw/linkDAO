import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProgressIndicator from '../ProgressIndicator';
import { ProgressMilestone } from '../../../types/reputation';

const mockMilestones: ProgressMilestone[] = [
  {
    category: 'posting',
    current: 75,
    target: 100,
    reward: 'Expert Badge',
    progress: 75
  },
  {
    category: 'governance',
    current: 40,
    target: 50,
    reward: 'Governance Pro',
    progress: 80
  },
  {
    category: 'community',
    current: 90,
    target: 100,
    reward: 'Community Leader',
    progress: 90
  }
];

describe('ProgressIndicator', () => {
  it('renders milestones correctly', () => {
    render(<ProgressIndicator milestones={mockMilestones} />);
    
    expect(screen.getByText('Content Creation')).toBeInTheDocument();
    expect(screen.getByText('Governance')).toBeInTheDocument();
    expect(screen.getByText('Community')).toBeInTheDocument();
  });

  it('shows correct progress percentages', () => {
    render(<ProgressIndicator milestones={mockMilestones} />);
    
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  it('displays progress values correctly', () => {
    render(<ProgressIndicator milestones={mockMilestones} />);
    
    expect(screen.getByText('75 / 100')).toBeInTheDocument();
    expect(screen.getByText('40 / 50')).toBeInTheDocument();
    expect(screen.getByText('90 / 100')).toBeInTheDocument();
  });

  it('shows reward information', () => {
    render(<ProgressIndicator milestones={mockMilestones} />);
    
    expect(screen.getByText('Expert Badge')).toBeInTheDocument();
    expect(screen.getByText('Governance Pro')).toBeInTheDocument();
    expect(screen.getByText('Community Leader')).toBeInTheDocument();
  });

  it('hides labels when showLabels is false', () => {
    render(<ProgressIndicator milestones={mockMilestones} showLabels={false} />);
    
    expect(screen.queryByText('Content Creation')).not.toBeInTheDocument();
    expect(screen.queryByText('75%')).not.toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<ProgressIndicator milestones={mockMilestones} size="sm" />);
    
    // Test small size
    expect(document.querySelector('.h-2')).toBeInTheDocument();
    
    // Test medium size
    rerender(<ProgressIndicator milestones={mockMilestones} size="md" />);
    expect(document.querySelector('.h-3')).toBeInTheDocument();
    
    // Test large size
    rerender(<ProgressIndicator milestones={mockMilestones} size="lg" />);
    expect(document.querySelector('.h-4')).toBeInTheDocument();
  });

  it('renders vertical orientation correctly', () => {
    render(<ProgressIndicator milestones={mockMilestones} orientation="vertical" />);
    
    expect(document.querySelector('.progress-indicator-vertical')).toBeInTheDocument();
    expect(screen.getByText('Content Creation')).toBeInTheDocument();
  });

  it('shows category icons', () => {
    render(<ProgressIndicator milestones={mockMilestones} />);
    
    expect(screen.getByText('✍️')).toBeInTheDocument(); // posting
    expect(screen.getByText('🏛️')).toBeInTheDocument(); // governance
    expect(screen.getByText('👥')).toBeInTheDocument(); // community
  });
});