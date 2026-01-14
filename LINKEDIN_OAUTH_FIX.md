# LinkedIn OAuth Fix

## Issue
LinkedIn OAuth connection was failing with the error:
```
Include valid openId scopes like profile, email
```

## Root Cause
The LinkedIn OAuth provider was using default scopes that did not include the required OpenID Connect scopes. LinkedIn requires the `openid` scope for OpenID Connect authentication, along with `profile` and `email` scopes to retrieve user information.

## Solution
Updated the default LinkedIn OAuth scopes in `/app/backend/src/services/oauth/linkedinOAuthProvider.ts` to include all required OpenID Connect scopes:

**Before:**
```typescript
return ['profile', 'w_member_social'];
```

**After:**
```typescript
return ['openid', 'profile', 'email', 'w_member_social'];
```

## Required Environment Variables
Add the following to your `.env` file:

```bash
# LinkedIn OAuth Configuration
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_CALLBACK_URL=http://localhost:10000/api/social-media/callback/linkedin
# Optional: Override default scopes (default: openid profile email w_member_social)
LINKEDIN_SCOPES=openid profile email w_member_social
```

## How to Get LinkedIn OAuth Credentials

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Create a new application or select an existing one
3. Enable "Sign In with LinkedIn using OpenID Connect" in your app settings
4. Add the following redirect URLs:
   - Development: `http://localhost:10000/api/social-media/callback/linkedin`
   - Production: `https://your-domain.com/api/social-media/callback/linkedin`
5. Copy the Client ID and Client Secret to your `.env` file

## Scopes Explanation

- `openid`: Required for OpenID Connect authentication
- `profile`: Allows access to user's profile information (name, profile picture)
- `email`: Allows access to user's email address
- `w_member_social`: Allows posting content to LinkedIn (UGC posts)

## Testing
After updating the environment variables and restarting the backend server:

1. Navigate to `/settings/connections`
2. Click "Connect" next to LinkedIn
3. You should be redirected to LinkedIn's authorization page
4. Authorize the application
5. You should be redirected back to your app with a successful connection

## Troubleshooting

If you still encounter issues:

1. **Verify redirect URL**: Ensure the `LINKEDIN_CALLBACK_URL` matches exactly what's configured in your LinkedIn app settings
2. **Check app permissions**: Ensure your LinkedIn app has the "Sign In with LinkedIn using OpenID Connect" product enabled
3. **Verify scopes**: Make sure all required scopes (`openid`, `profile`, `email`, `w_member_social`) are included
4. **Check console logs**: Look for detailed error messages in the browser console and backend logs

## Files Modified

1. `/app/backend/src/services/oauth/linkedinOAuthProvider.ts` - Updated default scopes
2. `/app/.env.example` - Added LinkedIn OAuth configuration documentation