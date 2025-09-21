import React from 'react';
import { render, screen } from '@testing-library/react';
import { AboutCommunityWidget } from '../AboutCommunityWidget';
import { Community } from '../../../models/Community';
import { CommunityStats, CommunityRule } from '../../../types/community';

// Integration test to verify the component works with the existing codebase
describe('AboutCommunityWidget Integration', () => {
  const mockCommunity: Community = {
    id: '1',
    name: 'test-community',
    displayName: 'Test Community',
    description: 'Integration test community',
    rules: [],
    memberCount: 100,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    category: 'test',
    tags: ['test'],
    isPublic: true,
    moderators: [],
    settings: {
      allowedPostTypes: [],
      requireApproval: false,
      minimumReputation: 0,
      stakingRequirements: []
    }
  };

  const mockStats: CommunityStats = {
    memberCount: 100,
    onlineCount: 5,
    postsThisWeek: 10,
    activeDiscussions: 2,
    growthRate: 1.0,
    createdAt: new Date('2023-01-01')
  };

  const mockRules: CommunityRule[] = [];

  it('renders without crashing in the existing codebase', () => {
    render(
      <AboutCommunityWidget
        community={mockCommunity}
        stats={mockStats}
        rules={mockRules}
        canEdit={false}
      />
    );

    expect(screen.getByText('About Community')).toBeInTheDocument();
    expect(screen.getByText('Integration test community')).toBeInTheDocument();
  });

  it('integrates with existing Community model', () => {
    render(
      <AboutCommunityWidget
        community={mockCommunity}
        stats={mockStats}
        rules={mockRules}
        canEdit={false}
      />
    );

    // Verify it uses the Community model fields correctly
    expect(screen.getByText('Integration test community')).toBeInTheDocument(); // description
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument(); // member count
    expect(screen.getByText('5')).toBeInTheDocument(); // online count
    expect(screen.getByText('Members')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
  });
});