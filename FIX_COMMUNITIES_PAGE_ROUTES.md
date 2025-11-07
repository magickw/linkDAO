# Fix for Communities Page Route Issues

## Summary
The communities page error is likely caused by inconsistent API base URL configuration between different services in the frontend.

## The Fix

### Step 1: Standardize CommunityService to use centralized config

Update `app/frontend/src/services/communityService.ts`:

```typescript
// At the top of the file, change:
// OLD:
const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

// NEW:
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';
const BACKEND_API_BASE_URL = API_BASE_URL;
```

Then update all API calls to use the standardized endpoint:

```typescript
// OLD:
`${BACKEND_API_BASE_URL}/communities`

// NEW:
`${BACKEND_API_BASE_URL}${API_ENDPOINTS.COMMUNITIES}`
// This will call: http://localhost:10000/api/communities
```

### Step 2: Verify Environment Variables

Create/update `app/frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:10000
NEXT_PUBLIC_BACKEND_URL=http://localhost:10000
```

For production, use your actual backend URL:

```bash
NEXT_PUBLIC_API_URL=https://your-backend-url.com
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
```

### Step 3: Clear Browser Cache

Run this in the browser console:

```javascript
// Clear service worker
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister());
});

// Clear caches
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});

// Reload
location.reload();
```

## Quick Test

After applying the fix, test with:

```bash
# Start backend
cd app/backend
npm run dev

# Start frontend
cd app/frontend
npm run dev

# Visit http://localhost:3000/communities
```

## What This Fixes

1. **Consistent API URLs**: All services use the same base URL
2. **Proper route paths**: Uses `/api/communities` which is the primary backend route
3. **Environment flexibility**: Works in both dev and production
4. **Error visibility**: The error logging we added will show the actual issue

## If Error Persists

Check the browser console for the detailed error message we added. It will show:
- The exact error message
- The full stack trace
- Which API call failed

This will help identify if it's:
- A network issue
- A CORS issue
- A backend route issue
- A data format issue
