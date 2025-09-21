import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export default async function globalSetup() {
  console.log('🚀 Setting up Reddit-Style Community test environment...');

  // Create test reports directory
  const reportsDir = path.join(process.cwd(), 'test-reports', 'reddit-style');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Create coverage directory
  const coverageDir = path.join(process.cwd(), 'coverage', 'reddit-style');
  if (!fs.existsSync(coverageDir)) {
    fs.mkdirSync(coverageDir, { recursive: true });
  }

  // Set up test database or mock services if needed
  process.env.NODE_ENV = 'test';
  process.env.REACT_APP_API_URL = 'http://localhost:3001';
  process.env.REACT_APP_WS_URL = 'ws://localhost:3001';

  // Initialize test data
  const testDataPath = path.join(process.cwd(), 'src', '__tests__', 'data');
  if (!fs.existsSync(testDataPath)) {
    fs.mkdirSync(testDataPath, { recursive: true });
  }

  // Create mock data files
  const mockData = {
    communities: [
      {
        id: 'test-community',
        name: 'Test Community',
        displayName: 'Test Community',
        description: 'A test community for Reddit-style features',
        memberCount: 1234,
        onlineCount: 56,
        bannerImage: 'https://example.com/banner.jpg',
        avatarImage: 'https://example.com/avatar.jpg',
        createdAt: '2023-01-01T00:00:00.000Z',
        rules: [
          { id: '1', title: 'Be respectful', description: 'Treat others with respect' },
          { id: '2', title: 'No spam', description: 'Do not post spam content' },
        ],
        flairs: [
          { id: '1', name: 'Discussion', color: '#ff4500', backgroundColor: '#fff5f0' },
          { id: '2', name: 'Guide', color: '#0079d3', backgroundColor: '#f0f8ff' },
        ],
        moderators: [
          { id: '1', username: 'mod1', role: 'admin', tenure: '2 years' },
          { id: '2', username: 'mod2', role: 'moderator', tenure: '1 year' },
        ],
        isJoined: false,
        canModerate: false,
      }
    ],
    posts: Array.from({ length: 50 }, (_, i) => ({
      id: `test-post-${i + 1}`,
      title: `Test Post Title ${i + 1}`,
      content: `This is test post content ${i + 1}`,
      author: {
        id: `user${i + 1}`,
        username: `testuser${i + 1}`,
        avatar: `https://example.com/avatar${i + 1}.jpg`,
      },
      communityId: 'test-community',
      flair: i % 2 === 0 ? { id: '1', name: 'Discussion' } : { id: '2', name: 'Guide' },
      thumbnail: `https://example.com/thumbnail${i + 1}.jpg`,
      voteScore: Math.floor(Math.random() * 100),
      userVote: null,
      commentCount: Math.floor(Math.random() * 50),
      topComment: {
        id: `comment${i + 1}`,
        content: `This is a top comment for post ${i + 1}`,
        author: { username: `commenter${i + 1}` },
        voteScore: Math.floor(Math.random() * 20),
      },
      awards: [],
      isPinned: i < 3,
      isGovernanceProposal: i % 10 === 0,
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
      mediaType: ['text', 'image', 'video', 'link'][i % 4],
    })),
    governance: {
      activeProposals: [
        {
          id: 'proposal-1',
          title: 'Test Governance Proposal',
          description: 'A test proposal for governance features',
          status: 'active',
          deadline: new Date(Date.now() + 7 * 24 * 3600000).toISOString(),
          participationRate: 0.65,
          votingPower: 1000,
          choices: ['Yes', 'No', 'Abstain'],
          results: { yes: 450, no: 200, abstain: 50 },
        }
      ],
      userVotingPower: 100,
      participationRate: 0.65,
    }
  };

  fs.writeFileSync(
    path.join(testDataPath, 'mockData.json'),
    JSON.stringify(mockData, null, 2)
  );

  // Set up performance monitoring
  global.testStartTime = Date.now();

  console.log('✅ Reddit-Style Community test environment setup complete');
}