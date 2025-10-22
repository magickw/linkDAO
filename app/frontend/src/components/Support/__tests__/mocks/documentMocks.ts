export const mockDocuments = [
  {
    id: 'beginners-guide',
    title: 'Beginner\'s Guide to LDAO',
    description: 'Learn the basics of LDAO tokens, wallet setup, and getting started with the platform.',
    category: 'getting-started',
    difficulty: 'beginner',
    readTime: 15,
    lastUpdated: '2024-01-15T10:00:00Z',
    popularity: 95,
    tags: ['wallet', 'setup', 'basics', 'tokens'],
    content: `# Beginner's Guide to LDAO

## Introduction
Welcome to the LDAO ecosystem! This guide will help you get started.

## Step 1: Setting up your wallet
First, you'll need to set up a compatible wallet...

## Step 2: Acquiring LDAO tokens
Once your wallet is ready, you can acquire LDAO tokens...

## Step 3: Using the platform
Now you're ready to explore the platform features...`,
    author: 'LDAO Team',
    version: '1.2.0'
  },
  {
    id: 'security-guide',
    title: 'Security Best Practices',
    description: 'Essential security guidelines to protect your LDAO tokens and personal information.',
    category: 'security',
    difficulty: 'intermediate',
    readTime: 8,
    lastUpdated: '2024-01-20T14:30:00Z',
    popularity: 87,
    tags: ['security', 'safety', 'protection', 'best-practices'],
    content: `# Security Best Practices

## Wallet Security
Keep your private keys secure and never share them...

## Platform Safety
Use strong passwords and enable two-factor authentication...

## Common Scams
Be aware of these common scam tactics...`,
    author: 'Security Team',
    version: '2.1.0'
  },
  {
    id: 'troubleshooting-guide',
    title: 'Troubleshooting Guide',
    description: 'Solutions to common issues and problems you might encounter.',
    category: 'troubleshooting',
    difficulty: 'intermediate',
    readTime: 12,
    lastUpdated: '2024-01-18T09:15:00Z',
    popularity: 73,
    tags: ['troubleshooting', 'problems', 'solutions', 'help'],
    content: `# Troubleshooting Guide

## Connection Issues
If you're having trouble connecting to the platform...

## Transaction Problems
When transactions fail or are pending...

## Wallet Issues
Common wallet-related problems and solutions...`,
    author: 'Support Team',
    version: '1.5.0'
  },
  {
    id: 'quick-faq',
    title: 'Quick FAQ',
    description: 'Frequently asked questions and quick answers.',
    category: 'getting-started',
    difficulty: 'beginner',
    readTime: 5,
    lastUpdated: '2024-01-10T16:45:00Z',
    popularity: 91,
    tags: ['faq', 'questions', 'answers', 'quick'],
    content: `# Quick FAQ

## What is LDAO?
LDAO is a decentralized autonomous organization token...

## How do I get started?
Follow our beginner's guide to get started...

## Is it safe?
Yes, when you follow our security best practices...`,
    author: 'LDAO Team',
    version: '1.0.0'
  }
];

export const mockCategories = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Basic guides for new users',
    count: 2,
    icon: 'play-circle'
  },
  {
    id: 'security',
    name: 'Security',
    description: 'Security and safety guidelines',
    count: 1,
    icon: 'shield'
  },
  {
    id: 'troubleshooting',
    name: 'Troubleshooting',
    description: 'Solutions to common problems',
    count: 1,
    icon: 'wrench'
  },
  {
    id: 'advanced',
    name: 'Advanced',
    description: 'Advanced features and configurations',
    count: 0,
    icon: 'cog'
  }
];

export const mockSearchResults = {
  'wallet': [mockDocuments[0], mockDocuments[2]],
  'security': [mockDocuments[1]],
  'troubleshooting': [mockDocuments[2]],
  'nonexistent': []
};

export const mockAnalytics = {
  documentViews: {
    'beginners-guide': 1250,
    'security-guide': 890,
    'troubleshooting-guide': 650,
    'quick-faq': 1100
  },
  searchQueries: [
    { query: 'wallet setup', count: 45 },
    { query: 'security', count: 32 },
    { query: 'transaction failed', count: 28 },
    { query: 'getting started', count: 25 }
  ],
  popularDocuments: ['beginners-guide', 'quick-faq', 'security-guide'],
  categoryViews: {
    'getting-started': 2350,
    'security': 890,
    'troubleshooting': 650,
    'advanced': 120
  }
};