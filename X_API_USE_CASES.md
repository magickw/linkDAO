# X (Twitter) API Use Cases for LinkDAO

## Overview
LinkDAO is a blockchain-based social platform that enables users to:
- Create and join decentralized communities
- Purchase and award virtual currency (gold) to content creators
- Engage in Web3 social interactions with token-based rewards
- Participate in community governance and content moderation

## X API Version & Access Tier

**API Version:** X API v2 (current standard, all new development should use v2)

**Recommended Access Tier:** Basic ($200/month) - provides access to most commonly used endpoints

**Note:** The Free tier is extremely limited (500 posts/month, 17 requests/24 hours for posting). For production applications, Basic tier is the minimum recommended.

---

## Use Cases for X's Data and API

### 1. User Account Synchronization
**Purpose:** Allow users to link their X (Twitter) account to their LinkDAO profile for enhanced social features.

**Data Used:**
- User profile information (username, display name, profile image URL)
- Public profile data (bio, location, website)
- Verified status

**API Endpoints:**
- `GET /2/users/me` - Retrieve authenticated user's profile (Rate limit: 25 req/24 hrs per user)
- `GET /2/users/by/username/{username}` - Look up user by username
- `GET /2/users/{id}` - Retrieve user by ID with additional fields

**Required Scopes:** `users.read`, `tweet.read`

**Benefits:**
- Seamless cross-platform identity verification
- Enhanced user profile completeness
- Trust and credibility through social proof

---

### 2. Content Sharing & Cross-Posting
**Purpose:** Enable users to share their LinkDAO posts, achievements, and community updates to their X timeline.

**Data Used:**
- User's tweet creation permissions
- Media upload capabilities (for images, videos)

**API Endpoints:**
- `POST /2/tweets` - Create posts on behalf of users
- `POST /2/media/upload` - Upload media attachments (v2 endpoint, replaces deprecated v1.1)
  - For chunked uploads: `POST /2/media/upload` with INIT, APPEND, FINALIZE commands
- `GET /2/tweets/search/recent` - Search recent posts (last 7 days)

**Required Scopes:** `tweet.write`, `tweet.read`, `media.write`

**Rate Limits (Basic Tier):**
- Post creation: 100 posts/24 hrs per user
- Media upload: Tied to post creation limits

**Benefits:**
- Amplify user content reach
- Drive traffic from X to LinkDAO
- Increase platform visibility and user acquisition

---

### 3. Social Activity Import
**Purpose:** Import user's X activity to populate their LinkDAO profile and enable social graph connections.

**Data Used:**
- User's recent tweets (public only)
- User's follower/following relationships
- User's likes and retweets

**API Endpoints:**
- `GET /2/users/{id}/tweets` - Retrieve user's tweets (max 3200 most recent)
- `GET /2/users/{id}/followers` - Get follower list (max 1000 per request)
- `GET /2/users/{id}/following` - Get following list (max 1000 per request)
- `GET /2/users/{id}/liked_tweets` - Get user's liked tweets

**Required Scopes:** `tweet.read`, `users.read`, `follows.read`, `like.read`

**Access Note:** Followers/following endpoints may require Basic tier or higher with user context authentication.

**Benefits:**
- Richer user profiles with social context
- Discoverability of existing connections
- Onboarding through social graph mapping

---

### 4. Social Login & Authentication
**Purpose:** Enable users to sign up/log in to LinkDAO using their X account credentials.

**Data Used:**
- OAuth 2.0 authentication tokens (with PKCE)
- Basic user identity verification

**Authentication Flow:**
- OAuth 2.0 Authorization Code Flow with PKCE
- Authorization URL: `https://x.com/i/oauth2/authorize`
- Token URL: `https://api.x.com/2/oauth2/token`
- `GET /2/users/me` - Verify authenticated user after token exchange

**Required Scopes:** `users.read`, `tweet.read` (minimum for login)

**Benefits:**
- Frictionless onboarding experience
- Reduced password management overhead
- Faster user registration

---

### 5. Content Moderation & Safety
**Purpose:** Leverage X's reputation and trust signals to enhance content moderation on LinkDAO.

**Data Used:**
- User's account age and verification status
- Public reputation indicators
- Account creation date

**API Endpoints:**
- `GET /2/users/{id}` - Retrieve user metadata including:
  - `created_at` - Account creation date
  - `verified` - Verification status
  - `public_metrics` - Follower/following counts
  - `protected` - Whether account is private

**Required Scopes:** `users.read`

**Benefits:**
- Improved community safety
- Reduced spam and malicious content
- Trust-based user ranking

---

### 6. Community Discovery & Growth
**Purpose:** Enable users to find and invite friends from X to join LinkDAO communities.

**Data Used:**
- User's social graph (followers/following)
- Public user profiles for discovery

**API Endpoints:**
- `GET /2/users/{id}/followers` - Access follower list
- `GET /2/users/{id}/following` - Access following list
- `GET /2/users/by` - Batch lookup users by usernames (max 100)

**Required Scopes:** `users.read`, `follows.read`

**Benefits:**
- Network effects and viral growth
- Community building through existing relationships
- Higher engagement through social connections

---

### 7. Achievement & Badge Sharing
**Purpose:** Allow users to showcase their LinkDAO achievements, gold awards, and community milestones on X.

**Data Used:**
- Tweet creation permissions
- Media upload capabilities

**API Endpoints:**
- `POST /2/tweets` - Share achievement announcements
- `POST /2/media/upload` - Upload achievement badges/images
  - Supports: Images (JPEG, PNG, GIF, WEBP), Videos (MP4), Animated GIFs

**Required Scopes:** `tweet.write`, `media.write`

**Benefits:**
- User recognition and gamification
- Platform promotion through user achievements
- Social proof of community participation

---

### 8. Real-time Social Feeds
**Purpose:** Display relevant X content within LinkDAO communities for enriched discussions.

**Data Used:**
- Public tweets from specific accounts or hashtags
- Recent tweet searches

**API Endpoints:**
- `GET /2/tweets/search/recent` - Search recent tweets (last 7 days)
- `GET /2/tweets/search/all` - Full-archive search (Pro tier and above only)
- Filtered Stream endpoints (Pro tier and above):
  - `POST /2/tweets/search/stream/rules` - Add filter rules
  - `GET /2/tweets/search/stream` - Connect to filtered stream

**Required Scopes:** `tweet.read`

**Access Note:** Filtered stream and full-archive search require Pro tier ($5,000/month) or Enterprise access.

**Benefits:**
- Richer content ecosystem
- Cross-platform engagement
- Trending topic awareness

---

## API Access Tiers Summary

| Tier | Monthly Cost | Post Reads | Key Features |
|------|-------------|------------|--------------|
| Free | $0 | 500/month | Very limited, 17 posts/24 hrs write |
| Basic | $200 | 10,000/month | Most v2 endpoints, 100 posts/24 hrs write |
| Pro | $5,000 | 1,000,000/month | Full-archive search, filtered stream |
| Enterprise | Custom | 50,000,000+/month | Highest limits, dedicated support |

**Recommendation for LinkDAO:** Start with Basic tier for production. Upgrade to Pro if real-time streaming or full-archive search is needed.

---

## Data Protection & Privacy Commitments

1. **No Data Resale:** We will not resell any data received via X APIs
2. **User Consent:** All data access requires explicit user authorization through OAuth
3. **Minimal Data Collection:** We only collect data necessary for the stated use cases
4. **Secure Storage:** All user data is encrypted and stored securely
5. **Data Retention:** User data is retained only as long as necessary for service provision
6. **User Control:** Users can revoke X access and delete their data at any time
7. **Compliance:** We comply with GDPR, CCPA, and other applicable data protection regulations

## Compliance with X Developer Agreement

- We understand that we may not resell anything received via X APIs
- We accept the Developer Agreement, Incorporated Developer Terms, and X Developer Policy
- We understand our Developer account may be terminated for violations
- By accessing X APIs, we indicate agreement with all terms and policies

## Technical Implementation Notes

### Authentication Best Practices
- Use OAuth 2.0 with PKCE (Proof Key for Code Exchange)
- Store refresh tokens securely (encrypted at rest)
- Implement token refresh logic before expiration
- Handle rate limit errors gracefully with exponential backoff

### Rate Limit Handling
- Implement request queuing for bulk operations
- Cache API responses where appropriate
- Monitor `x-rate-limit-remaining` headers
- Use webhooks where available instead of polling

### Migration Notes (2025)
- v1.1 media upload endpoint (`upload.twitter.com/1.1/media/upload.json`) was deprecated March 31, 2025
- All new development should use v2 endpoints exclusively
- X is transitioning terminology from "tweets" to "posts" in documentation

---

## Contact & Support

For questions about our X API usage or data protection practices:
- Email: support@linkdao.io
- Documentation: https://docs.linkdao.io/privacy

## References

- [X API Documentation](https://developer.x.com/en/docs/x-api)
- [X API v2 Support](https://developer.x.com/en/support/x-api/v2)
- [X Developer Changelog](https://docs.x.com/changelog)
- [X API Pricing](https://developer.x.com/en/products/twitter-api)

---

*Last Updated: January 2026*
