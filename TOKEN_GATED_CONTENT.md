# Token-Gated Content System

## Overview

The Token-Gated Content System allows communities to create premium content that is only accessible to users who meet certain criteria. This system supports three types of gating mechanisms:

1. **Token Balance Requirements** - Users must hold a minimum balance of a specific token
2. **NFT Ownership** - Users must own a specific NFT or NFT from a collection
3. **Subscription Tiers** - Users must have an active subscription to access content

## Key Features

- Flexible gating mechanisms with multiple access levels (view, interact, full)
- Subscription-based monetization with tiered benefits
- User access management and tracking
- Integration with existing community and post systems

## Database Schema

### Community Token Gated Content
Stores information about token-gated content:

```sql
CREATE TABLE community_token_gated_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    gating_type VARCHAR(50) NOT NULL, -- 'token_balance', 'nft_ownership', 'subscription'
    token_address VARCHAR(66),
    token_id VARCHAR(128),
    minimum_balance NUMERIC(20,8),
    subscription_tier VARCHAR(50),
    access_type VARCHAR(50) DEFAULT 'view', -- 'view', 'interact', 'full'
    metadata TEXT, -- JSON additional data
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### Community User Content Access
Tracks individual user access to gated content:

```sql
CREATE TABLE community_user_content_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES community_token_gated_content(id) ON DELETE CASCADE,
    user_address VARCHAR(66) NOT NULL,
    access_level VARCHAR(50) NOT NULL, -- 'denied', 'view', 'interact', 'full'
    access_granted_at TIMESTAMP DEFAULT NOW() NOT NULL,
    access_expires_at TIMESTAMP,
    metadata TEXT, -- JSON additional data
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    PRIMARY KEY (content_id, user_address)
);
```

### Community Subscription Tiers
Defines subscription tiers for communities:

```sql
CREATE TABLE community_subscription_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price NUMERIC(20,8) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    benefits TEXT, -- JSON array of benefits
    access_level VARCHAR(50) NOT NULL, -- 'view', 'interact', 'full'
    duration_days INTEGER,
    is_active BOOLEAN DEFAULT true,
    metadata TEXT, -- JSON additional data
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### Community User Subscriptions
Tracks user subscriptions to community tiers:

```sql
CREATE TABLE community_user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    tier_id UUID NOT NULL REFERENCES community_subscription_tiers(id) ON DELETE CASCADE,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'cancelled'
    payment_tx_hash VARCHAR(66),
    metadata TEXT, -- JSON additional data
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

## API Endpoints

### Token-Gated Content

#### Check Content Access
```
GET /api/communities/token-gated-content/:contentId/access
```
Check if the authenticated user has access to specific token-gated content.

#### Grant Content Access
```
POST /api/communities/token-gated-content/:contentId/access
```
Grant access to token-gated content for a user (admin/moderator only).

#### Create Token-Gated Content
```
POST /api/communities/:communityId/token-gated-content
```
Create new token-gated content for a community.

#### Get Token-Gated Content by Post
```
GET /api/communities/posts/:postId/token-gated-content
```
Get token-gated content information for a specific post.

### Subscription Tiers

#### Create Subscription Tier
```
POST /api/communities/:communityId/subscription-tiers
```
Create a new subscription tier for a community.

#### Get Subscription Tiers
```
GET /api/communities/:communityId/subscription-tiers
```
Get all active subscription tiers for a community.

### User Subscriptions

#### Subscribe User
```
POST /api/communities/:communityId/subscriptions
```
Subscribe the authenticated user to a subscription tier.

#### Get User Subscriptions
```
GET /api/communities/:communityId/subscriptions
```
Get all subscriptions for the authenticated user in a community.

## Access Levels

1. **Denied** - No access to content
2. **View** - Can view content but cannot interact (comments, reactions, etc.)
3. **Interact** - Can view and interact with content
4. **Full** - Complete access including any special privileges

## Implementation Notes

- Token balance and NFT ownership checks require blockchain integration
- Subscription tiers can have different durations (one-time, recurring)
- Access can be time-limited or indefinite
- Metadata fields allow for extensibility and custom functionality
- All timestamps are stored in UTC

## Future Enhancements

- Integration with DeFi protocols for yield-bearing subscriptions
- Dynamic pricing based on demand or user engagement
- Referral programs for subscription promotions
- Creator reward pools from subscription revenue
- Advanced analytics for content performance