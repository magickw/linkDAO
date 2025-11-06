#!/bin/bash

# Emergency startup script for critical memory situations
# This script starts the standalone JavaScript server to keep service online

echo "🚨 EMERGENCY STARTUP - Critical Memory Situation"
echo "Starting minimal standalone server..."

# Use emergency environment
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=800 --optimize-for-size --gc-interval=25"

# Check if standalone server exists
if [ -f "src/index.production.standalone.js" ]; then
    echo "✅ Starting standalone JavaScript server..."
    node src/index.production.standalone.js
else
    echo "❌ Standalone server not found, creating minimal server..."
    
    # Create minimal emergency server
    cat > emergency-server.js << 'EOF'
const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

console.log('🚨 EMERGENCY SERVER - Minimal functionality only');

app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({ 
    status: 'emergency', 
    mode: 'minimal',
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage()
  });
});

app.get('/emergency-health', (req, res) => {
  res.json({ status: 'emergency' });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'LinkDAO Backend - Emergency Mode',
    status: 'Service temporarily running in minimal mode due to memory constraints'
  });
});

app.use('*', (req, res) => {
  res.status(503).json({
    error: 'Service temporarily unavailable',
    message: 'Backend is running in emergency mode with limited functionality'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚨 Emergency server running on port ${PORT}`);
});
EOF

    echo "✅ Starting emergency server..."
    node emergency-server.js
fi