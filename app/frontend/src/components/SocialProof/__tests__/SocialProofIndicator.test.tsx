import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SocialProofIndicator, { SocialProofData } from '../SocialProofIndicator';

describe('SocialProofIndicator', () => {
  const mockSocialProof: SocialProofData = {
    followedUsersWhoEngaged: [
      {
        id: '1',
        address: '0x1234567890123456789012345678901234567890',
        username: 'alice',
        displayName: 'Alice',
        verified: false
      },
      {
        id: '2',
        address: '0x2345678901234567890123456789012345678901',
        username: 'bob',
        displayName: 'Bob',
        verified: false
      }
    ],
    totalEngagementFromFollowed: 25,
    communityLeadersWhoEngaged: [
      {
        id: '3',
        address: '0x3456789012345678901234567890123456789012',
        username: 'leader',
        displayName: 'Community Leader',
        verified: false
      }
    ],
    verifiedUsersWhoEngaged: [
      {
        id: '4',
        address: '0x4567890123456789012345678901234567890123',
        username: 'verified',
        displayName: 'Verified User',
        verified: true
      }
    ]
  };

  it('renders nothing when no engaged users', () => {
    const emptySocialProof: SocialProofData = {
      followedUsersWhoEngaged: [],
      totalEngagementFromFollowed: 0,
      communityLeadersWhoEngaged: [],
      verifiedUsersWhoEngaged: []
    };

    const { container } = render(<SocialProofIndicator socialProof={emptySocialProof} />);
    expect(container.firstChild).toBeNull();
  });

  it('displays user avatars correctly', () => {
    render(<SocialProofIndicator socialProof={mockSocialProof} />);
    
    // Should show avatar containers for users (verified users get priority)
    const avatarContainers = document.querySelectorAll('.w-8.h-8.rounded-full');
    expect(avatarContainers.length).toBeGreaterThan(0);
  });

  it('shows correct social proof text for verified users', () => {
    const verifiedOnlySocialProof: SocialProofData = {
      ...mockSocialProof,
      communityLeadersWhoEngaged: [],
      followedUsersWhoEngaged: []
    };

    render(<SocialProofIndicator socialProof={verifiedOnlySocialProof} />);
    expect(screen.getByText('1 verified user engaged')).toBeInTheDocument();
  });

  it('shows correct social proof text for community leaders', () => {
    const leadersOnlySocialProof: SocialProofData = {
      ...mockSocialProof,
      verifiedUsersWhoEngaged: [],
      followedUsersWhoEngaged: []
    };

    render(<SocialProofIndicator socialProof={leadersOnlySocialProof} />);
    expect(screen.getByText('1 community leader engaged')).toBeInTheDocument();
  });

  it('shows correct social proof text for followed users', () => {
    const followedOnlySocialProof: SocialProofData = {
      ...mockSocialProof,
      verifiedUsersWhoEngaged: [],
      communityLeadersWhoEngaged: []
    };

    render(<SocialProofIndicator socialProof={followedOnlySocialProof} />);
    expect(screen.getByText('2 users you follow engaged')).toBeInTheDocument();
  });

  it('shows engagement score when provided', () => {
    render(<SocialProofIndicator socialProof={mockSocialProof} />);
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('respects maxAvatars limit', () => {
    render(<SocialProofIndicator socialProof={mockSocialProof} maxAvatars={2} />);
    
    // Should show +2 indicator for remaining users
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('opens modal when clicked and showModal is true', () => {
    render(<SocialProofIndicator socialProof={mockSocialProof} showModal />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(screen.getByText('Social Proof')).toBeInTheDocument();
    expect(screen.getByText('Verified Users (1)')).toBeInTheDocument();
    expect(screen.getByText('Community Leaders (1)')).toBeInTheDocument();
    expect(screen.getByText('People You Follow (2)')).toBeInTheDocument();
  });

  it('does not open modal when showModal is false', () => {
    render(<SocialProofIndicator socialProof={mockSocialProof} showModal={false} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(screen.queryByText('Social Proof')).not.toBeInTheDocument();
  });

  it('closes modal when close button is clicked', () => {
    render(<SocialProofIndicator socialProof={mockSocialProof} showModal />);
    
    // Open modal
    const openButton = screen.getByRole('button');
    fireEvent.click(openButton);
    
    // Close modal
    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);
    
    expect(screen.queryByText('Social Proof')).not.toBeInTheDocument();
  });
});