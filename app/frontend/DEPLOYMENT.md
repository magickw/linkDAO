# Social Dashboard Deployment Guide

This document provides comprehensive instructions for deploying the integrated Social Dashboard to various environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Build Process](#build-process)
4. [Deployment Options](#deployment-options)
5. [Performance Optimization](#performance-optimization)
6. [Monitoring and Analytics](#monitoring-and-analytics)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- Git
- Docker (optional, for containerized deployment)

### Environment Variables

Create environment files for each deployment environment:

#### `.env.local` (Development)
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3002
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_SERVICE_WORKER=false
NEXT_PUBLIC_LOG_LEVEL=debug
```

#### `.env.staging` (Staging)
```bash
NEXT_PUBLIC_BACKEND_URL=https://api-staging.linkdao.com
NEXT_PUBLIC_WS_URL=wss://ws-staging.linkdao.com
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_SERVICE_WORKER=true
NEXT_PUBLIC_LOG_LEVEL=info
```

#### `.env.production` (Production)
```bash
NEXT_PUBLIC_BACKEND_URL=https://api.linkdao.com
NEXT_PUBLIC_WS_URL=wss://ws.linkdao.com
NEXT_PUBLIC_CHAIN_ID=1
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_SERVICE_WORKER=true
NEXT_PUBLIC_LOG_LEVEL=error
```

## Environment Configuration

### Development Environment

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Build for development
npm run build
```

### Staging Environment

```bash
# Set environment
export NODE_ENV=production
export DEPLOY_ENV=staging

# Install production dependencies
npm ci --only=production

# Build application
npm run build

# Start application
npm start
```

### Production Environment

```bash
# Set environment
export NODE_ENV=production
export DEPLOY_ENV=production

# Install production dependencies
npm ci --only=production

# Build application with optimizations
npm run build

# Start application
npm start
```

## Build Process

### Build Optimization

The build process includes several optimization steps:

1. **Code Splitting**: Automatic splitting of vendor, web3, and UI libraries
2. **Tree Shaking**: Removal of unused code
3. **Minification**: JavaScript and CSS minification
4. **Image Optimization**: WebP and AVIF format generation
5. **Bundle Analysis**: Size analysis and warnings

### Build Commands

```bash
# Standard build
npm run build

# Build with bundle analysis
npm run build:analyze

# Build for specific environment
DEPLOY_ENV=staging npm run build
```

### Build Verification

After building, verify the build:

```bash
# Check bundle sizes
npm run build:analyze

# Test production build locally
npm run start

# Run production tests
npm run test:production
```

## Deployment Options

### 1. Vercel Deployment (Recommended)

#### Automatic Deployment

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

#### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to staging
vercel --env .env.staging

# Deploy to production
vercel --prod --env .env.production
```

#### Vercel Configuration (`vercel.json`)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

### 2. Docker Deployment

#### Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### Docker Compose

```yaml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_BACKEND_URL=${API_URL}
      - NEXT_PUBLIC_WS_URL=${WS_URL}
      - NEXT_PUBLIC_CHAIN_ID=${CHAIN_ID}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 3. Static Export Deployment

For static hosting (Netlify, GitHub Pages, etc.):

```bash
# Build static export
npm run build
npm run export

# Deploy static files from 'out' directory
```

## Performance Optimization

### Bundle Size Optimization

1. **Code Splitting**: Implemented automatic splitting
2. **Dynamic Imports**: Use for large components
3. **Tree Shaking**: Remove unused dependencies
4. **Bundle Analysis**: Regular size monitoring

### Runtime Performance

1. **Image Optimization**: WebP/AVIF formats
2. **Lazy Loading**: Images and components
3. **Service Worker**: Caching strategy
4. **CDN**: Static asset delivery

### Performance Monitoring

```javascript
// Web Vitals monitoring
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

## Monitoring and Analytics

### Vercel Analytics

Automatically enabled in production builds:

```javascript
import { Analytics } from '@vercel/analytics/react';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
```

### Custom Monitoring

```javascript
// Performance monitoring
import { performanceMonitor } from '@/utils/performanceMonitor';

// Error tracking
import { errorTracker } from '@/utils/errorTracker';

// Usage analytics
import { usageAnalytics } from '@/utils/usageAnalytics';
```

### Health Checks

```javascript
// API health check endpoint
export default function handler(req, res) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
}
```

## Security Configuration

### Content Security Policy

```javascript
const csp = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https: blob:;
  font-src 'self' https:;
  connect-src 'self' https: wss: ws:;
  frame-src 'none';
  object-src 'none';
`;
```

### Security Headers

```javascript
const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  }
];
```

## Troubleshooting

### Common Issues

#### Build Failures

1. **Memory Issues**: Increase Node.js memory limit
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm run build
   ```

2. **Dependency Conflicts**: Clear cache and reinstall
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **TypeScript Errors**: Check type definitions
   ```bash
   npm run type-check
   ```

#### Runtime Issues

1. **Hydration Errors**: Check server/client rendering differences
2. **Web3 Connection Issues**: Verify network configuration
3. **API Connection Issues**: Check CORS and environment variables

#### Performance Issues

1. **Large Bundle Size**: Analyze and optimize imports
2. **Slow Loading**: Implement lazy loading
3. **Memory Leaks**: Check component cleanup

### Debugging

```bash
# Enable debug mode
DEBUG=* npm run dev

# Check bundle composition
npm run build:analyze

# Performance profiling
npm run build -- --profile

# Memory usage analysis
node --inspect npm run build
```

### Logs and Monitoring

```javascript
// Structured logging
import { logger } from '@/utils/logger';

logger.info('Deployment started', {
  environment: process.env.NODE_ENV,
  version: process.env.npm_package_version
});
```

## Deployment Checklist

### Pre-deployment

- [ ] All tests passing
- [ ] Bundle size within limits
- [ ] Environment variables configured
- [ ] Security headers configured
- [ ] Performance metrics acceptable

### Post-deployment

- [ ] Health check endpoints responding
- [ ] Analytics tracking working
- [ ] Error monitoring active
- [ ] Performance monitoring active
- [ ] User workflows tested

### Rollback Plan

1. Keep previous deployment available
2. Monitor error rates and performance
3. Have rollback procedure documented
4. Test rollback in staging environment

## Support and Maintenance

### Regular Maintenance

1. **Dependency Updates**: Monthly security updates
2. **Performance Reviews**: Weekly performance analysis
3. **Error Monitoring**: Daily error rate monitoring
4. **User Feedback**: Regular user experience reviews

### Emergency Procedures

1. **Incident Response**: Documented escalation procedures
2. **Rollback Process**: Automated rollback capabilities
3. **Communication Plan**: User notification procedures
4. **Recovery Testing**: Regular disaster recovery testing

For additional support, contact the development team or refer to the project documentation.