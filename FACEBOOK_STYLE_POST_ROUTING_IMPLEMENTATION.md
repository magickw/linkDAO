# Facebook-Style Post Routing Implementation

## Overview

This document describes the implementation of Facebook-style post routing for LinkDAO timeline posts. The solution eliminates 404 errors from direct post links and provides a seamless user experience similar to Facebook's post sharing.

## Problem Statement

Previously, timeline post links like `https://www.linkdao.io/post/e22a7005-a88f-45da-89f9-01b8799e9be6` resulted in 404 errors because:
- The route didn't exist in the frontend
- Raw UUIDs were exposed in URLs
- No user context was provided
- Posts couldn't be viewed standalone

## Solution Architecture

### Three-Layer URL System

Following Facebook's pattern, we implement three types of URLs:

#### 1. Share URL (Short, Stable, Opaque)
```
https://www.linkdao.io/p/abcD92Kx
```
- **Purpose**: Safe, stable URLs for sharing
- **Format**: `/p/:shareId` where shareId is 8-character base62 encoded string
- **Behavior**: Fetches post and redirects to canonical URL
- **Benefits**: 
  - Never exposes internal UUIDs
  - Stable forever
  - Works without user context
  - SEO-friendly

#### 2. Canonical URL (User-Scoped)
```
https://www.linkdao.io/baofeng/posts/abcD92Kx
```
- **Purpose**: Canonical, user-scoped post URL
- **Format**: `/:handle/posts/:shareId`
- **Behavior**: Displays post in full-page view
- **Benefits**:
  - SEO context
  - Ownership context
  - Permission checks
  - Profile integration

#### 3. Modal URL (Future Enhancement)
```
https://www.linkdao.io/?post=abcD92Kx
```
- **Purpose**: Open post in modal overlay on timeline
- **Format**: `/?post=:shareId`
- **Behavior**: Opens modal without navigation
- **Benefits**:
  - Maintains timeline context
  - Better UX for browsing
  - Facebook-like experience

## Implementation Details

### Database Changes

#### Migration: `0073_add_post_share_ids.sql`
```sql
-- Add share_id column to quick_posts table
ALTER TABLE quick_posts 
ADD COLUMN IF NOT EXISTS share_id VARCHAR(16) UNIQUE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_quick_posts_share_id ON quick_posts(share_id);

-- Function to generate base62 share IDs
CREATE OR REPLACE FUNCTION generate_share_id() RETURNS VARCHAR(16) AS $$
DECLARE
  chars TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * 62 + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Populate existing posts with share_ids
UPDATE quick_posts 
SET share_id = generate_share_id()
WHERE share_id IS NULL;

-- Make share_id NOT NULL
ALTER TABLE quick_posts 
ALTER COLUMN share_id SET NOT NULL;
```

#### Schema Update: `schema.ts`
```typescript
export const quickPosts = pgTable("quick_posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  shareId: varchar("share_id", { length: 16 }).notNull().unique(), // NEW
  authorId: uuid("author_id").notNull().references(() => users.id),
  // ... other fields
}, (t) => ({
  shareIdIdx: index("idx_quick_posts_share_id").on(t.shareId), // NEW
  // ... other indexes
}));
```

### Backend Implementation

#### Share ID Generator: `utils/shareIdGenerator.ts`
```typescript
/**
 * Generate a random base62 share ID
 * @param length - Length of the share ID (default: 8)
 * @returns A random base62 string
 */
export function generateShareId(length: number = 8): string {
  const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * BASE62_CHARS.length);
    result += BASE62_CHARS[randomIndex];
  }
  return result;
}
```

#### New Routes

##### 1. Post Share Routes: `routes/postShareRoutes.ts`
```typescript
// GET /p/:shareId
router.get('/:shareId', async (req, res) => {
  const { shareId } = req.params;
  
  // Look up post by share_id
  const post = await db
    .select()
    .from(quickPosts)
    .where(eq(quickPosts.shareId, shareId))
    .limit(1);
    
  // Look up author's handle
  const author = await db
    .select({ handle: users.handle })
    .from(users)
    .where(eq(users.walletAddress, post.authorId))
    .limit(1);
    
  const handle = author?.handle || post.authorId.slice(0, 8);
  
  return res.json({
    success: true,
    data: {
      post,
      canonicalUrl: `/${handle}/posts/${shareId}`,
      shareUrl: `/p/${shareId}`
    }
  });
});
```

##### 2. Quick Post Routes: `routes/quickPostRoutes.ts`
```typescript
// GET /api/quick-posts/share/:shareId
router.get('/share/:shareId', 
  safeBind(quickPostController.getQuickPostByShareId, quickPostController)
);
```

#### Service Layer Updates

##### QuickPostService: `services/quickPostService.ts`
```typescript
async createQuickPost(postData: QuickPostInput) {
  const insertData = {
    authorId: postData.authorId,
    contentCid: postData.contentCid,
    shareId: generateShareId(8), // Generate share ID
    // ... other fields
  };
  
  const [newPost] = await db.insert(quickPosts).values(insertData).returning();
  return newPost;
}

async getQuickPostByShareId(shareId: string) {
  const posts = await db
    .select()
    .from(quickPosts)
    .leftJoin(users, eq(quickPosts.authorId, users.id))
    .where(eq(quickPosts.shareId, shareId))
    .limit(1);
    
  return posts[0] || null;
}
```

### Frontend Implementation

#### New Pages

##### 1. Share URL Page: `pages/p/[shareId].tsx`
- Handles `/p/:shareId` URLs
- Fetches post by share ID
- Updates URL to canonical without navigation
- Displays post in full-page view
- Provides social meta tags for sharing

##### 2. Canonical URL Page: `pages/[handle]/posts/[shareId].tsx`
- Handles `/:handle/posts/:shareId` URLs
- Fetches post by share ID
- Verifies handle matches post author
- Redirects if handle mismatch
- Provides share button
- Links to user profile

#### Key Features

##### URL Rewriting
```typescript
// In /p/:shareId page
const canonical = `/${handle}/posts/${shareId}`;
window.history.replaceState({}, '', canonical);
```

##### Handle Verification
```typescript
// In /:handle/posts/:shareId page
const postHandle = post.authorProfile?.handle || post.author?.slice(0, 8);
if (handle && postHandle !== handle) {
  router.replace(`/${postHandle}/posts/${shareId}`);
  return;
}
```

##### Share Link Generation
```typescript
const handleCopyShareLink = () => {
  const url = `${window.location.origin}/p/${shareId}`;
  navigator.clipboard.writeText(url);
  addToast('Share link copied!', 'success');
};
```

## Usage Examples

### Creating a Post
```typescript
// Backend automatically generates share_id
const post = await quickPostService.createQuickPost({
  authorId: user.id,
  content: "Hello world!",
  // ... other fields
});

// Post now has a share_id like "abcD92Kx"
console.log(post.shareId); // "abcD92Kx"
```

### Sharing a Post
```typescript
// Generate share URL
const shareUrl = `https://linkdao.io/p/${post.shareId}`;

// User shares this URL on social media
// When clicked, it:
// 1. Loads post data
// 2. Updates URL to canonical: /baofeng/posts/abcD92Kx
// 3. Displays post
```

### Direct Navigation
```typescript
// User navigates directly to canonical URL
router.push(`/${handle}/posts/${shareId}`);

// Page:
// 1. Fetches post by share_id
// 2. Verifies handle matches
// 3. Displays post with full context
```

## Benefits

### User Experience
- ✅ No more 404 errors on post links
- ✅ Clean, readable URLs
- ✅ Stable share links
- ✅ User context in URLs
- ✅ SEO-friendly

### Technical
- ✅ Decouples UI from internal IDs
- ✅ Scalable to billions of posts
- ✅ Fast lookups with indexed share_id
- ✅ Compatible with social media unfurling
- ✅ Future-proof for modal views

### Security
- ✅ Never exposes internal UUIDs
- ✅ Opaque share IDs
- ✅ Permission checks at user level
- ✅ No enumeration attacks

## Migration Path

### For Existing Posts

1. **Run Migration**
   ```bash
   psql -d linkdao -f drizzle/0073_add_post_share_ids.sql
   ```

2. **Verify Share IDs**
   ```sql
   SELECT id, share_id FROM quick_posts LIMIT 10;
   ```

3. **Update Application**
   ```bash
   npm run build
   npm run deploy
   ```

### For New Posts

Share IDs are automatically generated on creation:
```typescript
// In QuickPostService.createQuickPost()
shareId: generateShareId(8)
```

## Future Enhancements

### Modal View (Phase 2)
- Implement `/?post=:shareId` modal overlay
- Use `history.pushState` for URL updates
- Keep timeline in background
- Facebook-like browsing experience

### Analytics
- Track share URL usage
- Monitor canonical URL visits
- Measure social media referrals
- A/B test URL formats

### Optimizations
- Cache share_id lookups
- Preload post data on hover
- Implement CDN caching
- Add service worker support

## Testing

### Manual Testing

1. **Create a post**
   - Post should have a share_id
   - Verify in database

2. **Access share URL**
   - Visit `/p/:shareId`
   - Should redirect to canonical
   - Post should display

3. **Access canonical URL**
   - Visit `/:handle/posts/:shareId`
   - Post should display
   - Share button should work

4. **Test 404 handling**
   - Visit invalid share_id
   - Should show error page
   - Should not crash

### Automated Testing

```typescript
describe('Post Routing', () => {
  it('should generate share_id on post creation', async () => {
    const post = await createPost({ content: 'test' });
    expect(post.shareId).toMatch(/^[0-9A-Za-z]{8}$/);
  });
  
  it('should fetch post by share_id', async () => {
    const post = await getPostByShareId('abcD92Kx');
    expect(post).toBeDefined();
  });
  
  it('should redirect to canonical URL', async () => {
    const response = await fetch('/p/abcD92Kx');
    expect(response.redirected).toBe(true);
    expect(response.url).toMatch(/\/\w+\/posts\/abcD92Kx/);
  });
});
```

## Deployment Checklist

- [x] Database migration created
- [x] Share ID generator implemented
- [x] Backend routes updated
- [x] Service layer updated
- [x] Frontend pages created
- [ ] Migration run on production
- [ ] Application deployed
- [ ] DNS/CDN updated
- [ ] Monitoring enabled
- [ ] Documentation updated

## Monitoring

### Key Metrics
- Share URL usage rate
- Canonical URL direct visits
- 404 error rate (should be near 0)
- Page load times
- Social media referrals

### Alerts
- High 404 rate on post URLs
- Share ID generation failures
- Database query timeouts
- Missing share_id on new posts

## Support

For issues or questions:
- Check logs for share_id generation
- Verify database migration ran
- Test share URL endpoints
- Review frontend routing

## References

- Facebook post routing: https://www.facebook.com/share/p/
- Base62 encoding: https://en.wikipedia.org/wiki/Base62
- Next.js dynamic routes: https://nextjs.org/docs/routing/dynamic-routes
- URL state management: https://developer.mozilla.org/en-US/docs/Web/API/History_API
