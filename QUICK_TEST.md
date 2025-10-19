# 🚀 Quick Testing Guide - Following System & Real-time Updates

## Fast Start (1 command)

```bash
# From LinkDAO root directory
./start-test.sh
```

This will:
- ✅ Check and free ports if needed
- ✅ Install dependencies (if missing)
- ✅ Start backend on port 10000
- ✅ Start frontend on port 3000
- ✅ Show live logs

## Manual Start (if you prefer)

**Terminal 1 - Backend:**
```bash
cd app/backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd app/frontend
npm run dev
```

## Testing Steps (Quick Version)

### Test 1: Following System (2 minutes)
1. Open two browser windows
2. Connect different wallets in each
3. Create posts in both windows
4. Click "Follow" button in Window 1 on Window 2's post
5. Click "Following" tab - should only show Window 2's posts ✅

### Test 2: Real-time Updates (1 minute)
1. Keep both windows open side-by-side
2. Create a post in Window 2
3. Watch for "New posts available" banner in Window 1 ✅
4. Click banner - new post appears ✅

## Expected Results

### ✅ Following System Working:
- Follow button changes to "Following"
- "Following" tab shows only followed users' posts
- "For You" tab shows all posts
- Unfollow works correctly

### ✅ Real-time Updates Working:
- Blue banner appears when someone posts
- Banner text: "🔄 New posts available - Click to refresh"
- Toast notification appears
- Clicking banner shows new posts
- Works on all tabs (For You, Following, Hot, etc.)

## Troubleshooting

### Backend won't start
```bash
# Check if port is in use
lsof -ti:10000 | xargs kill -9

# Try starting again
cd app/backend && npm run dev
```

### Frontend won't start
```bash
# Check if port is in use
lsof -ti:3000 | xargs kill -9

# Try starting again
cd app/frontend && npm run dev
```

### WebSocket not connecting
1. Refresh browser
2. Reconnect wallet
3. Check browser console for errors
4. Check backend logs for WebSocket initialization

### Follow button not working
1. Ensure both users are connected
2. Check browser console for API errors
3. Verify backend is running
4. Check Network tab for `/api/follows/follow` request

## Stop Testing

```bash
./stop-test.sh
```

Or press `Ctrl+C` in the terminal running the servers.

## View Detailed Logs

```bash
# Backend logs
tail -f logs/backend.log

# Frontend logs
tail -f logs/frontend.log
```

## Next Steps

After testing:
1. ✅ Report results (pass/fail for each feature)
2. 🔄 If passing, proceed to implement Search & Notifications
3. 🐛 If failing, debug issues first

## Full Testing Guide

For comprehensive testing with detailed steps, see: `TESTING_GUIDE.md`

## Implementation Status

- ✅ Following System - COMPLETE
- ✅ Real-time Updates - COMPLETE
- ⏳ Search Functionality - PENDING
- ⏳ Notifications System - PENDING

Ready to continue? Report your test results!
