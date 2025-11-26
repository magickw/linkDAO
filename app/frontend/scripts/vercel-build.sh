#!/bin/bash
# Pre-build script to remove playwright directories before Next.js build

echo "Current directory: $(pwd)"
echo "Checking for playwright before removal:"
find node_modules -name "*playwright*" -type d -maxdepth 3 || echo "No playwright found (or error)"

echo "Removing playwright directories recursively..."
# Find and remove all directories named playwright, playwright-core, or @playwright inside node_modules
find node_modules -name "playwright" -type d -prune -exec rm -rf {} +
find node_modules -name "playwright-core" -type d -prune -exec rm -rf {} +
find node_modules -name "@playwright" -type d -prune -exec rm -rf {} +

echo "Checking for playwright AFTER removal:"
find node_modules -name "*playwright*" -type d || echo "No playwright found"

echo "Playwright directories removed. Starting Next.js build..."
npm run build
