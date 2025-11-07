# CSRF Token Integration for Cart Service

## Problem
The frontend cart service was not including CSRF tokens in requests to the backend, causing cart operations to fail with 403 Forbidden errors. The backend cart routes require CSRF protection for state-changing operations (POST, PUT, DELETE).

## Solution
1. Created a new CSRF service (`csrfService.ts`) to manage CSRF token retrieval and validation
2. Updated the cart service to use the CSRF service for authenticated requests
3. Modified the auth service to initialize the CSRF service upon successful authentication

## Implementation Details

### CSRF Service
- Manages CSRF token lifecycle (fetching, storing, refreshing)
- Provides CSRF headers for authenticated requests
- Integrates with the authentication system using the auth token as session ID

### Cart Service Updates
- Modified `getAuthHeaders()` to include CSRF headers for authenticated requests
- Updated all backend API methods to use async headers
- Added subscription to authentication status changes

### Auth Service Updates
- Added CSRF service initialization upon successful authentication
- Enhanced token clearing to also clear CSRF tokens

## How It Works
1. When a user authenticates, the auth service calls `csrfService.initialize()` with the session token
2. The CSRF service fetches a CSRF token from `/api/csrf-token` endpoint
3. When the cart service makes requests to backend cart endpoints, it includes:
   - `X-Session-ID` header (set to the auth token)
   - `X-CSRF-Token` header (set to the CSRF token)
4. The backend validates these headers using its CSRF protection middleware

## Testing
The integration can be tested by:
1. Authenticating a user
2. Adding an item to the cart
3. Verifying that the request includes the required CSRF headers

## Files Modified
- `app/frontend/src/services/csrfService.ts` - New CSRF service
- `app/frontend/src/services/cartService.ts` - Updated to use CSRF service
- `app/frontend/src/services/authService.ts` - Updated to initialize CSRF service