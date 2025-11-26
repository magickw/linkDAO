#!/bin/bash
# Pre-build script to remove playwright directories before Next.js build

echo "Removing playwright directories recursively..."
# Find and remove all directories named playwright, playwright-core, or @playwright inside node_modules
find node_modules -name "playwright" -type d -prune -exec rm -rf {} +
find node_modules -name "playwright-core" -type d -prune -exec rm -rf {} +
find node_modules -name "@playwright" -type d -prune -exec rm -rf {} +

echo "Playwright directories removed. Starting Next.js build..."
npm run build
