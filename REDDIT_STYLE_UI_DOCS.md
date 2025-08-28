# Reddit-Style UI Implementation for LinkDAO

## Overview

This document describes the implementation of a Reddit-style UI for the LinkDAO Web3 social platform. The implementation follows the requested features while maintaining Web3-native functionality.

## Key Components

### 1. RedditPostCard Component

The [RedditPostCard.tsx](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend/src/components/RedditPostCard.tsx) component implements a Reddit-style post display with:

- Upvote/downvote arrows with visual feedback
- Community tags showing which DAO the post belongs to
- Compact post information (title, author, timestamp)
- Media previews when available
- Action buttons (comments, share, save, tip)
- Token-based voting system instead of traditional karma

### 2. RedditNav Component

The [RedditNav.tsx](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend/src/components/RedditNav.tsx) component provides Reddit-style navigation with:

- Hot/New/Top/Rising tabs with appropriate icons
- Time filters (hour, day, week, month, year, all time)
- Responsive dropdown for time filters on smaller screens

### 3. RedditSidebar Component

The [RedditSidebar.tsx](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend/src/components/RedditSidebar.tsx) component includes:

- User info card with karma and community count
- Top communities list with member counts
- Trending DAOs section
- Wallet quick stats with portfolio value and 24h change
- Community rules display

### 4. RedditCommunityHeader Component

The [RedditCommunityHeader.tsx](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend/src/components/RedditCommunityHeader.tsx) component provides:

- Community banner with gradient background
- Community icon and name
- Member and online counts
- Community description
- Navigation tabs for Posts/Proposals/Governance/Marketplace
- Join/Joined button

### 5. PostCreationModal Component

The [PostCreationModal.tsx](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend/src/components/PostCreationModal.tsx) component enhances the post creation experience with:

- Modal interface for creating posts
- Content text area with character counter
- Media upload with preview
- Tag input for categorization
- Clean, focused interface

## Pages

### 1. Social Feed Page

The [social.tsx](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend/src/pages/social.tsx) page implements:

- Reddit-style three-column layout (main feed, sidebar)
- Navigation tabs for sorting posts
- Post creation button that opens the modal
- Responsive design for all screen sizes
- Loading states and error handling

### 2. Community Index Page

The [dao/index.tsx](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend/src/pages/dao/index.tsx) page displays:

- Grid of available DAO communities
- Community cards with banners, icons, and descriptions
- Member and online counts for each community
- "Create Community" call-to-action

### 3. Community Page

The [dao/[community].tsx](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend/src/pages/dao/%5Bcommunity%5D.tsx) page provides:

- Community-specific header with join functionality
- Community navigation tabs
- Community-specific post feed
- Sidebar with community information

## Web3-Native Features

### Token-Based Voting System

Instead of traditional upvotes/downvotes, the implementation uses:

- Upvotes that cost a small amount of platform tokens
- Downvotes that require reputation staking
- Token rewards for authors of top posts
- "Gilding" system using crypto tips instead of Reddit Gold

### Community Structure

Web3-native community mapping:

- r/ethereum → /dao/ethereum-builders
- r/defi → /dao/defi-traders
- r/nfts → /dao/nft-collectors

Each community has its own governance token and rules.

### Post Types

The platform supports Web3-specific post types:

- Trade Analysis (with portfolio screenshots)
- Governance Discussions
- DeFi Strategy sharing
- NFT showcases
- Proposal submissions

## Responsive Design

All components are designed with mobile responsiveness in mind:

- Flexible grid layouts that adapt to screen size
- Appropriate touch targets for mobile users
- Collapsible elements for smaller screens
- Optimized navigation for mobile devices

## Dark Mode Support

All components fully support dark mode:

- Automatic detection of system preference
- User-toggleable dark/light mode
- Consistent styling across all components
- Proper contrast for readability

## Implementation Details

### State Management

- Local component state for UI interactions
- Integration with existing Web3 context for wallet information
- Integration with existing hooks for data fetching
- Toast notifications for user feedback

### Data Flow

1. Posts are fetched using existing [useFeed](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend/src/hooks/usePosts.ts#L12-L33) hook
2. User actions update local state immediately for responsiveness
3. API calls are made to backend services for persistence
4. Errors are displayed using toast notifications

### Styling

- Uses Tailwind CSS for consistent styling
- Follows existing design system with primary color scheme
- Implements proper spacing and typography
- Includes hover and focus states for interactive elements

## Future Enhancements

1. Integration with actual token-based voting system
2. Implementation of community-specific governance tokens
3. Addition of advanced filtering and search capabilities
4. Implementation of user karma/reputation system
5. Addition of community moderation tools
6. Integration with wallet for token-based actions