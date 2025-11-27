#!/bin/bash
echo "Cleaning .next..."
rm -rf .next

echo "Removing ALL playwright packages from node_modules..."
rm -rf node_modules/playwright*
rm -rf node_modules/@playwright*

# Also remove any nested playwright packages
find node_modules -name "*playwright*" -type d -exec rm -rf {} + 2>/dev/null || true

echo "Running Next.js build..."
npm run build