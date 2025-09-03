# Render Deployment Checklist

## Pre-deployment
- [ ] Verify package.json has minimal dependencies
- [ ] Check build size is under 400MB
- [ ] Test health endpoint locally
- [ ] Set environment variables in Render dashboard

## Render Configuration
- [ ] Service type: Web Service
- [ ] Environment: Node
- [ ] Build Command: `npm install && npm run build`
- [ ] Start Command: `npm start`
- [ ] Health Check Path: `/health`

## Environment Variables (Set in Render Dashboard)
- [ ] NODE_ENV=production
- [ ] PORT=10000
- [ ] FRONTEND_URL=your-frontend-url

## Post-deployment
- [ ] Verify health endpoint: https://your-app.onrender.com/health
- [ ] Test API endpoints
- [ ] Monitor memory usage in Render logs
- [ ] Check response times

## Troubleshooting
If deployment fails with memory issues:
1. Check Render logs for memory usage
2. Consider upgrading to paid plan for more memory
3. Further optimize dependencies if needed

## API Endpoints Available
- GET / - Basic info
- GET /health - Health check
- GET /ping - Simple ping
- POST /api/marketplace/registration/seller - Seller registration
- POST /api/marketplace/registration/buyer - Buyer registration
- GET /api/marketplace/listings - Get listings
- GET /api/marketplace/listings/:id - Get specific listing
- POST /api/auth/login - User login
- POST /api/auth/register - User registration
- GET /api/analytics/dashboard - Analytics data
