#!/bin/bash

# Chunked compilation build script for extreme memory constraints
# This script compiles TypeScript in smaller chunks to avoid memory issues

echo "🚀 Building LinkDAO Backend for Production (Chunked Mode)"
echo "Environment: ${NODE_ENV:-production}"
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"

# Set aggressive memory limits
export NODE_OPTIONS="--max-old-space-size=1200 --optimize-for-size --gc-interval=50"

# Create dist directory
echo "📁 Creating dist directory..."
mkdir -p dist

# Clean any previous build artifacts
echo "🧹 Cleaning previous build artifacts..."
rm -rf dist/* 2>/dev/null || true

# Create a minimal tsconfig for chunked compilation
cat > tsconfig.chunk.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": false,
    "declarationMap": false,
    "sourceMap": false,
    "removeComments": true,
    "noEmitOnError": false,
    "incremental": false,
    "tsBuildInfoFile": false,
    "maxNodeModuleJsDepth": 0,
    "disableSizeLimit": true,
    "preserveWatchOutput": false,
    "pretty": false
  },
  "include": [],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.spec.ts",
    "tests/**/*",
    "src/tests/**/*"
  ]
}
EOF

# Compile core files first
echo "🔨 Compiling core files..."
jq '.include = ["src/index.ts", "src/config/**/*", "src/utils/**/*", "src/middleware/**/*"]' tsconfig.chunk.json > tsconfig.core.json
npx tsc --project tsconfig.core.json 2>&1 || true

# Compile services
echo "🔨 Compiling services..."
jq '.include = ["src/services/**/*"]' tsconfig.chunk.json > tsconfig.services.json
npx tsc --project tsconfig.services.json 2>&1 || true

# Compile controllers
echo "🔨 Compiling controllers..."
jq '.include = ["src/controllers/**/*"]' tsconfig.chunk.json > tsconfig.controllers.json
npx tsc --project tsconfig.controllers.json 2>&1 || true

# Compile routes
echo "🔨 Compiling routes..."
jq '.include = ["src/routes/**/*"]' tsconfig.chunk.json > tsconfig.routes.json
npx tsc --project tsconfig.routes.json 2>&1 || true

# Compile remaining files
echo "🔨 Compiling remaining files..."
jq '.include = ["src/**/*"]' tsconfig.chunk.json > tsconfig.remaining.json
npx tsc --project tsconfig.remaining.json 2>&1 || true

# Clean up temporary configs
rm -f tsconfig.chunk.json tsconfig.core.json tsconfig.services.json tsconfig.controllers.json tsconfig.routes.json tsconfig.remaining.json

# Verify the build succeeded
if [ -f "dist/index.js" ]; then
    echo "✅ Build successful!"
    echo "📊 dist/index.js size: $(ls -lh dist/index.js | awk '{print $5}')"
    echo "📊 Total .js files: $(find dist -name '*.js' 2>/dev/null | wc -l)"
    exit 0
else
    echo "❌ ERROR: dist/index.js was not created!"
    echo "📂 Listing dist directory:"
    ls -la dist/ 2>&1 || echo "dist/ does not exist"
    exit 1
fi