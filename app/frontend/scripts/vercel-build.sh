#!/bin/bash
echo "Cleaning .next..."
rm -rf .next

echo "Removing playwright directories from node_modules..."
rm -rf node_modules/playwright
rm -rf node_modules/playwright-core
rm -rf node_modules/@playwright

echo "Running Next.js build..."
npm run build