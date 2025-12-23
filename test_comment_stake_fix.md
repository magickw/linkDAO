# Fix Summary for Comments and Staking Issues

## Issues Fixed:

### 1. Comment Creation 500 Error
**Problem**: Frontend was sending `author` field in the request body, but backend expects user authentication via JWT token and extracts user address from the token.

**Solution**: 
- Removed the `author` field from the request body in `communityPostService.ts`
- Updated both the main request and fallback request to only send `content`, `parentCommentId`, and `media`

### 2. Post ID Not Found Error
**Problem**: Frontend was sending `shareId` (e.g., `b56a46a8-db71-46fd-b166-ec4467cf7bdf`) but backend was looking for posts by primary key `id` instead of `shareId`.

**Solution**:
- Updated `feedService.ts` addComment method to properly handle shareId lookups
- Added logic to check if the ID is a UUID and then search both quickPosts and posts table by shareId
- Now supports:
  - Integer IDs (legacy posts)
  - UUID quick post IDs
  - UUID shareIds for community posts

### 3. Wallet Signer Error for Staking
**Problem**: "could not coalesce error" and "Cannot assign to read only property 'requestId'" errors from ethers provider when trying to stake.

**Solution**:
- Added better error handling for wallet provider issues
- Added specific error message for the coalescing error
- Added fallback to request accounts again before creating a new provider
- Provides clearer error messages to users

## Files Modified:
1. `/app/frontend/src/services/communityPostService.ts` - Removed author field from comment requests
2. `/app/backend/src/services/feedService.ts` - Fixed post lookup to handle shareId properly  
3. `/app/frontend/src/services/web3/ldaoTokenService.ts` - Improved wallet signer error handling

## Testing:
The fixes should now allow:
- Comments to be created successfully on community posts
- Staking to work with better error handling when wallet providers have issues