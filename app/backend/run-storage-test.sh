#!/bin/bash

# Test script for self-hosted storage system

echo "Running Self-Hosted Storage System Test..."
echo "=========================================="

# Check if TypeScript is available
if ! command -v ts-node &> /dev/null; then
    echo "Installing ts-node for testing..."
    npm install -g ts-node
fi

# Run the test
echo "Executing test..."
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend
ts-node test-storage-system.ts

# Check the exit code
if [ $? -eq 0 ]; then
    echo "✅ Test completed successfully!"
else
    echo "❌ Test failed!"
    exit 1
fi