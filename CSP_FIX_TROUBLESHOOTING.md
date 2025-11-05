# CSP and Service Worker Fix - Troubleshooting Guide

## Quick Fix Applied ✅

The following issues have been resolved:
- CSP violations blocking localhost:10000 connections
- Service Worker CSP conflicts in development
- Backend connection issues
- CORS configuration problems

## How to Start Development

### Option 1: Simple Start (Recommended)
```bash
node dev-server.js
```

### Option 2: Manual Steps
```bash
# 1. Start backend (in separate terminal)
cd app/backend && npm run dev

# 2. Start frontend
npm run dev:no-csp
```

### Option 3: Emergency CSP Disable
```bash
npm run fix:csp
```

## Available Scripts

- `npm run dev:clean` - Clear cache and start
- `npm run dev:no-csp` - Start without CSP
- `npm run backend:restart` - Restart backend
- `npm run fix:csp` - Emergency CSP disable + restart

## If Problems Persist

### 1. Clear Everything
```bash
# Clear browser data
# - Open DevTools (F12)
# - Application tab > Storage > Clear site data

# Clear project cache
rm -rf .next node_modules/.cache
npm install
```

### 2. Check Backend Status
```bash
curl http://localhost:10000/health
```

### 3. Use Incognito Mode
Open your browser in incognito/private mode to bypass cached CSP policies.

### 4. Manual Backend Start
```bash
cd app/backend
npm install
npm run dev
```

## What Was Fixed

1. **CSP Policy**: Made development-friendly, allows all localhost connections
2. **Service Worker**: Disabled in development to prevent CSP conflicts  
3. **Environment**: Proper environment variables for localhost:10000
4. **CORS**: Enhanced to allow all development origins
5. **Scripts**: Added convenient npm scripts for development

## Production Notes

These fixes are for DEVELOPMENT ONLY. Production deployment will use:
- Strict CSP policies
- Enabled Service Workers
- HTTPS-only connections
- Specific allowed origins

---

**Status**: ✅ All CSP and backend issues resolved
**Environment**: Development optimized
**Next**: Start development with `node dev-server.js`
