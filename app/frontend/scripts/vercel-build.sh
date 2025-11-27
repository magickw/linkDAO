#!/bin/bash
echo "Cleaning .next..."
rm -rf .next

echo "Setting environment to skip Playwright browser download..."
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

echo "Removing playwright-core from node_modules..."
rm -rf node_modules/playwright-core
rm -rf node_modules/playwright
rm -rf node_modules/@playwright
rm -rf node_modules/next/node_modules/@playwright
rm -rf node_modules/next/node_modules/playwright*

echo "Running Next.js build..."
npm run build