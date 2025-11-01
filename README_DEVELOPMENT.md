# LinkDAO Development Setup

## Prerequisites
- Node.js >= 18.0.0
- npm >= 8.0.0

## Environment Configuration

Create a `.env.local` file in the `app/frontend` directory with the following content:

```
NEXT_PUBLIC_BACKEND_URL=http://localhost:10000
NEXT_PUBLIC_API_URL=http://localhost:10000
```

## Running the Application

### 1. Start the Backend Service
```bash
# In one terminal, navigate to the backend directory
cd app/backend
npm install
npm run dev
```

The backend will start on port 10000.

### 2. Start the Frontend Service
```bash
# In another terminal, navigate to the frontend directory
cd app/frontend
npm install
npm run dev
```

The frontend will start on port 3000.

## Troubleshooting

### "Failed to fetch" Errors
These errors typically occur when:
1. The backend service is not running
2. The backend is running on a different port than expected
3. There's a network connectivity issue

To resolve:
1. Ensure the backend is running on port 10000
2. Check that both services can communicate (no firewall blocking)
3. Verify the environment variables are set correctly

### Common Commands
```bash
# Check if backend is running
curl http://localhost:10000/api/health

# Restart both services
npm run stop-all
npm run start-all
```

## Development Tips

1. **Consistent URLs**: Both [authService.ts](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend/src/services/authService.ts) and [feedService.ts](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend/src/services/feedService.ts) now use the same backend URL configuration from `ENV_CONFIG.BACKEND_URL`.

2. **Improved Error Handling**: Network errors are now handled gracefully with fallback mechanisms instead of crashing the application.

3. **Cache Management**: The feed service includes in-memory caching to reduce redundant network requests.

## Testing

To run tests:
```bash
cd app/frontend
npm test
```