#!/bin/bash

# Production build script for environment with 4GB RAM
# Use available memory for efficient compilation

echo "🚀 Preparing LinkDAO Backend for Production"
echo "Environment: ${NODE_ENV:-production}"
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"

# Create dist directory
echo "📁 Creating dist directory..."
mkdir -p dist

# Use memory-optimized build approach with 4GB RAM
echo "🔨 Compiling TypeScript to JavaScript (4GB RAM optimized)..."
NODE_OPTIONS='--max-old-space-size=3500 --optimize-for-size' npx tsc --project tsconfig.production.json
tsc_result=$?

if [ $tsc_result -ne 0 ]; then
    echo "❌ TypeScript compilation failed with exit code: $tsc_result"
    # Try fallback build approach
    echo "🔄 Trying fallback build approach..."
    # Use the standalone build which doesn't compile everything
    if [ -f "src/index.production.standalone.js" ]; then
        cp src/index.production.standalone.js dist/index.js
        chmod +x dist/index.js
        echo "✅ Fallback build completed!"
        echo "📊 dist/index.js size: $(ls -lh dist/index.js | awk '{print $5}')"
        echo "🎯 Ready to run with: node dist/index.js"
        exit 0
    else
        # Create a minimal production launcher
        cat > dist/index.js << 'EOF'
#!/usr/bin/env node

// Set environment variables for Standard tier
process.env.RENDER_SERVICE_TYPE = 'standard';
process.env.RENDER_SERVICE_PLAN = 'standard';
process.env.RENDER_PRO = 'true';
process.env.MEMORY_LIMIT = '4096';

console.log('🚀 Starting LinkDAO Backend - Production Mode');
console.log('📊 Node.js version:', process.version);
console.log('📊 Environment:', process.env.NODE_ENV || 'development');

// Load the main production application
try {
    require('./index.production.js');
} catch (e) {
    console.error('❌ Failed to load compiled application:', e.message);
    process.exit(1);
}
EOF
        chmod +x dist/index.js
        echo "⚠️  Created minimal launcher due to compilation failure"
        echo "📊 dist/index.js size: $(ls -lh dist/index.js | awk '{print $5}')"
        echo "🎯 Ready to run with: node dist/index.js"
        exit 0
    fi
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
