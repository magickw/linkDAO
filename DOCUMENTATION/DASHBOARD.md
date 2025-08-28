# LinkDAO Dashboard Documentation

## Overview

The LinkDAO Dashboard is a personalized feed for authenticated users that consolidates social, governance, and marketplace activities into a single view. It provides a comprehensive overview of the user's Web3 activities and connections.

## Features

### 1. Top Section (User Snapshot)

The user snapshot provides a quick overview of the authenticated user's profile and key metrics:

- **User Info Bar**
  - Avatar with reputation badge indicator
  - Username and ENS name
  - Wallet balance summary (ETH, USDC, NFT count)
  - Quick action buttons (Create Post, Send Tokens, DAO Proposal)

- **Notifications / Tasks Widget**
  - Governance votes pending
  - Auction bids expiring
  - Social mentions and new followers

### 2. Main Feed (Personalized Posts)

The main feed displays a personalized stream of content from various sources:

- **Source of Posts**
  - Users the authenticated user follows
  - DAOs user has joined (governance proposals, discussions)
  - Market updates from watched tokens/NFTs
  - AI Assistant Suggestions (curated threads)

- **Feed Content Types**
  - Recent Posts (social text, media, NFT showcases)
  - Governance Updates (proposals & discussions in DAOs)
  - Marketplace Updates (items posted/bid on by connections)
  - AI Assistant Suggestions (curated threads)

- **Post Card Layout**
  - DAO / User tag at top
  - Title + preview snippet
  - Media / NFT embed (if present)
  - Action bar: reactions (🔥💎🚀), tip, stake-to-boost, comment, share

### 3. Right Sidebar (Smart Recommendations)

The sidebar provides contextual recommendations and insights:

- **Trending DAOs** (that friends are active in)
- **Suggested users to follow**
- **Active marketplace auctions** from connections
- **AI insights** ("You missed 3 hot proposals in DeFi Builders DAO")

### 4. Bottom Section (Quick Wallet & Governance)

The bottom section provides quick access to common actions:

- **Wallet snapshot**: balances + quick send/receive
- **DAO votes**: inline action → vote without leaving feed
- **Marketplace shortcuts**: Sell Item, View Bids

## Mobile Dashboard View

The dashboard is fully responsive with mobile-specific features:

- **Top tabs** for filtering feed:
  - All | Users | DAOs | Marketplace
- **Gesture shortcuts**:
  - Swipe right → react 🔥
  - Swipe left → tip
  - Long press → stake tokens

## Feed Refresh Logic

The dashboard implements intelligent feed refresh mechanisms:

- **Real-time updates** (via WebSockets or GraphQL subscriptions)
- **Infinite scroll** + pagination
- **Prioritization logic**:
  - Posts from direct follows > DAOs > Recommendations
  - Boosted posts (stake-weighted) rise in ranking

## Technical Implementation

### Frontend

The dashboard is implemented as a React component in `/app/frontend/src/pages/dashboard.tsx` and includes:

- Integration with Web3 context for wallet connectivity
- Use of existing hooks for posts and profiles
- Responsive design for all device sizes
- Mobile-specific navigation and gestures

### Backend

The personalized feed is powered by the backend API:

- **Endpoint**: `/api/posts/feed`
- **Service**: `PostService.getFeed()`
- **Database Queries**: Joins posts with user follows data
- **Personalization Logic**: 
  - Prioritizes posts from followed users
  - Includes user's own posts
  - Sorts by creation date (newest first)

## Future Enhancements

Planned improvements for the dashboard include:

1. **Advanced Personalization**
   - Machine learning-based content recommendations
   - User interest profiling based on interactions
   - Collaborative filtering for similar users

2. **Enhanced Real-time Features**
   - Live notifications for all activities
   - Real-time comment and reaction updates
   - WebSocket integration for instant updates

3. **Deeper DAO Integration**
   - Proposal voting directly from feed
   - DAO membership status indicators
   - Treasury balance tracking

4. **Marketplace Integration**
   - NFT previews with real-time bidding
   - Price tracking for watched assets
   - Automated alerts for price changes

5. **AI Assistant Integration**
   - Contextual insights for each post
   - Automated content summarization
   - Smart tagging and categorization

## API Endpoints

### Get Personalized Feed
```
GET /api/posts/feed?forUser={userAddress}
```

Returns a JSON array of posts personalized for the specified user.

## Component Structure

```
Dashboard (/dashboard)
├── UserSnapshot
│   ├── UserInfoBar
│   ├── WalletBalance
│   └── QuickActions
├── NotificationsWidget
├── MainFeed
│   ├── FeedFilters (mobile)
│   └── PostCard
└── SmartRecommendations
    ├── TrendingDAOs
    ├── SuggestedUsers
    ├── ActiveAuctions
    └── AIInsights
```