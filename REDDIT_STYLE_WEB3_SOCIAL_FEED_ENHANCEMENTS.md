# Reddit-Style Web3 Social Feed Enhancements

This document outlines the enhancements made to the LinkDAO social feed to create a Reddit-style Web3-native experience with tokenized voting, reputation systems, and DAO integration.

## Overview

The enhanced social feed combines the familiar Reddit-style interface with Web3-native features including tokenized voting, reputation-based moderation, and DAO community integration.

## Key Features Implemented

### 1. Layout & Navigation

#### Left Sidebar
- **User Profile Card**: Displays wallet address, ENS name, reputation score, and tier
- **Wallet Integration**: Shows token balances and portfolio value with 24h change
- **Top Communities List**: Shows joined DAOs with member counts and treasury balances
- **Trending DAOs**: Displays popular DAOs with governance token information
- **Community Rules**: Clear guidelines for community participation

#### Main Feed
- **Reddit-Style Post Cards**: Vertical list with upvote/downvote arrows
- **Tokenized Voting**: Microtransactions for upvotes/downvotes (0.01 $LDAO for upvote, 0.005 $LDAO for downvote)
- **Post Type Indicators**: Visual badges for different post types (Proposal, DeFi, NFT, Analysis)
- **Compact Metadata**: Title, DAO tag, author, timestamp
- **Social Actions**: Comments, share, save, and tipping functionality

#### Right Sidebar
- **Community Treasury**: Displays DAO treasury assets and values
- **Governance Token Info**: Shows token details, supply, and market cap
- **Wallet Quick Stats**: Portfolio value and quick action buttons (Buy, Swap)

### 2. Post Types

#### Standard Post
- Text, link, image, or video content
- Basic tagging system
- Default post type for general discussions

#### Proposal Post
- Directly linked to governance contracts
- Shows proposal ID and status
- Special styling with governance badge

#### DeFi Strategy Post
- Can embed wallet screenshots (read-only data)
- Shows PnL and TVL metrics
- Special styling with DeFi badge

#### NFT Showcase
- Auto-preview of NFTs from wallet
- Displays collection and token standard (ERC-721/ERC-1155)
- Special styling with NFT badge

#### Analysis Post
- Structured post type with charts and tables
- PnL tracking capabilities
- Special styling with Analysis badge

### 3. Voting & Ranking Mechanism

#### Tokenized Upvotes
- Upvote = microtransaction in platform token (0.01 $LDAO)
- Author receives rewards pooled from upvotes
- Visual feedback for successful transactions

#### Downvotes with Skin-in-the-Game
- Downvoter stakes reputation or tokens (0.005 $LDAO)
- Slashed if flagged as abuse by community
- Encourages responsible voting

#### Reward Loop
- High-ranking posts unlock token rewards
- "Crypto gilding" = send stablecoins or platform tokens as tips
- Tipping directly supports content creators

#### Sorting
- **Hot/New/Top/Rising** tabs
- **Time Filters**: Hour, day, week, month, year, all-time
- Algorithm considers votes, tips, and recency

### 4. DAO Communities (/dao/…)

#### Community Structure
- Each DAO has its own governance token
- Treasury dashboard with asset breakdown
- Rules (on-chain or off-chain enforced)
- Reputation-weighted voting on moderators/rules

#### Example Mappings
- r/ethereum → /dao/ethereum-builders
- r/nfts → /dao/nft-collectors
- r/defi → /dao/defi-traders

### 5. Web3-Native Enhancements

#### Wallet Integration
- Quick connect with smart wallets (ERC-4337)
- All actions (tip, upvote, stake) routed through wallet
- Real-time balance and portfolio updates

#### Reputation Layer
- On-chain or off-chain reputation score
- Affects voting power and posting privileges
- Tier system (Novice, Apprentice, Expert, Master)

#### Monetization
- Token-gated content
- Creator monetization (subscriptions in USDC)
- Revenue sharing between communities & authors

#### Moderation
- DAO-based, token-weighted moderation
- Slashing for spam or abuse
- Reputation decay for bad actors

## Technical Implementation

### Frontend Components

#### RedditPostCard
- Enhanced with tokenized voting functionality
- Post type detection and special rendering
- Integrated tipping feature with USDC support
- Visual indicators for different post types

#### RedditSidebar
- Wallet integration with balance display
- Reputation score and tier visualization
- Community treasury information
- DAO token and pricing data

#### PostCreationModal
- Post type selection interface
- NFT contract address and token ID fields
- Specialized placeholders for different post types

#### RedditCommunityHeader
- Community join/leave functionality
- Treasury value display
- Governance token information

#### RedditNav
- Sorting and time filter controls
- Responsive design for mobile

### Backend Integration

#### Tokenized Voting
- API endpoints for processing microtransactions
- Integration with wallet for token transfers
- Vote tracking and reputation updates

#### Tipping System
- USDC transfer functionality
- Creator reward distribution
- Transaction history tracking

#### Reputation System
- Integration with existing reputation service
- Voting participation tracking
- Content quality scoring

## User Flow Example

1. **Alice connects wallet** → Auto-generated profile with reputation score
2. **Alice posts analysis** in /dao/defi-traders with specialized post type
3. **Bob upvotes** → Spends 0.01 $LDAO, Alice receives reward
4. **Alice's post rises in Hot** → Increased visibility and engagement
5. **Treasury auto-rewards Alice** → Weekly creator pool payout based on post performance
6. **DAO moderators downvote spam** → Using staked reputation to maintain quality
7. **Alice tips another author** → Sends 1 USDC for great research

## Future Enhancements

1. **Advanced Analytics Dashboard**: Deeper insights from voting and reputation data
2. **Cross-chain Reputation**: Reputation tracking across multiple blockchains
3. **Delegation System**: Enhanced delegation functionality with reputation-based delegate selection
4. **Mobile App**: Native mobile application with push notifications
5. **Advanced Moderation Tools**: AI-powered content classification and moderation