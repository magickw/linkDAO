#!/bin/bash

# Deploy Console Error Fixes
# Date: 2025-11-06
# Fixes: Logout 404, Trending 500, Excessive logging

set -e

echo "🚀 Deploying Console Error Fixes..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from project root"
    exit 1
fi

# Show what will be deployed
echo "📋 Files to be deployed:"
echo "  Frontend:"
echo "    - app/frontend/src/services/authService.ts"
echo "    - app/frontend/src/components/Messaging/FloatingChatWidget.tsx"
echo "  Backend:"
echo "    - app/backend/src/services/feedService.ts"
echo ""

# Confirm deployment
read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Stage changes
echo "📦 Staging changes..."
git add app/frontend/src/services/authService.ts
git add app/frontend/src/components/Messaging/FloatingChatWidget.tsx
git add app/backend/src/services/feedService.ts
git add CONSOLE_ERRORS_FIXES_APPLIED.md
git add CRITICAL_CONSOLE_ERRORS_FIX.md
git add CRITICAL_PRODUCTION_FIXES_NEEDED.md

# Commit
echo "💾 Committing changes..."
git commit -m "fix: resolve critical console errors

- Fix logout 404 by correcting API path from /auth/logout to /api/auth/logout
- Fix trending posts 500 by returning empty array instead of throwing
- Remove excessive console logging from FloatingChatWidget
- Add comprehensive error handling to prevent UI crashes

Fixes #console-errors"

# Push
echo "🚢 Pushing to main..."
git push origin main

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "📊 Monitor deployment:"
echo "  Frontend (Vercel): https://vercel.com/dashboard"
echo "  Backend (Render): https://dashboard.render.com"
echo ""
echo "🔍 After deployment, verify:"
echo "  1. Logout works without 404 errors"
echo "  2. Trending posts widget displays (even if empty)"
echo "  3. Console is cleaner (no excessive logging)"
echo "  4. No 500 errors in backend logs"
echo ""
echo "📝 See CONSOLE_ERRORS_FIXES_APPLIED.md for full details"
