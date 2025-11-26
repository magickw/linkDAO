#!/bin/bash
# Pre-build script to remove playwright directories before Next.js build

echo "Removing playwright directories..."
rm -rf node_modules/playwright
rm -rf node_modules/playwright-core  
rm -rf node_modules/@playwright

echo "Playwright directories removed. Starting Next.js build..."
npm run build
