# Post Visibility Issue - Diagnostic Guide

## Problem
Posts are created successfully but don't appear in the timeline/feed.

## Possible Causes

### 1. **Feed Caching Issue**
The feed service uses caching for trending posts. New posts might not appear immediately if the cache hasn't been invalidated.

**Solution**: Try refreshing the page or waiting a few seconds for the cache to update.

### 2. **Feed Source Filter**
If you're viewing the "Following" feed but haven't followed anyone (or the post author), the post won't appear.

**Solution**: Switch to "All" feed or "Hot" feed to see all posts.

### 3. **Community Filter**
If you have community filters applied, posts from other communities won't show.

**Solution**: Clear community filters or ensure you're viewing the correct community.

### 4. **Moderation Status**
Posts with `moderationStatus = 'blocked'` are filtered out from the feed.

**Solution**: Check if the post has been flagged by moderation.

### 5. **Parent ID Issue**
If the post has a `parentId` set, it will be treated as a comment and filtered out from the main feed.

**Solution**: Ensure `parentId` is NULL for top-level posts.

## Quick Fixes

### Check if Post Exists in Database
Run this query to verify the post was created:

```sql
SELECT id, author_id, content_cid, dao, parent_id, moderation_status, created_at 
FROM posts 
ORDER BY created_at DESC 
LIMIT 10;
```

### Clear Feed Cache
The feed service caches trending posts. To force a refresh:
- Wait 5-10 minutes for cache to expire
- Or restart the backend server to clear in-memory cache

### Check Feed Filters
In the frontend, ensure:
- Feed source is set to "all" (not "following")
- No community filters are applied
- Sort is set to "newest" to see recent posts first

### Verify Post Creation Response
Check the browser console for the post creation response. It should include:
```json
{
  "success": true,
  "data": {
    "id": 123,
    "authorId": "...",
    "contentCid": "...",
    "createdAt": "...",
    "parentId": null  // Should be null for top-level posts
  }
}
```

## Frontend Fix

If posts aren't appearing immediately, add this to the post creation success handler:

```typescript
// After successful post creation
const newPost = response.data;

// Optimistically add to feed
setFeedPosts(prev => [newPost, ...prev]);

// Or force feed refresh
refetchFeed();
```

## Backend Fix

The issue is likely in the feed query. The feed service filters posts with:
- `parentId IS NULL` (exclude comments)
- `moderationStatus != 'blocked'` (exclude blocked content)
- Time range filter
- Community filter
- Following filter (if applicable)

Make sure your newly created post:
1. Has `parentId = NULL`
2. Has `moderationStatus = NULL` or not 'blocked'
3. Has a valid `createdAt` timestamp
4. Has the correct `dao` (community) value if filtering by community

## Testing Steps

1. **Create a post** and note the response
2. **Check browser console** for any errors
3. **Switch to "Newest" sort** to see most recent posts first
4. **Clear all filters** (communities, following, etc.)
5. **Refresh the page** to clear any client-side cache
6. **Check the Network tab** to see the feed API response

## Immediate Workaround

Add this to your frontend after creating a post:

```typescript
// Force immediate feed refresh after post creation
await createPost(postData);
router.push('/'); // Navigate to home
router.reload(); // Force page reload
```

This ensures the feed is fetched fresh from the server.
