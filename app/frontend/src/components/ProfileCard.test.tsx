import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileCard from './ProfileCard';

// Mock the FollowButton component
jest.mock('./FollowButton', () => {
  return function MockFollowButton() {
    return <button data-testid="follow-button">Follow</button>;
  };
});

describe('ProfileCard', () => {
  const mockProfile = {
    id: '1',
    address: '0x1234567890123456789012345678901234567890',
    handle: 'testuser',
    ens: 'testuser.eth',
    avatarCid: 'QmAvatar123',
    bioCid: 'QmBio123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('renders profile information correctly', () => {
    render(<ProfileCard profile={mockProfile} />);
    
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('testuser.eth')).toBeInTheDocument();
    expect(screen.getByTestId('follow-button')).toBeInTheDocument();
  });

  it('renders without ENS name when not available', () => {
    const profileWithoutEns = {
      ...mockProfile,
      ens: '',
    };
    
    render(<ProfileCard profile={profileWithoutEns} />);
    
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.queryByText('testuser.eth')).not.toBeInTheDocument();
  });

  it('displays avatar when avatarCid is provided', () => {
    render(<ProfileCard profile={mockProfile} />);
    
    const avatar = screen.getByAltText('Profile avatar');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', expect.stringContaining('QmAvatar123'));
  });

  it('uses default avatar when avatarCid is not provided', () => {
    const profileWithoutAvatar = {
      ...mockProfile,
      avatarCid: '',
    };
    
    render(<ProfileCard profile={profileWithoutAvatar} />);
    
    const avatar = screen.getByAltText('Profile avatar');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', '/default-avatar.png');
  });
});