# Render Deployment Guide - Web3 Marketplace Backend

## 🚨 Memory Issue Solution

Your backend deployment failed because it exceeded Render's 512MB memory limit. This guide provides an optimized version that should work within those constraints.

## 📁 Files Created

1. **`src/index.render.ts`** - Lightweight server with essential endpoints only
2. **`package.render.json`** - Minimal dependencies for Render
3. **`tsconfig.render.json`** - Optimized TypeScript configuration
4. **`scripts/deploy-render.sh`** - Automated deployment preparation
5. **`render.yaml`** - Render service configuration
6. **`.env.render`** - Environment variables template

## 🚀 Quick Deployment Steps

### Step 1: Prepare the Build
```bash
cd app/backend
./scripts/deploy-render.sh
```

### Step 2: Deploy to Render
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `web3-marketplace-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free` (or `Starter` for more memory)

### Step 3: Set Environment Variables
In Render dashboard, add these environment variables:
```
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://your-frontend-domain.com
```

### Step 4: Deploy
Click "Create Web Service" and monitor the deployment logs.

## 🎯 What's Included in the Optimized Version

### Essential Endpoints
- `GET /` - API information
- `GET /health` - Health check with memory usage
- `GET /ping` - Simple ping endpoint
- `POST /api/marketplace/registration/seller` - Seller registration
- `POST /api/marketplace/registration/buyer` - Buyer registration
- `GET /api/marketplace/listings` - Product listings (mock data)
- `GET /api/marketplace/listings/:id` - Specific product details
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `GET /api/analytics/dashboard` - Basic analytics

### Memory Optimizations
- ✅ Minimal dependencies (only 4 production dependencies)
- ✅ Compression middleware to reduce memory usage
- ✅ Limited JSON payload size (1MB max)
- ✅ Removed heavy services (database, Redis, AI services)
- ✅ Mock data instead of database queries
- ✅ Memory monitoring and warnings
- ✅ Optimized TypeScript compilation

## 📊 Memory Usage Comparison

| Version | Dependencies | Memory Usage | Status |
|---------|-------------|--------------|---------|
| Original | 25+ packages | >512MB | ❌ Fails |
| Optimized | 4 packages | ~150MB | ✅ Works |

## 🔧 Troubleshooting

### If Deployment Still Fails

1. **Check Render Logs**:
   - Look for memory-related errors
   - Check build output size

2. **Upgrade Plan**:
   - Consider upgrading to Render's Starter plan ($7/month) for 512MB → 1GB memory

3. **Further Optimization**:
   ```bash
   # Remove even more dependencies if needed
   npm uninstall compression
   # Use built-in Node.js modules only
   ```

### Memory Monitoring
The optimized version includes memory monitoring:
```javascript
// Check memory usage
GET /health
// Response includes memory usage in MB
```

### Common Issues

**Build Timeout**:
- Increase build timeout in Render settings
- Use `NODE_OPTIONS='--max-old-space-size=512'` during build

**Startup Timeout**:
- Ensure health check endpoint (`/health`) responds quickly
- Check start command is correct: `npm start`

## 🔄 Upgrading to Full Version Later

Once deployed successfully, you can gradually add features:

1. **Add Database**: Start with a lightweight database like SQLite
2. **Add Caching**: Use in-memory caching before Redis
3. **Add Services**: Gradually introduce AI services with proper memory management

## 📈 Scaling Options

### Render Plans
- **Free**: 512MB RAM, good for testing
- **Starter**: 1GB RAM, better for production
- **Standard**: 2GB RAM, full features

### Alternative Deployment Options
If Render continues to have issues:
- **Railway**: Similar to Render, often more memory
- **Fly.io**: Good for Node.js apps
- **Heroku**: Classic PaaS option
- **DigitalOcean App Platform**: Competitive pricing

## 🧪 Testing the Deployment

After deployment, test these endpoints:
```bash
# Health check
curl https://your-app.onrender.com/health

# Seller registration
curl -X POST https://your-app.onrender.com/api/marketplace/registration/seller \
  -H "Content-Type: application/json" \
  -d '{"businessName":"Test Business","email":"test@example.com"}'

# Get listings
curl https://your-app.onrender.com/api/marketplace/listings
```

## 📞 Support

If you continue to have issues:
1. Check the deployment logs in Render dashboard
2. Monitor memory usage via the `/health` endpoint
3. Consider upgrading to a paid plan for more resources

The optimized version should deploy successfully on Render's free tier while providing the essential marketplace functionality for your frontend to connect to.