# Testing Guide: Following System & Real-time Updates

## Prerequisites

1. **Two Browser Windows/Profiles:**
   - Chrome Profile 1 (User A)
   - Chrome Profile 2 or Incognito (User B)

2. **Two Wallet Accounts:**
   - MetaMask Account 1
   - MetaMask Account 2

3. **Servers Running:**
   ```bash
   # Terminal 1 - Backend
   cd app/backend
   npm run dev
   # Should see: "Server running on port 10000"
   # Should see: "WebSocket service initialized"

   # Terminal 2 - Frontend
   cd app/frontend
   npm run dev
   # Should see: "Ready on http://localhost:3000"
   ```

---

## TEST 1: Following System

### Step 1: Setup Users
**Browser 1 (User A):**
1. Navigate to `http://localhost:3000`
2. Click "Connect Wallet" button
3. Connect MetaMask Account 1
4. Note your wallet address (e.g., `0x1234...abcd`)

**Browser 2 (User B):**
1. Navigate to `http://localhost:3000` (incognito or different profile)
2. Click "Connect Wallet" button
3. Connect MetaMask Account 2
4. Note your wallet address (e.g., `0x5678...efgh`)

### Step 2: Create Test Posts
**Browser 1 (User A):**
1. Create a post: "Test post from User A - #test"
2. Wait for success toast
3. Should see the post appear in feed

**Browser 2 (User B):**
1. Create a post: "Test post from User B - #testing"
2. Wait for success toast
3. Should see the post appear in feed

### Step 3: Test Follow Functionality
**Browser 1 (User A):**
1. Look for User B's post in the feed
2. Find the FollowButton on User B's post card
3. Click "Follow" button
4. Button should change to "Following"
5. ✅ **SUCCESS:** Button state changed

**Verify Backend:**
```bash
# In a new terminal
cd app/backend
# Check logs for:
# "User authenticated: 0x1234...abcd"
# "User 0x1234...abcd subscribed to feed:all"
```

### Step 4: Test Following Feed Filter
**Browser 1 (User A):**
1. Click the "Following" tab at the top of the feed
2. ✅ **EXPECTED:** Should ONLY see posts from User B (the user you're following)
3. Click the "For You" tab
4. ✅ **EXPECTED:** Should see posts from BOTH users

**If Following Tab Shows Empty:**
- Check browser console for errors
- Verify the follow action succeeded
- Check backend logs for SQL queries

### Step 5: Test Unfollow
**Browser 1 (User A):**
1. Click "Following" button on User B's post
2. Button should change back to "Follow"
3. Click "Following" tab
4. ✅ **EXPECTED:** Should show empty state or message
5. ✅ **SUCCESS:** Unfollow working

---

## TEST 2: Real-time Updates

### Step 1: Setup WebSocket Connections
**Both Browsers:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for: `"WebSocket connected"` or `"User authenticated"`
4. ✅ **EXPECTED:** WebSocket connection established

**Check Backend Logs:**
```
Client connected: <socket-id>
User authenticated: 0x1234...abcd (<socket-id>) - Reconnecting: false
User 0x1234...abcd subscribed to feed:all
```

### Step 2: Test Real-time Post Broadcasting
**Browser 1 (User A):**
1. Position both browser windows side-by-side
2. Keep Browser 2 (User B) visible

**Browser 2 (User B):**
1. Create a new post: "Real-time test post from User B"
2. Click "Post" button
3. Wait for success toast

**Browser 1 (User A) - Watch carefully:**
1. ✅ **EXPECTED:** Blue banner appears at top of feed:
   ```
   🔄 New posts available - Click to refresh
   ```
2. ✅ **EXPECTED:** Toast notification: "New posts available"
3. Click the blue refresh banner
4. ✅ **EXPECTED:** New post from User B appears in feed

**Check Browser Console (Browser 1):**
```javascript
// Should see:
New post received: { type: 'new_post', data: {...}, timestamp: ... }
```

**Check Backend Logs:**
```
Broadcasting feed update for post: <post-id>
Sent feed update to <N> subscribers
```

### Step 3: Test Multiple Real-time Updates
**Browser 2 (User B):**
1. Create 3 posts quickly:
   - "Real-time test #1"
   - "Real-time test #2"
   - "Real-time test #3"

**Browser 1 (User A):**
1. ✅ **EXPECTED:** Banner appears after first post
2. ✅ **EXPECTED:** Banner stays visible during subsequent posts
3. Click refresh banner once
4. ✅ **EXPECTED:** All 3 new posts appear

### Step 4: Test WebSocket Reconnection
**Browser 1 (User A):**
1. Open DevTools Console
2. Run: `window.location.reload()` or refresh page
3. Wait 2-3 seconds

**Expected Reconnection Flow:**
```javascript
// Console should show:
"WebSocket disconnected"
"Attempting to reconnect..."
"WebSocket connected"
"User authenticated: 0x1234...abcd (reconnecting: true)"
"Subscriptions restored"
```

**Browser 2 (User B):**
1. Create another post: "Post after reconnection"

**Browser 1 (User A):**
1. ✅ **EXPECTED:** Banner appears (reconnection successful!)

---

## TEST 3: Following + Real-time Combined

### Scenario: Real-time updates on Following feed
**Browser 1 (User A):**
1. Follow User B (if not already following)
2. Click "Following" tab
3. Should see User B's posts only

**Browser 2 (User B):**
1. Create a new post: "Combined test - Real-time + Following"

**Browser 1 (User A):**
1. While on "Following" tab:
2. ✅ **EXPECTED:** "New posts available" banner appears
3. Click refresh
4. ✅ **EXPECTED:** New post from User B appears
5. ✅ **SUCCESS:** Real-time updates work on filtered feeds

---

## Common Issues & Solutions

### Issue 1: "Following" tab shows all posts (not filtering)
**Debug Steps:**
1. Check browser console for API request:
   ```
   GET /api/feed/enhanced?feedSource=following&page=1&limit=20
   ```
2. Check backend logs for SQL query with `IN (followingIds)`
3. Verify follow relationship exists in database:
   ```sql
   SELECT * FROM follows WHERE follower_id = '<user-a-id>';
   ```

**Solution:**
- Make sure you clicked "Follow" button
- Refresh the page after following
- Check backend logs for errors

### Issue 2: WebSocket not connecting
**Debug Steps:**
1. Check browser console for errors
2. Check backend logs for WebSocket initialization
3. Verify backend running on port 10000
4. Check CORS settings

**Solution:**
```typescript
// In backend .env file, verify:
FRONTEND_URL=http://localhost:3000
PORT=10000
```

### Issue 3: "New posts available" banner doesn't appear
**Debug Steps:**
1. Check browser console for WebSocket messages
2. Verify subscription is active:
   ```javascript
   // In console:
   console.log('WebSocket subscribed to feed:all')
   ```
3. Check backend logs for broadcast:
   ```
   Broadcasting feed update for post: <post-id>
   ```

**Solution:**
- Refresh both browser windows
- Reconnect wallet
- Check WebSocket connection in Network tab (WS)

### Issue 4: Follow button doesn't change state
**Debug Steps:**
1. Check browser console for errors
2. Check network tab for API calls:
   ```
   POST /api/follows/follow
   Body: { follower: "0x...", following: "0x..." }
   ```
3. Check response status (should be 200 or 201)

**Solution:**
- Ensure backend is running
- Check authentication middleware
- Verify wallet addresses are correct

---

## Performance Checks

### Backend Performance
```bash
# Check server logs for timing:
# "Feed loaded in Xms"
# "WebSocket message sent in Xms"
```

**Expected Performance:**
- Feed load: < 500ms
- WebSocket broadcast: < 50ms
- Follow/Unfollow action: < 200ms

### Frontend Performance
**Open Chrome DevTools → Performance tab:**
1. Record while scrolling feed
2. ✅ **EXPECTED:** 60fps scrolling
3. ✅ **EXPECTED:** No layout thrashing

---

## Checklist: All Tests Passed

### Following System
- [ ] Follow button appears on posts
- [ ] Clicking Follow changes to Following
- [ ] Following tab filters to only followed users
- [ ] For You tab shows all posts
- [ ] Unfollow works correctly
- [ ] Follow count updates in real-time

### Real-time Updates
- [ ] WebSocket connects on page load
- [ ] "New posts available" banner appears for new posts
- [ ] Banner shows for all tabs (For You, Following, Hot, etc.)
- [ ] Clicking banner refreshes feed
- [ ] Multiple posts queue correctly
- [ ] WebSocket reconnects after page refresh
- [ ] Subscriptions restore after reconnection

### Combined Features
- [ ] Real-time updates work on Following feed
- [ ] Real-time updates work on For You feed
- [ ] Performance is smooth (no lag)
- [ ] No console errors

---

## Next Steps After Testing

If all tests pass:
✅ **Ready to implement Search and Notifications!**

If tests fail:
❌ **Review errors and fix issues before proceeding**

Post your test results and I'll help debug any issues before we continue with Search and Notifications implementation.
