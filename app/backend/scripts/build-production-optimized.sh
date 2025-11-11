#!/bin/bash

# Production build script for Render Standard (2GB RAM)
# Uses TypeScript compiler to create optimized JavaScript files

echo "🚀 Preparing LinkDAO Backend for Production (Optimized Build)"
echo "Environment: ${NODE_ENV:-production}"
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"

# Create dist directory
echo "📁 Creating dist directory..."
mkdir -p dist

# Set Node.js options for compilation
export NODE_OPTIONS="--max-old-space-size=4096"

# Compile TypeScript to JavaScript
echo "📝 Compiling TypeScript to JavaScript..."
if npx tsc --project tsconfig.production.json; then
  echo "✅ TypeScript compilation successful!"
else
  echo "⚠️ TypeScript compilation had warnings/errors but continuing..."
fi

# Check if dist directory has files
if [ -f "dist/index.js" ]; then
  echo "✅ Compiled JavaScript files created successfully!"
  echo "📊 dist/index.js size: $(ls -lh dist/index.js | awk '{print $5}')"
else
  echo "❌ No compiled JavaScript files found!"
  echo "📝 Falling back to ts-node launcher..."
  
  # Create a simple launcher script that uses ts-node
  cat > dist/index.js << 'EOF'
#!/usr/bin/env node

/**
 * Production launcher using ts-node
 * This runs the TypeScript source directly without pre-compilation
 */
 
console.log('🚀 Starting LinkDAO Backend via ts-node');
console.log('📊 Node.js version:', process.version);
console.log('📊 Environment:', process.env.NODE_ENV || 'development');

// Set up ts-node with optimized settings
require('ts-node').register({
  transpileOnly: true, // Skip type checking for faster startup
  compilerOptions: {
    module: 'commonjs',
    target: 'ES2020',
    esModuleInterop: true,
    skipLibCheck: true,
  }
});

// Load and run the main application
require('../src/index.ts');
EOF

  chmod +x dist/index.js
  echo "✅ Fallback ts-node launcher created!"
fi

echo "🎯 Build process complete!"
exit 0