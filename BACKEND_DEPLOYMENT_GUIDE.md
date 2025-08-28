# LinkDAO Backend Deployment Guide

## Overview
This guide explains how to deploy the LinkDAO backend API to a cloud hosting provider. While the frontend can be deployed to Vercel, the backend needs to be deployed to a Node.js hosting provider that supports long-running processes and WebSocket connections.

## Supported Hosting Providers
1. Render (recommended)
2. Heroku
3. DigitalOcean App Platform
4. AWS Elastic Beanstalk
5. Google Cloud Run
6. Azure App Service

## Prerequisites
1. A hosting account with one of the supported providers
2. Environment variables configured
3. Database (if using persistent storage instead of in-memory)
4. Access to blockchain RPC endpoints

## Deployment Steps

### 1. Prepare Environment Variables

The backend requires the following environment variables:

| Variable Name | Description | Example Value |
|---------------|-------------|---------------|
| `JWT_SECRET` | Secret key for JWT token generation | `your-super-secret-jwt-key` |
| `PORT` | Port to run the server on | `3002` |
| `FRONTEND_URL` | URL of the frontend application | `https://your-frontend.vercel.app` |
| `RPC_URL` | Blockchain RPC endpoint | `https://goerli.base.org` |
| `PROFILE_REGISTRY_ADDRESS` | Deployed ProfileRegistry contract address | `0x1234...7890` |
| `FOLLOW_MODULE_ADDRESS` | Deployed FollowModule contract address | `0x2345...8901` |
| `PAYMENT_ROUTER_ADDRESS` | Deployed PaymentRouter contract address | `0x3456...9012` |
| `GOVERNANCE_ADDRESS` | Deployed Governance contract address | `0x4567...0123` |
| `MARKETPLACE_ADDRESS` | Deployed Marketplace contract address | `0x6789...2345` |

### 2. Deploy to Render (Recommended)

1. Go to https://render.com and sign up or log in
2. Click "New+" and select "Web Service"
3. Connect your GitHub repository
4. Set the following configuration:
   - **Name**: `linkdao-backend`
   - **Root Directory**: `app/backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free or higher depending on your needs

5. Add environment variables in the "Advanced" section
6. Click "Create Web Service"

### 3. Deploy to Other Providers

#### Heroku
```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set JWT_SECRET=your-super-secret-jwt-key
heroku config:set PORT=3002
heroku config:set FRONTEND_URL=https://your-frontend.vercel.app
# ... set other environment variables

# Deploy
git push heroku main
```

#### DigitalOcean App Platform
1. Go to https://cloud.digitalocean.com/apps
2. Click "Create App"
3. Connect your GitHub repository
4. Set source directory to `app/backend`
5. Configure environment variables
6. Set build command to `npm install`
7. Set run command to `npm start`
8. Create the app

### 4. Configure CORS

Make sure your backend is configured to accept requests from your frontend domain. The current CORS configuration in [index.ts](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend/src/index.ts) allows all origins, but for production you might want to restrict this:

```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
```

### 5. Database Configuration (Optional)

The current implementation uses in-memory storage for marketplace data. For production, you should consider using a persistent database:

1. PostgreSQL
2. MongoDB
3. MySQL

To implement database storage:
1. Add database connection code to the marketplace service
2. Replace in-memory arrays with database queries
3. Add proper indexing for performance
4. Implement connection pooling

### 6. WebSocket Configuration

The backend includes WebSocket support for real-time notifications. Make sure your hosting provider supports WebSocket connections:

```javascript
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});
```

### 7. Health Checks

The backend includes health check endpoints:
- `GET /health` - Basic health check
- `GET /ws` - WebSocket endpoint information

Configure your hosting provider to use these for health monitoring.

## Post-Deployment Configuration

### 1. Verify Deployment
After deployment, test the following endpoints:
- `GET /health` - Should return status OK
- `GET /api/profiles` - Should return an empty array or profiles
- `POST /api/auth/register` - Should allow user registration

### 2. Update Frontend Configuration
Update the `NEXT_PUBLIC_API_URL` environment variable in your frontend Vercel project to point to your deployed backend URL.

### 3. Monitor Logs
Check your hosting provider's logging system for any errors or issues.

## Scaling Considerations

### Horizontal Scaling
For handling more traffic:
1. Enable clustering in your Node.js application
2. Use a load balancer
3. Implement proper session management (Redis recommended)
4. Use a shared database instead of in-memory storage

### Database Scaling
For production use:
1. Use a managed database service
2. Implement proper indexing
3. Add read replicas for heavy read workloads
4. Consider caching with Redis

### WebSocket Scaling
For WebSocket connections:
1. Use sticky sessions or a WebSocket load balancer
2. Consider using a dedicated WebSocket service like Pusher
3. Implement proper connection management

## Security Considerations

### 1. Environment Variables
- Never commit secrets to version control
- Use your hosting provider's secret management
- Rotate secrets regularly

### 2. Rate Limiting
Implement rate limiting to prevent abuse:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 3. Input Validation
All API endpoints should validate input data:
- Use validation middleware
- Sanitize user inputs
- Implement proper error handling

### 4. Authentication
- Use strong JWT secrets
- Implement token expiration
- Consider refresh tokens for better UX

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure `FRONTEND_URL` environment variable is set correctly
   - Check that the frontend URL matches exactly

2. **WebSocket Connection Issues**
   - Verify that your hosting provider supports WebSockets
   - Check firewall settings
   - Ensure proper CORS configuration

3. **Database Connection Issues**
   - Verify database credentials
   - Check network connectivity
   - Ensure database is accessible from your hosting provider

4. **Environment Variables Not Set**
   - Double-check all required environment variables
   - Verify they are set in your hosting provider's dashboard

### Checking Logs
Most hosting providers offer log viewing:
- Render: Dashboard > Your App > Logs
- Heroku: `heroku logs --tail`
- DigitalOcean: Dashboard > App > Logs

## Additional Notes

- The backend is configured to run on port 3002 by default, but hosting providers will typically assign a port via the `PORT` environment variable
- Make sure your smart contracts are deployed to the same network you're using in your RPC_URL
- Consider implementing proper logging and monitoring for production deployments
- For high-traffic applications, consider using a CDN for static assets and implementing caching strategies