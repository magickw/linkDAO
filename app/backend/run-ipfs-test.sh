#!/bin/bash

# Test script for IPFS integration system

echo "Running IPFS Integration System Test..."
echo "======================================"

# Check if TypeScript is available
if ! command -v ts-node &> /dev/null; then
    echo "Installing ts-node for testing..."
    npm install -g ts-node
fi

# Run the test
echo "Executing IPFS integration test..."
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend
ts-node test-ipfs-integration.ts

# Check the exit code
if [ $? -eq 0 ]; then
    echo "✅ IPFS integration test completed successfully!"
else
    echo "❌ IPFS integration test failed!"
    exit 1
fi