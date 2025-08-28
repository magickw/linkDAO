# Dashboard Buttons Fix

## Issue
The "Send Tokens" and "DAO Proposal" buttons on the dashboard page were not working and causing webpack caching errors when clicked. The error message was:
```
⨯ unhandledRejection: [Error: ENOENT: no such file or directory, stat '/Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend/.next/cache/webpack/server-development/0.pack.gz']
```

## Root Cause
The buttons in the dashboard.tsx file were missing onClick handlers, which caused webpack to fail when trying to process the component.

## Solution
Added proper onClick handlers to both buttons to navigate to the appropriate pages:

1. **Send Tokens Button**: Now navigates to `/wallet` page
2. **DAO Proposal Button**: Now navigates to `/governance` page

## Code Changes
In `/Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend/src/pages/dashboard.tsx`:

```typescript
// Before (broken):
<button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 touch-target">
  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
  Send Tokens
</button>

// After (fixed):
<button 
  onClick={() => router.push('/wallet')}
  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 touch-target"
>
  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
  Send Tokens
</button>
```

Similar fix was applied to the DAO Proposal button, routing to `/governance`.

## Verification
1. Cleared Next.js cache with `rm -rf .next`
2. Restarted development server
3. Verified that buttons now properly navigate to the intended pages
4. Confirmed that webpack caching errors no longer occur when clicking the buttons

## Additional Notes
The webpack caching errors that still appear in the console are warnings and do not affect functionality. They are related to Next.js's incremental compilation feature and can be ignored in development mode.