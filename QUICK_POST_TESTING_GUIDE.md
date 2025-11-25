# Quick Post Creation Testing Guide

## Overview
This document provides a comprehensive guide to testing the Quick Post creation functionality from the Facebook-style composer on the LinkDAO platform.

## Architecture Flow

### Frontend Components
1. **FacebookStylePostComposer** (`/components/FacebookStylePostComposer.tsx`)
   - User-facing composer component
   - Collects: content, media files, hashtags, feeling, location, links
   - Handles: file uploads, preview generation, hashtag extraction

2. **Index Page** (`/pages/index.tsx`)
   - Contains `handlePostSubmit` function
   - Routes to QuickPostService when no `communityId` is provided
   - Shows success/error toasts to user

3. **QuickPostService** (`/services/quickPostService.ts`)
   - Frontend service layer
   - Handles API communication
   - Manages CSRF tokens and session IDs
   - Includes authentication headers

### Backend Components
1. **QuickPost Routes** (`/routes/quickPostRoutes.ts`)
   - Endpoint: `POST /api/quick-posts`
   - Validates requests
   - Handles errors gracefully

2. **QuickPostController** (`/controllers/quickPostController.ts`)
   - Validates input (content, authorId required)
   - Uploads content to IPFS (with fallback)
   - Processes media and tags
   - Returns created post with ID and CID

3. **QuickPostService** (`/services/quickPostService.ts`)
   - Database operations
   - Inserts into `quick_posts` table
   - Updates trending cache
   - Returns saved post

## Database Schema
The `quick_posts` table stores:
- `id`: UUID (primary key)
- `authorId`: User ID
- `contentCid`: IPFS CID of content
- `content`: Actual content (fallback)
- `parentId`: For replies/threads
- `mediaCids`: JSON array of media CIDs
- `tags`: JSON array of hashtags
- `onchainRef`: On-chain reference
- `isTokenGated`: Boolean
- `gatedContentPreview`: Preview for gated content
- `stakedValue`: Token stake amount
- `reputationScore`: Post reputation
- `moderationStatus`: Moderation state
- `createdAt`, `updatedAt`: Timestamps

## Manual Testing Procedure

### Prerequisites
1. Backend server running on port 3001
2. Database connected and migrations run
3. User authenticated (wallet connected)
4. IPFS service available (optional - has fallback)

### Test Cases

#### Test 1: Basic Quick Post Creation
**Steps:**
1. Navigate to home page (`/`)
2. Ensure wallet is connected
3. Click on the post composer (should expand)
4. Type: "This is my first quick post! #testing"
5. Click "Post" button

**Expected Results:**
- ✅ Post composer shows loading state
- ✅ Success toast appears
- ✅ Post appears in feed immediately
- ✅ Composer resets to empty state
- ✅ Post contains correct content
- ✅ Hashtag `#testing` is extracted

**Backend Logs to Verify:**
```
POST /api/quick-posts - Creating quick post
Content uploaded to IPFS with CID: <CID>
Quick post created: <UUID>
```

#### Test 2: Quick Post with Media
**Steps:**
1. Click composer to expand
2. Type: "Check out this amazing image! #photo"
3. Click image icon
4. Select an image file
5. Wait for preview to load
6. Click "Post" button

**Expected Results:**
- ✅ Image preview appears in composer
- ✅ Post is created successfully
- ✅ Media is uploaded to IPFS
- ✅ Post displays image in feed
- ✅ Image is clickable/viewable

#### Test 3: Quick Post with Feeling
**Steps:**
1. Click composer
2. Type: "Having a great day!"
3. Click smile/feeling icon
4. Enter "excited" in feeling input
5. Click "Post"

**Expected Results:**
- ✅ Post content includes "— feeling excited"
- ✅ Feeling is displayed in feed post

#### Test 4: Quick Post with Location
**Steps:**
1. Click composer
2. Type: "At the conference"
3. Click location icon
4. Enter "San Francisco, CA"
5. Click "Post"

**Expected Results:**
- ✅ Post content includes "at San Francisco, CA"
- ✅ Location is displayed in feed post

#### Test 5: Quick Post with Link
**Steps:**
1. Click composer
2. Type: "Check this out!"
3. Click link icon
4. Enter URL: "https://linkdao.io"
5. Click "Post"

**Expected Results:**
- ✅ Post content includes the URL
- ✅ Link is clickable in feed
- ✅ Link preview may appear (if implemented)

#### Test 6: Multiple Hashtags
**Steps:**
1. Click composer
2. Type: "Love #web3 and #blockchain technology! #defi is the future"
3. Click "Post"

**Expected Results:**
- ✅ All three hashtags extracted: web3, blockchain, defi
- ✅ Hashtags are clickable in feed
- ✅ Tags stored in database as JSON array

#### Test 7: Error Handling - Empty Content
**Steps:**
1. Click composer
2. Leave content empty
3. Click "Post" button

**Expected Results:**
- ✅ Post button should be disabled OR
- ✅ Error toast: "Content is required"
- ✅ No API call made

#### Test 8: Error Handling - Not Authenticated
**Steps:**
1. Disconnect wallet
2. Try to create a post

**Expected Results:**
- ✅ Error toast: "Please connect your wallet to post"
- ✅ No API call made

#### Test 9: Long Content
**Steps:**
1. Click composer
2. Type a very long post (500+ characters)
3. Click "Post"

**Expected Results:**
- ✅ Textarea auto-expands
- ✅ Post is created successfully
- ✅ Content is fully stored
- ✅ Feed displays with "Read more" if truncated

#### Test 10: Special Characters
**Steps:**
1. Click composer
2. Type: "Testing special chars: @user #tag $TOKEN 🚀 💎 https://link.com"
3. Click "Post"

**Expected Results:**
- ✅ All special characters preserved
- ✅ Emojis display correctly
- ✅ Mentions, hashtags, links are formatted

## API Testing with cURL

### Get CSRF Token
```bash
curl -X GET http://localhost:3001/api/quick-posts/csrf-token \
  -H "x-session-id: test-session-123"
```

### Create Quick Post
```bash
curl -X POST http://localhost:3001/api/quick-posts \
  -H "Content-Type: application/json" \
  -H "x-session-id: test-session-123" \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "content": "Test post from cURL #testing",
    "authorId": "user_wallet_address",
    "tags": ["testing"],
    "media": []
  }'
```

### Get Quick Post by ID
```bash
curl -X GET http://localhost:3001/api/quick-posts/POST_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Posts by Author
```bash
curl -X GET "http://localhost:3001/api/quick-posts/author/AUTHOR_ID?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Database Verification

### Check if post was created
```sql
SELECT * FROM quick_posts
ORDER BY created_at DESC
LIMIT 10;
```

### Verify content CID
```sql
SELECT id, content_cid, content, author_id, created_at
FROM quick_posts
WHERE author_id = 'YOUR_WALLET_ADDRESS';
```

### Check tags
```sql
SELECT id, content, tags
FROM quick_posts
WHERE tags IS NOT NULL
ORDER BY created_at DESC;
```

## Common Issues & Solutions

### Issue: "Service temporarily unavailable"
**Cause:** Backend server not running or database connection failed
**Solution:**
- Check backend server logs
- Verify database connection
- Check environment variables

### Issue: "CSRF token invalid"
**Cause:** CSRF token expired or mismatched session
**Solution:**
- Refresh the page to get new token
- Clear sessionStorage
- Check session ID consistency

### Issue: "Unauthorized to create quick post"
**Cause:** User not authenticated or JWT token invalid
**Solution:**
- Connect wallet
- Check JWT token in localStorage
- Verify authService.getAuthHeaders() returns valid token

### Issue: Content not appearing in feed
**Cause:** Feed not refreshing or WebSocket not connected
**Solution:**
- Manual page refresh
- Check WebSocket connection status
- Verify feed refresh mechanism

### Issue: IPFS upload fails
**Cause:** IPFS service unavailable
**Solution:**
- Check IPFS configuration
- Verify mock CID fallback is working
- Content should still be saved with fallback CID

## Performance Metrics

Monitor these metrics during testing:

1. **Post Creation Time**
   - Target: < 2 seconds (with IPFS)
   - Target: < 500ms (with mock CID)

2. **Feed Update Time**
   - Target: < 1 second (WebSocket)
   - Target: < 3 seconds (polling)

3. **Media Upload Time**
   - Depends on file size
   - Should show progress indicator

## Security Checklist

- ✅ CSRF protection enabled
- ✅ Authentication required
- ✅ Input validation (content, authorId)
- ✅ SQL injection prevention (using ORM)
- ✅ XSS prevention (content sanitization)
- ✅ Rate limiting (if implemented)
- ✅ Session management
- ✅ JWT token validation

## Success Criteria

A successful test should demonstrate:
1. ✅ Quick posts can be created from the composer
2. ✅ Posts appear in the feed immediately
3. ✅ Media attachments work correctly
4. ✅ Hashtags are extracted and saved
5. ✅ Error handling works properly
6. ✅ Authentication is enforced
7. ✅ Database stores all data correctly
8. ✅ IPFS integration works (or fallback)
9. ✅ UI provides good feedback
10. ✅ No console errors

## Next Steps for Production

1. **Monitoring**: Add analytics tracking for post creation
2. **Rate Limiting**: Implement rate limits per user
3. **Content Moderation**: Add automated content filtering
4. **Spam Prevention**: Implement duplicate detection
5. **Performance**: Add caching for frequent queries
6. **Features**: Add edit/delete functionality
7. **Notifications**: Notify followers of new posts
8. **Search**: Make posts searchable by content/hashtags
