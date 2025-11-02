# Pinata/IPFS Crash Debug Report

## Issue Summary
App crashes with uncaught exception immediately after logging "Testing Pinata connection..." on Render Pro deployment.

## Crash Pattern
```
Testing Pinata connection...
🚨 Uncaught Exception: (no error details captured)
🛑 Shutting down due to uncaught exception...
```

## Root Cause Analysis

### Timeline of Events
1. ✅ Database connection established
2. ✅ Redis connection established  
3. ✅ "Configuring IPFS client for Pinata gateway" logged
4. ✅ "Testing Pinata connection..." logged
5. ❌ **CRASH** - Uncaught exception with no error details

### Likely Causes

1. **ipfs-http-client v56 Initialization Issue**
   - The `ipfs-http-client` package (v56.0.3) may have initialization code that throws
   - The `create()` function might be making network calls that fail
   - Missing or incompatible dependencies

2. **Pinata API Configuration**
   - Missing `IPFS_PROJECT_ID` environment variable (Pinata JWT token)
   - Missing `IPFS_PROJECT_SECRET` environment variable
   - Invalid Pinata API credentials

3. **Network/DNS Issues**
   - Cannot resolve `api.pinata.cloud`
   - Network timeout during client initialization
   - Firewall blocking outbound HTTPS to Pinata

## Fixes Applied

### 1. Enhanced Error Handling in metadataService.ts
```typescript
// Wrapped ipfs-http-client require in try-catch
try {
  const ipfsModule = require('ipfs-http-client');
  create = ipfsModule.create;
} catch (requireError) {
  safeLogger.error('Failed to require ipfs-http-client:', requireError);
  return null;
}

// Added try-catch around Pinata client creation
try {
  const client = create({ /* config */ });
  safeLogger.info('✅ Pinata client created successfully');
  return client;
} catch (pinataError) {
  safeLogger.error('Pinata client creation failed:', pinataError);
  return null;
}
```

### 2. Graceful Degradation
- Service returns `null` if IPFS client fails to initialize
- Fallback to content hashing when IPFS unavailable
- App continues without IPFS functionality

## Environment Variables Required

Add these to Render environment variables:

```bash
# Pinata Configuration (if using Pinata)
IPFS_PROJECT_ID=your_pinata_jwt_token_here
IPFS_PROJECT_SECRET=your_pinata_secret_here  # May not be needed for JWT auth
IPFS_HOST=api.pinata.cloud
IPFS_PORT=443
IPFS_PROTOCOL=https
IPFS_GATEWAY_URL=https://gateway.pinata.cloud/ipfs/
```

## Alternative Solutions

### Option 1: Disable IPFS Temporarily
Remove or comment out IPFS environment variables to skip initialization:
```bash
# IPFS_PROJECT_ID=
# IPFS_PROJECT_SECRET=
```

### Option 2: Use Public IPFS Gateway
Configure to use public IPFS node instead of Pinata:
```bash
IPFS_HOST=ipfs.io
IPFS_PORT=443
IPFS_PROTOCOL=https
# Remove IPFS_PROJECT_ID and IPFS_PROJECT_SECRET
```

### Option 3: Lazy Load IPFS Client
Only initialize IPFS client when actually needed (not at module load time)

## Testing Steps

1. **Deploy with enhanced error handling**
   - Current changes should capture the actual error
   - Check logs for detailed error message

2. **Verify Pinata credentials**
   - Get JWT token from Pinata dashboard
   - Test token with curl:
     ```bash
     curl -X GET "https://api.pinata.cloud/data/testAuthentication" \
       -H "Authorization: Bearer YOUR_JWT_TOKEN"
     ```

3. **Test without IPFS**
   - Remove IPFS env vars
   - Verify app starts successfully
   - Confirms IPFS is the issue

## Next Steps

1. ✅ Deploy current changes to capture error details
2. ⏳ Check Render logs for actual error message
3. ⏳ Based on error, apply specific fix:
   - If missing credentials: Add Pinata JWT token
   - If network issue: Check Render firewall/DNS
   - If package issue: Downgrade ipfs-http-client or remove dependency

## Files Modified

- `app/backend/src/services/metadataService.ts` - Enhanced error handling around IPFS client initialization
