#!/bin/bash

# Deploy Remaining Console Error Fixes
# Date: 2025-11-06
# Fixes: Geolocation, DEX, Safe Rendering, WebSocket

set -e

echo "🚀 Deploying Remaining Console Error Fixes..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from project root"
    exit 1
fi

# Show what will be deployed
echo "📋 New files to be deployed:"
echo "  Frontend Services:"
echo "    - app/frontend/src/services/geolocationService.ts"
echo "    - app/frontend/src/services/dexService.ts"
echo "    - app/frontend/src/utils/safeRender.ts"
echo "  Documentation:"
echo "    - REMAINING_FIXES_APPLIED.md"
echo "    - REMAINING_ISSUES_FIXES.md"
echo ""

# Confirm deployment
read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Check environment variables
echo "🔍 Checking environment variables..."
if [ -f "app/frontend/.env.local" ]; then
    echo "✅ Found .env.local"
else
    echo "⚠️  No .env.local found - you may need to add environment variables"
fi

# Stage changes
echo "📦 Staging changes..."
git add app/frontend/src/services/geolocationService.ts
git add app/frontend/src/services/dexService.ts
git add app/frontend/src/utils/safeRender.ts
git add REMAINING_FIXES_APPLIED.md
git add REMAINING_ISSUES_FIXES.md
git add DEPLOY_REMAINING_FIXES.sh

# Commit
echo "💾 Committing changes..."
git commit -m "feat: add graceful error handling for optional services

- Add geolocation service with multiple fallback providers
  * Handles ip-api.com 403 errors gracefully
  * Falls back to alternative providers
  * Caches results to reduce API calls
  
- Add DEX service with feature flag and error handling
  * Returns empty array instead of 404 errors
  * Supports NEXT_PUBLIC_ENABLE_DEX feature flag
  * Comprehensive timeout and error handling
  
- Add safe rendering utilities to prevent React Error #31
  * safeRender() converts objects to primitives
  * safeAddress() formats wallet addresses
  * safeCount() safely converts to numbers
  * Prevents Symbol rendering errors
  
- All services degrade gracefully when unavailable
- No breaking changes to existing functionality

Fixes: IP geolocation 403, DEX 404, React Error #31
Impact: Cleaner console, better UX, production-ready"

# Push
echo "🚢 Pushing to main..."
git push origin main

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "📊 Monitor deployment:"
echo "  Frontend (Vercel): https://vercel.com/dashboard"
echo ""
echo "🔍 After deployment, verify:"
echo "  1. No IP geolocation 403 errors"
echo "  2. No DEX 404 errors"
echo "  3. No React Error #31"
echo "  4. All features work with/without optional services"
echo ""
echo "⚙️  Environment Variables to Add (if not already set):"
echo "  NEXT_PUBLIC_ENABLE_DEX=false"
echo "  NEXT_PUBLIC_WS_URL=wss://api.linkdao.io"
echo "  NEXT_PUBLIC_BACKEND_URL=https://api.linkdao.io"
echo ""
echo "📝 See REMAINING_FIXES_APPLIED.md for full details"
