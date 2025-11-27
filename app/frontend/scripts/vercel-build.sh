#!/bin/bash
echo "Cleaning .next..."
rm -rf .next

echo "Removing playwright-core from Next.js node_modules..."
rm -rf node_modules/next/node_modules/@playwright
rm -rf node_modules/next/node_modules/playwright*
rm -rf node_modules/next/node_modules/*playwright*

# Also remove any playwright packages directly
rm -rf node_modules/playwright*
rm -rf node_modules/@playwright*

echo "Running Next.js build..."
npm run build