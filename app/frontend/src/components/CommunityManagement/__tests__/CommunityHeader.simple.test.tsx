import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CommunityHeader from '../CommunityHeader';

// Simple mock for Button component
jest.mock('../../ui/Button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  UserGroupIcon: () => <div data-testid="user-group-icon" />,
  PhotoIcon: () => <div data-testid="photo-icon" />,
  CheckIcon: () => <div data-testid="check-icon" />,
}));

const mockCommunity = {
  id: 'test-community',
  name: 'testcommunity',
  displayName: 'Test Community',
  description: 'This is a test community',
  memberCount: 1250,
  onlineCount: 45,
  createdAt: new Date('2023-01-01'),
  isJoined: false,
  canModerate: false,
};

describe('CommunityHeader - Simple Test', () => {
  it('renders without crashing', () => {
    render(
      <CommunityHeader
        community={mockCommunity}
        isJoined={false}
        onJoinToggle={() => {}}
        canModerate={false}
      />
    );
    
    expect(screen.getByText('Test Community')).toBeInTheDocument();
  });
});