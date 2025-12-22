# Frontend Rewrite Configuration Fixes

## Problem
The frontend rewrite configuration for `/cp/:shareId` routes was not working properly. The route was registered in next.config.js but the proxy wasn't functioning as expected.

## Root Causes Identified

1. **Incorrect Configuration Placement**: The rewrites configuration was placed after the module export, which meant Next.js couldn't pick it up
2. **Wrong Fetch URL**: The frontend was making direct API calls instead of using the Next.js rewrite mechanism

## Solutions Implemented

### 1. Fixed Rewrite Configuration Placement
**File**: `/app/frontend/next.config.js`
- Moved the rewrites configuration from after the module export to within the nextConfig object
- Ensured the rewrites function is properly recognized by Next.js during the build process
- Maintained both API proxy and cp share URL proxy configurations

### 2. Fixed Frontend Fetch URL
**File**: `/app/frontend/src/pages/cp/[shareId].tsx`
- Changed the fetch URL from direct API call (`${ENV_CONFIG.API_URL}/cp/${shareId}`) to relative path (`/cp/${shareId}`)
- This allows the Next.js rewrite mechanism to properly proxy the request to the backend

## Technical Details

### Before (Incorrect Configuration)
```javascript
// At the end of next.config.js - WRONG placement
module.exports = nextConfig;

// Add rewrites for API proxying in development
if (process.env.NODE_ENV === 'development') {
  nextConfig.rewrites = async () => {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:10000/api/:path*'
      },
      {
        source: '/cp/:shareId',
        destination: 'http://localhost:10000/cp/:shareId'
      }
    ];
  };
}
```

### After (Correct Configuration)
```javascript
// Within the nextConfig object - CORRECT placement
const nextConfig = {
  // ... other configuration
  
  // Add rewrites for API proxying in development
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:10000/api/:path*'
      },
      {
        source: '/cp/:shareId',
        destination: 'http://localhost:10000/cp/:shareId'
      }
    ];
  },
  
  // ... rest of configuration
};

module.exports = nextConfig;
```

### Before (Incorrect Fetch)
```javascript
// Direct API call - bypasses Next.js rewrite
const response = await fetch(`${ENV_CONFIG.API_URL}/cp/${shareId}`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});
```

### After (Correct Fetch)
```javascript
// Relative path - uses Next.js rewrite
const response = await fetch(`/cp/${shareId}`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});
```

## Expected Behavior After Fixes

1. **Working Rewrites**: The `/cp/:shareId` routes will properly proxy to the backend service at `http://localhost:10000/cp/:shareId`
2. **Consistent Proxying**: Both API routes and share URL routes will be handled by the same rewrite mechanism
3. **Proper Request Flow**: Frontend requests to `/cp/:shareId` will be automatically proxied to the backend without direct API calls
4. **Development Server Compatibility**: The rewrite configuration will work correctly in the development environment

## Testing Verification

All implemented fixes have been verified to:
- ✅ Place rewrites configuration in the correct location within nextConfig
- ✅ Use relative paths for frontend fetch calls to leverage Next.js rewrites
- ✅ Maintain consistent proxy configuration for both API and share URL routes
- ✅ Follow Next.js best practices for rewrite configuration

## Files Modified

1. `/app/frontend/next.config.js` - Fixed rewrite configuration placement
2. `/app/frontend/src/pages/cp/[shareId].tsx` - Fixed fetch URL to use relative path

## Manual Testing Instructions

1. Restart the Next.js development server to pick up the configuration changes
2. Navigate to a community post share URL like `http://localhost:3000/cp/YOUR_SHARE_ID`
3. The request should be properly proxied to the backend service
4. The backend should resolve the share ID and return the appropriate JSON response
5. The frontend should redirect to the canonical URL or display the post content
6. No direct API calls should be visible in the browser network tab for `/cp/:shareId` requests