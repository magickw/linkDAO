import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Web3PostCard from './Web3PostCard';

// Mock the ProfileCard component
jest.mock('./ProfileCard', () => {
  return function MockProfileCard({ profile }: any) {
    return <div data-testid="profile-card">{profile.handle}</div>;
  };
});

describe('Web3PostCard', () => {
  const mockPost = {
    id: '1',
    author: '0x1234567890123456789012345678901234567890',
    content: 'This is a test post content',
    tags: ['test', 'post'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockAuthorProfile = {
    id: '1',
    address: '0x1234567890123456789012345678901234567890',
    handle: 'testuser',
    ens: 'testuser.eth',
    avatarCid: 'QmAvatar123',
    bioCid: 'QmBio123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('renders post content correctly', () => {
    render(<Web3PostCard post={mockPost} authorProfile={mockAuthorProfile} />);
    
    expect(screen.getByText('This is a test post content')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('#test')).toBeInTheDocument();
    expect(screen.getByText('#post')).toBeInTheDocument();
  });

  it('formats the timestamp correctly', () => {
    render(<Web3PostCard post={mockPost} authorProfile={mockAuthorProfile} />);
    
    // Check that a timestamp is displayed (exact format may vary)
    const timeElement = screen.getByText(/ago/i);
    expect(timeElement).toBeInTheDocument();
  });

  it('renders without tags when post has no tags', () => {
    const postWithoutTags = {
      ...mockPost,
      tags: [],
    };
    
    render(<Web3PostCard post={postWithoutTags} authorProfile={mockAuthorProfile} />);
    
    expect(screen.queryByText('#test')).not.toBeInTheDocument();
    expect(screen.queryByText('#post')).not.toBeInTheDocument();
  });

  it('handles missing author profile gracefully', () => {
    render(<Web3PostCard post={mockPost} authorProfile={null} />);
    
    // Should still render the post content
    expect(screen.getByText('This is a test post content')).toBeInTheDocument();
    
    // Should show unknown author
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});