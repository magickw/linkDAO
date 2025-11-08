# Profile Edit Fix Summary

## Issue
Users were unable to edit their profile on the `/profile` page, encountering the error:
```
Error loading profile
We encountered an issue while loading your profile information.
Create Error: Failed to create profile
```

## Root Cause
The issue was caused by **incorrect route ordering** in the backend API routes. Express.js matches routes in the order they are defined, and the generic `/:id` route was being matched before the more specific `/address/:address` route.

### What was happening:
1. Frontend calls: `GET /api/profiles/address/0x123...`
2. Backend matches this to: `GET /api/profiles/:id` with `id="address"`
3. Backend tries to find a profile with ID "address" (instead of wallet address "0x123...")
4. Returns 404 error
5. Frontend shows "Error loading profile"

## Fixes Applied

### 1. Fixed Route Ordering (`app/backend/src/routes/userProfileRoutes.ts`)
**Before:**
```typescript
router.get('/:id', asyncHandler(userProfileController.getProfileById));
router.get('/address/:address', asyncHandler(userProfileController.getProfileByAddress));
```

**After:**
```typescript
// Note: More specific routes (like /address/:address) must come BEFORE generic routes (like /:id)
// to prevent Express from matching /address/0x123 as /:id with id="address"
router.get('/address/:address', asyncHandler(userProfileController.getProfileByAddress));
router.get('/:id', asyncHandler(userProfileController.getProfileById));
```

### 2. Updated Response Format (`app/backend/src/controllers/userProfileController.ts`)
Changed the controller to return a consistent response format with a `data` wrapper and handle missing profiles gracefully:

**Before:**
```typescript
getProfileByAddress = async (req: Request, res: Response): Promise<Response> => {
  const { address } = req.params;
  const profile = await userProfileService.getProfileByAddress(address);
  if (!profile) {
    throw new NotFoundError('Profile not found');
  }
  return res.json(profile);
}
```

**After:**
```typescript
getProfileByAddress = async (req: Request, res: Response): Promise<Response> => {
  const { address } = req.params;
  const profile = await userProfileService.getProfileByAddress(address);
  if (!profile) {
    // Return null instead of 404 to allow frontend to handle gracefully
    return res.json({ data: null });
  }
  return res.json({ data: profile });
}
```

Also updated `createProfile` and `updateProfile` to return `{ data: profile }` format for consistency.

## How It Works Now

1. **Profile Loading:**
   - Frontend calls: `GET /api/profiles/address/0x123...`
   - Backend correctly routes to `getProfileByAddress` controller
   - If profile exists: Returns `{ data: { id, walletAddress, handle, ... } }`
   - If profile doesn't exist: Returns `{ data: null }` (not an error)
   - Frontend handles both cases gracefully

2. **Profile Creation:**
   - User clicks "Edit Profile" and fills in handle, bio, etc.
   - Frontend calls: `POST /api/profiles` with profile data
   - Backend creates profile and returns `{ data: newProfile }`
   - Frontend updates UI with new profile

3. **Profile Editing:**
   - User modifies profile fields
   - Frontend calls: `PUT /api/profiles/{id}` with updated data
   - Backend updates profile and returns `{ data: updatedProfile }`
   - Frontend updates UI with updated profile

## Testing

To verify the fix works:

1. **Connect your wallet** on the profile page
2. **Check that profile loads** without errors (even if no profile exists yet)
3. **Click "Edit Profile"** button
4. **Fill in your handle and bio**
5. **Click "Save Profile"**
6. **Verify the profile is saved** and displayed correctly

## Technical Details

### Route Matching in Express
Express matches routes in the order they are defined. When you have:
- `/address/:address` (specific)
- `/:id` (generic)

The generic route will match ANY path segment, including "address". Therefore, specific routes must be defined BEFORE generic catch-all routes.

### Response Format
The frontend's `ProfileService.getProfileByAddress()` expects:
```typescript
{
  data: {
    id: string;
    walletAddress: string;
    handle: string;
    // ... other fields
  } | null
}
```

This allows the frontend to distinguish between:
- Profile exists: `data` contains profile object
- Profile doesn't exist: `data` is `null`
- Error occurred: HTTP error status code

## Files Modified

1. `app/backend/src/routes/userProfileRoutes.ts` - Fixed route ordering
2. `app/backend/src/controllers/userProfileController.ts` - Updated response format

## Related Files

- `app/frontend/src/pages/profile.tsx` - Profile page UI
- `app/frontend/src/hooks/useProfile.ts` - React Query hooks for profile data
- `app/frontend/src/services/profileService.ts` - API service for profile operations
- `app/backend/src/services/userProfileService.ts` - Backend service for profile operations
