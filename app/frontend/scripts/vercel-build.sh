#!/bin/bash
echo "Cleaning .next..."
rm -rf .next

echo "Setting environment to skip Playwright browser download..."
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

echo "Removing all playwright packages from node_modules..."
# Remove from frontend node_modules
rm -rf node_modules/playwright-core
rm -rf node_modules/playwright
rm -rf node_modules/@playwright

# Remove from any nested node_modules (like next's internal deps)
find node_modules -type d -name "playwright*" -exec rm -rf {} + 2>/dev/null || true
find node_modules -type d -name "@playwright" -exec rm -rf {} + 2>/dev/null || true

# Also check parent directory if running in workspace
if [ -d "../node_modules" ]; then
  rm -rf ../node_modules/playwright-core
  rm -rf ../node_modules/playwright
  rm -rf ../node_modules/@playwright
  find ../node_modules -type d -name "playwright*" -exec rm -rf {} + 2>/dev/null || true
  find ../node_modules -type d -name "@playwright" -exec rm -rf {} + 2>/dev/null || true
fi

echo "Running Next.js build..."
npm run build