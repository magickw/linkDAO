#!/bin/bash
echo "Cleaning .next..."
rm -rf .next

echo "Setting environment to skip Playwright browser download..."
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Aggressively remove playwright from everywhere
echo "Aggressively removing playwright packages..."
find . -name "playwright-core" -type d -prune -exec rm -rf {} +
find . -name "playwright" -type d -prune -exec rm -rf {} +
find . -name "@playwright" -type d -prune -exec rm -rf {} +

# Double check node_modules specifically
rm -rf node_modules/playwright-core
rm -rf node_modules/playwright
rm -rf node_modules/@playwright

echo "Running Next.js build..."
npm run build