# Backend Configuration Fixes

## Issues Resolved

### 1. Backend URL Mismatch
- **Problem**: Frontend was calling `localhost:10000` but backend runs on `localhost:10000`
- **Solution**: Updated all service files to use `localhost:10000` as default
- **Files Updated**: All service files in `app/frontend/src/services/`

### 2. Environment Configuration
- **Problem**: Inconsistent environment variable usage across services
- **Solution**: 
  - Updated `.env` file to use correct backend URL
  - Created centralized environment configuration in `src/config/environment.ts`
  - Updated all services to use consistent backend URL

### 3. Backend Server Issues
- **Problem**: Incomplete backend code causing 503 errors
- **Solution**: 
  - Completed the truncated `index.fixed.js` file
  - Added all missing seller CRUD endpoints
  - Added proper error handling and CORS configuration
  - Added PostgreSQL database integration

### 4. Database Configuration
- **Problem**: Backend needs PostgreSQL database connection
- **Solution**: 
  - Added PostgreSQL connection pooling
  - Created proper database schema for sellers and listings
  - Added environment variable support for `DATABASE_URL`

## Quick Start

### 1. Start Backend Server
```bash
# From LinkDAO root directory
./start-backend.sh
```

### 2. Start Frontend
```bash
# From LinkDAO root directory (in a new terminal)
./start-frontend.sh
```

### 3. Database Setup (Optional)
If you want to use a real PostgreSQL database:

```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database
createdb linkdao

# Set environment variable
export DATABASE_URL="postgresql://localhost:5432/linkdao"
```

## Environment Variables

### Development (.env)
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:10000
NEXT_PUBLIC_API_URL=http://localhost:10000
```

### Production (.env.production)
```
NEXT_PUBLIC_BACKEND_URL=https://linkdao-backend.onrender.com
NEXT_PUBLIC_API_URL=https://linkdao-backend.onrender.com
```

## Backend Endpoints

The backend now provides these endpoints:

### Health & Status
- `GET /` - API information
- `GET /health` - Health check
- `GET /ping` - Simple ping

### Authentication
- `GET /api/auth/nonce/:address` - Get authentication nonce
- `POST /api/auth/wallet` - Wallet authentication

### Profiles
- `GET /api/profiles` - List profiles
- `GET /api/profiles/address/:address` - Get profile by address

### Posts
- `GET /api/posts` - List posts
- `POST /api/posts` - Create post
- `GET /api/posts/feed` - Get posts feed

### Sellers
- `GET /api/sellers/profile/:walletAddress` - Get seller profile
- `POST /api/sellers/profile` - Create seller profile
- `PUT /api/sellers/profile/:walletAddress` - Update seller profile

### Marketplace
- `GET /marketplace/reputation/:walletAddress` - Get reputation data

## Error Resolution

### 503 Service Unavailable
- **Cause**: Backend server not running or crashed
- **Solution**: Restart backend using `./start-backend.sh`

### CORS Errors
- **Cause**: Frontend and backend on different ports
- **Solution**: Backend now includes comprehensive CORS configuration

### Rate Limiting
- **Cause**: Too many requests to external services
- **Solution**: Backend includes rate limiting and proper error handling

### Database Connection Errors
- **Cause**: PostgreSQL not running or DATABASE_URL not set
- **Solution**: 
  - Start PostgreSQL: `brew services start postgresql`
  - Set DATABASE_URL environment variable
  - Backend will create tables automatically

## Development Tips

1. **Check Backend Status**: Visit `http://localhost:10000` to see API info
2. **Monitor Logs**: Backend logs all requests and errors
3. **Database**: Backend creates tables automatically on startup
4. **Environment**: Use the startup scripts for consistent configuration

## Production Deployment

The production environment is configured to use:
- Backend: `https://linkdao-backend.onrender.com`
- Frontend: `https://linkdao.io`

Make sure the deployed backend includes all the fixes from `index.fixed.js`.