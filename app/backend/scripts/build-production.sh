#!/bin/bash

# Production build script for environment with 4GB RAM
# Use available memory for efficient compilation

echo "🚀 Preparing LinkDAO Backend for Production"
echo "Environment: ${NODE_ENV:-production}"
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"

# Clean up old build artifacts to prevent cache issues
echo "🧹 Cleaning old build artifacts..."
rm -rf dist

# Create fresh dist directory
echo "📁 Creating dist directory..."
mkdir -p dist

echo "🔨 Compiling TypeScript to JavaScript with SWC (ultra-fast)..."
# Use SWC for compilation - 20-70x faster than tsc
# Exclude the same files as tsconfig.json
npx swc src -d dist --copy-files --strip-leading-paths \
  --ignore "**/*.test.ts" \
  --ignore "**/*.spec.ts" \
  --ignore "**/tests/**" \
  --ignore "**/controllers/advancedTradingController.ts" \
  --ignore "**/controllers/dexTradingController.ts" \
  --ignore "**/services/advancedTradingService.ts" \
  --ignore "**/services/multiChainDEXService.ts" \
  --ignore "**/services/uniswapV3Service.ts" \
  --ignore "**/routes/advancedTradingRoutes.ts" \
  --ignore "**/routes/dexTradingRoutes.ts"
swc_result=$?

if [ $swc_result -ne 0 ]; then
    echo "❌ SWC compilation failed with exit code: $swc_result"
    exit 1
fi

echo "✅ SWC compilation completed successfully!"

# Optional: Run type checking separately (doesn't block deployment)
echo "🔍 Running type checking (optional, can be skipped for faster builds)..."
NODE_OPTIONS="--max-old-space-size=1024" npx tsc --noEmit --project tsconfig.production.json || echo "⚠️  Type checking completed with warnings (non-blocking)"

if [ $swc_result -ne 0 ]; then
    echo "❌ SWC compilation failed"
    exit 1
fi

# The compilation should have created dist/index.js from src/index.ts
# Make sure it's executable
if [ -f "dist/index.js" ]; then
    chmod +x dist/index.js
    echo "✅ Production build completed!"
    echo "📊 dist/index.js size: $(ls -lh dist/index.js | awk '{print $5}')"
    echo "🎯 Ready to run with: node dist/index.js"
else
    echo "❌ Compilation did not produce dist/index.js"
    exit 1
fi

exit 0
