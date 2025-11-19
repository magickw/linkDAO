# Feed Requirements Implementation Plan

## Overview
Implement three key feed filtering requirements:
1. User's timeline shows posts from followings + own posts ✅ (Already implemented)
2. Communities page shows posts from joined communities
3. New users see recommended posts based on onboarding preferences

## Current Status

### ✅ Requirement 1: User Timeline/Feed
**Status**: Already working correctly
**Location**: `/app/frontend/src/components/Feed/FeedPage.tsx` (line 54)
**Implementation**: Uses `feedSource: 'following'` which shows:
- Posts from users the current user follows
- User's own posts
- Backend handles this in `/app/backend/src/services/feedService.ts` (lines 91-263)

### ❌ Requirement 2: Communities Page Feed Filtering
**Status**: Needs implementation
**Current Behavior**: Shows ALL posts (`feedSource: 'all'`)
**Required Behavior**: Show posts from communities user has joined

**Files to Modify**:
1. `/app/frontend/src/pages/communities.tsx` (line 259-263)
2. `/app/backend/src/services/feedService.ts` - Add community filtering logic

**Implementation Steps**:
```typescript
// Frontend: communities.tsx
const response = await FeedService.getEnhancedFeed({
  sortBy: sortBy,
  timeRange: timeFilter,
  feedSource: 'all',
  communities: joinedCommunities // Pass user's joined communities
}, pageNum, 20);
```

```typescript
// Backend: feedService.ts
// Already has communityFilter logic (line 82-86)
// Just need to pass the communities array from frontend
```

### ❌ Requirement 3: New User Onboarding Preferences
**Status**: Needs implementation from scratch

**Components Needed**:
1. Onboarding flow/modal for new users
2. Interest selection (topics/categories)
3. Database schema for user preferences
4. Recommendation algorithm based on preferences
5. Feed filtering logic for new users without follows

**Database Schema Addition**:
```sql
CREATE TABLE user_onboarding_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  preferred_categories TEXT[], -- e.g. ['defi', 'nft', 'dao']
  preferred_tags TEXT[], -- e.g. ['ethereum', 'trading', 'governance']
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_onboarding_user_id ON user_onboarding_preferences(user_id);
```

**Feed Logic for New Users**:
```typescript
// If user is new (no follows, no joined communities):
// 1. Check onboarding preferences
// 2. Show popular posts from preferred categories/tags
// 3. Show trending posts as fallback
```

## Implementation Priority

1. **High Priority**: Requirement #2 (Communities Page Filtering)
   - Quick win, uses existing infrastructure
   - Critical for user experience
   
2. **Medium Priority**: Requirement #3 (New User Recommendations)
   - Requires more infrastructure
   - Important for onboarding experience
   - Can start with simple version (popular posts in selected categories)

## Next Steps

1. Fix communities page to filter by joined communities
2. Design user onboarding preferences UI
3. Add database schema for preferences
4. Implement recommendation algorithm
5. Update feed service to handle new user recommendations

